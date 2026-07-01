import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-serif tracking-wide text-karat mb-4">
        RAREHOLD
      </h1>
      <p className="max-w-xl text-lg text-gray-300 mb-10">
        Form a company. Pool your Karat. Race against AI and rival companies
        to claim the world&apos;s rarest digital-represented assets — paintings,
        antiques, metals, and collectibles. Strength is earned, not bought.
      </p>

      <div className="flex gap-4">
        <Link
          href="/company/create"
          className="px-6 py-3 bg-karat text-ink font-semibold rounded-lg hover:opacity-90 transition"
        >
          Found a Company
        </Link>
        <Link
          href="/companies"
          className="px-6 py-3 border border-karat text-karat font-semibold rounded-lg hover:bg-karat hover:text-ink transition"
        >
          Browse Companies
        </Link>
      </div>

      <p className="mt-16 text-sm text-gray-500 max-w-md">
        All currency (Karat) is virtual and non-withdrawable. Rarehold is a
        strategy game — not an investment platform.
      </p>
    </main>
  );
}
