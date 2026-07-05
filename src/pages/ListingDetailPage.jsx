import { ArrowLeft, CalendarClock, MapPin, MessageCircle, Route, UsersRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { rides } from '../data/mockData.js';
import { useState } from 'react';
import { useAuth } from '../state/AuthContext.jsx';

export default function ListingDetailPage() {
  const { rideId } = useParams();
  const { currentUser, isAuthenticated } = useAuth();
  const isDriver = currentUser?.role === 'driver';
  const ride = rides.find((item) => item.id === rideId);
  const [sent, setSent] = useState(false);

  if (!ride) {
    return (
      <section className="page">
        <div className="empty-state glass">
          <h1>Ride not found</h1>
          <Link to="/" className="button">
            Back to marketplace
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page detail-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={18} />
        Back to rides
      </Link>
      <div className="detail-layout">
        <article className="detail-main glass">
          <img src={ride.image} alt="" className="detail-image" />
          <div className="detail-content">
            <span className="eyebrow">{ride.category}</span>
            <h1>{ride.title}</h1>
            <p>{ride.description}</p>
            <div className="route-box">
              <div>
                <MapPin size={18} />
                <span>Pickup</span>
                <strong>{ride.pickup}</strong>
              </div>
              <div>
                <Route size={18} />
                <span>Drop-off</span>
                <strong>{ride.dropoff}</strong>
              </div>
            </div>
            <div className="detail-list">
              <span>
                <CalendarClock size={18} />
                {ride.date}, {ride.time}
              </span>
              <span>
                <UsersRound size={18} />
                {ride.seats} seats available
              </span>
              <span>
                <Route size={18} />
                {ride.distance}
              </span>
            </div>
          </div>
        </article>
        <aside className="seller-panel glass">
          <img src={ride.seller.photoUrl} alt="" className="seller-photo" />
          <h2>{ride.seller.name}</h2>
          <p>{ride.seller.rating} rating across {ride.seller.rides} rides</p>
          <div className="price-box">
            <span>Seat price</span>
            <strong>${ride.price}</strong>
          </div>
          {!isAuthenticated && (
            <Link to="/login" className="button">
              <MessageCircle size={18} />
              Sign in to inquire
            </Link>
          )}
          {isAuthenticated && !isDriver && (
            <button type="button" className={sent ? 'button success' : 'button'} onClick={() => setSent(true)}>
              <MessageCircle size={18} />
              {sent ? 'Inquiry sent' : 'Send inquiry'}
            </button>
          )}
          {isDriver && (
            <Link to={`/rides/${ride.id}/edit`} className="button ghost">
              Edit mock listing
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
