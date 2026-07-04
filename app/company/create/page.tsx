"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import BackButton from "../../../components/BackButton";

const COMPANY_CREATION_COST = 2000; // Karat, prevents spam companies
const SECTORS = ["mixed", "paintings", "antiques", "metals", "collectibles", "vastu"];

export default function CreateCompany() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sector, setSector] = useState("mixed");
  const [initialStake, setInitialStake] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // Fetch wallet to verify sufficient balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("karat_wallet")
      .eq("id", user.id)
      .single();

    const totalNeeded = COMPANY_CREATION_COST + initialStake;
    if (!profile || profile.karat_wallet < totalNeeded) {
      setError(`You need at least ${totalNeeded} Karat (${COMPANY_CREATION_COST} founding fee + your initial stake).`);
      setLoading(false);
      return;
    }

    // Create company
    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .insert({
        name,
        founder_id: user.id,
        sector_focus: sector,
        treasury_balance: initialStake,
      })
      .select()
      .single();

    if (companyErr || !company) {
      setError(companyErr?.message ?? "Could not create company.");
      setLoading(false);
      return;
    }

    // Add founder as first member with full initial stake
    await supabase.from("company_members").insert({
      company_id: company.id,
      user_id: user.id,
      contributed_karat: initialStake,
      stake_percent: 100,
      role: "founder",
    });

    // Deduct from personal wallet
    await supabase
      .from("profiles")
      .update({ karat_wallet: profile.karat_wallet - totalNeeded })
      .eq("id", user.id);

    // Log the ledger entry
    await supabase.from("treasury_transactions").insert({
      company_id: company.id,
      user_id: user.id,
      type: "contribution",
      amount: initialStake,
      balance_after: initialStake,
    });

    setLoading(false);
    router.push(`/company/${company.id}`);
  }

  return (
    <main className="min-h-[calc(100vh-73px)] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <BackButton fallbackHref="/" />
        <form onSubmit={handleCreate} className="rh-card p-8">
          <p className="rh-eyebrow mb-2">Institution Charter</p>
          <h1 className="text-2xl font-display text-parchment mb-6">Found a Company</h1>

          <label className="block text-sm text-parchment-dim mb-1.5">Company Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mb-4 px-3 py-2.5 rounded-lg bg-ink border border-line text-parchment placeholder:text-parchment-dim/50 focus:border-karat outline-none transition-colors"
            placeholder="e.g. Meerut Heritage Holdings"
          />

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
            Founding fee: {COMPANY_CREATION_COST} Karat (one-time, prevents spam
            companies). Your stake becomes your ownership % in the company treasury.
          </p>

          {error && <p className="text-danger text-sm mb-4">{error}</p>}

          <button disabled={loading} className="rh-btn-primary w-full py-3 disabled:opacity-50">
            {loading ? "Creating..." : "Create Company"}
          </button>
        </form>
      </div>
    </main>
  );
}
