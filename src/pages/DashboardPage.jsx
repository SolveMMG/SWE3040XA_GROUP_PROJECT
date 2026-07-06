import { CarFront, ClipboardList, MapPinned, Plus, ShieldCheck, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../state/AuthContext.jsx';

function DashboardCard({ icon, label, value }) {
  return (
    <div className="dashboard-card glass">
      <span className="dashboard-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const isDriver = currentUser?.role === 'driver';
  const [stats, setStats] = useState({ rides: null, bookings: null, pending: null });

  useEffect(() => {
    Promise.all([api.get('/rides'), api.get('/bookings')])
      .then(([ridesRes, bookingsRes]) => {
        const rides = ridesRes.data.rides || [];
        const bookings = bookingsRes.data.bookings || [];
        setStats({
          rides: rides.length,
          bookings: bookings.length,
          pending: bookings.filter((b) => b.status === 'pending').length,
        });
      })
      .catch(() => {});
  }, [isDriver]);

  const avgRating = currentUser?.avg_rating
    ? `${Number(currentUser.avg_rating).toFixed(1)} ★`
    : 'New';

  const driverCards = [
    { label: 'Your ride offers', value: stats.rides, icon: <CarFront size={22} /> },
    { label: 'Pending requests', value: stats.pending, icon: <ClipboardList size={22} /> },
    { label: 'Average rating', value: avgRating, icon: <Star size={22} /> },
  ];

  const passengerCards = [
    { label: 'Available rides', value: stats.rides, icon: <MapPinned size={22} /> },
    { label: 'Your bookings', value: stats.bookings, icon: <ClipboardList size={22} /> },
    { label: 'Average rating', value: avgRating, icon: <Star size={22} /> },
  ];

  return (
    <section className="page dashboard-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{isDriver ? 'Driver dashboard' : 'Passenger dashboard'}</span>
          <h1>{isDriver ? 'Manage your rides and requests.' : 'Find rides and track your trips.'}</h1>
        </div>
      </div>

      <div className="dashboard-grid">
        {(isDriver ? driverCards : passengerCards).map((card) => (
          <DashboardCard key={card.label} {...card} />
        ))}
      </div>

      <div className="dashboard-actions glass">
        <div>
          <ShieldCheck size={24} />
          <h2>{isDriver ? 'Driver functions' : 'Passenger functions'}</h2>
          <p>
            {isDriver
              ? 'Offer a new ride, respond to passenger requests, or update your driver profile.'
              : 'Browse available rides, check booking status, or update your profile.'}
          </p>
        </div>
        <div className="action-row">
          {isDriver ? (
            <>
              <Link to="/rides/new" className="button">
                <Plus size={18} />
                Offer ride
              </Link>
              <Link to="/bookings" className="button ghost">
                Ride requests
              </Link>
              <Link to="/profile" className="button ghost">
                Driver profile
              </Link>
            </>
          ) : (
            <>
              <Link to="/" className="button">
                Browse rides
              </Link>
              <Link to="/bookings" className="button ghost">
                My bookings
              </Link>
              <Link to="/profile" className="button ghost">
                My profile
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
