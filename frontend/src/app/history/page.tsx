import ProtectedRoute from '@/Components/Auth/ProtectedRoute'
import TransactionHistoryPage from '@/Components/Dashboard/UserDashboard/TransactionHistoryPage'

export default function HistoryPage() {
    return (
        <ProtectedRoute>
            <TransactionHistoryPage />
        </ProtectedRoute>
    )
}

