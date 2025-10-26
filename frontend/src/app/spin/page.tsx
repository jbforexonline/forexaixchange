import DashboardLayout from '@/Components/Layout/DashboardLayout'
import SpinPage from '@/Components/Dashboard/SpinPage'
import '@/Components/Layout/DashboardLayout.scss'
import '@/Components/Styles/SpinPage.scss'

export default function Spin() {
    return (
        <DashboardLayout>
            <SpinPage />
        </DashboardLayout>
    )
}
