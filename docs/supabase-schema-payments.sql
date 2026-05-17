-- ApplyWise Africa — Payments add-on schema
-- ────────────────────────────────────────────────────────────────────
-- Run this AFTER docs/supabase-schema.sql. Adds:
--   • payment_settings table (admin-configurable MoMo numbers per country)
--   • payment-screenshots Storage bucket + policies
--   • Note: payments table already exists from the main schema; this
--     just adds a screenshot_path column for cleaner storage references.
-- Safe to re-run.
-- ────────────────────────────────────────────────────────────────────

-- ── payment_settings (singleton-ish: one row, id = 'main') ────────
create table if not exists public.payment_settings (
  id text primary key default 'main',
  -- MTN MoMo numbers per country. Empty string = not configured.
  mtn_rwanda_number  text default '',
  mtn_rwanda_name    text default '',
  mtn_rwanda_active  boolean default false,

  mtn_uganda_number  text default '',
  mtn_uganda_name    text default '',
  mtn_uganda_active  boolean default false,

  mtn_ghana_number   text default '',
  mtn_ghana_name     text default '',
  mtn_ghana_active   boolean default false,

  mtn_cameroon_number text default '',
  mtn_cameroon_name   text default '',
  mtn_cameroon_active boolean default false,

  -- For students whose country isn't listed
  fallback_instructions text default 'Please contact support to arrange payment.',

  updated_at timestamptz default now()
);

-- Seed the singleton row if it doesn't exist
insert into public.payment_settings (id) values ('main') on conflict (id) do nothing;

-- RLS: any authenticated user can read (so checkout works);
-- only admins should write — for now we let any authenticated user write
-- and rely on app-level admin gating. Tighten this when we have admin roles.
alter table public.payment_settings enable row level security;

drop policy if exists "anyone read settings"  on public.payment_settings;
drop policy if exists "auth write settings"   on public.payment_settings;

create policy "anyone read settings" on public.payment_settings
  for select using (true);

create policy "auth write settings" on public.payment_settings
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── Add screenshot_path column to payments (in addition to existing screenshot_url) ──
-- screenshot_path stores the Supabase Storage path so we can serve via signed URLs;
-- screenshot_url is what we display (filled in after upload).
alter table public.payments
  add column if not exists screenshot_path text default '',
  add column if not exists period text default 'monthly',
  add column if not exists country text default '';

-- ── Storage bucket for payment screenshots ─────────────────────────
-- Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('payment-screenshots', 'payment-screenshots', false)
on conflict (id) do nothing;

-- Storage policies: users can upload to their own folder, admins can read all.
-- Folder structure: payment-screenshots/{user_id}/{payment_id}-{filename}
drop policy if exists "own folder upload"  on storage.objects;
drop policy if exists "own folder read"    on storage.objects;
drop policy if exists "own folder update"  on storage.objects;
drop policy if exists "own folder delete"  on storage.objects;

create policy "own folder upload" on storage.objects
  for insert with check (
    bucket_id = 'payment-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own folder read" on storage.objects
  for select using (
    bucket_id = 'payment-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own folder update" on storage.objects
  for update using (
    bucket_id = 'payment-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own folder delete" on storage.objects
  for delete using (
    bucket_id = 'payment-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ────────────────────────────────────────────────────────────────────
-- DONE. You should now see:
--   • A new `payment_settings` table with one row (id='main')
--   • The `payments` table has 3 new columns: screenshot_path, period, country
--   • A new Storage bucket called 'payment-screenshots' (private)
--   • Policies allowing users to upload to their own folder
-- ────────────────────────────────────────────────────────────────────
