import UserDashboardLayout from '@/Components/Layout/UserDashboardLayout'
import TransactionHistoryPage from '@/Components/Dashboard/UserDashboard/TransactionHistoryPage'
import ProtectedRoute from '@/Components/Auth/ProtectedRoute'

export default function UserHistoryPage() {
    return (
        <ProtectedRoute>
            <UserDashboardLayout>
                <TransactionHistoryPage />
            </UserDashboardLayout>
        </ProtectedRoute>
    )
}

