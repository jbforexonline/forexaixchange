// This checkout flow depends on client-side search params,
// so mark the route as fully dynamic to avoid prerender errors.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { Suspense } from "react";
import CheckoutPage from "@/Components/Dashboard/Checkout";

export default function DepositCheckoutPage() {
  return (
    <Suspense fallback={<div>Loading checkout...</div>}>
      <CheckoutPage />
    </Suspense>
  );
}
