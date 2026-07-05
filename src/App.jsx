import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import CreateListingPage from './pages/CreateListingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InquiriesPage from './pages/InquiriesPage.jsx';
import ListingDetailPage from './pages/ListingDetailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MarketplacePage from './pages/MarketplacePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route index element={<MarketplacePage />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="rides/:rideId" element={<ListingDetailPage />} />
        <Route
          path="rides/new"
          element={
            <ProtectedRoute role="driver">
              <CreateListingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="rides/:rideId/edit"
          element={
            <ProtectedRoute role="driver">
              <CreateListingPage mode="edit" />
            </ProtectedRoute>
          }
        />
        <Route
          path="inquiries"
          element={
            <ProtectedRoute>
              <InquiriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
