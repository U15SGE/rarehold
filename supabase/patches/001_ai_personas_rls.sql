-- Patch: enable RLS on ai_personas (missed in initial schema)
alter table public.ai_personas enable row level security;

create policy "public read ai_personas" on public.ai_personas
  for select using (true);
