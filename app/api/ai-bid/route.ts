import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { settleIfExpired } from "../../../lib/settleRound";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function generateReasoning(params: {
  personaName: string;
  categoryWeight: number;
  rarityScore: number;
  currentHighest: number;
  walkAwayPrice: number;
  fairValue: number;
  aggressionFactor: number;
  category: string;
}): string {
  const { personaName, categoryWeight, rarityScore, currentHighest, walkAwayPrice, fairValue, aggressionFactor, category } = params;

  const priceRatio = currentHighest > 0 ? currentHighest / fairValue : 0;
  const distanceToWalkaway = (walkAwayPrice - currentHighest) / walkAwayPrice;

  // High category expertise
  if (categoryWeight >= 1.3) {
    return `${personaName} recognizes strong ${category} expertise here and bids with confidence.`;
  }

  // Very rare item
  if (rarityScore >= 80) {
    return `${personaName} flags exceptional rarity (${rarityScore}/100) — willing to stretch valuation.`;
  }

  // Getting close to walk-away threshold
  if (distanceToWalkaway < 0.15) {
    return `${personaName} is approaching its valuation ceiling but pushes one more increment.`;
  }

  // High aggression persona
  if (aggressionFactor >= 0.3) {
    return `${personaName} applies aggressive pressure, sensing rising competitive interest.`;
  }

  // Price still well below fair value
  if (priceRatio < 0.6) {
    return `${personaName} sees the current price well under fair value — an efficient entry point.`;
  }

  return `${personaName} continues bidding based on steady confidence in this asset's trajectory.`;
}

export async function POST(req: NextRequest) {
  const { round_id } = await req.json();

  if (!round_id) {
    return NextResponse.json({ error: "round_id required" }, { status: 400 });
  }

  // 1. Fetch round + item
  const { data: round, error: roundErr } = await supabase
    .from("bidding_rounds")
    .select("*, items(*)")
    .eq("id", round_id)
    .single();

  if (roundErr || !round || round.status !== "live") {
    return NextResponse.json({ skipped: true, reason: "round not live" });
  }

  // If round has expired, settle it via the shared helper (admin client
  // bypasses RLS, which is required to write the winner/treasury updates)
  if (new Date(round.ends_at).getTime() <= Date.now()) {
    const result = await settleIfExpired(supabaseAdmin, round_id);
    return NextResponse.json({ closed: true, ...result });
  }

  const item = round.items;

  // 2. Current highest bid
  const { data: bids } = await supabase
    .from("bids")
    .select("*")
    .eq("round_id", round_id)
    .order("amount", { ascending: false })
    .limit(1);

  const currentHighest = bids && bids.length > 0 ? bids[0].amount : 0;

  // 3. All AI personas
  const { data: personas } = await supabase.from("ai_personas").select("*");
  if (!personas) return NextResponse.json({ error: "no personas" }, { status: 500 });

  const results = [];

  for (const persona of personas) {
    const fairValue = item.base_valuation * (1 + item.rarity_score / 100);
    const walkAwayPrice = fairValue * persona.walkaway_multiplier;

    if (currentHighest >= walkAwayPrice) {
      results.push({ persona: persona.persona_name, action: "walked_away" });
      continue;
    }

    const categoryWeight = persona.category_bias?.[item.category] ?? 1;
    const rarityComponent = (item.rarity_score / 100) * 0.4;
    const categoryComponent = (Math.min(categoryWeight, 2) / 2) * 0.25;
    const treasuryHealthComponent = 0.15;
    const randomAggression = Math.random() * persona.aggression_factor * 0.2;

    const interestScore =
      rarityComponent + categoryComponent + treasuryHealthComponent + randomAggression;

    const shouldBid = Math.random() < interestScore;
    if (!shouldBid) {
      results.push({ persona: persona.persona_name, action: "passed_this_tick" });
      continue;
    }

    const increment = 0.03 + Math.random() * 0.05;
    const baseline = currentHighest > 0 ? currentHighest : fairValue * 0.5;
    const newBid = Math.round(baseline * (1 + increment));

    const { data: aiCompany } = await supabase
      .from("companies")
      .select("treasury_balance")
      .eq("id", persona.company_id)
      .single();

    if (!aiCompany || aiCompany.treasury_balance < newBid) {
      results.push({ persona: persona.persona_name, action: "insufficient_treasury" });
      continue;
    }

    const reasoning = generateReasoning({
      personaName: persona.persona_name,
      categoryWeight,
      rarityScore: item.rarity_score,
      currentHighest,
      walkAwayPrice,
      fairValue,
      aggressionFactor: persona.aggression_factor,
      category: item.category,
    });

    await supabase.from("bids").insert({
      round_id,
      company_id: persona.company_id,
      placed_by: null,
      amount: newBid,
      is_ai: true,
      reasoning,
    });

    results.push({ persona: persona.persona_name, action: "bid_placed", amount: newBid, reasoning });
  }

  return NextResponse.json({ round_id, results });
}
