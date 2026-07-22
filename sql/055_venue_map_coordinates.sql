alter table public.contacts
  add column if not exists address text,
  add column if not exists postal_code text,
  add column if not exists department text,
  add column if not exists region text,
  add column if not exists website text,
  add column if not exists capacity integer check (capacity is null or capacity >= 0),
  add column if not exists latitude double precision check (latitude is null or latitude between -90 and 90),
  add column if not exists longitude double precision check (longitude is null or longitude between -180 and 180);

create index if not exists contacts_company_geolocation_idx
  on public.contacts(company_id, latitude, longitude)
  where contact_type = 'venue' and latitude is not null and longitude is not null;

comment on column public.contacts.latitude is
  'Latitude WGS84 du lieu, renseignee par import ou geocodage controle.';

comment on column public.contacts.longitude is
  'Longitude WGS84 du lieu, renseignee par import ou geocodage controle.';
