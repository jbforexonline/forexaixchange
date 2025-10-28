import UserDashboardLayout from '@/Components/Layout/UserDashboardLayout'
import SettingsPage from '@/Components/Dashboard/UserDashboard/SettingsPage'
import '@/Components/Layout/DashboardLayout.scss'

export default function UserSettingsPage() {
    return (
        <UserDashboardLayout>
            <SettingsPage />
        </UserDashboardLayout>
    )
}
