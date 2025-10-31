import UserDashboardLayout from '@/Components/Layout/UserDashboardLayout'
import SpinPage from '@/Components/Dashboard/UserDashboard/SpinPage'
import '@/Components/Layout/DashboardLayout.scss'

export default function UserSpinPage() {
    return (
        <UserDashboardLayout>
            <SpinPage />
        </UserDashboardLayout>
    )
}

