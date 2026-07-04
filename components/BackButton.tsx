"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ label = "Back", fallbackHref }: { label?: string; fallbackHref?: string }) {
  const router = useRouter();

  function handleClick() {
    if (fallbackHref && window.history.length <= 2) {
      router.push(fallbackHref);
    } else {
      router.back();
    }
  }

  return (
    <button
      onClick={handleClick}
      className="rh-btn-ghost inline-flex items-center gap-2 text-sm mb-6"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}
