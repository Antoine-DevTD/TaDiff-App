-- 093 - Conflit éditorial explicite, sans nouvelle tentative PostgREST.
-- Prérequis : 092. Ne change ni les données, ni les droits, ni le verrouillage.
-- SQLSTATE 40001 est réservé aux erreurs de sérialisation transitoires :
-- PostgREST 14 le relance indéfiniment pour une révision devenue obsolète.
-- https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b
begin;
do $$
declare
  definition text;
  old_raise constant text := $old$raise exception 'resource_conflict' using errcode='40001';$old$;
  new_raise constant text := $new$raise exception 'resource_conflict' using errcode='PT409';$new$;
begin
  select pg_get_functiondef('resource_private.mutate_page(uuid,jsonb,integer,text,uuid)'::regprocedure) into definition;
  if position(new_raise in definition) > 0 and position(old_raise in definition) = 0 then return; end if;
  if length(definition) - length(replace(definition, old_raise, '')) <> length(old_raise) then
    raise exception 'resource_conflict_migration_unexpected_definition';
  end if;
  execute replace(definition, old_raise, new_raise);
end;
$$;
commit;
