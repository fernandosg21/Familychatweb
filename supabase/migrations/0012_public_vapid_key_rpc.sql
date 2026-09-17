-- O cliente lia a chave pública VAPID de uma variável de ambiente do Vercel
-- (NEXT_PUBLIC_VAPID_PUBLIC_KEY) separada da chave que o servidor usa para
-- assinar os pushes (lida do Vault). Se as duas divergirem — por exemplo, a
-- variável do Vercel foi copiada de uma geração antiga do par de chaves —
-- o push é aceito pelo serviço (FCM/APNs) mas o navegador nunca exibe a
-- notificação, porque a assinatura não bate com a chave usada na inscrição.
-- Esta function deixa a chave pública (que é pública por natureza, sem
-- problema em expor) vir sempre da mesma fonte que o servidor usa.

create or replace function public.get_vapid_public_key()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key';
$$;

revoke all on function public.get_vapid_public_key() from public;
grant execute on function public.get_vapid_public_key() to anon, authenticated;
