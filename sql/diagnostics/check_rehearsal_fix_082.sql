-- Lecture seule : vérifier le correctif 082 dans le SQL Editor de TaDiff.
-- La simple présence de cette RPC ne suffit pas : elle existait déjà en 080.
with deployed as (
  select pg_get_functiondef(to_regprocedure(
    'public.submit_public_rehearsal_response(uuid,uuid,text,text,jsonb)'
  )) as definition
)
select case
  when definition is null then 'Fonction absente'
  when position('candidate.value' in definition) > 0
    and position('answers(value)' in definition) > 0
    then 'Motifs du correctif 082 retrouvés'
  else 'Définition à comparer au fichier 082'
end as verification_082, definition
from deployed;
