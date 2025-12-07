"use client";
import DashboardLayout from '@/Components/Layout/DashboardLayout'
import DashboardHome from '@/Components/Dashboard/DashboardHome'
import ProtectedRoute from '@/Components/ProtectedRoute'
import '@/Components/Layout/DashboardLayout.scss'
import '@/Components/Styles/DashboardHome.scss'

export default function DashboardPage() {
    return (
        <ProtectedRoute requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <DashboardLayout>
                <DashboardHome />
            </DashboardLayout>
        </ProtectedRoute>
    )
}