import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export const revalidate = 0;

export default async function Auctions() {
  const { data: rounds } = await supabase
    .from("bidding_rounds")
    .select("*, items(*)")
    .in("status", ["live", "scheduled"])
    .order("starts_at", { ascending: true });

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-serif text-karat mb-8">Live Auctions</h1>

      {!rounds || rounds.length === 0 ? (
        <p className="text-gray-500">No active auctions right now.</p>
      ) : (
        <div className="space-y-3">
          {rounds.map((r: any) => (
            <Link
              key={r.id}
              href={`/bidding/${r.id}`}
              className="block bg-[#17171a] border border-[#2a2a2e] rounded-xl p-5 hover:border-karat transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {r.items?.name}
                  </h2>
                  <p className="text-sm text-gray-400 capitalize">
                    {r.items?.category} · Rarity {r.items?.rarity_score}/100
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    r.status === "live"
                      ? "bg-green-900 text-green-300"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {r.status === "live" ? "LIVE" : "SCHEDULED"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
