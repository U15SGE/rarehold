"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setLoading(false);

    if (otpErr) {
      setError(otpErr.message);
      return;
    }

    setMessage(`We sent a 6-digit code to ${email}.`);
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    setLoading(false);

    if (verifyErr) {
      setError(verifyErr.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-[#17171a] border border-[#2a2a2e] rounded-xl p-8">
        <h1 className="text-2xl font-serif text-karat mb-2">Welcome to Rarehold</h1>
        <p className="text-sm text-gray-400 mb-6">
          {step === "email"
            ? "Enter your email to get a login code."
            : "Enter the 6-digit code we sent you."}
        </p>

        {step === "email" ? (
          <form onSubmit={sendOtp}>
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
              {loading ? "Sending..." : "Send Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            {message && <p className="text-sm text-gray-400 mb-4">{message}</p>}
            <input
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full mb-4 px-3 py-2 rounded bg-[#0e0e10] border border-[#2a2a2e] text-white tracking-widest text-center text-lg"
            />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button
              disabled={loading}
              className="w-full py-3 bg-karat text-ink font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Enter"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-300"
            >
              Use a different email
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-gray-600 text-center">
          New here? Verifying the code automatically creates your account
          with 10,000 starting Karat.
        </p>
      </div>
    </main>
  );
}
