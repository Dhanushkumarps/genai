-- Create table for logging panic events
create table if not exists public.panic_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  trigger_score int not null,
  trigger_details jsonb, -- Store breakdown of why it triggered
  started_at timestamptz default now(),
  resolved_at timestamptz
);

-- Enable RLS
alter table public.panic_events enable row level security;

-- Policies
create policy "Users can view their own panic events"
  on public.panic_events for select
  using (auth.uid() = user_id);

create policy "Users can insert their own panic events"
  on public.panic_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own panic events"
  on public.panic_events for update
  using (auth.uid() = user_id);

-- Add columns to system_stats if they don't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'system_stats' and column_name = 'last_panic_at') then
    alter table public.system_stats add column last_panic_at timestamptz;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'system_stats' and column_name = 'session_started_at') then
    alter table public.system_stats add column session_started_at timestamptz default now();
  end if;
end $$;
