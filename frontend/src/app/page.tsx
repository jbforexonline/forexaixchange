import type { Metadata } from "next";
import LandingClient from "@/Components/Landing/LandingClient";

const BASE_URL = "https://forexaiexchange.com";

export const metadata: Metadata = {
  title: "Forex Gamification Platform | AI Forex Trading Game | ForexAiXchange",
  description:
    "ForexAiXchange is a forex gamification platform and forex simulation game. Trade with AI-driven rounds in a risk-free forex trading game environment.",
  keywords: [
    "forex gamification platform",
    "forex trading game",
    "AI forex platform",
    "forex simulation game",
    "forex AI",
    "ForexAiXchange",
  ],
  alternates: { canonical: BASE_URL },
  openGraph: {
    title: "ForexAiXchange – Forex Gamification Platform & AI Forex Trading Game",
    description:
      "Forex gamification platform and forex simulation game. AI-driven rounds, risk-free forex trading game.",
    url: BASE_URL,
    siteName: "ForexAiXchange",
    type: "website",
    images: [{ url: "/image/logo.png", width: 512, height: 512, alt: "ForexAiXchange" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ForexAiXchange – Forex Gamification Platform & AI Forex Trading Game",
    description: "Forex gamification platform and forex simulation game.",
    images: ["/image/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ForexAiXchange",
  url: BASE_URL,
  logo: `${BASE_URL}/image/logo.png`,
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ForexAiXchange",
  url: BASE_URL,
  description:
    "Forex gamification platform and forex simulation game. AI-driven rounds in a risk-free environment.",
  publisher: { "@id": `${BASE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", url: `${BASE_URL}/login` },
    "query-input": "required name=search_term_string",
  },
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { ...organizationSchema, "@id": `${BASE_URL}/#organization` },
      websiteSchema,
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingClient />
    </>
  );
}
