-- 094 - Lecture privée compatible avec l'opération du Storage hébergé.
-- Prérequis : 091–093. Les droits des fichiers restent ceux de la publication.
-- Le service hébergé utilise aussi object.get_authenticated_info pour télécharger.
-- Aucune signature, liste, copie ou lecture publique du bucket n'est autorisée.
begin;
drop policy if exists resource_media_read on storage.objects;
create policy resource_media_read on storage.objects for select to anon, authenticated using (
  bucket_id='resource-media' and (
    ((storage.allow_only_operation('object.get_authenticated')
      or storage.allow_only_operation('object.get_authenticated_info'))
      and exists(select 1 from public.resource_assets a where a.storage_path=storage.objects.name))
    or ((storage.allow_only_operation('object.delete') or storage.allow_only_operation('object.delete_many'))
      and (select resource_private.can_edit()) and not exists(select 1 from public.resource_assets a where a.storage_path=storage.objects.name))
  )
);
commit;
