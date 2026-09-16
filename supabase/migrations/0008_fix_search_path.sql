-- Corrige o aviso de segurança "Function Search Path Mutable" do linter do Supabase.
create or replace function public.compute_is_adult()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.is_adult := new.birth_date is not null and new.birth_date <= (current_date - interval '18 years');
  return new;
end;
$$;
