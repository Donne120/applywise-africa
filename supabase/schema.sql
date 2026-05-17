-- ============================================================
-- ApplyWise Africa — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Users / Profiles ─────────────────────────────────────────
create table if not exists student_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  academic_background text default '',
  education_level text default '',
  intended_degree_level text default 'Master''s',
  work_experience text default '',
  projects text default '',
  achievements text default '',
  challenges text default '',
  career_goals text default '',
  target_countries text default '',
  preferred_programs text default '',
  personal_story_notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- ── Scholarships ──────────────────────────────────────────────
create table if not exists scholarships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
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

-- ── Tasks ─────────────────────────────────────────────────────
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  category text default 'Documents',
  status text default 'Pending',
  scholarship_id uuid references scholarships(id) on delete set null,
  scholarship_name text default '',
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Learning Resources ────────────────────────────────────────
create table if not exists learning_resources (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
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

-- ── Writing Documents ─────────────────────────────────────────
create table if not exists writing_documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  writing_type text not null,
  target_country text default '',
  target_university text default '',
  target_program text default '',
  degree_level text default 'Master''s',
  scholarship_name text default '',
  word_limit integer default 0,
  deadline date,
  tone text default 'Natural',
  output_style text default 'Structured Essay',
  formatting_style text default 'Structured Essay',
  paragraph_length text default 'Medium',
  country_style text default 'Other',
  raw_input text default '',
  follow_up_questions jsonb default '[]',
  user_answers jsonb default '[]',
  profile_summary text default '',
  story_angle text default '',
  outline text default '',
  final_writing text default '',
  quality_scores jsonb,
  improvement_checklist jsonb default '[]',
  status text default 'Draft',
  linked_scholarship_id uuid references scholarships(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Payments ──────────────────────────────────────────────────
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  plan_name text not null,
  amount numeric default 0,
  currency text default 'RWF',
  payment_method text default '',
  transaction_reference text default '',
  screenshot_url text default '',
  status text default 'Pending',
  credits_added integer default 0,
  admin_note text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── User Credits / Plan ───────────────────────────────────────
create table if not exists user_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique,
  plan_name text default 'Free',
  writing_credits integer default 1,
  updated_at timestamptz default now()
);

-- ── Row Level Security ─────────────────────────────────────────
alter table student_profiles enable row level security;
alter table scholarships enable row level security;
alter table tasks enable row level security;
alter table learning_resources enable row level security;
alter table writing_documents enable row level security;
alter table payments enable row level security;
alter table user_plans enable row level security;

-- Policies: users can only see/edit their own data
create policy "own data" on student_profiles for all using (auth.uid() = user_id);
create policy "own data" on scholarships for all using (auth.uid() = user_id);
create policy "own data" on tasks for all using (auth.uid() = user_id);
create policy "own data" on learning_resources for all using (auth.uid() = user_id);
create policy "own data" on writing_documents for all using (auth.uid() = user_id);
create policy "own data" on payments for all using (auth.uid() = user_id);
create policy "own data" on user_plans for all using (auth.uid() = user_id);

-- ── Storage Buckets ───────────────────────────────────────────
-- Run these in Supabase Dashboard → Storage, or via SQL:
insert into storage.buckets (id, name, public) values
  ('payment-screenshots', 'payment-screenshots', false),
  ('writing-documents', 'writing-documents', false)
on conflict (id) do nothing;

-- Storage policies
create policy "user can upload payment screenshot"
  on storage.objects for insert
  with check (bucket_id = 'payment-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "user can view own payment screenshot"
  on storage.objects for select
  using (bucket_id = 'payment-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "user can upload writing doc"
  on storage.objects for insert
  with check (bucket_id = 'writing-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "user can view own writing doc"
  on storage.objects for select
  using (bucket_id = 'writing-documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- ── Updated_at triggers ────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on student_profiles for each row execute function update_updated_at();
create trigger set_updated_at before update on scholarships for each row execute function update_updated_at();
create trigger set_updated_at before update on tasks for each row execute function update_updated_at();
create trigger set_updated_at before update on learning_resources for each row execute function update_updated_at();
create trigger set_updated_at before update on writing_documents for each row execute function update_updated_at();
create trigger set_updated_at before update on payments for each row execute function update_updated_at();
create trigger set_updated_at before update on user_plans for each row execute function update_updated_at();
