-- Run this in Supabase Dashboard → SQL Editor (or via Supabase CLI) to create the merchants table.
-- Merchants table: one row per tenant (e.g. id = 'default'). Paid plan unlocks extra settings and removes queue limit.
create table if not exists public.merchants (
  id text primary key,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  business_name text,
  business_tagline text,
  logo_url text,
  colour_background text,
  colour_waiting text,
  colour_ready text,
  message_queue text,
  message_ready text,
  message_thankyou text,
  close_btn_text text,
  close_btn_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Optional: ensure default merchant exists (run after first deploy or manually)
-- insert into public.merchants (id, plan) values ('default', 'free') on conflict (id) do nothing;

alter table public.merchants enable row level security;

create policy "Allow read merchants" on public.merchants for select using (true);
create policy "Allow update merchants" on public.merchants for update using (true);
create policy "Allow insert merchants" on public.merchants for insert with check (true);
