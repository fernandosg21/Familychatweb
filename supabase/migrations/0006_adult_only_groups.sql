-- Só adultos criam famílias e grupos. "Adulto" não é autodeclarado: é
-- calculado a partir da data de nascimento.
--  - Quem CRIA uma família informa a própria data de nascimento (precisa ter
--    18+ anos, validado na Edge Function signup).
--  - Quem ENTRA numa família existente começa sem data de nascimento (tratado
--    como criança) até o administrador da família preencher essa informação
--    pelo painel — só então a conta passa a poder criar grupos.

alter table public.profiles
  add column birth_date date,
  add column is_adult boolean not null default false;

create or replace function public.compute_is_adult()
returns trigger
language plpgsql
as $$
begin
  new.is_adult := new.birth_date is not null and new.birth_date <= (current_date - interval '18 years');
  return new;
end;
$$;

create trigger trg_compute_is_adult
  before insert or update of birth_date on public.profiles
  for each row execute function public.compute_is_adult();

-- Administrador pode definir a data de nascimento de um membro da própria família.
create policy "profiles: admin sets birth date of family member"
  on public.profiles for update
  to authenticated
  using (
    family_id is not null
    and family_id = (select p.family_id from public.profiles p where p.id = auth.uid())
    and exists (
      select 1 from public.profiles ap
      where ap.id = auth.uid() and ap.family_role = 'admin' and ap.family_id = profiles.family_id
    )
  );

-- Lista completa da própria família (aprovados e pendentes) — só para administradores.
create or replace function public.get_family_members()
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  birth_date date,
  is_adult boolean,
  family_role text,
  approval_status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select pr.id, pr.display_name, pr.avatar_url, pr.birth_date, pr.is_adult, pr.family_role, pr.approval_status, pr.created_at
  from public.profiles pr
  where pr.family_id = (select p.family_id from public.profiles p where p.id = auth.uid())
    and exists (
      select 1 from public.profiles admin_p
      where admin_p.id = auth.uid()
        and admin_p.family_role = 'admin'
        and admin_p.family_id = pr.family_id
    )
  order by pr.created_at asc;
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
  if not exists (select 1 from public.profiles where id = auth.uid() and is_adult = true) then
    raise exception 'Somente adultos podem criar grupos.';
  end if;

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
