"use client";
import DashboardLayout from '@/Components/Layout/DashboardLayout'
import SpinPage from '@/Components/Dashboard/SpinPage'
import ProtectedRoute from '@/Components/ProtectedRoute'
import '@/Components/Layout/DashboardLayout.scss'
import '@/Components/Styles/SpinPage.scss'

export default function Spin() {
    return (
        <ProtectedRoute requireAuth={true}>
            <DashboardLayout>
                <SpinPage />
            </DashboardLayout>
        </ProtectedRoute>
    )
}
