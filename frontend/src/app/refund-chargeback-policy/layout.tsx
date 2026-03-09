import type { Metadata } from "next";

const BASE_URL = "https://forexaiexchange.com";

export const metadata: Metadata = {
  title: "Refund & Chargeback Policy",
  description: "Refund, chargeback, AML, and fraud prevention policy for ForexAiXchange.",
  alternates: { canonical: `${BASE_URL}/refund-chargeback-policy` },
};

export default function RefundChargebackPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
