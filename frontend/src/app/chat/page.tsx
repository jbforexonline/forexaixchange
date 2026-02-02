import UserDashboardLayout from '@/Components/Layout/UserDashboardLayout';
import ChatRoom from '@/Components/Dashboard/UserDashboard/ChatRoom';
import ProtectedRoute from '@/Components/Auth/ProtectedRoute';
import '@/Components/Layout/DashboardLayout.scss';

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <UserDashboardLayout>
        <ChatRoom />
      </UserDashboardLayout>
    </ProtectedRoute>
  );
}
