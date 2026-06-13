create table if not exists public.playbook_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'landing-playbooks',
  user_agent text,
  created_at timestamptz not null default now()
);

create unique index if not exists playbook_subscribers_email_lower_idx
  on public.playbook_subscribers (lower(email));

alter table public.playbook_subscribers enable row level security;

create policy "Anyone can subscribe to playbooks"
  on public.playbook_subscribers
  for insert
  to anon, authenticated
  with check (true);

create policy "Admins can view playbook subscribers"
  on public.playbook_subscribers
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can delete playbook subscribers"
  on public.playbook_subscribers
  for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role));