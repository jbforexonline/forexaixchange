import type { Metadata } from "next";

const BASE_URL = "https://forexaiexchange.com";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for ForexAiXchange.",
  alternates: { canonical: `${BASE_URL}/terms` },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
