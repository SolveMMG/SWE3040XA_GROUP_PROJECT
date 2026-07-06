import { Check, Clock, CreditCard, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../state/AuthContext.jsx';

function statusClass(status) {
  const map = { pending: 'pending', accepted: 'success', declined: 'danger', paid: 'success' };
  return map[status] || '';
}

export default function InquiriesPage() {
  const { currentUser } = useAuth();
  const isDriver = currentUser?.role === 'driver';
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState(null);
  const [phone, setPhone] = useState('');

  const load = () => {
    setLoading(true);
    api
      .get('/bookings')
      .then(({ data }) => setBookings(data.bookings || []))
      .catch(() => setError('Could not load bookings.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const respond = async (id, action) => {
    setError('');
    try {
      await api.patch(`/bookings/${id}/${action}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Action failed.');
    }
  };

  const initiatePay = async (bookingId) => {
    if (!phone.trim()) return;
    setError('');
    try {
      await api.post('/payments/initiate', { booking_id: bookingId, phone: phone.trim() });
      setPayingId(null);
      setPhone('');
      alert('M-Pesa STK push sent to your phone. Enter your PIN to complete payment.');
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Payment initiation failed.');
    }
  };

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{isDriver ? 'Received ride requests' : 'My ride bookings'}</span>
          <h1>{isDriver ? 'Review passenger requests.' : 'Track your ride bookings.'}</h1>
        </div>
      </div>

      {loading && <div className="state-bar glass">Loading bookings...</div>}
      {error && <div className="state-bar danger">{error}</div>}

      <div className="inquiry-list">
        {!loading && bookings.length === 0 && (
          <div className="empty-state glass">
            <h2>No bookings yet</h2>
            <p>
              {isDriver
                ? 'Passengers will appear here when they request your rides.'
                : 'Browse rides and send a booking request.'}
            </p>
          </div>
        )}

        {bookings.map((b) => (
          <article className="inquiry-card glass" key={b.id}>
            <div>
              <div className="card-topline">
                <span>{new Date(b.created_at).toLocaleDateString()}</span>
                <span className={`status ${statusClass(b.status)}`}>{b.status}</span>
              </div>
              <h2>
                {b.ride?.origin} → {b.ride?.destination}
              </h2>
              <p>
                {b.seats_requested} seat{b.seats_requested > 1 ? 's' : ''} · KES {b.total_price}
              </p>
            </div>

            {isDriver && b.status === 'pending' && (
              <div className="action-row">
                <button type="button" className="button success" onClick={() => respond(b.id, 'accept')}>
                  <Check size={18} />
                  Accept
                </button>
                <button type="button" className="button danger" onClick={() => respond(b.id, 'decline')}>
                  <X size={18} />
                  Decline
                </button>
              </div>
            )}

            {!isDriver && b.status === 'accepted' && (
              payingId === b.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    type="tel"
                    placeholder="254712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <div className="action-row">
                    <button className="button" onClick={() => initiatePay(b.id)}>
                      <CreditCard size={18} />
                      Pay via M-Pesa
                    </button>
                    <button className="button ghost" onClick={() => setPayingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="button" onClick={() => setPayingId(b.id)}>
                  <CreditCard size={18} />
                  Pay KES {b.total_price}
                </button>
              )
            )}

            {b.status === 'paid' && (
              <div className="status-note">
                <Check size={18} />
                Payment confirmed
              </div>
            )}

            {b.status === 'pending' && !isDriver && (
              <div className="status-note">
                <Clock size={18} />
                Awaiting driver response
              </div>
            )}

            {b.status === 'declined' && (
              <div className="status-note">
                <X size={18} />
                Booking declined
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
