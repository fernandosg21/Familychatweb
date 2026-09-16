-- Modelo multi-família com aprovação de administrador.
-- Qualquer pessoa pode criar uma nova família (definindo um código/senha de
-- acesso) ou entrar em uma existente com esse código. Quem entra fica
-- "pending" até o administrador da família aprovar.

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.families enable row level security;
-- Sem policies de select/insert para authenticated/anon: a tabela só é lida
-- pelas Edge Functions (service role), que validam o código antes de expor
-- qualquer coisa. O nome da família aprovada é exposto via get_my_family().

-- "approval_status" (não "status"): a coluna `status` já existe em profiles
-- como o recado/bio do usuário (estilo WhatsApp).
alter table public.profiles
  add column family_id uuid references public.families(id) on delete cascade,
  add column family_role text not null default 'member' check (family_role in ('admin','member')),
  add column approval_status text not null default 'pending' check (approval_status in ('pending','approved'));

-- Substitui a policy antiga (visível para qualquer autenticado) por uma
-- restrita à própria família, já aprovada. O próprio perfil sempre é visível
-- (necessário para a tela de "aguardando aprovação").
drop policy if exists "profiles: family can view" on public.profiles;
create policy "profiles: family can view"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or (
      approval_status = 'approved'
      and family_id is not null
      and family_id = (select p.family_id from public.profiles p where p.id = auth.uid())
    )
  );

-- Dados da própria família (nome) para quem já é membro.
create or replace function public.get_my_family()
returns table (id uuid, name text, member_count bigint, pending_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    f.id,
    f.name,
    (select count(*) from public.profiles where family_id = f.id and approval_status = 'approved'),
    (select count(*) from public.profiles where family_id = f.id and approval_status = 'pending')
  from public.families f
  join public.profiles me on me.family_id = f.id
  where me.id = auth.uid();
$$;

-- Solicitações pendentes da própria família — só retorna algo se quem chama for admin.
create or replace function public.get_pending_family_members()
returns table (id uuid, display_name text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select pr.id, pr.display_name, pr.created_at
  from public.profiles pr
  where pr.approval_status = 'pending'
    and pr.family_id = (select p.family_id from public.profiles p where p.id = auth.uid())
    and exists (
      select 1 from public.profiles admin_p
      where admin_p.id = auth.uid()
        and admin_p.family_role = 'admin'
        and admin_p.family_id = pr.family_id
    )
  order by pr.created_at asc;
$$;

-- O código de convite único global foi substituído pelo modelo de famílias.
drop table if exists public.invite_codes;
