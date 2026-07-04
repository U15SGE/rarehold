"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { maxAllowedBid } from "../../../lib/companyMath";
import BackButton from "../../../components/BackButton";

interface Bid {
  id: string;
  company_id: string;
  amount: number;
  is_ai: boolean;
  reasoning?: string | null;
  created_at: string;
  companies?: { name: string };
}

interface MyCompanyOption {
  id: string;
  name: string;
  treasury_balance: number;
}

export default function BiddingRoom({ params }: { params: { roundId: string } }) {
  const { roundId } = params;
  const [round, setRound] = useState<any>(null);
  const [item, setItem] = useState<any>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [myCompanies, setMyCompanies] = useState<MyCompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const myCompany = myCompanies.find((c) => c.id === selectedCompanyId) ?? null;

  // Initial load
  useEffect(() => {
    async function load() {
      const { data: roundData } = await supabase
        .from("bidding_rounds")
        .select("*, items(*)")
        .eq("id", roundId)
        .single();

      if (roundData) {
        setRound(roundData);
        setItem(roundData.items);
      }

      const { data: bidData } = await supabase
        .from("bids")
        .select("*, companies(name)")
        .eq("round_id", roundId)
        .order("amount", { ascending: false });

      if (bidData) setBids(bidData as any);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: memberships } = await supabase
          .from("company_members")
          .select("companies(id, name, treasury_balance)")
          .eq("user_id", user.id);

        const options =
          memberships
            ?.map((m: any) => m.companies)
            .filter((c: any) => c) ?? [];

        setMyCompanies(options);
        if (options.length > 0) setSelectedCompanyId(options[0].id);
      }
    }
    load();
  }, [roundId]);

  // Realtime subscription — new bids appear instantly for everyone
  useEffect(() => {
    const channel = supabase
      .channel(`round-${roundId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bids", filter: `round_id=eq.${roundId}` },
        (payload) => {
          setBids((prev) =>
            [...prev, payload.new as Bid].sort((a, b) => b.amount - a.amount)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId]);

  // Countdown timer
  useEffect(() => {
    if (!round) return;
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(round.ends_at).getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [round]);

  // Trigger the AI bidding engine every few seconds while this round is live.
  // This simulates a real-time opponent without needing a separate server cron.
  useEffect(() => {
    if (!round || round.status !== "live") return;

    const tick = () => {
      fetch("/api/ai-bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round_id: roundId }),
      }).catch(() => {});
    };

    tick();
    const interval = setInterval(tick, 6000);
    return () => clearInterval(interval);
  }, [round, roundId]);

  const highestBid = bids[0]?.amount ?? 0;

  async function placeBid() {
    setError(null);
    if (!myCompany) {
      setError("Join or select a company first.");
      return;
    }

    const cap = maxAllowedBid(myCompany.treasury_balance, 40);
    if (bidAmount > cap) {
      setError(`Max allowed single bid is ${cap} Karat (40% of treasury cap).`);
      return;
    }
    if (bidAmount <= highestBid) {
      setError(`Bid must exceed current highest bid of ${highestBid} Karat.`);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: bidErr } = await supabase.from("bids").insert({
      round_id: roundId,
      company_id: myCompany.id,
      placed_by: user?.id,
      amount: bidAmount,
      is_ai: false,
    });

    if (bidErr) setError(bidErr.message);
  }

  if (!round || !item) {
    return (
      <main className="min-h-screen flex items-center justify-center text-parchment-dim">
        Loading auction...
      </main>
    );
  }

  const urgent = timeLeft > 0 && timeLeft <= 30;

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <BackButton fallbackHref="/auctions" />
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-verified opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-verified" />
            </span>
            <p className="rh-eyebrow">Live Auction</p>
          </div>
          <h1 className="text-3xl font-display text-parchment">{item.name}</h1>
          <p className="text-parchment-dim capitalize">
            {item.category} · Rarity {item.rarity_score}/100
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-parchment-dim mb-1">Time Remaining</p>
          <p className={`text-2xl font-mono ${urgent ? "text-danger" : "text-karat"}`}>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
          </p>
        </div>
      </div>

      <div className="rh-card p-6 mb-6">
        <p className="text-sm text-parchment-dim mb-1">Current Highest Bid</p>
        <p className="text-4xl font-mono font-medium text-karat">{highestBid.toLocaleString()} Karat</p>
        {bids[0] && (
          <p className="text-sm text-parchment-dim mt-1">
            by {bids[0].companies?.name ?? "AI Company"} {bids[0].is_ai && "🤖"}
          </p>
        )}
        {bids[0]?.is_ai && bids[0]?.reasoning && (
          <p className="text-xs text-parchment-dim/70 mt-2 italic">{bids[0].reasoning}</p>
        )}
      </div>

      <div className="rh-card p-6 mb-6">
        {myCompanies.length === 0 ? (
          <p className="text-sm text-parchment-dim">
            You need to found or join a company before you can bid.
          </p>
        ) : (
          <>
            {myCompanies.length > 1 && (
              <>
                <label className="block text-sm text-parchment-dim mb-2">
                  Bidding as
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full mb-4 px-3 py-2.5 rounded-lg bg-ink border border-line text-parchment focus:border-karat outline-none transition-colors"
                >
                  {myCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.treasury_balance.toLocaleString()} Karat)
                    </option>
                  ))}
                </select>
              </>
            )}
            <label className="block text-sm text-parchment-dim mb-2">Your Bid (Karat)</label>
            <div className="flex gap-3">
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                className="flex-1 px-3 py-2.5 rounded-lg bg-ink border border-line text-parchment font-mono focus:border-karat outline-none transition-colors"
              />
              <button onClick={placeBid} className="rh-btn-primary px-6 py-2.5">
                Place Bid
              </button>
            </div>
          </>
        )}
        {error && <p className="text-danger text-sm mt-2">{error}</p>}
      </div>

      <h2 className="text-lg font-display text-parchment mb-3">Live Bid Feed</h2>
      <div className="space-y-2">
        {bids.map((bid) => (
          <div key={bid.id} className="rh-card px-4 py-3">
            <div className="flex justify-between">
              <span className="text-parchment">
                {bid.companies?.name ?? "AI Company"} {bid.is_ai && "🤖"}
              </span>
              <span className="text-karat font-mono">{bid.amount.toLocaleString()} Karat</span>
            </div>
            {bid.is_ai && bid.reasoning && (
              <p className="text-xs text-parchment-dim mt-1 italic">{bid.reasoning}</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
