// =========================================================
// AI-BID Edge Function
// Runs on an interval (via Supabase Cron / pg_cron trigger)
// while a bidding_round status = 'live'.
// Decides whether each AI persona places a new bid.
// =========================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceKey);

interface AiPersona {
  id: string;
  company_id: string;
  persona_name: string;
  aggression_factor: number;
  walkaway_multiplier: number;
  category_bias: Record<string, number>;
}

Deno.serve(async (req) => {
  const { round_id } = await req.json();

  // 1. Fetch round + item
  const { data: round, error: roundErr } = await supabase
    .from("bidding_rounds")
    .select("*, items(*)")
    .eq("id", round_id)
    .single();

  if (roundErr || !round || round.status !== "live") {
    return new Response(JSON.stringify({ skipped: true, reason: "round not live" }), { status: 200 });
  }

  const item = round.items;

  // 2. Fetch current highest bid in this round
  const { data: bids } = await supabase
    .from("bids")
    .select("*")
    .eq("round_id", round_id)
    .order("amount", { ascending: false })
    .limit(1);

  const currentHighest = bids && bids.length > 0 ? bids[0].amount : 0;

  // 3. Fetch all AI personas
  const { data: personas } = await supabase.from("ai_personas").select("*");
  if (!personas) return new Response(JSON.stringify({ error: "no personas" }), { status: 500 });

  const results = [];

  for (const persona of personas as AiPersona[]) {
    // Fair value estimate = base_valuation adjusted by rarity
    const fairValue = item.base_valuation * (1 + item.rarity_score / 100);

    // Walk-away threshold — AI will not bid beyond this
    const walkAwayPrice = fairValue * persona.walkaway_multiplier;

    if (currentHighest >= walkAwayPrice) {
      results.push({ persona: persona.persona_name, action: "walked_away" });
      continue;
    }

    // Category bias weighting (defaults to 1 if category not tracked yet)
    const categoryWeight = persona.category_bias?.[item.category] ?? 1;

    // Interest score formula
    const rarityComponent = (item.rarity_score / 100) * 0.4;
    const categoryComponent = Math.min(categoryWeight, 2) / 2 * 0.25;
    const treasuryHealthComponent = 0.15; // placeholder — could pull live treasury ratio
    const randomAggression = Math.random() * persona.aggression_factor * 0.2;

    const interestScore = rarityComponent + categoryComponent + treasuryHealthComponent + randomAggression;

    // Decide whether to bid this tick (probabilistic, scaled by interest)
    const shouldBid = Math.random() < interestScore;

    if (!shouldBid) {
      results.push({ persona: persona.persona_name, action: "passed_this_tick" });
      continue;
    }

    // Incremental bid: 3-8% above current highest (or base valuation if no bids yet)
    const increment = 0.03 + Math.random() * 0.05;
    const baseline = currentHighest > 0 ? currentHighest : fairValue * 0.5;
    const newBid = Math.round(baseline * (1 + increment));

    // Check AI company treasury
    const { data: aiCompany } = await supabase
      .from("companies")
      .select("treasury_balance")
      .eq("id", persona.company_id)
      .single();

    if (!aiCompany || aiCompany.treasury_balance < newBid) {
      results.push({ persona: persona.persona_name, action: "insufficient_treasury" });
      continue;
    }

    // Place the bid
    await supabase.from("bids").insert({
      round_id,
      company_id: persona.company_id,
      placed_by: null,
      amount: newBid,
      is_ai: true,
    });

    results.push({ persona: persona.persona_name, action: "bid_placed", amount: newBid });
  }

  return new Response(JSON.stringify({ round_id, results }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
