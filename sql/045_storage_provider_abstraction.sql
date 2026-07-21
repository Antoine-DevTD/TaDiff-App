-- 045 - Les documents peuvent vivre dans Supabase Storage ou Cloudflare R2.

alter table public.show_documents
  add column if not exists storage_provider text not null default 'supabase'
  check (storage_provider in ('supabase', 'r2'));

alter table public.company_documents
  add column if not exists storage_provider text not null default 'supabase'
  check (storage_provider in ('supabase', 'r2'));

create index if not exists show_documents_storage_provider_idx
  on public.show_documents(storage_provider) where storage_path is not null;

create index if not exists company_documents_storage_provider_idx
  on public.company_documents(storage_provider) where storage_path is not null;
