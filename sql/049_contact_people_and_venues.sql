alter table public.contacts
  add column if not exists contact_type text not null default 'person'
    check (contact_type in ('person', 'venue')),
  add column if not exists venue_id uuid references public.contacts(id) on delete set null;

create index if not exists contacts_company_type_idx
  on public.contacts(company_id, contact_type);

create index if not exists contacts_venue_id_idx
  on public.contacts(venue_id)
  where venue_id is not null;

alter table public.contacts
  drop constraint if exists contacts_venue_not_self;

alter table public.contacts
  add constraint contacts_venue_not_self
  check (venue_id is null or venue_id <> id);

comment on column public.contacts.contact_type is
  'Personne physique ou lieu/structure repertorie dans le carnet.';

comment on column public.contacts.venue_id is
  'Lieu auquel une personne est rattachee, par exemple sa direction ou sa programmation.';
