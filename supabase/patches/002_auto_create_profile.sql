-- Patch 002: Auto-create a profile row whenever a new user signs up.
-- Username defaults to the email prefix + a short unique suffix from their user id,
-- so it's always unique without asking the user upfront.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'user') || '_' || substr(new.id::text, 1, 6)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
