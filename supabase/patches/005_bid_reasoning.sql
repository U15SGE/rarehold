-- Patch 005: Add a short human-readable reasoning string to bids,
-- so AI bids can display *why* they bid (adds an "intelligence" feel
-- without needing a full reasoning engine).

alter table public.bids add column if not exists reasoning text;
