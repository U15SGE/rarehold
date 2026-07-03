import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

  // If round has expired, close it and settle the winner
  if (new Date(round.ends_at).getTime() <= Date.now()) {
    const { data: topBid } = await supabase
      .from("bids")
      .select("*")
      .eq("round_id", round_id)
      .order("amount", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (topBid) {
      await supabase
        .from("bidding_rounds")
        .update({
          status: "closed",
          winning_company_id: topBid.company_id,
          final_price: topBid.amount,
        })
        .eq("id", round_id);

      await supabase
        .from("items")
        .update({
          current_owner_company_id: topBid.company_id,
          is_ai_owned: topBid.is_ai,
        })
        .eq("id", round.item_id);

      // Deduct winning bid from company treasury, update win count
      const { data: winningCompany } = await supabase
        .from("companies")
        .select("treasury_balance, win_count")
        .eq("id", topBid.company_id)
        .single();

      if (winningCompany) {
        await supabase
          .from("companies")
          .update({
            treasury_balance: winningCompany.treasury_balance - topBid.amount,
            win_count: winningCompany.win_count + 1,
          })
          .eq("id", topBid.company_id);
      }
    } else {
      await supabase
        .from("bidding_rounds")
        .update({ status: "closed" })
        .eq("id", round_id);
    }

    return NextResponse.json({ closed: true });
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

    await supabase.from("bids").insert({
      round_id,
      company_id: persona.company_id,
      placed_by: null,
      amount: newBid,
      is_ai: true,
    });

    results.push({ persona: persona.persona_name, action: "bid_placed", amount: newBid });
  }

  return NextResponse.json({ round_id, results });
}
