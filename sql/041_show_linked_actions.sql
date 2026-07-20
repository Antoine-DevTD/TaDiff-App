-- 041 - Actions rattachees aux spectacles et typees pour une lecture rapide

alter table public.reminders
  add column if not exists show_id uuid references public.shows(id) on delete set null,
  add column if not exists action_type text not null default 'other';

alter table public.reminders drop constraint if exists reminders_action_type_check;
alter table public.reminders
  add constraint reminders_action_type_check
  check (action_type in ('call', 'email', 'document', 'quote', 'administration', 'other'));

update public.reminders r
set show_id = o.show_id
from public.opportunities o
where r.opportunity_id = o.id
  and r.show_id is null
  and o.show_id is not null;

update public.reminders r
set show_id = s.id
from public.shows s
where r.company_id = s.company_id
  and r.show_id is null
  and lower(trim(r.related_to)) = lower(trim(s.title));

update public.reminders
set action_type = case
  when lower(title) ~ '(mail|email|courriel|ecrire)' then 'email'
  when lower(title) ~ '(appel|appeler|contacter|relancer)' then 'call'
  when lower(title) ~ '(dossier|document|fiche|texte)' then 'document'
  when lower(title) ~ '(devis|tarif|budget)' then 'quote'
  when lower(title) ~ '(mettre a jour|completer|preparer)' then 'administration'
  else 'other'
end
where action_type = 'other';

create index if not exists reminders_show_id_idx on public.reminders(show_id);
create index if not exists reminders_company_show_due_idx
  on public.reminders(company_id, show_id, due_date)
  where done = false;
