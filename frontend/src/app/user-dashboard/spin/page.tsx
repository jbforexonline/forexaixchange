import UserDashboardLayout from '@/Components/Layout/UserDashboardLayout'
import SpinPage from '@/Components/Dashboard/UserDashboard/SpinPage'
import ProtectedRoute from '@/Components/Auth/ProtectedRoute'
import '@/Components/Layout/DashboardLayout.scss'

export default function UserSpinPage() {
    return (
        <ProtectedRoute>
            <UserDashboardLayout>
                <SpinPage />
            </UserDashboardLayout>
        </ProtectedRoute>
    )
}

