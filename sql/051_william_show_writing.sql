-- 051 - Atelier de redaction William par spectacle

alter table public.shows
  add column if not exists synopsis_text text,
  add column if not exists intention_note_text text;

create table if not exists public.william_conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  objective text not null check (objective in ('logline', 'synopsis', 'intention', 'email_pitch')),
  mode text not null check (mode in ('interview', 'documents')),
  source_context text not null default '',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.william_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.william_conversations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 12000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists william_conversations_show_updated_idx
  on public.william_conversations(company_id, show_id, updated_at desc);
create index if not exists william_messages_conversation_created_idx
  on public.william_messages(conversation_id, created_at);

alter table public.william_conversations enable row level security;
alter table public.william_messages enable row level security;

drop policy if exists "members can read William conversations" on public.william_conversations;
create policy "members can read William conversations"
  on public.william_conversations for select to authenticated
  using (public.is_company_member(company_id));

drop policy if exists "members can create William conversations" on public.william_conversations;
create policy "members can create William conversations"
  on public.william_conversations for insert to authenticated
  with check (public.is_company_member(company_id) and user_id = (select auth.uid()));

drop policy if exists "members can update William conversations" on public.william_conversations;
create policy "members can update William conversations"
  on public.william_conversations for update to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "members can read William messages" on public.william_messages;
create policy "members can read William messages"
  on public.william_messages for select to authenticated
  using (
    public.is_company_member(company_id)
    and exists (
      select 1 from public.william_conversations conversation
      where conversation.id = william_messages.conversation_id
        and conversation.company_id = william_messages.company_id
    )
  );

drop policy if exists "members can create William messages" on public.william_messages;
create policy "members can create William messages"
  on public.william_messages for insert to authenticated
  with check (
    public.is_company_member(company_id)
    and (user_id is null or user_id = (select auth.uid()))
    and exists (
      select 1 from public.william_conversations conversation
      where conversation.id = william_messages.conversation_id
        and conversation.company_id = william_messages.company_id
    )
  );

grant select, insert, update on public.william_conversations to authenticated;
grant select, insert on public.william_messages to authenticated;
