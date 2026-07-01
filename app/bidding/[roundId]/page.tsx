"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { maxAllowedBid } from "../../../lib/companyMath";

interface Bid {
  id: string;
  company_id: string;
  amount: number;
  is_ai: boolean;
  created_at: string;
  companies?: { name: string };
}

export default function BiddingRoom({ params }: { params: { roundId: string } }) {
  const { roundId } = params;
  const [round, setRound] = useState<any>(null);
  const [item, setItem] = useState<any>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [myCompany, setMyCompany] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

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
    return <main className="min-h-screen flex items-center justify-center">Loading auction...</main>;
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-serif text-karat">{item.name}</h1>
          <p className="text-gray-400 capitalize">{item.category} · Rarity {item.rarity_score}/100</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Time Remaining</p>
          <p className="text-2xl font-mono text-karat">
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
          </p>
        </div>
      </div>

      <div className="bg-[#17171a] border border-[#2a2a2e] rounded-xl p-6 mb-6">
        <p className="text-sm text-gray-400 mb-1">Current Highest Bid</p>
        <p className="text-4xl font-bold text-karat">{highestBid.toLocaleString()} Karat</p>
        {bids[0] && (
          <p className="text-sm text-gray-500 mt-1">
            by {bids[0].companies?.name ?? "AI Company"} {bids[0].is_ai && "🤖"}
          </p>
        )}
      </div>

      <div className="bg-[#17171a] border border-[#2a2a2e] rounded-xl p-6 mb-6">
        <label className="block text-sm text-gray-400 mb-2">Your Bid (Karat)</label>
        <div className="flex gap-3">
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(Number(e.target.value))}
            className="flex-1 px-3 py-2 rounded bg-[#0e0e10] border border-[#2a2a2e] text-white"
          />
          <button
            onClick={placeBid}
            className="px-6 py-2 bg-karat text-ink font-semibold rounded-lg hover:opacity-90 transition"
          >
            Place Bid
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      <h2 className="text-lg text-gray-300 mb-3">Live Bid Feed</h2>
      <div className="space-y-2">
        {bids.map((bid) => (
          <div
            key={bid.id}
            className="flex justify-between px-4 py-3 bg-[#17171a] border border-[#2a2a2e] rounded-lg"
          >
            <span>
              {bid.companies?.name ?? "AI Company"} {bid.is_ai && "🤖"}
            </span>
            <span className="text-karat font-semibold">{bid.amount.toLocaleString()} Karat</span>
          </div>
        ))}
      </div>
    </main>
  );
}
