"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

interface Profile {
  username: string;
  karat_wallet: number;
}

export default function Header() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("username, karat_wallet")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data as Profile);
      setLoading(false);
    }

    loadProfile();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2e]">
      <Link href="/" className="text-xl font-serif text-karat tracking-wide">
        RAREHOLD
      </Link>

      <div className="flex items-center gap-4">
        {loading ? null : profile ? (
          <>
            <span className="text-sm text-gray-300">{profile.username}</span>
            <span className="text-sm text-karat font-semibold">
              {profile.karat_wallet.toLocaleString()} Karat
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-300"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 bg-karat text-ink text-sm font-semibold rounded-lg hover:opacity-90 transition"
          >
            Log In
          </Link>
        )}
      </div>
    </header>
  );
}
