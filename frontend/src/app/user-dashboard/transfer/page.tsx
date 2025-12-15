import UserDashboardLayout from '@/Components/Layout/UserDashboardLayout'
import TransferPage from '@/Components/Dashboard/UserDashboard/TransferPage'
import ProtectedRoute from '@/Components/Auth/ProtectedRoute'
import '@/Components/Layout/DashboardLayout.scss'

export default function UserTransferPage() {
    return (
        <ProtectedRoute>
            <UserDashboardLayout>
                <TransferPage />
            </UserDashboardLayout>
        </ProtectedRoute>
    )
}

