-- 069 - Modèles d'emails actifs et modèle par défaut pour chaque usage

alter table public.email_templates
  add column if not exists enabled boolean not null default true,
  add column if not exists is_default boolean not null default false;

create unique index if not exists email_templates_one_default_per_use_idx
  on public.email_templates(company_id, message_type)
  where is_default;

create index if not exists email_templates_enabled_use_idx
  on public.email_templates(company_id, message_type, enabled, updated_at desc);

grant select, insert, update, delete on public.email_templates to authenticated;
