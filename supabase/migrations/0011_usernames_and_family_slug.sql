-- Login por nome de usuário no formato "usuario@familia", para não depender
-- do e-mail sintético (UUID@familychat.local) criado para contas sem e-mail
-- próprio (tipicamente crianças). O "familia" aqui é um slug curto e único
-- por família, derivado do nome dela — não é o join_code (esse continua
-- secreto, só usado para pedir entrada numa família).

alter table public.families add column if not exists slug text;

update public.families
set slug = lower(regexp_replace(
  translate(
    name,
    'áàãâäéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
  ),
  '[^a-zA-Z0-9]+', '', 'g'
))
where slug is null;

-- Resolve eventuais colisões de slug (mais de uma família cairia no mesmo
-- texto) anexando parte do id, garantindo unicidade antes da constraint.
with dupes as (
  select id, slug, row_number() over (partition by slug order by created_at) as rn
  from public.families
)
update public.families f
set slug = f.slug || substr(f.id::text, 1, 4)
from dupes d
where d.id = f.id and d.rn > 1;

alter table public.families alter column slug set not null;
alter table public.families add constraint families_slug_unique unique (slug);

alter table public.profiles add column if not exists username text;

create unique index if not exists profiles_family_username_unique_idx
  on public.profiles (family_id, lower(username))
  where username is not null;

-- Expõe o slug para quem já é membro da própria família.
drop function if exists public.get_my_family();

create function public.get_my_family()
returns table (id uuid, name text, slug text, member_count bigint, pending_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    f.id,
    f.name,
    f.slug,
    (select count(*) from public.profiles where family_id = f.id and approval_status = 'approved'),
    (select count(*) from public.profiles where family_id = f.id and approval_status = 'pending')
  from public.families f
  join public.profiles me on me.family_id = f.id
  where me.id = auth.uid();
$$;

-- Traduz "usuario@familia" para o e-mail real de autenticação, sem expor
-- nenhum outro dado. Precisa ser chamável por anon, pois roda antes do login.
create or replace function public.resolve_login_email(p_username text, p_family_slug text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select u.email
  from public.profiles p
  join public.families f on f.id = p.family_id
  join auth.users u on u.id = p.id
  where f.slug = lower(trim(p_family_slug))
    and p.username is not null
    and lower(p.username) = lower(trim(p_username))
  limit 1;
$$;

revoke all on function public.resolve_login_email(text, text) from public;
grant execute on function public.resolve_login_email(text, text) to anon, authenticated;

-- Inclui o username no painel de membros do admin, para ele lembrar o login
-- de cada conta que criou.
drop function if exists public.get_family_members();

create function public.get_family_members()
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  birth_date date,
  is_adult boolean,
  family_role text,
  approval_status text,
  username text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select pr.id, pr.display_name, pr.avatar_url, pr.birth_date, pr.is_adult, pr.family_role, pr.approval_status, pr.username, pr.created_at
  from public.profiles pr
  where pr.family_id = public.my_family_id()
    and exists (
      select 1 from public.profiles admin_p
      where admin_p.id = auth.uid()
        and admin_p.family_role = 'admin'
        and admin_p.family_id = pr.family_id
    )
  order by pr.created_at asc;
$$;
