import type { Metadata } from "next";

const BASE_URL = "https://forexaiexchange.com";

export const metadata: Metadata = {
  title: "Login — ForexAiXchange",
  description: "Login to your ForexAiXchange account to access spin-based forex gamification rounds and your history.",
  alternates: { canonical: `${BASE_URL}/login` },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

