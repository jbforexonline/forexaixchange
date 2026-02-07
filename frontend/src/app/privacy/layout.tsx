import type { Metadata } from "next";

const BASE_URL = "https://forexaiexchange.com";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for ForexAiXchange.",
  alternates: { canonical: `${BASE_URL}/privacy` },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
