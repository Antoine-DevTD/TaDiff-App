create or replace function public.submit_public_rehearsal_response(p_token uuid, p_participant_id uuid, p_display_name text, p_comment text, p_responses jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  poll_row rehearsal_polls%rowtype;
  participant_row rehearsal_participants%rowtype;
  response_item jsonb;
begin
  select * into poll_row from rehearsal_polls where public_token = p_token and status = 'open';
  if not found then raise exception 'Ce sondage ne prend plus de reponses.'; end if;
  if poll_row.response_deadline is not null and poll_row.response_deadline < current_date then raise exception 'La date limite de reponse est depassee.'; end if;
  if p_participant_id is not null then
    select * into participant_row from rehearsal_participants where id = p_participant_id and poll_id = poll_row.id;
    if not found then raise exception 'Participant introuvable.'; end if;
  else
    if length(trim(coalesce(p_display_name, ''))) < 2 then raise exception 'Indiquez votre nom.'; end if;
    insert into rehearsal_participants (poll_id, company_id, display_name) values (poll_row.id, poll_row.company_id, trim(p_display_name)) returning * into participant_row;
  end if;
  if jsonb_array_length(coalesce(p_responses, '[]'::jsonb)) <> (select count(*) from rehearsal_slots where poll_id = poll_row.id)
    or (select count(distinct candidate.value->>'slotId') from jsonb_array_elements(coalesce(p_responses, '[]'::jsonb)) as candidate(value)) <> (select count(*) from rehearsal_slots where poll_id = poll_row.id)
    or exists (select 1 from jsonb_array_elements(coalesce(p_responses, '[]'::jsonb)) as candidate(value) where not exists (select 1 from rehearsal_slots where id = (candidate.value->>'slotId')::uuid and poll_id = poll_row.id))
  then raise exception 'Repondez une seule fois a chaque creneau.'; end if;
  update rehearsal_participants set comment = nullif(trim(coalesce(p_comment, '')), ''), responded_at = now() where id = participant_row.id;
  delete from rehearsal_responses where participant_id = participant_row.id;
  for response_item in select value from jsonb_array_elements(coalesce(p_responses, '[]'::jsonb)) as answers(value) loop
    if (response_item->>'availability') in ('yes','maybe','no') and exists (select 1 from rehearsal_slots where id = (response_item->>'slotId')::uuid and poll_id = poll_row.id) then
      insert into rehearsal_responses (participant_id, slot_id, company_id, availability) values (participant_row.id, (response_item->>'slotId')::uuid, poll_row.company_id, response_item->>'availability');
    end if;
  end loop;
  return jsonb_build_object('participantId', participant_row.id);
end $$;
