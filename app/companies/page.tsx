import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export const revalidate = 0;

export default async function BrowseCompanies() {
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, sector_focus, treasury_balance, power_score, tier, win_count, loss_count")
    .order("power_score", { ascending: false });

  return (
    <main className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif text-karat">Companies</h1>
        <Link
          href="/company/create"
          className="px-4 py-2 bg-karat text-ink text-sm font-semibold rounded-lg hover:opacity-90 transition"
        >
          Found a Company
        </Link>
      </div>

      {!companies || companies.length === 0 ? (
        <p className="text-gray-500">
          No companies yet. Be the first to found one.
        </p>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => (
            <Link
              key={c.id}
              href={`/company/${c.id}`}
              className="block bg-[#17171a] border border-[#2a2a2e] rounded-xl p-5 hover:border-karat transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-white">{c.name}</h2>
                  <p className="text-sm text-gray-400 capitalize">
                    {c.sector_focus} ·{" "}
                    <span className="capitalize text-karat">{c.tier}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Treasury</p>
                  <p className="text-karat font-semibold">
                    {c.treasury_balance.toLocaleString()} Karat
                  </p>
                </div>
              </div>
              <div className="flex gap-6 mt-3 text-xs text-gray-500">
                <span>Power Score: {c.power_score}</span>
                <span>
                  Record: {c.win_count}W - {c.loss_count}L
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
