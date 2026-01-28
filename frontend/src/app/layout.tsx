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
  title: "ForexAI Exchange",
  description: "AI-Powered Forex Trading Platform",
  icons: {
    icon: "/image/logo.png",
    shortcut: "/image/logo.png",
    apple: "/image/logo.png",
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
