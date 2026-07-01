import "./globals.css";

export const metadata = {
  title: "Rarehold — Where Rarity Competes",
  description: "A strategy game where human companies race against AI to claim the world's rarest digital-represented assets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
