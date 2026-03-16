-- Create a table to track user system stats (cognitive load, energy)
create table if not exists public.system_stats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  cognitive_load int default 0,
  energy_level int default 100,
  last_updated timestamptz default now()
);

-- Enable RLS
alter table public.system_stats enable row level security;

-- Create policies
create policy "Users can view their own stats"
  on public.system_stats for select
  using (auth.uid() = user_id);

create policy "Users can update their own stats"
  on public.system_stats for update
  using (auth.uid() = user_id);

create policy "Users can insert their own stats"
  on public.system_stats for insert
  with check (auth.uid() = user_id);

-- Create a function to initialize stats for new users
create or replace function public.handle_new_user_stats()
returns trigger as $$
begin
  insert into public.system_stats (user_id, cognitive_load, energy_level)
  values (new.id, 0, 100);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user stats (hook onto the existing users table trigger if possible, or auth.users)
-- Since we already have a trigger on auth.users -> public.users, we can either add to that function or create a new trigger on public.users
create trigger on_user_created_stats
  after insert on public.users
  for each row execute procedure public.handle_new_user_stats();
