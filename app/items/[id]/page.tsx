import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import BackButton from "../../../components/BackButton";
import ClassifyForm from "../../../components/ClassifyForm";

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
      <main className="min-h-screen flex items-center justify-center text-parchment-dim">
        Item not found.
      </main>
    );
  }

  const { data: rounds } = await supabase
    .from("bidding_rounds")
    .select("*, companies(name)")
    .eq("item_id", id)
    .order("starts_at", { ascending: true });

  const { data: classifications } = await supabase
    .from("item_classifications")
    .select("*, companies(name)")
    .eq("item_id", id)
    .order("created_at", { ascending: true });

  const aiClassifications = (classifications ?? []).filter((c: any) => c.is_ai);
  const humanClassifications = (classifications ?? []).filter((c: any) => !c.is_ai);
  const isVerified = item.authenticity_status !== "Unverified";

  // Build a simple chronological timeline from the data we have
  const timelineEvents: { label: string; detail: string; date: string }[] = [
    {
      label: "Discovered",
      detail: `${item.name} entered the Rarehold registry, unclassified.`,
      date: item.created_at,
    },
  ];

  if (isVerified) {
    const firstCorrect = humanClassifications.find((c: any) => c.is_correct);
    if (firstCorrect) {
      timelineEvents.push({
        label: "Identity Confirmed",
        detail: `${firstCorrect.companies?.name ?? "A company"} correctly classified this asset as ${item.era_estimate}, ${item.authenticity_status}.`,
        date: firstCorrect.created_at,
      });
    }
  }

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
      <BackButton fallbackHref="/auctions" />
      <p className="rh-eyebrow mb-1">{item.category} · Verification Record</p>
      <h1 className="text-3xl font-display text-parchment mb-1">{item.name}</h1>
      <p className="text-parchment-dim mb-6">Rarity {item.rarity_score}/100</p>

      {item.description && (
        <p className="text-parchment/90 mb-8 leading-relaxed max-w-2xl">{item.description}</p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rh-card p-4">
          <p className="text-xs text-parchment-dim mb-1">Era</p>
          <p className="text-lg text-parchment font-display">
            {isVerified ? item.era_estimate : "Unclassified"}
          </p>
        </div>
        <div className="rh-card p-4">
          <p className="text-xs text-parchment-dim mb-1">Authenticity</p>
          <p className={`text-lg font-display ${isVerified ? "text-verified" : "text-parchment"}`}>
            {isVerified ? item.authenticity_status : "Unverified"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="rh-card p-4">
          <p className="text-xs text-parchment-dim mb-1">Current Owner</p>
          <p className="text-lg text-parchment font-display">
            {item.companies?.name ?? "Unclaimed"}
          </p>
        </div>
        <div className="rh-card p-4">
          <p className="text-xs text-parchment-dim mb-1">Base Valuation</p>
          <p className="text-lg text-karat font-mono">
            {item.base_valuation.toLocaleString()} Karat
          </p>
        </div>
      </div>

      <h2 className="text-lg font-display text-parchment mb-4">AI Institution Assessments</h2>
      <div className="space-y-2 mb-10">
        {aiClassifications.length === 0 ? (
          <p className="text-sm text-parchment-dim">No AI assessments filed yet.</p>
        ) : (
          aiClassifications.map((c: any) => (
            <div key={c.id} className="rh-card p-4">
              <div className="flex justify-between mb-1">
                <span className="text-parchment font-medium">🤖 AI Institution</span>
                <span className={`text-xs font-mono ${c.is_correct ? "text-verified" : "text-parchment-dim"}`}>
                  {c.era_guess} · {c.authenticity_guess}
                </span>
              </div>
              {c.reasoning && (
                <p className="text-xs text-parchment-dim italic">{c.reasoning}</p>
              )}
            </div>
          ))
        )}
      </div>

      <h2 className="text-lg font-display text-parchment mb-4">Human Classifications</h2>
      <div className="space-y-2 mb-6">
        {humanClassifications.length === 0 ? (
          <p className="text-sm text-parchment-dim">
            No company has attempted a classification yet. Be the first.
          </p>
        ) : (
          humanClassifications.map((c: any) => (
            <div key={c.id} className="rh-card flex justify-between items-center px-4 py-3">
              <span className="text-parchment">{c.companies?.name}</span>
              <div className="text-right">
                <span className={`text-xs font-mono ${c.is_correct ? "text-verified" : "text-danger"}`}>
                  {c.era_guess} · {c.authenticity_guess}
                </span>
                {c.points_awarded > 0 && (
                  <p className="text-xs text-karat font-mono">+{c.points_awarded} Discovery Score</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {!isVerified && (
        <div className="rh-card p-6 mb-10">
          <h3 className="text-base font-display text-parchment mb-4">
            Submit Your Classification
          </h3>
          <ClassifyForm itemId={id} />
        </div>
      )}

      <h2 className="text-lg font-display text-parchment mb-4">Provenance Timeline</h2>
      <div className="space-y-5 border-l border-line pl-6">
        {timelineEvents.map((event, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-karat" />
            <p className="text-karat text-sm font-semibold">{event.label}</p>
            <p className="text-parchment text-sm">{event.detail}</p>
            <p className="text-parchment-dim/60 text-xs mt-1 font-mono">
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
              <Link key={r.id} href={`/bidding/${r.id}`} className="rh-btn-primary inline-block px-6 py-3">
                View Live Auction →
              </Link>
            ))}
        </div>
      )}
    </main>
  );
}
