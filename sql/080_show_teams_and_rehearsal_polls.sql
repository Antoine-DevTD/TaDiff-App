-- 080 - Equipes de spectacle et sondages de repetitions

create table if not exists public.show_team_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  job_title text not null,
  character_name text,
  alternate_group text,
  created_at timestamptz not null default now(),
  unique (show_id, contact_id)
);

create table if not exists public.rehearsal_polls (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  title text not null,
  public_token uuid not null default gen_random_uuid() unique,
  default_location text,
  response_deadline date,
  show_responses boolean not null default true,
  status text not null default 'open' check (status in ('draft', 'open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rehearsal_slots (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.rehearsal_polls(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  slot_date date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  location text,
  calendar_event_id uuid references public.calendar_events(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.rehearsal_participants (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.rehearsal_polls(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  team_member_id uuid references public.show_team_members(id) on delete set null,
  display_name text not null,
  comment text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (poll_id, team_member_id)
);

create table if not exists public.rehearsal_responses (
  participant_id uuid not null references public.rehearsal_participants(id) on delete cascade,
  slot_id uuid not null references public.rehearsal_slots(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  availability text not null check (availability in ('yes', 'maybe', 'no')),
  updated_at timestamptz not null default now(),
  primary key (participant_id, slot_id)
);

create unique index if not exists shows_id_company_unique on public.shows(id, company_id);
create unique index if not exists contacts_id_company_unique on public.contacts(id, company_id);
create unique index if not exists calendar_events_id_company_unique on public.calendar_events(id, company_id);
create unique index if not exists show_team_members_id_company_unique on public.show_team_members(id, company_id);
create unique index if not exists rehearsal_polls_id_company_unique on public.rehearsal_polls(id, company_id);
create unique index if not exists rehearsal_slots_id_company_unique on public.rehearsal_slots(id, company_id);
create unique index if not exists rehearsal_participants_id_company_unique on public.rehearsal_participants(id, company_id);
alter table public.show_team_members add constraint show_team_show_company_fk foreign key (show_id, company_id) references public.shows(id, company_id) on delete cascade;
alter table public.show_team_members add constraint show_team_contact_company_fk foreign key (contact_id, company_id) references public.contacts(id, company_id) on delete cascade;
alter table public.rehearsal_polls add constraint rehearsal_poll_show_company_fk foreign key (show_id, company_id) references public.shows(id, company_id) on delete cascade;
alter table public.rehearsal_slots add constraint rehearsal_slot_poll_company_fk foreign key (poll_id, company_id) references public.rehearsal_polls(id, company_id) on delete cascade;
alter table public.rehearsal_slots add constraint rehearsal_slot_event_company_fk foreign key (calendar_event_id, company_id) references public.calendar_events(id, company_id) on delete set null (calendar_event_id);
alter table public.rehearsal_participants add constraint rehearsal_participant_poll_company_fk foreign key (poll_id, company_id) references public.rehearsal_polls(id, company_id) on delete cascade;
alter table public.rehearsal_participants add constraint rehearsal_participant_team_company_fk foreign key (team_member_id, company_id) references public.show_team_members(id, company_id) on delete set null (team_member_id);
alter table public.rehearsal_responses add constraint rehearsal_response_participant_company_fk foreign key (participant_id, company_id) references public.rehearsal_participants(id, company_id) on delete cascade;
alter table public.rehearsal_responses add constraint rehearsal_response_slot_company_fk foreign key (slot_id, company_id) references public.rehearsal_slots(id, company_id) on delete cascade;

create index if not exists show_team_members_show_idx on public.show_team_members(show_id);
create index if not exists rehearsal_polls_show_idx on public.rehearsal_polls(show_id, created_at desc);
create index if not exists rehearsal_slots_poll_idx on public.rehearsal_slots(poll_id, slot_date, start_time);
create index if not exists rehearsal_participants_poll_idx on public.rehearsal_participants(poll_id);
create index if not exists rehearsal_responses_slot_idx on public.rehearsal_responses(slot_id);

alter table public.show_team_members enable row level security;
alter table public.rehearsal_polls enable row level security;
alter table public.rehearsal_slots enable row level security;
alter table public.rehearsal_participants enable row level security;
alter table public.rehearsal_responses enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['show_team_members','rehearsal_polls','rehearsal_slots','rehearsal_participants','rehearsal_responses'] loop
    execute format('drop policy if exists "company members read %1$s" on public.%1$I', table_name);
    execute format('create policy "company members read %1$s" on public.%1$I for select to authenticated using (public.is_company_member(company_id))', table_name);
    execute format('drop policy if exists "company writers manage %1$s" on public.%1$I', table_name);
    execute format($policy$create policy "company writers manage %1$s" on public.%1$I for all to authenticated
      using (public.is_company_member(company_id) and exists (select 1 from public.profiles where id = (select auth.uid()) and company_id = %1$I.company_id and role in ('owner','admin','member')))
      with check (public.is_company_member(company_id) and exists (select 1 from public.profiles where id = (select auth.uid()) and company_id = %1$I.company_id and role in ('owner','admin','member')))$policy$, table_name);
  end loop;
end $$;

revoke all on table public.show_team_members, public.rehearsal_polls, public.rehearsal_slots, public.rehearsal_participants, public.rehearsal_responses from anon;
grant select, insert, update, delete on table public.show_team_members, public.rehearsal_polls, public.rehearsal_slots, public.rehearsal_participants, public.rehearsal_responses to authenticated;
grant all on table public.show_team_members, public.rehearsal_polls, public.rehearsal_slots, public.rehearsal_participants, public.rehearsal_responses to service_role;

alter table public.calendar_events drop constraint if exists calendar_events_kind_check;
alter table public.calendar_events add constraint calendar_events_kind_check check (kind in ('event', 'deadline', 'show', 'rehearsal'));

create or replace function public.get_public_rehearsal_poll(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'title', p.title, 'status', p.status, 'deadline', p.response_deadline,
    'showResponses', p.show_responses, 'showTitle', s.title, 'companyName', c.name,
    'participants', coalesce((select jsonb_agg(jsonb_build_object('id', rp.id, 'name', rp.display_name, 'comment', rp.comment, 'respondedAt', rp.responded_at) order by rp.display_name) from rehearsal_participants rp where rp.poll_id = p.id), '[]'::jsonb),
    'slots', coalesce((select jsonb_agg(jsonb_build_object('id', rs.id, 'date', rs.slot_date, 'startTime', rs.start_time, 'endTime', rs.end_time, 'location', coalesce(rs.location, p.default_location), 'confirmed', rs.confirmed_at is not null) order by rs.slot_date, rs.start_time) from rehearsal_slots rs where rs.poll_id = p.id), '[]'::jsonb),
    'responses', case when p.show_responses then coalesce((select jsonb_agg(jsonb_build_object('participantId', rr.participant_id, 'slotId', rr.slot_id, 'availability', rr.availability)) from rehearsal_responses rr join rehearsal_participants rp on rp.id = rr.participant_id where rp.poll_id = p.id), '[]'::jsonb) else '[]'::jsonb end
  ) from rehearsal_polls p join shows s on s.id = p.show_id join companies c on c.id = p.company_id
  where p.public_token = p_token and p.status <> 'draft';
$$;

create or replace function public.submit_public_rehearsal_response(p_token uuid, p_participant_id uuid, p_display_name text, p_comment text, p_responses jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare poll_row rehearsal_polls%rowtype; participant_row rehearsal_participants%rowtype; item jsonb;
begin
  select * into poll_row from rehearsal_polls where public_token = p_token and status = 'open';
  if not found then raise exception 'Ce sondage ne prend plus de reponses.'; end if;
  if poll_row.response_deadline is not null and poll_row.response_deadline < current_date then raise exception 'La date limite de reponse est depassee.'; end if;
  if p_participant_id is not null then
    select * into participant_row from rehearsal_participants where id = p_participant_id and poll_id = poll_row.id;
    if not found then raise exception 'Participant introuvable.'; end if;
  else
    if length(trim(coalesce(p_display_name, ''))) < 2 then raise exception 'Indiquez votre nom.'; end if;
    insert into rehearsal_participants (poll_id, company_id, display_name) values (poll_row.id, poll_row.company_id, trim(p_display_name)) returning * into participant_row;
  end if;
  if jsonb_array_length(coalesce(p_responses, '[]'::jsonb)) <> (select count(*) from rehearsal_slots where poll_id = poll_row.id)
    or (select count(distinct item->>'slotId') from jsonb_array_elements(coalesce(p_responses, '[]'::jsonb)) item) <> (select count(*) from rehearsal_slots where poll_id = poll_row.id)
    or exists (select 1 from jsonb_array_elements(coalesce(p_responses, '[]'::jsonb)) item where not exists (select 1 from rehearsal_slots where id = (item->>'slotId')::uuid and poll_id = poll_row.id))
  then raise exception 'Repondez une seule fois a chaque creneau.'; end if;
  update rehearsal_participants set comment = nullif(trim(coalesce(p_comment, '')), ''), responded_at = now() where id = participant_row.id;
  delete from rehearsal_responses where participant_id = participant_row.id;
  for item in select * from jsonb_array_elements(coalesce(p_responses, '[]'::jsonb)) loop
    if (item->>'availability') in ('yes','maybe','no') and exists (select 1 from rehearsal_slots where id = (item->>'slotId')::uuid and poll_id = poll_row.id) then
      insert into rehearsal_responses (participant_id, slot_id, company_id, availability) values (participant_row.id, (item->>'slotId')::uuid, poll_row.company_id, item->>'availability');
    end if;
  end loop;
  return jsonb_build_object('participantId', participant_row.id);
end $$;

create or replace function public.create_rehearsal_poll(p_show_id uuid, p_title text, p_default_location text, p_deadline date, p_show_responses boolean, p_team_member_ids uuid[], p_slots jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare company uuid; poll_id uuid; member record; slot jsonb;
begin
  select company_id into company from shows where id = p_show_id and public.is_company_member(company_id);
  if company is null then raise exception 'Spectacle introuvable.'; end if;
  if cardinality(p_team_member_ids) = 0 or (select count(*) from show_team_members where show_id = p_show_id and company_id = company and id = any(p_team_member_ids)) <> cardinality(p_team_member_ids) then raise exception 'Equipe invalide.'; end if;
  if jsonb_array_length(p_slots) = 0 then raise exception 'Ajoutez un creneau.'; end if;
  insert into rehearsal_polls(company_id,show_id,title,default_location,response_deadline,show_responses,status) values(company,p_show_id,trim(p_title),nullif(trim(coalesce(p_default_location,'')),''),p_deadline,p_show_responses,'open') returning id into poll_id;
  for slot in select * from jsonb_array_elements(p_slots) loop
    insert into rehearsal_slots(company_id,poll_id,slot_date,start_time,end_time,location) values(company,poll_id,(slot->>'date')::date,(slot->>'startTime')::time,(slot->>'endTime')::time,nullif(trim(coalesce(slot->>'location','')),''));
  end loop;
  for member in select stm.id, c.name from show_team_members stm join contacts c on c.id=stm.contact_id and c.company_id=stm.company_id where stm.id=any(p_team_member_ids) and stm.show_id=p_show_id and stm.company_id=company loop
    insert into rehearsal_participants(company_id,poll_id,team_member_id,display_name) values(company,poll_id,member.id,member.name);
  end loop;
  return poll_id;
end $$;

create or replace function public.confirm_rehearsal_slots(p_show_id uuid, p_poll_id uuid, p_slot_ids uuid[])
returns integer language plpgsql security invoker set search_path = public as $$
declare company uuid; poll_row rehearsal_polls%rowtype; slot rehearsal_slots%rowtype; event_id uuid; confirmed_count integer := 0;
begin
  select * into poll_row from rehearsal_polls where id=p_poll_id and show_id=p_show_id;
  if not found or not public.is_company_member(poll_row.company_id) then raise exception 'Sondage introuvable.'; end if;
  company := poll_row.company_id;
  if (select count(*) from rehearsal_slots where poll_id=p_poll_id and id=any(p_slot_ids)) <> cardinality(p_slot_ids) then raise exception 'Creneau invalide.'; end if;
  for slot in select * from rehearsal_slots where poll_id=p_poll_id and id=any(p_slot_ids) for update loop
    if slot.calendar_event_id is null then
      insert into calendar_events(company_id,title,event_date,kind,related_show_id,all_day,start_time,end_time,location) values(company,'Répétition · '||poll_row.title,slot.slot_date,'rehearsal',p_show_id,false,slot.start_time,slot.end_time,coalesce(slot.location,poll_row.default_location)) returning id into event_id;
      update rehearsal_slots set calendar_event_id=event_id,confirmed_at=now() where id=slot.id and calendar_event_id is null;
      confirmed_count := confirmed_count + 1;
    end if;
  end loop;
  return confirmed_count;
end $$;

revoke all on function public.get_public_rehearsal_poll(uuid) from public;
revoke all on function public.submit_public_rehearsal_response(uuid,uuid,text,text,jsonb) from public;
grant execute on function public.get_public_rehearsal_poll(uuid) to anon, authenticated;
grant execute on function public.submit_public_rehearsal_response(uuid,uuid,text,text,jsonb) to anon, authenticated;
revoke all on function public.create_rehearsal_poll(uuid,text,text,date,boolean,uuid[],jsonb) from public, anon;
revoke all on function public.confirm_rehearsal_slots(uuid,uuid,uuid[]) from public, anon;
grant execute on function public.create_rehearsal_poll(uuid,text,text,date,boolean,uuid[],jsonb) to authenticated;
grant execute on function public.confirm_rehearsal_slots(uuid,uuid,uuid[]) to authenticated;
notify pgrst, 'reload schema';
