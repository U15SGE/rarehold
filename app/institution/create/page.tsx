"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import BackButton from "../../../components/BackButton";

const FOUNDING_COST = 2000; // Karat, prevents spam institutions
const SECTORS = ["mixed", "paintings", "antiques", "metals", "collectibles", "vastu"];

export default function CreateInstitution() {
  const router = useRouter();
  const [institutionType, setInstitutionType] = useState<"trading" | "verifying">("trading");
  const [name, setName] = useState("");
  const [sector, setSector] = useState("mixed");
  const [affiliation, setAffiliation] = useState("");
  const [initialStake, setInitialStake] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVerifying = institutionType === "verifying";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in first.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("karat_wallet")
      .eq("id", user.id)
      .single();

    // Verifying institutions register for free — they aren't playing the
    // bidding economy, they're lending real-world classification expertise.
    const totalNeeded = isVerifying ? 0 : FOUNDING_COST + initialStake;
    const stakeToUse = isVerifying ? 0 : initialStake;

    if (!isVerifying && (!profile || profile.karat_wallet < totalNeeded)) {
      setError(`You need at least ${totalNeeded} Karat (${FOUNDING_COST} founding fee + your initial stake).`);
      setLoading(false);
      return;
    }

    const { data: institution, error: institutionErr } = await supabase
      .from("companies")
      .insert({
        name,
        founder_id: user.id,
        sector_focus: sector,
        treasury_balance: stakeToUse,
        institution_type: institutionType,
        affiliation: isVerifying ? affiliation : null,
      })
      .select()
      .single();

    if (institutionErr || !institution) {
      setError(institutionErr?.message ?? "Could not register institution.");
      setLoading(false);
      return;
    }

    await supabase.from("company_members").insert({
      company_id: institution.id,
      user_id: user.id,
      contributed_karat: stakeToUse,
      stake_percent: 100,
      role: "founder",
    });

    if (!isVerifying) {
      await supabase
        .from("profiles")
        .update({ karat_wallet: profile!.karat_wallet - totalNeeded })
        .eq("id", user.id);

      await supabase.from("treasury_transactions").insert({
        company_id: institution.id,
        user_id: user.id,
        type: "contribution",
        amount: stakeToUse,
        balance_after: stakeToUse,
      });
    }

    setLoading(false);
    router.push(`/institution/${institution.id}`);
  }

  return (
    <main className="min-h-[calc(100vh-73px)] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <BackButton fallbackHref="/" />
        <form onSubmit={handleCreate} className="rh-card p-8">
          <p className="rh-eyebrow mb-2">Institution Charter</p>
          <h1 className="text-2xl font-display text-parchment mb-6">Register an Institution</h1>

          <label className="block text-sm text-parchment-dim mb-2">Institution Type</label>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setInstitutionType("trading")}
              className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                !isVerifying ? "border-karat bg-karat/10" : "border-line"
              }`}
            >
              <p className="text-sm font-semibold text-parchment">Trading Institution</p>
              <p className="text-xs text-parchment-dim mt-1">
                Pool treasury, bid against AI and rivals for rare assets.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setInstitutionType("verifying")}
              className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                isVerifying ? "border-karat bg-karat/10" : "border-line"
              }`}
            >
              <p className="text-sm font-semibold text-parchment">Verifying Institution</p>
              <p className="text-xs text-parchment-dim mt-1">
                Museums, archives, and experts who classify assets. No treasury required.
              </p>
            </button>
          </div>

          <label className="block text-sm text-parchment-dim mb-1.5">Institution Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mb-4 px-3 py-2.5 rounded-lg bg-ink border border-line text-parchment placeholder:text-parchment-dim/50 focus:border-karat outline-none transition-colors"
            placeholder={isVerifying ? "e.g. Meerut Heritage Museum" : "e.g. Meerut Heritage Holdings"}
          />

          {isVerifying && (
            <>
              <label className="block text-sm text-parchment-dim mb-1.5">Real-World Affiliation</label>
              <input
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                className="w-full mb-4 px-3 py-2.5 rounded-lg bg-ink border border-line text-parchment placeholder:text-parchment-dim/50 focus:border-karat outline-none transition-colors"
                placeholder="e.g. Affiliated museum, university, or research body"
              />
            </>
          )}

          <label className="block text-sm text-parchment-dim mb-1.5">Sector Focus</label>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="w-full mb-4 px-3 py-2.5 rounded-lg bg-ink border border-line text-parchment focus:border-karat outline-none transition-colors"
          >
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {!isVerifying && (
            <>
              <label className="block text-sm text-parchment-dim mb-1.5">
                Your Initial Stake (Karat)
              </label>
              <input
                required
                type="number"
                min={1000}
                step={500}
                value={initialStake}
                onChange={(e) => setInitialStake(Number(e.target.value))}
                className="w-full mb-2 px-3 py-2.5 rounded-lg bg-ink border border-line text-parchment focus:border-karat outline-none transition-colors font-mono"
              />
              <p className="text-xs text-parchment-dim/70 mb-6 leading-relaxed">
                Founding fee: {FOUNDING_COST} Karat (one-time, prevents spam
                institutions). Your stake becomes your ownership % in the treasury.
              </p>
            </>
          )}

          {isVerifying && (
            <p className="text-xs text-parchment-dim/70 mb-6 leading-relaxed">
              Verifying institutions register at no cost and carry a distinct
              badge on every classification they submit, lending real-world
              credibility to the verification record.
            </p>
          )}

          {error && <p className="text-danger text-sm mb-4">{error}</p>}

          <button disabled={loading} className="rh-btn-primary w-full py-3 disabled:opacity-50">
            {loading ? "Registering..." : "Register Institution"}
          </button>
        </form>
      </div>
    </main>
  );
}
