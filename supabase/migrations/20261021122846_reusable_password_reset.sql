-- Liens de réinitialisation consultables pendant sept jours.
-- Aucune lecture publique, aucun changement de mot de passe à l'ouverture.
create schema if not exists private;

create table if not exists public.password_reset_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '7 days'),
  used_at timestamptz,
  applied_at timestamptz,
  consumed_txid bigint,
  claim_id uuid,
  claim_until timestamptz
);
alter table public.password_reset_links add column if not exists applied_at timestamptz;
alter table public.password_reset_links add column if not exists consumed_txid bigint;
create index if not exists password_reset_links_user_created on public.password_reset_links(user_id,created_at);
alter table public.password_reset_links enable row level security;
revoke all on public.password_reset_links from public,anon,authenticated;
grant select,insert,update,delete on public.password_reset_links to service_role;

create or replace function public.issue_password_reset_link(p_email text,p_token_hash text)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare u auth.users%rowtype; expires timestamptz; recent_count integer;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or char_length(p_email)>254 then
    raise exception 'Invalid reset request.' using errcode='22023';
  end if;
  select * into u from auth.users where lower(email)=lower(trim(p_email)) for update;
  if not found or u.email_confirmed_at is null or (u.banned_until is not null and u.banned_until>clock_timestamp()) then
    return jsonb_build_object('status','ignored');
  end if;
  select count(*) into recent_count from public.password_reset_links
    where user_id=u.id and created_at>clock_timestamp()-interval '1 hour';
  if recent_count>=5 or exists(select 1 from public.password_reset_links
    where user_id=u.id and created_at>clock_timestamp()-interval '60 seconds') then
    return jsonb_build_object('status','ignored');
  end if;
  expires:=clock_timestamp()+interval '7 days';
  insert into public.password_reset_links(token_hash,user_id,email,expires_at)
    values(p_token_hash,u.id,lower(u.email),expires);
  return jsonb_build_object('status','issued','userId',u.id,'email',u.email,'expiresAt',expires);
end; $$;

create or replace function public.inspect_password_reset_link(p_token_hash text)
returns jsonb language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare r public.password_reset_links%rowtype; u auth.users%rowtype;
begin
  select * into r from public.password_reset_links where token_hash=p_token_hash;
  if not found then return jsonb_build_object('status','invalid'); end if;
  if r.used_at is not null then return jsonb_build_object('status','used'); end if;
  if r.expires_at<=statement_timestamp() then return jsonb_build_object('status','expired'); end if;
  select * into u from auth.users where id=r.user_id;
  if not found or lower(u.email) is distinct from r.email or u.email_confirmed_at is null
    or (u.banned_until is not null and u.banned_until>statement_timestamp()) then
    return jsonb_build_object('status','invalid');
  end if;
  return jsonb_build_object('status','ready','expiresAt',r.expires_at);
end; $$;

create or replace function public.claim_password_reset_link(p_token_hash text)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare r public.password_reset_links%rowtype; target_id uuid; state jsonb; claim uuid:=gen_random_uuid();
begin
  select user_id into target_id from public.password_reset_links where token_hash=p_token_hash;
  if target_id is null then return jsonb_build_object('status','invalid'); end if;
  -- Même ordre de verrouillage que l'API Auth et son trigger : utilisateur, liens.
  perform 1 from auth.users where id=target_id for update;
  select * into r from public.password_reset_links where token_hash=p_token_hash for update;
  state:=public.inspect_password_reset_link(p_token_hash);
  if state->>'status'<>'ready' then return state; end if;
  if exists(select 1 from public.password_reset_links where user_id=target_id
    and used_at is null and claim_until>clock_timestamp()) then
    return jsonb_build_object('status','busy');
  end if;
  update public.password_reset_links set claim_id=claim,claim_until=clock_timestamp()+interval '2 minutes' where id=r.id;
  return jsonb_build_object('status','claimed','userId',r.user_id,'claimId',claim);
end; $$;

create or replace function public.release_password_reset_claim(p_claim_id uuid)
returns void language sql security definer set search_path=public,pg_temp as $$
  update public.password_reset_links set claim_until=null where claim_id=p_claim_id and used_at is null;
$$;

create or replace function public.password_reset_claim_applied(p_claim_id uuid)
returns boolean language sql stable security definer set search_path=public,auth,pg_temp as $$
  select exists(select 1 from public.password_reset_links r join auth.users u on u.id=r.user_id
    where r.claim_id=p_claim_id and r.used_at is not null and r.applied_at is not null);
$$;

-- La mise à jour du mot de passe reste effectuée par l'API Auth, qui applique
-- ses règles de mot de passe. Cette garde empêche une requête retardée de
-- réutiliser une réservation déjà expirée ou consommée.
create or replace function private.guard_password_reset_claim()
returns trigger language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare marker text:=new.raw_app_meta_data->>'tadiff_password_reset_claim';
begin
  if marker is not null and (new.encrypted_password is distinct from old.encrypted_password
    or marker is distinct from (old.raw_app_meta_data->>'tadiff_password_reset_claim')) then
    if not exists(select 1 from public.password_reset_links r where r.user_id=new.id
      and r.claim_id::text=marker and r.claim_until>clock_timestamp()
      and ((new.encrypted_password is distinct from old.encrypted_password and r.used_at is null)
        or (new.encrypted_password is not distinct from old.encrypted_password
          and r.used_at is not null and r.consumed_txid=txid_current()))
      and r.expires_at>clock_timestamp() and r.email=lower(new.email)
      and new.email_confirmed_at is not null
      and (new.banned_until is null or new.banned_until<=clock_timestamp())) then
      raise exception 'Invalid password reset claim.' using errcode='42501';
    end if;
    update public.password_reset_links set applied_at=clock_timestamp(),claim_until=null where user_id=new.id and claim_id::text=marker;
    -- La réservation n'est pas conservée dans les métadonnées ni dans les JWT.
    new.raw_app_meta_data:=new.raw_app_meta_data-'tadiff_password_reset_claim';
  end if;
  return new;
end; $$;

create or replace function private.consume_password_reset_links()
returns trigger language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    -- Auth peut mettre à jour le mot de passe puis les métadonnées dans deux
    -- instructions de la même transaction. La garde valide son identifiant de
    -- transaction avant d'accepter la réservation et d'enregistrer le reçu.
    update public.password_reset_links set used_at=clock_timestamp(),consumed_txid=txid_current()
      where user_id=new.id and used_at is null;
  end if;
  return new;
end; $$;

drop trigger if exists tadiff_guard_password_reset on auth.users;
create trigger tadiff_guard_password_reset before update of encrypted_password,raw_app_meta_data on auth.users
  for each row execute function private.guard_password_reset_claim();
drop trigger if exists tadiff_consume_password_reset on auth.users;
create trigger tadiff_consume_password_reset after update of encrypted_password on auth.users
  for each row execute function private.consume_password_reset_links();

revoke all on function private.guard_password_reset_claim(),private.consume_password_reset_links() from public,anon,authenticated;
revoke all on function public.issue_password_reset_link(text,text),public.inspect_password_reset_link(text),
  public.claim_password_reset_link(text),public.release_password_reset_claim(uuid),public.password_reset_claim_applied(uuid) from public,anon,authenticated;
grant execute on function public.issue_password_reset_link(text,text),public.inspect_password_reset_link(text),
  public.claim_password_reset_link(text),public.release_password_reset_claim(uuid),public.password_reset_claim_applied(uuid) to service_role;

notify pgrst,'reload schema';
