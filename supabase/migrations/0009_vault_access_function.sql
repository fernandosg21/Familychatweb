-- O schema "vault" não é exposto pela API REST (PostgREST), então chamadas
-- como `admin.schema('vault').from('decrypted_secrets')` dentro de Edge
-- Functions (que usam supabase-js sobre a REST API) sempre falham
-- silenciosamente. Esta função SECURITY DEFINER expõe só a leitura pontual
-- de um segredo pelo nome, via RPC (que já é exposto), restrita à service_role.

create or replace function public.get_app_secret(secret_name text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name;
$$;

revoke all on function public.get_app_secret(text) from public;
revoke all on function public.get_app_secret(text) from anon;
revoke all on function public.get_app_secret(text) from authenticated;
grant execute on function public.get_app_secret(text) to service_role;
