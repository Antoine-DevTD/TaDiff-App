-- 033 - RIB et statuts appartiennent a la compagnie, pas a un spectacle.
--
-- Conserve le fichier existant dans Storage, cree une reference compagnie
-- pour le document le plus recent de chaque type, puis retire les anciennes
-- references rattachees aux spectacles.

with latest_show_document as (
  select distinct on (document.company_id, document.document_type)
    document.company_id,
    document.document_type,
    document.storage_path,
    document.file_url,
    document.notes,
    document.updated_at
  from public.show_documents as document
  where document.document_type in ('RIB', 'Statuts')
  order by document.company_id, document.document_type, document.updated_at desc
)
update public.company_documents as company_document
set
  storage_path = latest.storage_path,
  file_url = latest.file_url,
  note = coalesce(company_document.note, latest.notes),
  updated_at = latest.updated_at
from latest_show_document as latest
where company_document.company_id = latest.company_id
  and company_document.doc_type = latest.document_type
  and company_document.storage_path is null
  and company_document.file_url is null;

insert into public.company_documents (
  company_id,
  title,
  doc_type,
  storage_path,
  file_url,
  note,
  created_at,
  updated_at
)
select distinct on (document.company_id, document.document_type)
  document.company_id,
  document.title,
  document.document_type,
  document.storage_path,
  document.file_url,
  document.notes,
  document.updated_at,
  document.updated_at
from public.show_documents as document
where document.document_type in ('RIB', 'Statuts')
  and not exists (
    select 1
    from public.company_documents as company_document
    where company_document.company_id = document.company_id
      and company_document.doc_type = document.document_type
  )
order by document.company_id, document.document_type, document.updated_at desc;

delete from public.show_documents
where document_type in ('RIB', 'Statuts');
