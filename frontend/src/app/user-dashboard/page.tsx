import UserDashboardLayout from '@/Components/Layout/UserDashboardLayout'
import UserDashboard from '@/Components/Dashboard/UserDashboard/UserDashboard'
import ProtectedRoute from '@/Components/Auth/ProtectedRoute'
import '@/Components/Layout/DashboardLayout.scss'

export default function UserDashboardPage() {
    return (
        <ProtectedRoute>
            <UserDashboardLayout>
                <UserDashboard />
            </UserDashboardLayout>
        </ProtectedRoute>
    )
}
