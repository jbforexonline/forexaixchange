import type { Metadata } from "next";
import HowItWorksPage from "@/Components/HowItWorksPage";

const BASE_URL = "https://forexaiexchange.com";

export const metadata: Metadata = {
  title: "How It Works | ForexAiXchange",
  description:
    "Learn how the ForexAiXchange forex spin gamification platform works: Buy/Sell, Blue/Red, High/Low Volatility and Indecision pairs, x2-style payouts, spin timers and AI market insights.",
  alternates: { canonical: `${BASE_URL}/how-it-works` },
  openGraph: {
    title: "How It Works | ForexAiXchange",
    description:
      "Detailed explanation of the ForexAiXchange forex game: spin-based plays, betting pairs, Indecision logic, payouts and AI market suggestions.",
    url: `${BASE_URL}/how-it-works`,
    siteName: "ForexAiXchange",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ForexAiXchange — Where Market Trading Meets AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How It Works | ForexAiXchange",
    description:
      "See how ForexAiXchange structures forex spins with Buy/Sell, Blue/Red, High/Low Volatility and Indecision, plus AI market insights.",
    images: ["/og.png"],
  },
};

export default function HowItWorksRoute() {
  return <HowItWorksPage />;
}

