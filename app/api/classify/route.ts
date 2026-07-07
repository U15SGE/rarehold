import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { item_id, company_id, era_guess, authenticity_guess, submitted_by } = await req.json();

  if (!item_id || !company_id || !era_guess || !authenticity_guess) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: item } = await supabase
    .from("items")
    .select("true_era, true_authenticity, era_estimate")
    .eq("id", item_id)
    .single();

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const isCorrect =
    era_guess === item.true_era && authenticity_guess === item.true_authenticity;

  // Was this item already correctly identified by someone else?
  const { count: priorCorrectCount } = await supabase
    .from("item_classifications")
    .select("id", { count: "exact", head: true })
    .eq("item_id", item_id)
    .eq("is_correct", true);

  const isFirstCorrect = isCorrect && (priorCorrectCount ?? 0) === 0;
  const points = isCorrect ? (isFirstCorrect ? 100 : 20) : 0;

  const { error: insertErr } = await supabaseAdmin.from("item_classifications").insert({
    item_id,
    company_id,
    submitted_by,
    is_ai: false,
    era_guess,
    authenticity_guess,
    is_correct: isCorrect,
    points_awarded: points,
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  if (points > 0) {
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("discovery_score")
      .eq("id", company_id)
      .single();

    if (company) {
      await supabaseAdmin
        .from("companies")
        .update({ discovery_score: company.discovery_score + points })
        .eq("id", company_id);
    }
  }

  // Once an item is first correctly identified, its public status updates
  if (isFirstCorrect) {
    await supabaseAdmin
      .from("items")
      .update({
        era_estimate: item.true_era,
        authenticity_status: item.true_authenticity,
      })
      .eq("id", item_id);
  }

  return NextResponse.json({ isCorrect, isFirstCorrect, points });
}
