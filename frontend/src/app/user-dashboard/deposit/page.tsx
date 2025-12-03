import UserDashboardLayout from '@/Components/Layout/UserDashboardLayout'
import DepositPage from '@/Components/Dashboard/UserDashboard/DepositPage'
import ProtectedRoute from '@/Components/Auth/ProtectedRoute'
import '@/Components/Layout/DashboardLayout.scss'

export default function UserDepositPage() {
    return (
        <ProtectedRoute>
            <UserDashboardLayout>
                <DepositPage />
            </UserDashboardLayout>
        </ProtectedRoute>
    )
}

