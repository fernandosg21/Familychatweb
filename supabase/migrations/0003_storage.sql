-- Buckets de storage: avatars (público) e attachments (privado, por conversa).

insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 5242880)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 104857600)
on conflict (id) do nothing;

-- avatars: qualquer autenticado lê; cada usuário só escreve na sua pasta {user_id}/...
create policy "avatars: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "avatars: owner write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- attachments: caminho = {conversation_id}/{message_id}/{arquivo}
-- só participantes da conversa podem ler/enviar.
create policy "attachments: participants read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );

create policy "attachments: participants write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and public.is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );
