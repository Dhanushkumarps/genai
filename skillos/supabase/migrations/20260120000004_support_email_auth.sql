-- Add email to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;

-- Update trigger function to handle email
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, full_name, phone, email)
  values (
    new.id, 
    new.raw_user_meta_data ->> 'full_name', 
    new.phone,
    new.email
  );
  return new;
end;
$$;
