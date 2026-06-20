grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.companies to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.shows to authenticated;
grant select, insert, update, delete on table public.contacts to authenticated;
grant select, insert, update, delete on table public.opportunities to authenticated;
grant select, insert, update, delete on table public.reminders to authenticated;

drop policy if exists "authenticated users can create companies" on public.companies;
create policy "authenticated users can create companies"
  on public.companies
  for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "members can update companies" on public.companies;
create policy "members can update companies"
  on public.companies
  for update
  to authenticated
  using (public.is_company_member(id))
  with check (public.is_company_member(id));

drop policy if exists "members can read companies" on public.companies;
create policy "members can read companies"
  on public.companies
  for select
  to authenticated
  using (public.is_company_member(id));
