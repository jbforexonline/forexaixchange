import type { Metadata } from "next";
import LandingClient from "@/Components/Landing/LandingClient";

const BASE_URL = "https://forexaiexchange.com";

export const metadata: Metadata = {
  title:
    "ForexAiXchange | Forex Spin Gamification | Buy/Sell • Blue/Red • High/Low Volatility",
  description:
    "ForexAiXchange is a spin-based forex gamification experience where players place predictions on Buy/Sell, Blue/Red, and High/Low Volatility—with an Indecision option when outcomes tie. Where Market Trading Meets AI.",
  keywords: [
    "forexaiexchange",
    "forex game",
    "forex spin",
    "forex ai",
    "buy and sell",
    "blue and red",
    "high volatile",
    "low volatile",
    "indecision",
    "spin timer",
    "spin history",
    "forex pair market",
  ],
  alternates: { canonical: BASE_URL },
  openGraph: {
    title:
      "ForexAiXchange | Forex Spin Gamification | Buy/Sell • Blue/Red • High/Low Volatility",
    description:
      "Spin-based forex gamification where players place predictions on Buy/Sell, Blue/Red, and High/Low Volatility—with an Indecision option when outcomes tie.",
    url: BASE_URL,
    siteName: "ForexAiXchange",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ForexAiXchange — Where Market Trading Meets AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "ForexAiXchange | Forex Spin Gamification | Buy/Sell • Blue/Red • High/Low Volatility",
    description:
      "Spin-based forex gamification with Buy/Sell, Blue/Red, High/Low Volatility and an Indecision option when outcomes tie.",
    images: ["/og.png"],
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
    "Spin-based forex gamification where players place predictions on Buy/Sell, Blue/Red, and High/Low Volatility, plus an Indecision option when outcomes tie.",
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
