import "./globals.css";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import Header from "../components/Header";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Rarehold — Where Rarity Competes",
  description: "A strategy game where human companies race against AI to claim the world's rarest digital-represented assets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body">
        <Header />
        {children}
      </body>
    </html>
  );
}
