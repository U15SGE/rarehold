"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const ERA_OPTIONS = [
  "Pre-1500",
  "1500-1700",
  "1700-1850",
  "1850-1950",
  "1950-Present",
];

const AUTHENTICITY_OPTIONS = ["Genuine", "Reproduction", "Disputed"];

interface MyCompany {
  id: string;
  name: string;
}

export default function ClassifyForm({ itemId }: { itemId: string }) {
  const [myCompanies, setMyCompanies] = useState<MyCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [eraGuess, setEraGuess] = useState(ERA_OPTIONS[0]);
  const [authenticityGuess, setAuthenticityGuess] = useState(AUTHENTICITY_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ isCorrect: boolean; isFirstCorrect: boolean; points: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("company_members")
        .select("companies(id, name)")
        .eq("user_id", user.id);

      const options =
        memberships?.map((m: any) => m.companies).filter((c: any) => c) ?? [];
      setMyCompanies(options);
      if (options.length > 0) setSelectedCompanyId(options[0].id);
    }
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const res = await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: itemId,
        company_id: selectedCompanyId,
        era_guess: eraGuess,
        authenticity_guess: authenticityGuess,
        submitted_by: user?.id,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.error) {
      if (data.error.includes("duplicate") || data.error.includes("unique")) {
        setAlreadySubmitted(true);
      } else {
        setError(data.error);
      }
      return;
    }

    setResult(data);
  }

  if (myCompanies.length === 0) {
    return (
      <p className="text-sm text-parchment-dim">
        Found or join an institution to submit a classification claim.
      </p>
    );
  }

  if (result) {
    return (
      <div className={result.isCorrect ? "text-verified" : "text-danger"}>
        <p className="font-semibold mb-1">
          {result.isCorrect
            ? result.isFirstCorrect
              ? "Correct — first to identify this asset!"
              : "Correct — but someone identified it first."
            : "Incorrect classification."}
        </p>
        {result.points > 0 && (
          <p className="text-sm text-parchment">+{result.points} Discovery Score</p>
        )}
      </div>
    );
  }

  if (alreadySubmitted) {
    return <p className="text-sm text-parchment-dim">Your institution has already submitted a classification for this asset.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {myCompanies.length > 1 && (
        <div>
          <label className="block text-sm text-parchment-dim mb-1.5">Submitting as</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-ink border border-line text-parchment focus:border-karat outline-none transition-colors"
          >
            {myCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm text-parchment-dim mb-1.5">Estimated Era</label>
        <select
          value={eraGuess}
          onChange={(e) => setEraGuess(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-ink border border-line text-parchment focus:border-karat outline-none transition-colors"
        >
          {ERA_OPTIONS.map((era) => (
            <option key={era} value={era}>
              {era}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-parchment-dim mb-1.5">Authenticity</label>
        <select
          value={authenticityGuess}
          onChange={(e) => setAuthenticityGuess(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-ink border border-line text-parchment focus:border-karat outline-none transition-colors"
        >
          {AUTHENTICITY_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <button disabled={loading} className="rh-btn-primary w-full py-2.5 disabled:opacity-50">
        {loading ? "Submitting..." : "Submit Classification"}
      </button>
      <p className="text-xs text-parchment-dim/70 leading-relaxed">
        First correct classification earns 100 Discovery Score. Later correct
        classifications earn 20. Each institution may submit once per asset.
      </p>
    </form>
  );
}
