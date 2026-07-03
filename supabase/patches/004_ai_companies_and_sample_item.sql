-- Patch 004: AI companies/personas, RLS for AI bidding, and a sample item + live round

-- AI companies don't have a real human founder, so allow null founder_id
alter table public.companies alter column founder_id drop not null;

-- ---------------------------------------------------------
-- Create 3 AI companies + their personas
-- ---------------------------------------------------------
insert into public.companies (name, founder_id, sector_focus, treasury_balance, power_score, tier, member_cap)
values
  ('The Connoisseur Syndicate', null, 'mixed', 80000, 0, 'silver', 1),
  ('Aggressor Holdings AI', null, 'mixed', 100000, 0, 'silver', 1),
  ('Opportunist Capital AI', null, 'mixed', 60000, 0, 'bronze', 1);

insert into public.ai_personas (company_id, persona_name, aggression_factor, walkaway_multiplier, category_bias)
select id, 'The Connoisseur', 0.15, 1.3, '{"painting": 1.5, "antique": 1.4}'::jsonb
from public.companies where name = 'The Connoisseur Syndicate';

insert into public.ai_personas (company_id, persona_name, aggression_factor, walkaway_multiplier, category_bias)
select id, 'The Aggressor', 0.35, 1.8, '{"metal": 1.3, "collectible": 1.3}'::jsonb
from public.companies where name = 'Aggressor Holdings AI';

insert into public.ai_personas (company_id, persona_name, aggression_factor, walkaway_multiplier, category_bias)
select id, 'The Opportunist', 0.25, 1.2, '{"vastu": 1.4, "collectible": 1.2}'::jsonb
from public.companies where name = 'Opportunist Capital AI';

-- ---------------------------------------------------------
-- Allow AI bids to be inserted (not tied to a logged-in user)
-- ---------------------------------------------------------
create policy "ai can bid" on public.bids
  for insert with check (is_ai = true);

-- ---------------------------------------------------------
-- One sample rare item + a live bidding round for testing
-- ---------------------------------------------------------
insert into public.items (name, category, description, rarity_score, base_valuation)
values (
  'The Meerut Miniature — Mughal Court Scene',
  'painting',
  'A rare 18th-century Mughal-style miniature painting depicting a royal court scene, hand-painted with natural pigments and gold leaf detailing.',
  82,
  10000
);

insert into public.bidding_rounds (item_id, status, starts_at, ends_at)
select id, 'live', now(), now() + interval '15 minutes'
from public.items where name = 'The Meerut Miniature — Mughal Court Scene';
