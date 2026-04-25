import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginPage from '../pages/LoginPage';
import QueuePage from '../pages/QueuePage';
import ClientSearchPage from '../pages/ClientSearchPage';
import ClientProfilePage from '../pages/ClientProfilePage';
import ComplaintsPage from '../pages/ComplaintsPage';
import ComplaintDetailPage from '../pages/ComplaintDetailPage';
import TicketsPage from '../pages/TicketsPage';
import OperationalRequestsPage from '../pages/OperationalRequestsPage';
import ComplaintsHistoryPage from '../pages/ComplaintsHistoryPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/queue" replace /> : <LoginPage />}
      />
      <Route
        path="/queue"
        element={<ProtectedRoute><QueuePage /></ProtectedRoute>}
      />
      <Route
        path="/clients"
        element={<ProtectedRoute><ClientSearchPage /></ProtectedRoute>}
      />
      <Route
        path="/clients/:customerId"
        element={<ProtectedRoute><ClientProfilePage /></ProtectedRoute>}
      />
      <Route
        path="/complaints"
        element={<ProtectedRoute><ComplaintsPage /></ProtectedRoute>}
      />
      <Route
        path="/complaints/:complaintId"
        element={<ProtectedRoute><ComplaintDetailPage /></ProtectedRoute>}
      />
      <Route
        path="/tickets"
        element={<ProtectedRoute><TicketsPage /></ProtectedRoute>}
      />
      <Route
        path="/operational-requests"
        element={<ProtectedRoute><OperationalRequestsPage /></ProtectedRoute>}
      />
      <Route
        path="/history"
        element={<ProtectedRoute><ComplaintsHistoryPage /></ProtectedRoute>}
      />
      <Route path="*" element={<Navigate to="/queue" replace />} />
    </Routes>
  );
}
