import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import BackButton from "../../components/BackButton";

export const revalidate = 0;

export default async function BrowseCompanies() {
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, sector_focus, treasury_balance, power_score, tier, win_count, loss_count")
    .order("power_score", { ascending: false });

  return (
    <main className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <BackButton fallbackHref="/" />
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="rh-eyebrow mb-1">The Network</p>
          <h1 className="text-3xl font-display text-parchment">Companies</h1>
        </div>
        <Link href="/company/create" className="rh-btn-primary px-5 py-2.5 text-sm">
          Found a Company
        </Link>
      </div>

      {!companies || companies.length === 0 ? (
        <p className="text-parchment-dim">
          No companies yet. Be the first to found one.
        </p>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => (
            <Link
              key={c.id}
              href={`/company/${c.id}`}
              className="rh-card rh-card-hover block p-5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-display text-parchment">{c.name}</h2>
                  <p className="text-sm text-parchment-dim capitalize">
                    {c.sector_focus} ·{" "}
                    <span className="capitalize text-karat">{c.tier}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-parchment-dim">Treasury</p>
                  <p className="text-karat font-mono font-medium">
                    {c.treasury_balance.toLocaleString()} Karat
                  </p>
                </div>
              </div>
              <div className="flex gap-6 mt-3 text-xs text-parchment-dim font-mono">
                <span>Power Score {c.power_score}</span>
                <span>
                  {c.win_count}W · {c.loss_count}L
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
