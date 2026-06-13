-- Public bucket for files attached in the AI chat
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

-- Authenticated users can upload to their own folder; public read so AI/edge can fetch.
create policy "chat-attachments authenticated upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chat-attachments public read"
  on storage.objects for select to public
  using (bucket_id = 'chat-attachments');

create policy "chat-attachments owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'chat-attachments' and (storage.foldername(name))[1] = auth.uid()::text);