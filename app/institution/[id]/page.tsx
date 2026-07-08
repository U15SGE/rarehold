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

interface Institution {
  id: string;
  name: string;
  sector_focus: string;
  treasury_balance: number;
  power_score: number;
  tier: string;
  win_count: number;
  loss_count: number;
  discovery_score: number;
  member_cap: number;
  institution_type: "trading" | "verifying";
  affiliation: string | null;
}

interface Item {
  id: string;
  name: string;
  category: string;
  rarity_score: number;
}

export default function InstitutionDashboard({ params }: { params: { id: string } }) {
  const { id } = params;
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [contribution, setContribution] = useState(1000);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    const { data: institutionData } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();
    setInstitution(institutionData);

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

    const isVerifying = institution?.institution_type === "verifying";
    const requiredContribution = isVerifying ? 0 : contribution;

    if (!isVerifying && (!profile || profile.karat_wallet < contribution)) {
      setError("You don't have enough Karat for this contribution.");
      setJoining(false);
      return;
    }

    if (!institution) {
      setJoining(false);
      return;
    }

    await supabase.from("company_members").insert({
      company_id: id,
      user_id: user.id,
      contributed_karat: requiredContribution,
      role: "member",
    });

    if (!isVerifying) {
      const newTreasury = institution.treasury_balance + requiredContribution;
      await supabase
        .from("companies")
        .update({ treasury_balance: newTreasury })
        .eq("id", id);

      await supabase
        .from("profiles")
        .update({ karat_wallet: profile!.karat_wallet - requiredContribution })
        .eq("id", user.id);

      await supabase.from("treasury_transactions").insert({
        company_id: id,
        user_id: user.id,
        type: "contribution",
        amount: requiredContribution,
        balance_after: newTreasury,
      });

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
    }

    setJoining(false);
    loadAll();
  }

  if (!institution) {
    return (
      <main className="min-h-screen flex items-center justify-center text-parchment-dim">
        Loading institution...
      </main>
    );
  }

  const isVerifying = institution.institution_type === "verifying";

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <BackButton fallbackHref="/institutions" />
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="rh-eyebrow">{institution.tier} Tier</p>
            {isVerifying && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-verified/20 text-verified">
                Verifying Institution
              </span>
            )}
          </div>
          <h1 className="text-3xl font-display text-parchment">{institution.name}</h1>
          <p className="text-parchment-dim capitalize mt-1">
            {institution.sector_focus} sector
            {institution.affiliation && <span> · {institution.affiliation}</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-parchment-dim">Power Score</p>
          <p className="text-3xl font-mono text-karat">{institution.power_score}</p>
        </div>
      </div>

      <div className={`grid ${isVerifying ? "grid-cols-2" : "grid-cols-4"} gap-4 my-8`}>
        {!isVerifying && (
          <div className="rh-card p-4">
            <p className="text-xs text-parchment-dim mb-1">Treasury</p>
            <p className="text-xl font-mono text-karat">
              {institution.treasury_balance.toLocaleString()}
            </p>
          </div>
        )}
        <div className="rh-card p-4">
          <p className="text-xs text-parchment-dim mb-1">Discovery Score</p>
          <p className="text-xl font-mono text-karat">{institution.discovery_score}</p>
        </div>
        <div className="rh-card p-4">
          <p className="text-xs text-parchment-dim mb-1">Members</p>
          <p className="text-xl font-mono text-parchment">
            {members.length} / {institution.member_cap}
          </p>
        </div>
        {!isVerifying && (
          <div className="rh-card p-4">
            <p className="text-xs text-parchment-dim mb-1">Record</p>
            <p className="text-xl font-mono text-parchment">
              {institution.win_count}W · {institution.loss_count}L
            </p>
          </div>
        )}
      </div>

      {!isMember && (
        <form onSubmit={handleJoin} className="rh-card p-6 mb-8">
          <h2 className="text-lg font-display text-parchment mb-3">Join this Institution</h2>
          {isVerifying ? (
            <p className="text-sm text-parchment-dim mb-2">
              Join as a contributing researcher — no treasury contribution required.
            </p>
          ) : (
            <>
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
              </div>
              <p className="text-xs text-parchment-dim/70 mt-2 mb-2 leading-relaxed">
                Your ownership stake is proportional to your contribution relative
                to the institution&apos;s total treasury.
              </p>
            </>
          )}
          <button disabled={joining} className="rh-btn-primary px-6 py-2.5 disabled:opacity-50 mt-2">
            {joining ? "Joining..." : "Join"}
          </button>
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
            {!isVerifying && (
              <div className="text-right">
                <p className="text-karat font-mono">
                  {m.stake_percent.toFixed(2)}% stake
                </p>
                <p className="text-xs text-parchment-dim font-mono">
                  Vote weight {effectiveVoteWeight(m.stake_percent).toFixed(2)}%
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {!isVerifying && (
        <>
          <h2 className="text-lg font-display text-parchment mb-3">Portfolio</h2>
          {items.length === 0 ? (
            <p className="text-parchment-dim text-sm">
              This institution hasn&apos;t won any items yet.
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
        </>
      )}
    </main>
  );
}
