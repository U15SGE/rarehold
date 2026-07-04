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
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 border-b border-line bg-ink/85 backdrop-blur-md">
      <Link
        href="/"
        className="text-lg font-display tracking-[0.15em] text-karat uppercase"
      >
        Rarehold
      </Link>

      <nav className="flex items-center gap-6 md:gap-8">
        <Link href="/auctions" className="hidden sm:inline text-sm text-parchment-dim hover:text-karat transition-colors">
          Auctions
        </Link>
        <Link href="/companies" className="hidden sm:inline text-sm text-parchment-dim hover:text-karat transition-colors">
          Companies
        </Link>

        <div className="flex items-center gap-4">
          {loading ? null : profile ? (
            <>
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-xs text-parchment-dim">{profile.username}</span>
                <span className="text-sm font-mono text-karat font-medium">
                  {profile.karat_wallet.toLocaleString()} Karat
                </span>
              </div>
              <button onClick={handleLogout} className="rh-btn-ghost text-sm">
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="rh-btn-primary px-5 py-2 text-sm">
              Log In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
