-- Family Chat — schema inicial
-- Perfis, convites, conversas, participantes, mensagens, anexos e push.

create extension if not exists "pgcrypto";
create extension if not exists "pg_net";

-- ========== PROFILES ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  status text not null default 'Disponível',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: family can view"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: user updates self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- ========== INVITE CODES ==========
create table public.invite_codes (
  code text primary key,
  note text,
  max_uses int not null default 1,
  uses int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invite_codes enable row level security;
-- Sem policies de select/insert para authenticated/anon: só a Edge Function
-- (service role) acessa esta tabela.

-- ========== CONVERSATIONS ==========
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct','group')),
  name text,
  avatar_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

-- Função auxiliar SECURITY DEFINER para evitar recursão de RLS.
create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id and user_id = auth.uid()
  );
$$;

create policy "conversations: participants can view"
  on public.conversations for select
  to authenticated
  using (public.is_conversation_participant(id));

create policy "conversations: participants can update"
  on public.conversations for update
  to authenticated
  using (public.is_conversation_participant(id));

create policy "conversations: authenticated can create"
  on public.conversations for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "participants: view own conversations"
  on public.conversation_participants for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "participants: update own row"
  on public.conversation_participants for update
  to authenticated
  using (user_id = auth.uid());

create policy "participants: insert by conversation members"
  on public.conversation_participants for insert
  to authenticated
  with check (
    public.is_conversation_participant(conversation_id) or
    not exists (select 1 from public.conversation_participants cp where cp.conversation_id = conversation_id)
  );

create policy "participants: leave conversation"
  on public.conversation_participants for delete
  to authenticated
  using (user_id = auth.uid());

-- ========== MESSAGES ==========
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  type text not null check (type in ('text','image','video','audio','document','location')),
  body text,
  metadata jsonb not null default '{}',
  reply_to_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy "messages: participants can view"
  on public.messages for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "messages: participants can send"
  on public.messages for insert
  to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id));

create policy "messages: sender can edit/delete"
  on public.messages for update
  to authenticated
  using (sender_id = auth.uid());

-- ========== ATTACHMENTS ==========
create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  file_name text,
  size_bytes bigint,
  width int,
  height int,
  duration_seconds numeric
);

alter table public.message_attachments enable row level security;

create policy "attachments: participants can view"
  on public.message_attachments for select
  to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_participant(m.conversation_id)
    )
  );

create policy "attachments: sender can insert"
  on public.message_attachments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.messages m
      where m.id = message_id and m.sender_id = auth.uid()
    )
  );

-- ========== PUSH SUBSCRIPTIONS ==========
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push: user manages own subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ========== TRIGGERS ==========

-- Atualiza last_message_at da conversa a cada nova mensagem.
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger trg_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- Atualiza last_seen_at do perfil.
create or replace function public.touch_profile_last_seen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set last_seen_at = now() where id = new.sender_id;
  return new;
end;
$$;

create trigger trg_touch_last_seen
  after insert on public.messages
  for each row execute function public.touch_profile_last_seen();

-- ========== RPCs ==========

create or replace function public.create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  if other_user_id = auth.uid() then
    raise exception 'Não é possível criar conversa consigo mesmo';
  end if;

  select cp1.conversation_id into v_conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp1.conversation_id = cp2.conversation_id
  join public.conversations c on c.id = cp1.conversation_id
  where c.type = 'direct'
    and cp1.user_id = auth.uid()
    and cp2.user_id = other_user_id
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (type, created_by)
  values ('direct', auth.uid())
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values (v_conversation_id, auth.uid(), 'owner'), (v_conversation_id, other_user_id, 'member');

  return v_conversation_id;
end;
$$;

create or replace function public.create_group_conversation(group_name text, member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_member uuid;
begin
  insert into public.conversations (type, name, created_by)
  values ('group', group_name, auth.uid())
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values (v_conversation_id, auth.uid(), 'owner');

  foreach v_member in array member_ids loop
    if v_member <> auth.uid() then
      insert into public.conversation_participants (conversation_id, user_id, role)
      values (v_conversation_id, v_member, 'member')
      on conflict do nothing;
    end if;
  end loop;

  return v_conversation_id;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.conversation_participants
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();
$$;

create or replace function public.get_conversations_overview()
returns table (
  id uuid,
  type text,
  name text,
  avatar_url text,
  last_message_at timestamptz,
  participants jsonb,
  last_message jsonb,
  unread_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id,
    c.type,
    c.name,
    c.avatar_url,
    c.last_message_at,
    (
      select jsonb_agg(jsonb_build_object(
        'user_id', p.id,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'last_seen_at', p.last_seen_at
      ))
      from public.conversation_participants cp2
      join public.profiles p on p.id = cp2.user_id
      where cp2.conversation_id = c.id
    ) as participants,
    (
      select jsonb_build_object(
        'id', m.id, 'type', m.type, 'body', m.body,
        'sender_id', m.sender_id, 'created_at', m.created_at
      )
      from public.messages m
      where m.conversation_id = c.id and m.deleted_at is null
      order by m.created_at desc
      limit 1
    ) as last_message,
    (
      select count(*)
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and m.created_at > cp.last_read_at
    ) as unread_count
  from public.conversations c
  join public.conversation_participants cp on cp.conversation_id = c.id and cp.user_id = auth.uid()
  order by c.last_message_at desc;
$$;

-- ========== REALTIME ==========
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_participants;
alter publication supabase_realtime add table public.conversations;
