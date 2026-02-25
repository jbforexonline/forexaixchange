import type { Metadata } from "next";
import AboutPage from "@/Components/AboutPage";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://forexaiexchange.com";

export const metadata: Metadata = {
  title: "About Us | ForexAiXchange",
  description:
    "Learn about ForexAiXchange: our mission, vision, and values. AI-powered spin-based forex prediction, fairness, transparency, and community-first approach.",
  alternates: { canonical: `${BASE_URL}/about` },
  openGraph: {
    title: "About Us | ForexAiXchange",
    description:
      "ForexAiXchange — Where Forex meets AI-powered gaming. Our mission, vision, and what makes us different.",
    url: `${BASE_URL}/about`,
    siteName: "ForexAiXchange",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ForexAiXchange — Where Market Trading Meets AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us | ForexAiXchange",
    description: "About ForexAiXchange: mission, vision, and values. Spin-based forex prediction with AI.",
    images: ["/og.png"],
  },
};

export default function AboutRoute() {
  return <AboutPage />;
}
