import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../Components/Styles/LogIn.scss";
import "../Components/Styles/Register.scss";
import "../styles/wallet-theme.css";
import RoleBasedLayout from "@/Components/Layout/RoleBasedLayout";
import { DemoProvider } from "@/context/DemoContext";
import { ToastProvider } from "@/Components/Common/Toast/ToastContext";
import LegalReAcceptModal from "@/Components/Legal/LegalReAcceptModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://forexaiexchange.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "ForexAiXchange – Forex Gamification Platform & AI Forex Trading Game",
    template: "%s | ForexAiXchange",
  },
  description:
    "Forex gamification platform and forex simulation game. AI-driven rounds in a risk-free environment. ForexAiXchange.",
  applicationName: "ForexAiXchange",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: ["/favicon.ico", "/image/logo.png"],
    shortcut: "/image/logo.png",
    apple: "/image/logo.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "ForexAiXchange",
    images: [{ url: "/image/logo.png", width: 512, height: 512, alt: "ForexAiXchange" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@forexaixchange",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ToastProvider>
          <DemoProvider>
            <RoleBasedLayout>{children}</RoleBasedLayout>
            <LegalReAcceptModal />
          </DemoProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
