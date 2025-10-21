import DashboardLayout from '@/Components/Layout/DashboardLayout'
import DashboardHome from '@/Components/Dashboard/DashboardHome'
import '@/Components/Layout/DashboardLayout.scss'
import '@/Components/Dashboard/DashboardHome.scss'

export default function DashboardPage() {
    return (
        <DashboardLayout>
            <DashboardHome />
        </DashboardLayout>
    )
}