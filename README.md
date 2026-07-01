# Rarehold

**"Where Rarity Competes."**

A guild-based strategy game where human-formed **Companies** pool virtual currency (**Karat**) and compete — against each other and against **AI Companies** — in real-time bidding wars to claim digitally-represented rare assets (paintings, antiques, metals, collectibles).

> ⚠️ **Important:** Karat is a virtual, non-withdrawable in-game currency. This is a strategy/simulation game, not an investment or gambling platform. Currency only flows one way (purchasable with real money in future monetization, never redeemable back to real money).

---

## Core Mechanics (v0.1)

1. **Users** sign up and get 10,000 Karat starter balance.
2. Users **found or join a Company**. Joining costs nothing; founding costs 2,000 Karat (anti-spam).
3. Members contribute Karat to the company's shared **treasury**. Their `stake_percent` is recalculated proportionally to lifetime contribution — exactly like startup equity.
4. When a rare **Item** goes live for auction, a **Bidding Round** opens with a countdown timer.
5. Human companies bid via authorized members. **AI Companies** (personas: The Connoisseur, The Aggressor, The Opportunist) bid automatically via a server-side Edge Function using a transparent formula (rarity + category history + randomized aggression, with a hard walk-away threshold).
6. All bids are broadcast in **real time** via Supabase Realtime — everyone spectates live.
7. Winning company's treasury is debited, item is added to their portfolio, and their **Power Score** (treasury 30% + portfolio 40% + win rate 20% + activity 10%) updates, which determines their tier (Bronze → Silver → Gold → Legendary).
8. **Anti-whale safeguards**: max 40% of treasury per single bid, max 25% voting weight per member.
9. **Exit payout**: a member leaving a company is paid out based on their stake in the company's *current* valuation, not their original contribution — gains and losses are shared fairly.

Full design rationale is in the project conversation history — see `/docs/design-notes.md` (add as needed).

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + TailwindCSS
- **Backend:** Supabase (Postgres + Auth + Realtime + Edge Functions)
- **Hosting:** Vercel (frontend) + Supabase Cloud (backend)

---

## Project Structure

```
rarehold/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── company/create/page.tsx  # Company founding flow
│   ├── company/[id]/page.tsx    # Company dashboard (TODO)
│   ├── bidding/[roundId]/page.tsx  # Live bidding room (realtime)
│   └── api/                     # Route handlers (TODO: expand)
├── lib/
│   ├── supabaseClient.ts        # Supabase client init
│   └── companyMath.ts           # Stake %, power score, bid caps, exit payout logic
├── supabase/
│   ├── schema.sql               # Full DB schema + RLS policies
│   └── functions/ai-bid/        # AI bidding Edge Function
├── .env.example
└── package.json
```

---

## Setup

1. **Create a Supabase project** at https://supabase.com
2. Run `supabase/schema.sql` in the Supabase SQL Editor to create all tables, indexes, and RLS policies.
3. Copy `.env.example` to `.env.local` and fill in your Supabase URL + anon key.
4. Deploy the AI bidding function:
   ```bash
   supabase functions deploy ai-bid
   ```
5. Set up a cron job (Supabase Cron or `pg_cron`) to invoke `ai-bid` every ~5-10 seconds for each `live` round.
6. Install dependencies and run locally:
   ```bash
   npm install
   npm run dev
   ```
7. Deploy frontend to Vercel — connect this repo, add the same env vars in Vercel's dashboard.

---

## What's Built (MVP v0.1)

- [x] Database schema (users, companies, members, treasury ledger, items, bidding rounds, bids, AI personas, governance votes)
- [x] Row Level Security policies (public read for transparency, restricted writes)
- [x] Company creation flow (with founding fee + initial stake)
- [x] Live bidding room UI with Supabase Realtime subscription
- [x] AI bidding Edge Function (formula-based, transparent, with walk-away logic)
- [x] Core fairness math library (stake calculation, power score, anti-whale caps, exit payouts)

## What's Next (Roadmap)

- [ ] Company join flow + dashboard (treasury, members, portfolio, power score display)
- [ ] Internal governance voting UI (proposing max bid, member voting)
- [ ] Item catalog + admin panel for adding new rare items
- [ ] Cron scheduling for AI bidding + round lifecycle (auto-close rounds, settle winners)
- [ ] Leaderboards (companies, top contributors, top strategists)
- [ ] Achievements/titles system
- [ ] Secondary market (companies trading owned items with each other)
- [ ] Karat purchase flow (real-money → Karat, one-way monetization)

---

## Legal Note

This platform is designed as a **skill/strategy game with virtual currency only** — no real-money investment, withdrawal, or profit-sharing occurs. This design choice was made specifically to avoid classification as a Collective Investment Scheme (SEBI) or a betting/gambling product under Indian law. If a real-money fractional-ownership version is built in the future, it must be a **separate legal entity** with proper securities/AIF structuring and legal counsel — see project discussion notes.
