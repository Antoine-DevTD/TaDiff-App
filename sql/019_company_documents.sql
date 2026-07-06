-- 019 - Documents de la compagnie (pieces administratives reutilisables)
--
-- Objectif : stocker une fois pour toutes les pieces de la compagnie (RIB,
-- statuts, licence, attestation d'assurance, Kbis...) au niveau compagnie,
-- pour ne pas avoir a les re-televerser dossier par dossier / spectacle par
-- spectacle. Fichiers dans le bucket prive "documents" (migration 011),
-- chemin company_id/company/... (isolation par compagnie).

create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  doc_type text not null default 'Autre',
  storage_path text,
  file_url text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_documents_company_idx
  on public.company_documents(company_id, created_at desc);

alter table public.company_documents enable row level security;

drop policy if exists "members can manage company documents" on public.company_documents;
create policy "members can manage company documents"
  on public.company_documents for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));
