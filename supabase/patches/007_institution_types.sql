-- Patch 007: Institution types.
-- "Trading" institutions play the bidding-war game (need treasury/stake).
-- "Verifying" institutions are real-world experts/organizations (museums,
-- research bodies) who register purely to submit classification
-- assessments, lending real-world credibility to the verification record.
-- They do not need a treasury or founding fee.

alter table public.companies add column if not exists institution_type text not null default 'trading'
  check (institution_type in ('trading', 'verifying'));

alter table public.companies add column if not exists affiliation text;
