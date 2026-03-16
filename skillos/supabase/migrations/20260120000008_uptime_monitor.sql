-- Create table for work sessions
create table if not exists public.work_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  active_minutes int default 0,
  is_completed boolean default false
);

-- Create table for break logs
create table if not exists public.break_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  session_id uuid references public.work_sessions(id),
  break_type text not null, -- 'micro', 'short', 'long'
  status text not null, -- 'taken', 'snoozed', 'skipped'
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.work_sessions enable row level security;
alter table public.break_logs enable row level security;

-- Policies for work_sessions
create policy "Users can view their own work sessions"
  on public.work_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own work sessions"
  on public.work_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own work sessions"
  on public.work_sessions for update
  using (auth.uid() = user_id);

-- Policies for break_logs
create policy "Users can view their own break logs"
  on public.break_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own break logs"
  on public.break_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own break logs"
  on public.break_logs for update
  using (auth.uid() = user_id);
