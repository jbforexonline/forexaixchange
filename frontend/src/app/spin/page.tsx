import SpinPage from '@/Components/Dashboard/SpinPage'
import ProtectedRoute from '@/Components/Auth/ProtectedRoute'
import '@/Components/Styles/SpinPage.scss'

export default function Spin() {
    return (
        <ProtectedRoute>
            <SpinPage />
        </ProtectedRoute>
    )
}
