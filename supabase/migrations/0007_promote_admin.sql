-- Administrador pode promover outro adulto aprovado a administrador (ou
-- rebaixar de volta a membro comum).

create or replace function public.set_family_role(p_member_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_family_id uuid;
begin
  if p_role not in ('admin', 'member') then
    raise exception 'Papel inválido.';
  end if;

  if p_member_id = auth.uid() then
    raise exception 'Não é possível alterar seu próprio papel.';
  end if;

  select family_id into v_my_family_id from public.profiles where id = auth.uid() and family_role = 'admin';

  if v_my_family_id is null then
    raise exception 'Somente administradores podem fazer isso.';
  end if;

  update public.profiles
  set family_role = p_role
  where id = p_member_id
    and family_id = v_my_family_id
    and is_adult = true
    and approval_status = 'approved';
end;
$$;
