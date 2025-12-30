import SpinPage from '@/Components/Dashboard/SpinPage'
import ProtectedRoute from '@/Components/Auth/ProtectedRoute'
import '@/Components/Styles/SpinPage.scss'

// Full-screen gaming experience
export default function Spin() {
    return (
        <ProtectedRoute>
            <SpinPage />
        </ProtectedRoute>
    )
}
