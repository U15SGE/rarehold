import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

export const revalidate = 0;

export default async function ItemProvenance({ params }: { params: { id: string } }) {
  const { id } = params;

  const { data: item } = await supabase
    .from("items")
    .select("*, companies(name)")
    .eq("id", id)
    .single();

  if (!item) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Item not found.
      </main>
    );
  }

  const { data: rounds } = await supabase
    .from("bidding_rounds")
    .select("*, companies(name)")
    .eq("item_id", id)
    .order("starts_at", { ascending: true });

  // Build a simple chronological timeline from the data we have
  const timelineEvents: { label: string; detail: string; date: string }[] = [
    {
      label: "Discovered",
      detail: `${item.name} entered the Rarehold registry.`,
      date: item.created_at,
    },
  ];

  (rounds ?? []).forEach((r: any) => {
    timelineEvents.push({
      label: "Auction Opened",
      detail: `Bidding round started for ${item.name}.`,
      date: r.starts_at,
    });

    if (r.status === "closed") {
      timelineEvents.push({
        label: r.winning_company_id ? "Auction Won" : "Auction Closed",
        detail: r.winning_company_id
          ? `Won by ${r.companies?.name ?? "a company"} for ${r.final_price?.toLocaleString()} Karat.`
          : `Auction closed with no winning bid.`,
        date: r.ends_at,
      });
    }
  });

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-serif text-karat mb-1">{item.name}</h1>
      <p className="text-gray-400 capitalize mb-6">
        {item.category} · Rarity {item.rarity_score}/100
      </p>

      {item.description && (
        <p className="text-gray-300 mb-8 leading-relaxed">{item.description}</p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-[#17171a] border border-[#2a2a2e] rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Current Owner</p>
          <p className="text-lg text-white">
            {item.companies?.name ?? "Unclaimed"}
          </p>
        </div>
        <div className="bg-[#17171a] border border-[#2a2a2e] rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Base Valuation</p>
          <p className="text-lg text-karat">
            {item.base_valuation.toLocaleString()} Karat
          </p>
        </div>
      </div>

      <h2 className="text-lg text-gray-300 mb-4">Provenance Timeline</h2>
      <div className="space-y-4 border-l border-[#2a2a2e] pl-6">
        {timelineEvents.map((event, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-karat" />
            <p className="text-karat text-sm font-semibold">{event.label}</p>
            <p className="text-gray-300 text-sm">{event.detail}</p>
            <p className="text-gray-600 text-xs mt-1">
              {new Date(event.date).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {rounds && rounds.some((r: any) => r.status === "live") && (
        <div className="mt-10">
          {rounds
            .filter((r: any) => r.status === "live")
            .map((r: any) => (
              <Link
                key={r.id}
                href={`/bidding/${r.id}`}
                className="inline-block px-6 py-3 bg-karat text-ink font-semibold rounded-lg hover:opacity-90 transition"
              >
                View Live Auction →
              </Link>
            ))}
        </div>
      )}
    </main>
  );
}
