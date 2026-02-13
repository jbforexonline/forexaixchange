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

export const metadata: Metadata = {
  metadataBase: new URL("https://forexaiexchange.com"),
  title: {
    default: "ForexAiXchange — Where Market Trading Meets AI",
    template: "%s | ForexAiXchange",
  },
  description:
    "ForexAiXchange is a spin-based forex gamification experience where players place predictions on Buy/Sell, Blue/Red, and High/Low Volatility—with an Indecision option when outcomes tie. Where Market Trading Meets AI.",
  applicationName: "ForexAiXchange",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: ["/favicon-32x32.png", "/favicon-16x16.png", "/favicon.ico"],
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://forexaiexchange.com",
    siteName: "ForexAiXchange",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ForexAiXchange — Where Market Trading Meets AI" }],
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
