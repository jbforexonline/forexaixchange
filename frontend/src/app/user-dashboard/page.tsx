import UserDashboardLayout from '@/Components/Layout/UserDashboardLayout'
import UserDashboard from '@/Components/Dashboard/UserDashboard/UserDashboard'
import '@/Components/Layout/DashboardLayout.scss'

export default function UserDashboardPage() {
    return (
        <UserDashboardLayout>
            <UserDashboard />
        </UserDashboardLayout>
    )
}
