-- Dispara a Edge Function "send-push" a cada nova mensagem, usando pg_net.
-- As credenciais (URL do projeto e service role key) ficam no Vault do Supabase,
-- configuradas fora do controle de versão com:
--   select vault.create_secret('https://SEU_PROJETO.supabase.co', 'project_url');
--   select vault.create_secret('SUA_SERVICE_ROLE_KEY', 'service_role_key');

create extension if not exists "supabase_vault";

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_url text;
  v_service_key text;
begin
  select decrypted_secret into v_project_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_service_key from vault.decrypted_secrets where name = 'service_role_key';

  if v_project_url is null or v_service_key is null then
    return new;
  end if;

  perform net.http_post(
    url := v_project_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('message_id', new.id)
  );

  return new;
end;
$$;

create trigger trg_notify_new_message
  after insert on public.messages
  for each row execute function public.notify_new_message();
