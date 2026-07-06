-- 014 - Affiches de spectacle (Supabase Storage, bucket public)
--
-- Objectifs :
-- 1. Creer un bucket PUBLIC "posters" (8 Mo max, images uniquement).
--    L'affiche n'est pas sensible (elle sert aux programmateurs / devis) :
--    URL publique permanente stockee dans shows.poster_url, plus de lien externe.
-- 2. Isoler l'ecriture par compagnie : chemin = company_id/show_id/fichier.
--    Lecture publique (bucket public), ecriture reservee aux membres.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'posters',
  'posters',
  true,
  8388608, -- 8 Mo
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can read posters" on storage.objects;
create policy "public can read posters"
  on storage.objects for select
  to public
  using (bucket_id = 'posters');

drop policy if exists "members can upload company posters" on storage.objects;
create policy "members can upload company posters"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'posters'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "members can update company posters" on storage.objects;
create policy "members can update company posters"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'posters'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'posters'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "members can delete company posters" on storage.objects;
create policy "members can delete company posters"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'posters'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );
