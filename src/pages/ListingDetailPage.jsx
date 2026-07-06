import { ArrowLeft, CalendarClock, Check, MapPin, Route, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../state/AuthContext.jsx';

export default function ListingDetailPage() {
  const { rideId } = useParams();
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [booking, setBooking] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get(`/rides/${rideId}`)
      .then(({ data }) => setRide(data.ride))
      .catch(() => setFetchError('Ride not found.'))
      .finally(() => setLoading(false));
  }, [rideId]);

  const isDriver = currentUser?.role === 'driver';
  const isOwnRide = ride?.driver?.id === currentUser?.id;

  const requestBooking = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setSubmitting(true);
    setBookingError('');
    try {
      const { data } = await api.post('/bookings', { ride_id: rideId, seats_requested: seats });
      setBooking(data.booking);
    } catch (err) {
      setBookingError(err.response?.data?.error?.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="page">
        <div className="state-bar glass">Loading ride...</div>
      </section>
    );
  }

  if (!ride || fetchError) {
    return (
      <section className="page">
        <div className="empty-state glass">
          <h1>{fetchError || 'Ride not found'}</h1>
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
          <div className="detail-content">
            <span className="eyebrow">{ride.category || 'Commute'}</span>
            <h1>
              {ride.origin} → {ride.destination}
            </h1>
            <div className="route-box">
              <div>
                <MapPin size={18} />
                <span>Origin</span>
                <strong>{ride.origin}</strong>
              </div>
              <div>
                <Route size={18} />
                <span>Destination</span>
                <strong>{ride.destination}</strong>
              </div>
            </div>
            <div className="detail-list">
              <span>
                <CalendarClock size={18} />
                {new Date(ride.departure_time).toLocaleString()}
              </span>
              <span>
                <UsersRound size={18} />
                {ride.seats_available} seats available
              </span>
            </div>
          </div>
        </article>

        <aside className="seller-panel glass">
          {ride.driver?.photo_url && (
            <img src={ride.driver.photo_url} alt="" className="seller-photo" />
          )}
          <h2>{ride.driver?.name}</h2>
          <p>
            {ride.driver?.avg_rating
              ? `${Number(ride.driver.avg_rating).toFixed(1)} ★ rating`
              : 'No ratings yet'}
          </p>
          <div className="price-box">
            <span>Seat price</span>
            <strong>KES {ride.price_per_seat}</strong>
          </div>

          {booking ? (
            <div className="state-bar success">
              <Check size={18} /> Booking requested — awaiting driver approval.
            </div>
          ) : isOwnRide ? (
            <Link to={`/rides/${ride.id}/edit`} className="button ghost">
              Edit ride
            </Link>
          ) : isDriver ? (
            <p className="security-note">Drivers cannot book rides.</p>
          ) : (
            <>
              <label>
                Seats
                <input
                  type="number"
                  min="1"
                  max={ride.seats_available}
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                />
              </label>
              {bookingError && <div className="state-bar danger">{bookingError}</div>}
              {!isAuthenticated ? (
                <Link to="/login" className="button">
                  Sign in to book
                </Link>
              ) : (
                <button className="button" disabled={submitting} onClick={requestBooking}>
                  {submitting ? 'Requesting...' : 'Request booking'}
                </button>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
