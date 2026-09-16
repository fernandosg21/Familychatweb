-- Dispara a Edge Function "send-push" a cada nova mensagem, usando pg_net.
-- A Edge Function é implantada com verify_jwt=false (é chamada só por este
-- trigger, nunca pelo cliente) e busca as chaves VAPID direto no Vault, então
-- o trigger só precisa saber a URL do projeto — também guardada no Vault:
--   select vault.create_secret('https://SEU_PROJETO.supabase.co', 'project_url');

create extension if not exists "supabase_vault";

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_url text;
begin
  select decrypted_secret into v_project_url from vault.decrypted_secrets where name = 'project_url';

  if v_project_url is null then
    return new;
  end if;

  perform net.http_post(
    url := v_project_url || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('message_id', new.id)
  );

  return new;
end;
$$;

create trigger trg_notify_new_message
  after insert on public.messages
  for each row execute function public.notify_new_message();
