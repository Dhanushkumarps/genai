-- Enable pgvector extension
create extension if not exists vector;

-- 1. Create users table
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  full_name text,
  created_at timestamp with time zone default now()
);

-- 2. Create tasks table
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  difficulty integer check (difficulty >= 1 and difficulty <= 10),
  status text default 'pending' check (status in ('pending', 'active', 'completed')),
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone
);

-- 3. Create learning_logs table
create table public.learning_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  tags text[] default '{}',
  embedding vector(1536),
  created_at timestamp with time zone default now()
);

-- 4. Create system_stats table
create table public.system_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  cognitive_load integer check (cognitive_load >= 0 and cognitive_load <= 100),
  energy_level integer check (energy_level >= 0 and energy_level <= 100),
  created_at timestamp with time zone default now()
);

-- 5. Create brain_dumps table
create table public.brain_dumps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  type text check (type in ('stress', 'thoughts', 'worries')),
  created_at timestamp with time zone default now()
);

-- ROW LEVEL SECURITY

-- Enable RLS
alter table public.users enable row level security;
alter table public.tasks enable row level security;
alter table public.learning_logs enable row level security;
alter table public.system_stats enable row level security;
alter table public.brain_dumps enable row level security;

-- Policies for users
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Policies for tasks
create policy "Users can view their own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- Policies for learning_logs
create policy "Users can view their own learning logs"
  on public.learning_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own learning logs"
  on public.learning_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own learning logs"
  on public.learning_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete their own learning logs"
  on public.learning_logs for delete
  using (auth.uid() = user_id);

-- Policies for system_stats
create policy "Users can view their own system stats"
  on public.system_stats for select
  using (auth.uid() = user_id);

create policy "Users can insert their own system stats"
  on public.system_stats for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own system stats"
  on public.system_stats for update
  using (auth.uid() = user_id);

create policy "Users can delete their own system stats"
  on public.system_stats for delete
  using (auth.uid() = user_id);

-- Policies for brain_dumps
create policy "Users can view their own brain dumps"
  on public.brain_dumps for select
  using (auth.uid() = user_id);

create policy "Users can insert their own brain dumps"
  on public.brain_dumps for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own brain dumps"
  on public.brain_dumps for update
  using (auth.uid() = user_id);

create policy "Users can delete their own brain dumps"
  on public.brain_dumps for delete
  using (auth.uid() = user_id);

-- INDEXES

create index tasks_user_id_status_idx on public.tasks (user_id, status);
create index learning_logs_user_id_created_at_idx on public.learning_logs (user_id, created_at desc);
create index system_stats_user_id_created_at_idx on public.system_stats (user_id, created_at desc);
