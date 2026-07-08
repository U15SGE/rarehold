import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import BackButton from "../../components/BackButton";

export const revalidate = 0;

export default async function BrowseInstitutions() {
  const { data: institutions } = await supabase
    .from("companies")
    .select("id, name, sector_focus, treasury_balance, power_score, discovery_score, tier, win_count, loss_count, institution_type, affiliation")
    .order("power_score", { ascending: false });

  return (
    <main className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <BackButton fallbackHref="/" />
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="rh-eyebrow mb-1">The Network</p>
          <h1 className="text-3xl font-display text-parchment">Institutions</h1>
        </div>
        <Link href="/institution/create" className="rh-btn-primary px-5 py-2.5 text-sm">
          Register an Institution
        </Link>
      </div>

      {!institutions || institutions.length === 0 ? (
        <p className="text-parchment-dim">
          No institutions yet. Be the first to register one.
        </p>
      ) : (
        <div className="space-y-3">
          {institutions.map((c) => (
            <Link
              key={c.id}
              href={`/institution/${c.id}`}
              className="rh-card rh-card-hover block p-5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-display text-parchment">{c.name}</h2>
                    {c.institution_type === "verifying" && (
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-verified/20 text-verified">
                        Verifying
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-parchment-dim capitalize">
                    {c.sector_focus} ·{" "}
                    <span className="capitalize text-karat">{c.tier}</span>
                    {c.affiliation && <span> · {c.affiliation}</span>}
                  </p>
                </div>
                {c.institution_type !== "verifying" && (
                  <div className="text-right">
                    <p className="text-xs text-parchment-dim">Treasury</p>
                    <p className="text-karat font-mono font-medium">
                      {c.treasury_balance.toLocaleString()} Karat
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-6 mt-3 text-xs text-parchment-dim font-mono">
                <span>Power Score {c.power_score}</span>
                <span className="text-karat">Discovery Score {c.discovery_score}</span>
                {c.institution_type !== "verifying" && (
                  <span>
                    {c.win_count}W · {c.loss_count}L
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
