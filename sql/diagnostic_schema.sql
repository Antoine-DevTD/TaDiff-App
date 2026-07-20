-- Diagnostic du schema TaDiff
--
-- A coller tel quel dans le SQL editor Supabase.
-- Liste les colonnes et fonctions critiques manquantes dans le schema attendu.
-- Si le resultat est vide : le schema est complet.
--
-- Reparation : rejouer dans l'ordre les migrations citees dans la colonne
-- "migration" (elles sont toutes idempotentes, les rejouer ne casse rien),
-- puis executer :  notify pgrst, 'reload schema';

with attendu_colonnes(table_name, column_name, migration) as (
  values
    -- 004 pipeline / relances
    ('opportunities', 'probability', '004'),
    ('opportunities', 'next_action', '004'),
    ('opportunities', 'next_follow_up_at', '004'),
    ('opportunities', 'lost_reason', '004'),
    ('reminders', 'opportunity_id', '004'),
    ('reminders', 'contact_id', '004'),
    ('reminders', 'priority', '004'),
    ('reminders', 'completed_at', '004'),
    -- 005 finance / growth
    ('grant_opportunities', 'id', '005'),
    ('patronage_deals', 'id', '005'),
    ('commercial_packs', 'id', '005'),
    ('email_campaigns', 'id', '005'),
    ('quotes', 'id', '005'),
    ('show_cost_profiles', 'show_id', '005'),
    -- 006 beta / documents spectacle
    ('beta_signups', 'id', '006'),
    ('show_documents', 'id', '006'),
    ('shows', 'poster_url', '006'),
    -- 007 pieces subventions
    ('grant_opportunities', 'requirements', '007'),
    ('grant_opportunities', 'eligibility', '007'),
    ('grant_opportunities', 'source_url', '007'),
    ('grant_opportunities', 'themes', '007'),
    -- 008 frais fixes
    ('fixed_costs', 'id', '008'),
    -- 009 billing / roles
    ('companies', 'billing_status', '009'),
    ('companies', 'plan_code', '009'),
    ('companies', 'comped_until', '009'),
    ('companies', 'billing_notes', '009'),
    -- 010 tresorerie
    ('treasury_snapshots', 'id', '010'),
    -- 011 stockage documents
    ('show_documents', 'storage_path', '011'),
    -- 012 logs d'activite
    ('activity_logs', 'id', '012'),
    -- 036 modeles d'exploitation
    ('opportunities', 'exploitation_mode', '036'),
    ('opportunities', 'cession_fee', '036'),
    ('opportunities', 'estimated_box_office', '036'),
    ('opportunities', 'company_share_percent', '036'),
    ('opportunities', 'minimum_guarantee', '036'),
    ('opportunities', 'venue_rental', '036')
),
attendu_fonctions(function_name, migration) as (
  values
    ('is_company_member', '001'),
    ('ensure_workspace', '003'),
    ('register_beta_signup', '006'),
    ('get_beta_signup_stats', '006'),
    ('is_company_admin', '009'),
    ('current_company_role', '009'),
    ('company_has_access', '009'),
    ('log_activity', '012')
)
select 'colonne manquante' as probleme,
       a.table_name || '.' || a.column_name as objet,
       a.migration
from attendu_colonnes a
where not exists (
  select 1 from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = a.table_name
    and c.column_name = a.column_name
)

union all

select 'fonction manquante',
       f.function_name,
       f.migration
from attendu_fonctions f
where not exists (
  select 1 from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = f.function_name
)

union all

select 'bucket storage manquant', 'documents', '011'
where not exists (select 1 from storage.buckets where id = 'documents')

order by migration, objet;
