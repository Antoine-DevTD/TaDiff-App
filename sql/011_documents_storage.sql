-- 011 - Stockage reel des documents (Supabase Storage)
--
-- Objectifs :
-- 1. Creer le bucket prive "documents" (20 Mo max, formats bureautiques/PDF/images).
-- 2. Isoler les fichiers par compagnie : chemin = company_id/show_id/fichier.
-- 3. Ajouter show_documents.storage_path pour les fichiers stockes dans TaDiff
--    (file_url reste utilise pour les liens externes type Drive).
--
-- Les policies storage s'appuient sur public.is_company_member (migration 001) :
-- le premier segment du chemin doit etre l'id de la compagnie du membre.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  20971520, -- 20 Mo
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/plain'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

alter table public.show_documents
  add column if not exists storage_path text;

drop policy if exists "members can read company documents" on storage.objects;
create policy "members can read company documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "members can upload company documents" on storage.objects;
create policy "members can upload company documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "members can update company documents" on storage.objects;
create policy "members can update company documents"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'documents'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'documents'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "members can delete company documents" on storage.objects;
create policy "members can delete company documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );
