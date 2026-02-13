import type { Metadata } from "next";

const BASE_URL = "https://forexaiexchange.com";

export const metadata: Metadata = {
  title: "Create Account — ForexAiXchange",
  description: "Create your ForexAiXchange account to start exploring spin-based forex gamification with Buy/Sell, Blue/Red, and High/Low Volatility predictions.",
  alternates: { canonical: `${BASE_URL}/register` },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

