import type { Metadata } from "next";
import FAQPage from "@/Components/FAQPage";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://forexaiexchange.com";

export const metadata: Metadata = {
  title: "FAQ | ForexAiXchange",
  description:
    "Frequently asked questions about ForexAiXchange: spin game, accounts, deposits, withdrawals, premium, affiliate program, and support.",
  alternates: { canonical: `${BASE_URL}/faq` },
  openGraph: {
    title: "FAQ | ForexAiXchange",
    description: "Frequently asked questions about ForexAiXchange.",
    url: `${BASE_URL}/faq`,
    siteName: "ForexAiXchange",
    type: "website",
  },
};

export default function FAQRoute() {
  return <FAQPage />;
}
