"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { recalculateStakes, effectiveVoteWeight } from "../../../lib/companyMath";
import BackButton from "../../../components/BackButton";

interface Member {
  id: string;
  user_id: string;
  contributed_karat: number;
  stake_percent: number;
  role: string;
  profiles?: { username: string };
}

interface Company {
  id: string;
  name: string;
  sector_focus: string;
  treasury_balance: number;
  power_score: number;
  tier: string;
  win_count: number;
  loss_count: number;
  member_cap: number;
}

interface Item {
  id: string;
  name: string;
  category: string;
  rarity_score: number;
}

export default function CompanyDashboard({ params }: { params: { id: string } }) {
  const { id } = params;
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [contribution, setContribution] = useState(1000);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    const { data: companyData } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();
    setCompany(companyData);

    const { data: memberData } = await supabase
      .from("company_members")
      .select("*, profiles(username)")
      .eq("company_id", id)
      .order("stake_percent", { ascending: false });
    setMembers((memberData as any) ?? []);

    const { data: itemData } = await supabase
      .from("items")
      .select("id, name, category, rarity_score")
      .eq("current_owner_company_id", id);
    setItems(itemData ?? []);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setCurrentUserId(user.id);
      const alreadyMember = (memberData as any)?.some(
        (m: Member) => m.user_id === user.id
      );
      setIsMember(!!alreadyMember);
    }
  }

  useEffect(() => {
    loadAll();
  }, [id]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setJoining(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in first.");
      setJoining(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("karat_wallet")
      .eq("id", user.id)
      .single();

    if (!profile || profile.karat_wallet < contribution) {
      setError("You don't have enough Karat for this contribution.");
      setJoining(false);
      return;
    }

    if (!company) {
      setJoining(false);
      return;
    }

    // Insert new member
    await supabase.from("company_members").insert({
      company_id: id,
      user_id: user.id,
      contributed_karat: contribution,
      role: "member",
    });

    // Update treasury
    const newTreasury = company.treasury_balance + contribution;
    await supabase
      .from("companies")
      .update({ treasury_balance: newTreasury })
      .eq("id", id);

    // Deduct from personal wallet
    await supabase
      .from("profiles")
      .update({ karat_wallet: profile.karat_wallet - contribution })
      .eq("id", user.id);

    // Log ledger
    await supabase.from("treasury_transactions").insert({
      company_id: id,
      user_id: user.id,
      type: "contribution",
      amount: contribution,
      balance_after: newTreasury,
    });

    // Recalculate stakes for everyone
    const { data: allMembers } = await supabase
      .from("company_members")
      .select("user_id, contributed_karat")
      .eq("company_id", id);

    if (allMembers) {
      const updated = recalculateStakes(allMembers);
      for (const m of updated) {
        await supabase
          .from("company_members")
          .update({ stake_percent: m.stake_percent })
          .eq("company_id", id)
          .eq("user_id", m.user_id);
      }
    }

    setJoining(false);
    loadAll();
  }

  if (!company) {
    return (
      <main className="min-h-screen flex items-center justify-center text-parchment-dim">
        Loading company...
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <BackButton fallbackHref="/companies" />
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="rh-eyebrow mb-1">{company.tier} Tier Institution</p>
          <h1 className="text-3xl font-display text-parchment">{company.name}</h1>
          <p className="text-parchment-dim capitalize mt-1">
            {company.sector_focus} sector
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-parchment-dim">Power Score</p>
          <p className="text-3xl font-mono text-karat">{company.power_score}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 my-8">
        <div className="rh-card p-4">
          <p className="text-xs text-parchment-dim mb-1">Treasury</p>
          <p className="text-xl font-mono text-karat">
            {company.treasury_balance.toLocaleString()}
          </p>
        </div>
        <div className="rh-card p-4">
          <p className="text-xs text-parchment-dim mb-1">Members</p>
          <p className="text-xl font-mono text-parchment">
            {members.length} / {company.member_cap}
          </p>
        </div>
        <div className="rh-card p-4">
          <p className="text-xs text-parchment-dim mb-1">Record</p>
          <p className="text-xl font-mono text-parchment">
            {company.win_count}W · {company.loss_count}L
          </p>
        </div>
      </div>

      {!isMember && (
        <form onSubmit={handleJoin} className="rh-card p-6 mb-8">
          <h2 className="text-lg font-display text-parchment mb-3">Join this Company</h2>
          <label className="block text-sm text-parchment-dim mb-1.5">
            Your Contribution (Karat)
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              min={100}
              step={100}
              value={contribution}
              onChange={(e) => setContribution(Number(e.target.value))}
              className="flex-1 px-3 py-2.5 rounded-lg bg-ink border border-line text-parchment font-mono focus:border-karat outline-none transition-colors"
            />
            <button disabled={joining} className="rh-btn-primary px-6 py-2.5 disabled:opacity-50">
              {joining ? "Joining..." : "Join"}
            </button>
          </div>
          <p className="text-xs text-parchment-dim/70 mt-2 leading-relaxed">
            Your ownership stake is proportional to your contribution relative
            to the company&apos;s total treasury.
          </p>
          {error && <p className="text-danger text-sm mt-2">{error}</p>}
        </form>
      )}

      <h2 className="text-lg font-display text-parchment mb-3">Members</h2>
      <div className="space-y-2 mb-8">
        {members.map((m) => (
          <div key={m.id} className="rh-card flex justify-between items-center px-4 py-3">
            <div>
              <span className="text-parchment">{m.profiles?.username ?? "Unknown"}</span>
              {m.role === "founder" && (
                <span className="ml-2 text-xs text-karat">Founder</span>
              )}
              {m.user_id === currentUserId && (
                <span className="ml-2 text-xs text-parchment-dim">(You)</span>
              )}
            </div>
            <div className="text-right">
              <p className="text-karat font-mono">
                {m.stake_percent.toFixed(2)}% stake
              </p>
              <p className="text-xs text-parchment-dim font-mono">
                Vote weight {effectiveVoteWeight(m.stake_percent).toFixed(2)}%
              </p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-display text-parchment mb-3">Portfolio</h2>
      {items.length === 0 ? (
        <p className="text-parchment-dim text-sm">
          This company hasn&apos;t won any items yet.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <a key={item.id} href={`/items/${item.id}`} className="rh-card rh-card-hover flex justify-between px-4 py-3">
              <span className="capitalize text-parchment">
                {item.name} <span className="text-parchment-dim">({item.category})</span>
              </span>
              <span className="text-karat font-mono text-sm">Rarity {item.rarity_score}/100</span>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
