"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import BackButton from "../../components/BackButton";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });

    setLoading(false);

    if (otpErr) {
      setError(otpErr.message);
      return;
    }

    setSent(true);
  }

  return (
    <main className="min-h-[calc(100vh-73px)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <BackButton fallbackHref="/" />
        <div className="rh-card p-8">
          <p className="rh-eyebrow mb-2">Member Access</p>
          <h1 className="text-2xl font-display text-parchment mb-2">Welcome to Rarehold</h1>

          {!sent ? (
            <>
              <p className="text-sm text-parchment-dim mb-6">
                Enter your email to receive a login link.
              </p>
              <form onSubmit={sendMagicLink}>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full mb-4 px-3 py-2.5 rounded-lg bg-ink border border-line text-parchment placeholder:text-parchment-dim/50 focus:border-karat outline-none transition-colors"
                />
                {error && <p className="text-danger text-sm mb-4">{error}</p>}
                <button
                  disabled={loading}
                  className="rh-btn-primary w-full py-3 disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Login Link"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-parchment mb-2">Check your inbox 📬</p>
              <p className="text-sm text-parchment-dim">
                We sent a login link to <strong className="text-parchment">{email}</strong>. Open it on
                this device to sign in.
              </p>
              <button
                onClick={() => setSent(false)}
                className="rh-btn-ghost mt-6 text-sm"
              >
                Use a different email
              </button>
            </div>
          )}

          <p className="mt-6 text-xs text-parchment-dim/60 text-center leading-relaxed">
            New here? Clicking the link automatically creates your account
            with 10,000 starting Karat.
          </p>
        </div>
      </div>
    </main>
  );
}
