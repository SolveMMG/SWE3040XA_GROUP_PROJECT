import { CarFront, ClipboardList, MapPinned, Plus, ShieldCheck, Star, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { inquiries, rides } from '../data/mockData.js';
import { useAuth } from '../state/AuthContext.jsx';

function DashboardCard({ icon, label, value }) {
  return (
    <div className="dashboard-card glass">
      <span className="dashboard-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const isDriver = currentUser.role === 'driver';

  const driverCards = [
    { label: 'Active ride offers', value: rides.length, icon: <CarFront size={22} /> },
    { label: 'Pending requests', value: inquiries.received.filter((item) => item.status === 'Pending').length, icon: <ClipboardList size={22} /> },
    { label: 'Average rating', value: currentUser.rating || 'New', icon: <Star size={22} /> },
  ];

  const customerCards = [
    { label: 'Available rides', value: rides.length, icon: <MapPinned size={22} /> },
    { label: 'Sent inquiries', value: inquiries.sent.length, icon: <ClipboardList size={22} /> },
    { label: 'Payment method', value: currentUser.customerProfile?.preferredPayment || 'Not set', icon: <WalletCards size={22} /> },
  ];

  return (
    <section className="page dashboard-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{isDriver ? 'Driver dashboard' : 'Customer dashboard'}</span>
          <h1>{isDriver ? 'Manage your rides and requests.' : 'Find rides and track your trips.'}</h1>
          <p className="dashboard-copy">
            {isDriver
              ? 'Your driver tools focus on publishing rides, reviewing incoming inquiries, and keeping vehicle details current.'
              : 'Your customer tools focus on searching for rides, sending inquiries, and managing trip activity.'}
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        {(isDriver ? driverCards : customerCards).map((card) => (
          <DashboardCard key={card.label} {...card} />
        ))}
      </div>

      <div className="dashboard-actions glass">
        <div>
          <ShieldCheck size={24} />
          <h2>{isDriver ? 'Driver functions' : 'Customer functions'}</h2>
          <p>
            {isDriver
              ? 'Offer a new ride, respond to rider inquiries, or update your driver profile details.'
              : 'Browse available rides, check inquiry status, or update your customer profile.'}
          </p>
        </div>
        <div className="action-row">
          {isDriver ? (
            <>
              <Link to="/rides/new" className="button">
                <Plus size={18} />
                Offer ride
              </Link>
              <Link to="/inquiries" className="button ghost">
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
              <Link to="/inquiries" className="button ghost">
                My inquiries
              </Link>
              <Link to="/profile" className="button ghost">
                Customer profile
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
