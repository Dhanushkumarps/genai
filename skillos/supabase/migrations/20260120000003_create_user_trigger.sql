-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.phone);
  return new;
end;
$$;

-- Trigger to call the function on insert
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill existing users (Optional but recommended for dev)
insert into public.users (id, full_name, phone)
select id, raw_user_meta_data ->> 'full_name', phone
from auth.users
on conflict (id) do nothing;
