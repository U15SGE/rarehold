-- =========================================================
-- RAREHOLD — Core Database Schema
-- Currency unit: "Karat" (virtual, non-withdrawable)
-- =========================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- USERS (extends Supabase auth.users)
-- ---------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  karat_wallet bigint not null default 10000,     -- personal unassigned Karat
  reputation_score int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- COMPANIES
-- ---------------------------------------------------------
create type company_tier as enum ('bronze','silver','gold','legendary');

create table public.companies (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  founder_id uuid references public.profiles(id) not null,
  sector_focus text,                              -- e.g. 'paintings', 'metals', 'mixed'
  treasury_balance bigint not null default 0,
  power_score numeric not null default 0,
  win_count int not null default 0,
  loss_count int not null default 0,
  tier company_tier not null default 'bronze',
  member_cap int not null default 100,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- COMPANY MEMBERS (stake-based ownership)
-- ---------------------------------------------------------
create table public.company_members (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  contributed_karat bigint not null default 0,     -- lifetime contribution (for stake calc)
  stake_percent numeric not null default 0,        -- recalculated on every contribution/exit
  vote_weight_cap numeric not null default 25,     -- max % voting power (anti-whale)
  role text not null default 'member',             -- 'founder' | 'council' | 'member'
  joined_at timestamptz not null default now(),
  unique (company_id, user_id)
);

-- ---------------------------------------------------------
-- TREASURY LEDGER (every in/out movement, for audit + stake recalculation)
-- ---------------------------------------------------------
create table public.treasury_transactions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id),
  type text not null,                              -- 'contribution' | 'exit_payout' | 'bid_lock' | 'bid_refund' | 'win_settlement'
  amount bigint not null,
  balance_after bigint not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- ITEMS (the rare assets — paintings, antiques, metals, collectibles)
-- ---------------------------------------------------------
create type item_category as enum ('painting','antique','collectible','metal','vastu');

create table public.items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category item_category not null,
  description text,
  image_url text,
  rarity_score numeric not null,                   -- 0-100, drives valuation & AI interest
  base_valuation bigint not null,                   -- starting fair-value estimate in Karat
  current_owner_company_id uuid references public.companies(id),
  is_ai_owned boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- AI COMPANIES (bots, treated as special companies)
-- ---------------------------------------------------------
create table public.ai_personas (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id) unique,
  persona_name text not null,                       -- 'The Connoisseur' | 'The Aggressor' | 'The Opportunist'
  aggression_factor numeric not null default 0.2,   -- 0-1 randomized variance weight
  walkaway_multiplier numeric not null default 1.5, -- stops bidding beyond fair_value * this
  category_bias jsonb default '{}'::jsonb           -- per-category performance weighting
);

-- ---------------------------------------------------------
-- BIDDING ROUNDS (one per item auction event)
-- ---------------------------------------------------------
create type round_status as enum ('scheduled','live','closed');

create table public.bidding_rounds (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references public.items(id) not null,
  status round_status not null default 'scheduled',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  winning_company_id uuid references public.companies(id),
  final_price bigint,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- BIDS (live feed, one row per bid event)
-- ---------------------------------------------------------
create table public.bids (
  id uuid primary key default uuid_generate_v4(),
  round_id uuid references public.bidding_rounds(id) on delete cascade,
  company_id uuid references public.companies(id) not null,
  placed_by uuid references public.profiles(id),    -- null if AI
  amount bigint not null,
  is_ai boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- COMPANY VOTES (governance — bid authorization, treasury use %)
-- ---------------------------------------------------------
create table public.company_votes (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id) on delete cascade,
  round_id uuid references public.bidding_rounds(id),
  proposed_by uuid references public.profiles(id),
  proposed_max_bid bigint not null,
  votes_for numeric not null default 0,
  votes_against numeric not null default 0,
  status text not null default 'open',              -- 'open' | 'passed' | 'rejected'
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- INDEXES for realtime + query performance
-- ---------------------------------------------------------
create index idx_bids_round on public.bids(round_id);
create index idx_company_members_company on public.company_members(company_id);
create index idx_treasury_company on public.treasury_transactions(company_id);
create index idx_rounds_status on public.bidding_rounds(status);

-- ---------------------------------------------------------
-- RLS (Row Level Security) — enable on all tables
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.treasury_transactions enable row level security;
alter table public.items enable row level security;
alter table public.bidding_rounds enable row level security;
alter table public.bids enable row level security;
alter table public.company_votes enable row level security;

-- Public read policies (everything is spectate-able for transparency)
create policy "public read profiles" on public.profiles for select using (true);
create policy "public read companies" on public.companies for select using (true);
create policy "public read company_members" on public.company_members for select using (true);
create policy "public read items" on public.items for select using (true);
create policy "public read rounds" on public.bidding_rounds for select using (true);
create policy "public read bids" on public.bids for select using (true);

-- Write policies: only authenticated user can modify their own profile
create policy "user update own profile" on public.profiles for update using (auth.uid() = id);

-- Bids: only company members can insert bids for their own company
create policy "members place bids" on public.bids for insert
  with check (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = bids.company_id and cm.user_id = auth.uid()
    )
  );
