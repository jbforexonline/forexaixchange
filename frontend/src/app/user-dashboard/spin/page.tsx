import SpinPage from '@/Components/Dashboard/SpinPage'
import ProtectedRoute from '@/Components/Auth/ProtectedRoute'
import '@/Components/Styles/SpinPage.scss'

// Full-screen gaming experience - no sidebar wrapper
export default function UserSpinPage() {
    return (
        <ProtectedRoute>
            <SpinPage />
        </ProtectedRoute>
    )
}
