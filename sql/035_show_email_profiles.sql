alter table public.shows
  add column if not exists logline text,
  add column if not exists themes text[] not null default '{}',
  add column if not exists target_audience text,
  add column if not exists email_pitch text;

comment on column public.shows.logline is
  'One-sentence presentation of the show used in outreach emails.';
comment on column public.shows.themes is
  'Themes used to personalize outreach and presentation copy.';
comment on column public.shows.target_audience is
  'Audience or programming context for the show.';
comment on column public.shows.email_pitch is
  'Short editorial angle used when preparing outreach emails.';
