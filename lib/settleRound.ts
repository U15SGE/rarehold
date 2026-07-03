import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Checks if a bidding round has passed its end time and, if so,
 * settles it: declares the highest bidder the winner, transfers
 * the item, deducts the winning bid from their treasury, and
 * updates their win count. Safe to call multiple times — it's a
 * no-op if the round is already closed or still live.
 */
export async function settleIfExpired(supabase: SupabaseClient, roundId: string) {
  const { data: round } = await supabase
    .from("bidding_rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (!round || round.status !== "live") return { settled: false };
  if (new Date(round.ends_at).getTime() > Date.now()) return { settled: false };

  const { data: topBid } = await supabase
    .from("bids")
    .select("*")
    .eq("round_id", roundId)
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
      .eq("id", roundId);

    await supabase
      .from("items")
      .update({
        current_owner_company_id: topBid.company_id,
        is_ai_owned: topBid.is_ai,
      })
      .eq("id", round.item_id);

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
    await supabase.from("bidding_rounds").update({ status: "closed" }).eq("id", roundId);
  }

  return { settled: true };
}
