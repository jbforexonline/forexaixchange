import DashboardLayout from '@/Components/Layout/DashboardLayout'
import CheckoutPage from '@/Components/Dashboard/Checkout'
import '@/Components/Layout/DashboardLayout.scss'

export default function DepositCheckoutPage() {
  return (
    <DashboardLayout>
      <CheckoutPage />
    </DashboardLayout>
  )
}
