"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

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
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-[#17171a] border border-[#2a2a2e] rounded-xl p-8">
        <h1 className="text-2xl font-serif text-karat mb-2">Welcome to Rarehold</h1>

        {!sent ? (
          <>
            <p className="text-sm text-gray-400 mb-6">
              Enter your email to get a login link.
            </p>
            <form onSubmit={sendMagicLink}>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full mb-4 px-3 py-2 rounded bg-[#0e0e10] border border-[#2a2a2e] text-white"
              />
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <button
                disabled={loading}
                className="w-full py-3 bg-karat text-ink font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Login Link"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <p className="text-gray-300 mb-2">Check your inbox 📬</p>
            <p className="text-sm text-gray-500">
              We sent a login link to <strong>{email}</strong>. Open it on
              this device to sign in.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-6 text-sm text-gray-500 hover:text-gray-300"
            >
              Use a different email
            </button>
          </div>
        )}

        <p className="mt-6 text-xs text-gray-600 text-center">
          New here? Clicking the link automatically creates your account
          with 10,000 starting Karat.
        </p>
      </div>
    </main>
  );
}
