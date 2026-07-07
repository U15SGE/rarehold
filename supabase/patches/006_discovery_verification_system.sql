-- Patch 006: Discovery & Verification System
-- Items are mysteries at creation — their true era and authenticity are
-- hidden. AI institutions and human companies independently classify
-- them. Being first to correctly identify the truth earns Discovery Score.

alter table public.items add column if not exists true_era text;
alter table public.items add column if not exists true_authenticity text default 'Unverified';
alter table public.items add column if not exists era_estimate text;
alter table public.items add column if not exists authenticity_status text default 'Unverified';

alter table public.companies add column if not exists discovery_score integer not null default 0;

create table if not exists public.item_classifications (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references public.items(id) on delete cascade not null,
  company_id uuid references public.companies(id),
  submitted_by uuid references public.profiles(id),
  is_ai boolean not null default false,
  era_guess text not null,
  authenticity_guess text not null,
  reasoning text,
  is_correct boolean,
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  unique (item_id, company_id)
);

alter table public.item_classifications enable row level security;

create policy "public read classifications" on public.item_classifications
  for select using (true);

create policy "members submit classification" on public.item_classifications
  for insert with check (
    is_ai = true
    or exists (
      select 1 from public.company_members cm
      where cm.company_id = item_classifications.company_id
      and cm.user_id = auth.uid()
    )
  );

-- Seed ground truth + AI institution assessments for the existing sample item
update public.items
set true_era = '1700-1850', true_authenticity = 'Genuine'
where name = 'The Meerut Miniature — Mughal Court Scene';

insert into public.item_classifications (item_id, company_id, is_ai, era_guess, authenticity_guess, reasoning, is_correct)
select
  i.id,
  ap.company_id,
  true,
  case ap.persona_name
    when 'The Connoisseur' then '1700-1850'
    when 'The Aggressor' then '1850-1950'
    when 'The Opportunist' then '1700-1850'
  end,
  case ap.persona_name
    when 'The Connoisseur' then 'Genuine'
    when 'The Aggressor' then 'Genuine'
    when 'The Opportunist' then 'Disputed'
  end,
  case ap.persona_name
    when 'The Connoisseur' then 'Pigment composition and gold leaf technique are consistent with Mughal court workshops of this period.'
    when 'The Aggressor' then 'Stylistic elements suggest a later production, though craftsmanship quality is high.'
    when 'The Opportunist' then 'Insufficient provenance documentation to rule out a skilled later reproduction.'
  end,
  case ap.persona_name
    when 'The Connoisseur' then true
    when 'The Aggressor' then false
    when 'The Opportunist' then false
  end
from public.ai_personas ap, public.items i
where i.name = 'The Meerut Miniature — Mughal Court Scene';
