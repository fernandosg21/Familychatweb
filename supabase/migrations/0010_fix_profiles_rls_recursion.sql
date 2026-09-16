-- As policies de "profiles" comparavam family_id com uma subquery que também
-- lê "profiles". O Postgres reaplica as policies dessa mesma tabela dentro da
-- subquery, o que gera recursão infinita (42P17) em qualquer SELECT/UPDATE em
-- profiles. Isolando a leitura do próprio family_id numa function
-- SECURITY DEFINER (roda como dono da tabela, sem reaplicar RLS) quebra o ciclo.

create or replace function public.my_family_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select family_id from public.profiles where id = auth.uid();
$$;

drop policy if exists "profiles: family can view" on public.profiles;
create policy "profiles: family can view" on public.profiles
for select
using (
  id = auth.uid()
  or (approval_status = 'approved' and family_id is not null and family_id = public.my_family_id())
);

drop policy if exists "profiles: admin sets birth date of family member" on public.profiles;
create policy "profiles: admin sets birth date of family member" on public.profiles
for update
using (
  family_id is not null
  and family_id = public.my_family_id()
  and exists (
    select 1 from public.profiles ap
    where ap.id = auth.uid() and ap.family_role = 'admin' and ap.family_id = profiles.family_id
  )
);
