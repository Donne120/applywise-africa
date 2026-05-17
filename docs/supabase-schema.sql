-- ApplyWise Africa — Supabase schema
-- ────────────────────────────────────────────────────────────────────
-- Paste this entire file into the Supabase SQL Editor and run it.
-- Safe to run multiple times — every CREATE uses IF NOT EXISTS and
-- every policy is wrapped in a guard.
--
-- This sets up:
--   • All tables: profiles, scholarships, tasks, stories, recommenders,
--     retrospectives, writing_documents, learning_resources,
--     payments, retrospectives
--   • Row-Level Security so users can only see their own data
--   • Indices on user_id for every table (fast queries)
-- ────────────────────────────────────────────────────────────────────

-- ── Helper: keep updated_at fresh ─────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── Student Profile ───────────────────────────────────────────────
create table if not exists public.student_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  country_of_origin text default '',
  field_category text default 'STEM',
  field_specific text default '',
  education_level text default '',
  intended_degree_level text default 'Master''s',
  current_gpa text default 'Strong (B+ / 3.3+)',
  english_level text default 'Advanced',
  target_countries text default '',
  preferred_programs text default '',
  academic_background text default '',
  work_experience text default '',
  projects text default '',
  achievements text default '',
  challenges text default '',
  career_goals text default '',
  personal_story_notes text default '',
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_updated_at_profiles on public.student_profiles;
create trigger set_updated_at_profiles before update on public.student_profiles
  for each row execute procedure public.set_updated_at();

-- ── Scholarships ──────────────────────────────────────────────────
create table if not exists public.scholarships (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  institution text default '',
  country text default '',
  country_code text default '',
  focus_area text default '',
  status text default 'Not Started',
  priority text default 'Medium',
  funding text default '',
  funding_type text default 'Fully Funded',
  deadline date,
  days_left integer,
  is_past_due boolean default false,
  eligibility_confirmed boolean default false,
  requirements text default '',
  notes text default '',
  url text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists scholarships_user_id_idx on public.scholarships(user_id);

drop trigger if exists set_updated_at_scholarships on public.scholarships;
create trigger set_updated_at_scholarships before update on public.scholarships
  for each row execute procedure public.set_updated_at();

-- ── Tasks ─────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text default 'Documents',
  status text default 'Pending',
  scholarship_id text default '',
  scholarship_name text default '',
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists tasks_user_id_idx on public.tasks(user_id);

drop trigger if exists set_updated_at_tasks on public.tasks;
create trigger set_updated_at_tasks before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- ── Stories (Story Vault) ─────────────────────────────────────────
create table if not exists public.stories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text default '',
  themes text[] default array[]::text[],
  emotion integer default 3,
  when_it_happened text default '',
  why_it_matters text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists stories_user_id_idx on public.stories(user_id);

drop trigger if exists set_updated_at_stories on public.stories;
create trigger set_updated_at_stories before update on public.stories
  for each row execute procedure public.set_updated_at();

-- ── Recommenders ──────────────────────────────────────────────────
create table if not exists public.recommenders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text default '',
  relation text default 'Professor',
  organization text default '',
  years_known integer default 0,
  strengths_they_saw_in_you text default '',
  draft_letter text default '',
  status text default 'Not asked',
  linked_scholarship_ids text[] default array[]::text[],
  last_nudged_at timestamptz,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists recommenders_user_id_idx on public.recommenders(user_id);

drop trigger if exists set_updated_at_recommenders on public.recommenders;
create trigger set_updated_at_recommenders before update on public.recommenders
  for each row execute procedure public.set_updated_at();

-- ── Retrospectives ────────────────────────────────────────────────
create table if not exists public.retrospectives (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  scholarship_id text not null,
  feedback_received text default '',
  what_you_would_change text default '',
  emotional_note text default '',
  created_at timestamptz default now()
);
create index if not exists retros_user_id_idx on public.retrospectives(user_id);

-- ── Learning Resources ────────────────────────────────────────────
create table if not exists public.learning_resources (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  provider text default '',
  status text default 'Not Started',
  level text default 'Intermediate',
  duration text default '',
  cost text default 'Free',
  topic text default '',
  url text default '',
  emoji text default '📚',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists learning_user_id_idx on public.learning_resources(user_id);

drop trigger if exists set_updated_at_learning on public.learning_resources;
create trigger set_updated_at_learning before update on public.learning_resources
  for each row execute procedure public.set_updated_at();

-- ── Writing Documents (Studio drafts) ─────────────────────────────
create table if not exists public.writing_documents (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default '',
  writing_type text default '',
  target_country text default '',
  target_university text default '',
  target_program text default '',
  degree_level text default '',
  scholarship_name text default '',
  word_limit integer default 0,
  deadline date,
  tone text default 'Natural',
  output_style text default 'Structured Essay',
  formatting_style text default 'Structured Essay',
  paragraph_length text default 'Medium',
  country_style text default 'Other',
  raw_input text default '',
  follow_up_questions text[] default array[]::text[],
  user_answers text[] default array[]::text[],
  profile_summary text default '',
  story_angle text default '',
  outline text default '',
  final_writing text default '',
  quality_scores jsonb,
  improvement_checklist text[] default array[]::text[],
  status text default 'Draft',
  linked_scholarship_id text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists writing_user_id_idx on public.writing_documents(user_id);

drop trigger if exists set_updated_at_writing on public.writing_documents;
create trigger set_updated_at_writing before update on public.writing_documents
  for each row execute procedure public.set_updated_at();

-- ── Payments ──────────────────────────────────────────────────────
create table if not exists public.payments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_name text not null,
  amount numeric default 0,
  currency text default 'USD',
  payment_method text default '',
  transaction_reference text default '',
  screenshot_url text default '',
  status text default 'Pending',
  credits_added integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists payments_user_id_idx on public.payments(user_id);

drop trigger if exists set_updated_at_payments on public.payments;
create trigger set_updated_at_payments before update on public.payments
  for each row execute procedure public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- Every table: users only see/edit their own rows.
-- ────────────────────────────────────────────────────────────────────

alter table public.student_profiles  enable row level security;
alter table public.scholarships      enable row level security;
alter table public.tasks             enable row level security;
alter table public.stories           enable row level security;
alter table public.recommenders      enable row level security;
alter table public.retrospectives    enable row level security;
alter table public.learning_resources enable row level security;
alter table public.writing_documents enable row level security;
alter table public.payments          enable row level security;

-- Helper: drop-and-create policies idempotently
do $$
declare
  t text;
  tables text[] := array[
    'student_profiles', 'scholarships', 'tasks', 'stories', 'recommenders',
    'retrospectives', 'learning_resources', 'writing_documents', 'payments'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);

    execute format('create policy "own rows select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('create policy "own rows insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "own rows update" on public.%I for update using (auth.uid() = user_id)', t);
    execute format('create policy "own rows delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end$$;

-- ────────────────────────────────────────────────────────────────────
-- DONE. You should now see 9 tables in the Database → Tables view,
-- and RLS enabled on every one of them.
-- ────────────────────────────────────────────────────────────────────
