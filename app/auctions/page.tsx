import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { settleIfExpired } from "../../lib/settleRound";
import BackButton from "../../components/BackButton";

export const revalidate = 0;

export default async function Auctions() {
  // Settle any live rounds that have already expired before showing the list
  const { data: liveRounds } = await supabase
    .from("bidding_rounds")
    .select("id, ends_at")
    .eq("status", "live");

  if (liveRounds) {
    for (const r of liveRounds) {
      if (new Date(r.ends_at).getTime() <= Date.now()) {
        await settleIfExpired(supabase, r.id);
      }
    }
  }

  const { data: rounds } = await supabase
    .from("bidding_rounds")
    .select("*, items(*)")
    .in("status", ["live", "scheduled"])
    .order("starts_at", { ascending: true });

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <BackButton fallbackHref="/" />
      <p className="rh-eyebrow mb-1">Live Bidding Wars</p>
      <h1 className="text-3xl font-display text-parchment mb-8">Auctions</h1>

      {!rounds || rounds.length === 0 ? (
        <p className="text-parchment-dim">No active auctions right now.</p>
      ) : (
        <div className="space-y-3">
          {rounds.map((r: any) => (
            <div key={r.id} className="rh-card rh-card-hover p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <Link
                    href={`/items/${r.items?.id}`}
                    className="text-lg font-display text-parchment hover:text-karat transition-colors"
                  >
                    {r.items?.name}
                  </Link>
                  <p className="text-sm text-parchment-dim capitalize">
                    {r.items?.category} · Rarity {r.items?.rarity_score}/100
                  </p>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded ${
                    r.status === "live"
                      ? "bg-verified/20 text-verified"
                      : "bg-surface-raised text-parchment-dim"
                  }`}
                >
                  {r.status === "live" ? "● Live" : "Scheduled"}
                </span>
              </div>
              <Link href={`/bidding/${r.id}`} className="rh-btn-primary inline-block text-sm px-4 py-2">
                Enter Auction Room →
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
