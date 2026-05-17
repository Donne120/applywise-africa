-- ApplyWise Africa — Plan-gating add-on schema
-- ────────────────────────────────────────────────────────────────────
-- Run AFTER docs/supabase-schema.sql and docs/supabase-schema-payments.sql.
-- Adds plan + usage tracking to student_profiles.
-- Safe to re-run.
-- ────────────────────────────────────────────────────────────────────

alter table public.student_profiles
  add column if not exists current_plan text default 'Free',
  add column if not exists essays_used_this_period   integer default 0,
  add column if not exists letters_used_this_period  integer default 0,
  -- Start of the current monthly billing window. App logic resets counters
  -- when the current month/year > the month/year of this timestamp.
  add column if not exists usage_period_started timestamptz default now();

-- ────────────────────────────────────────────────────────────────────
-- DONE. The student_profiles table now has 4 new columns:
--   current_plan ('Free' | 'Starter' | 'Pro' | 'Premium')
--   essays_used_this_period (integer)
--   letters_used_this_period (integer)
--   usage_period_started (timestamptz)
-- ────────────────────────────────────────────────────────────────────
