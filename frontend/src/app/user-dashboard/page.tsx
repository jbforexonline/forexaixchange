import DashboardLayout from '@/Components/Layout/DashboardLayout'
import UserDashboard from '@/Components/Dashboard/UserDashboard'
import '@/Components/Layout/DashboardLayout.scss'

export default function UserDashboardPage() {
    return (
        <DashboardLayout>
            <UserDashboard />
        </DashboardLayout>
    )
}
