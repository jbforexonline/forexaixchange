import UserDashboardLayout from '@/Components/Layout/UserDashboardLayout'
import DepositPage from '@/Components/Dashboard/UserDashboard/DepositPage'
import '@/Components/Layout/DashboardLayout.scss'

export default function UserDepositPage() {
    return (
        <UserDashboardLayout>
            <DepositPage />
        </UserDashboardLayout>
    )
}

