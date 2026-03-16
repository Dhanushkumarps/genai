-- 1. Create placement_profiles table
create table public.placement_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_role text not null,
  target_company text,
  current_skills jsonb default '[]',
  skill_gaps jsonb default '[]',
  created_at timestamp with time zone default now()
);

-- 2. Create learning_plans table
create table public.learning_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  profile_id uuid not null references public.placement_profiles(id) on delete cascade,
  plan jsonb not null, -- Structured daily/weekly plan
  status text default 'active' check (status in ('active', 'completed', 'revised')),
  version integer default 1,
  created_at timestamp with time zone default now()
);

-- 3. Create mock_interviews table
create table public.mock_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  profile_id uuid not null references public.placement_profiles(id) on delete cascade,
  role text not null,
  questions jsonb default '[]',
  responses jsonb default '[]',
  score integer check (score >= 0 and score <= 100),
  feedback text,
  areas_to_improve jsonb default '[]',
  created_at timestamp with time zone default now()
);

-- RLS
alter table public.placement_profiles enable row level security;
alter table public.learning_plans enable row level security;
alter table public.mock_interviews enable row level security;

-- Policies
create policy "Users can view their own placement profiles"
  on public.placement_profiles for select using (auth.uid() = user_id);
create policy "Users can insert their own placement profiles"
  on public.placement_profiles for insert with check (auth.uid() = user_id);
create policy "Users can update their own placement profiles"
  on public.placement_profiles for update using (auth.uid() = user_id);

create policy "Users can view their own learning plans"
  on public.learning_plans for select using (auth.uid() = user_id);
create policy "Users can insert their own learning plans"
  on public.learning_plans for insert with check (auth.uid() = user_id);
create policy "Users can update their own learning plans"
  on public.learning_plans for update using (auth.uid() = user_id);

create policy "Users can view their own mock interviews"
  on public.mock_interviews for select using (auth.uid() = user_id);
create policy "Users can insert their own mock interviews"
  on public.mock_interviews for insert with check (auth.uid() = user_id);
create policy "Users can update their own mock interviews"
  on public.mock_interviews for update using (auth.uid() = user_id);
