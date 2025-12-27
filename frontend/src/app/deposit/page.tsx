import ProtectedRoute from '@/Components/Auth/ProtectedRoute'
import DepositPage from '@/Components/Dashboard/UserDashboard/DepositPage'

export default function Deposit() {
    return (
        <ProtectedRoute>
            <DepositPage />
        </ProtectedRoute>
    )
}
