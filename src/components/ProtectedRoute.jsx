import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';

export default function ProtectedRoute({ children, role }) {
  const location = useLocation();
  const { currentUser, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && currentUser.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
