import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import DiscoveryGlobe from "../components/DiscoveryGlobe";
import ActivityTicker from "../components/ActivityTicker";

export const revalidate = 0;

async function getTickerItems(): Promise<string[]> {
  const items: string[] = [];

  const { data: recentItems } = await supabase
    .from("items")
    .select("name, category, rarity_score, created_at")
    .order("created_at", { ascending: false })
    .limit(4);

  recentItems?.forEach((item) => {
    items.push(
      `NEW DISCOVERY — ${item.name} · ${item.category} · rarity ${item.rarity_score}/100`
    );
  });

  const { data: closedRounds } = await supabase
    .from("bidding_rounds")
    .select("final_price, items(name), companies(name)")
    .eq("status", "closed")
    .order("ends_at", { ascending: false })
    .limit(4);

  closedRounds?.forEach((r: any) => {
    if (r.companies?.name) {
      items.push(
        `CLAIMED — ${r.items?.name} won by ${r.companies.name} for ${r.final_price?.toLocaleString()} Karat`
      );
    }
  });

  const { data: recentCompanies } = await supabase
    .from("companies")
    .select("name, tier, created_at")
    .order("created_at", { ascending: false })
    .limit(3);

  recentCompanies?.forEach((c) => {
    items.push(`COMPANY FOUNDED — ${c.name} enters the ${c.tier} tier`);
  });

  if (items.length === 0) {
    items.push("RAREHOLD NETWORK ONLINE — awaiting the first discovery");
  }

  return items;
}

async function getGlobeNodes() {
  const { data: liveRounds } = await supabase
    .from("bidding_rounds")
    .select("id, items(name)")
    .eq("status", "live")
    .limit(6);

  const base = liveRounds?.map((r: any, i: number) => ({
    id: r.id,
    label: r.items?.name?.split(" ").slice(0, 2).join(" ") ?? "Live Auction",
    href: `/bidding/${r.id}`,
    angle: (360 / Math.max(liveRounds.length, 1)) * i,
  })) ?? [];

  if (base.length === 0) {
    return [
      { id: "a", label: "Discovery Pending", angle: 0 },
      { id: "b", label: "Discovery Pending", angle: 120 },
      { id: "c", label: "Discovery Pending", angle: 240 },
    ];
  }

  return base;
}

export default async function Home() {
  const [tickerItems, globeNodes] = await Promise.all([
    getTickerItems(),
    getGlobeNodes(),
  ]);

  return (
    <main className="min-h-screen">
      <ActivityTicker items={tickerItems} />

      <section className="relative overflow-hidden px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="rh-fade-up text-center md:text-left order-2 md:order-1">
            <p className="rh-eyebrow mb-4">A Civilization of Rare Assets</p>
            <h1 className="text-4xl md:text-6xl font-display font-medium text-parchment leading-[1.05] mb-6">
              Where rarity
              <br />
              <span className="text-karat italic">competes.</span>
            </h1>
            <p className="text-parchment-dim text-base md:text-lg leading-relaxed mb-10 max-w-md mx-auto md:mx-0">
              Rarehold is an arena, not a marketplace. Paintings, antiques,
              metals, and collectibles do not simply carry a price — they
              carry a contest. Institutions, human and artificial, stake
              their conviction on what history will come to value, and
              civilization decides who was right.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link href="/company/create" className="rh-btn-primary px-7 py-3.5 text-center">
                Found a Company
              </Link>
              <Link href="/companies" className="rh-btn-secondary px-7 py-3.5 text-center">
                Browse Companies
              </Link>
            </div>

            <p className="mt-12 text-xs text-parchment-dim/70 max-w-sm mx-auto md:mx-0 leading-relaxed">
              All currency (Karat) is virtual and non-withdrawable. Rarehold
              is a strategy game — not an investment platform.
            </p>
          </div>

          <div className="order-1 md:order-2 rh-fade-up" style={{ animationDelay: "0.15s" }}>
            <DiscoveryGlobe nodes={globeNodes} />
          </div>
        </div>
      </section>

      <section className="border-t border-line px-6 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <p className="rh-eyebrow mb-2">Standing</p>
            <p className="text-parchment text-sm leading-relaxed">
              No company begins powerful. Standing is built entry by entry,
              through treasury, discipline, and a record of correct
              conviction — never bought outright.
            </p>
          </div>
          <div>
            <p className="rh-eyebrow mb-2">Contest</p>
            <p className="text-parchment text-sm leading-relaxed">
              Every rare asset is claimed in the open, in real time — human
              institutions against artificial ones, each staking treasury on
              their own judgment of worth.
            </p>
          </div>
          <div>
            <p className="rh-eyebrow mb-2">Record</p>
            <p className="text-parchment text-sm leading-relaxed">
              What is claimed is remembered. Every asset carries its full
              provenance forward — who discovered it, who contested it, and
              who ultimately held it.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
