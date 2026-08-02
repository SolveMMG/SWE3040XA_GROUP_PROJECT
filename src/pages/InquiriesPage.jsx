import { Check, Clock, Inbox, LogIn, RefreshCw, Send, Star, WalletCards, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../state/AuthContext.jsx';
import { formatKSh } from '../utils/googleMaps.js';

function ReviewModal({ booking, onClose, onSubmit }) {
  const [rating, setRating]   = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving]   = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setSaving(true);
    await onSubmit({ bookingId: booking.id, driverId: booking.driver?.id, rating, comment });
    setSaving(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass" style={{ maxWidth: '420px' }}>
        <div className="modal-header-row">
          <h3>Rate your driver</h3>
          <button type="button" className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ margin: '4px 0 16px', color: '#64748b', fontSize: '0.9rem' }}>
          How was your ride with <strong>{booking.driver?.name || 'your driver'}</strong>?
        </p>
        <form onSubmit={submit}>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '12px 0' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n} type="button"
                onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(n)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <Star size={32} fill={(hovered || rating) >= n ? '#f59e0b' : 'none'} color={(hovered || rating) >= n ? '#f59e0b' : '#cbd5e1'} />
              </button>
            ))}
          </div>
          <textarea
            placeholder="Optional — share details about your experience"
            value={comment} onChange={(e) => setComment(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', fontSize: '0.9rem', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button type="submit" className="button" style={{ flex: 1 }} disabled={!rating || saving}>
              {saving ? 'Submitting…' : 'Submit Review'}
            </button>
            <button type="button" className="button ghost" onClick={onClose}>Skip</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PayModal({ item, onClose, onPaid }) {
  const { token } = useAuth();
  const [phone, setPhone]     = useState('');
  const [paying, setPaying]   = useState(false);
  const [polling, setPolling] = useState(false);
  const [msg, setMsg]         = useState('');

  const pollStatus = async (bookingId) => {
    setPolling(true);
    setMsg('Waiting for M-Pesa confirmation on your phone…');
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await api(`/payments/booking/${bookingId}`, { token });
        if (res.status === 'paid') {
          setPolling(false);
          onPaid(res);
          return;
        }
        if (res.status === 'failed') {
          setPolling(false);
          setMsg('Payment was not completed. Please try again.');
          return;
        }
      } catch { /* keep polling */ }
    }
    setPolling(false);
    setMsg('Payment not yet confirmed — check back in My Inquiries.');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setPaying(true);
    setMsg('');
    try {
      const res = await api('/payments/mpesa/stk-push', {
        token, method: 'POST',
        body: JSON.stringify({ bookingId: item.id, phone: phone.trim() }),
      });
      if (res.status === 'paid') {
        onPaid(res);
      } else {
        setPaying(false);
        await pollStatus(item.id);
      }
    } catch (err) {
      setMsg(err.message || 'Payment failed. Please try again.');
      setPaying(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass" style={{ maxWidth: '400px' }}>
        <div className="modal-header-row">
          <h3>Pay via M-Pesa</h3>
          <button type="button" className="close-btn" onClick={onClose} disabled={paying || polling}><X size={18} /></button>
        </div>
        <p style={{ margin: '4px 0 8px', color: '#64748b', fontSize: '0.9rem' }}>
          {item.ride?.origin} ➔ {item.ride?.destination}
        </p>
        <strong style={{ fontSize: '1.2rem' }}>{formatKSh(item.total_price)}</strong>
        {!paying && !polling ? (
          <form onSubmit={submit} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>M-Pesa phone number</label>
            <input
              type="tel" placeholder="e.g. 0712345678"
              value={phone} onChange={(e) => setPhone(e.target.value)}
              required
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
            />
            <button type="submit" className="button"><WalletCards size={18} /> Send M-Pesa Prompt</button>
          </form>
        ) : (
          <div style={{ marginTop: '16px', textAlign: 'center', color: '#64748b' }}>
            <div className="pulse-dot green" style={{ margin: '0 auto 8px' }} />
            <p>{msg}</p>
          </div>
        )}
        {msg && !polling && <p style={{ color: '#ef4444', marginTop: '10px', fontSize: '0.85rem' }}>{msg}</p>}
      </div>
    </div>
  );
}

export default function InquiriesPage() {
  const { currentUser, isAuthenticated, token } = useAuth();
  const [activeTab, setActiveTab] = useState('sent');
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [message, setMessage]     = useState('');
  const [payingItem, setPayingItem]   = useState(null);
  const [reviewItem, setReviewItem]   = useState(null);
  const [reviewedIds, setReviewedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('reviewed_bookings') || '[]')); }
    catch { return new Set(); }
  });

  useEffect(() => {
    if (currentUser?.role === 'driver') setActiveTab('received');
  }, [currentUser?.role]);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await api(`/bookings/me?role=${activeTab}`, { token });
      setItems(data.bookings || []);
      setMessage('');
    } catch (err) {
      setMessage(err.message || 'Failed to load ride requests');
    } finally {
      setLoading(false);
    }
  }, [token, activeTab]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const update = async (id, status) => {
    try {
      await api(`/bookings/${id}/status`, { token, method: 'PUT', body: JSON.stringify({ status }) });
      load();
    } catch (err) { setMessage(err.message); }
  };

  const cancelBooking = async (id) => {
    try {
      await api(`/bookings/${id}`, { token, method: 'DELETE' });
      load();
    } catch (err) { setMessage(err.message); }
  };

  const handlePaid = () => {
    setPayingItem(null);
    load();
  };

  const submitReview = async ({ bookingId, driverId, rating, comment }) => {
    try {
      await api('/reviews', {
        token, method: 'POST',
        body: JSON.stringify({ bookingId, driverId, rating, comment }),
      });
      const next = new Set([...reviewedIds, bookingId]);
      setReviewedIds(next);
      localStorage.setItem('reviewed_bookings', JSON.stringify([...next]));
      setReviewItem(null);
    } catch (err) {
      setMessage(err.message);
      setReviewItem(null);
    }
  };

  const statusLabel = (s) => ({
    pending:   'Waiting for driver',
    accepted:  'Accepted — ready to pay',
    declined:  'Declined by driver',
    cancelled: 'Cancelled by you',
    paid:      'Paid & Complete',
    refunded:  'Refunded',
  }[s] || s);

  if (!isAuthenticated) {
    return (
      <section className="page">
        <div className="empty-state glass">
          <LogIn size={32} />
          <h2>Sign in to view your ride inquiries</h2>
          <p>Track your sent seat requests and manage incoming passenger requests.</p>
          <Link to="/login" className="button">Sign In</Link>
        </div>
      </section>
    );
  }

  const isDriverTab = activeTab === 'received';

  return (
    <section className="page inquiries-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">My Ride Requests & Inquiries</span>
          <h1>{isDriverTab ? 'Passenger requests for your rides.' : 'Ride requests you have sent.'}</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="segmented glass">
            <button type="button" className={activeTab === 'sent' ? 'active' : ''} onClick={() => setActiveTab('sent')}>
              <Send size={15} /> Sent
            </button>
            <button type="button" className={activeTab === 'received' ? 'active' : ''} onClick={() => setActiveTab('received')}>
              <Inbox size={15} /> Received
            </button>
          </div>
          <button type="button" className="button ghost compact" onClick={load} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {message && <p className="state-bar danger">{message}</p>}

      {loading ? (
        <div className="state-bar glass">Loading ride inquiries…</div>
      ) : items.length === 0 ? (
        <div className="empty-state glass">
          <Inbox size={32} />
          <h2>No {activeTab === 'sent' ? 'sent' : 'received'} requests found</h2>
          <p>
            {activeTab === 'sent'
              ? 'Browse the marketplace and request a seat on an active ride.'
              : 'Publish a ride offer to receive requests from passengers.'}
          </p>
          <Link to={activeTab === 'sent' ? '/' : '/rides/new'} className="button">
            {activeTab === 'sent' ? 'Browse Marketplace' : 'Offer a Ride'}
          </Link>
        </div>
      ) : (
        <div className="inquiry-list">
          {items.map((item) => {
            const dateStr = item?.created_at || item?.createdAt;
            const formattedDate = dateStr ? new Date(dateStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently';
            const origin      = item.ride?.origin || 'Origin';
            const destination = item.ride?.destination || 'Destination';
            const seats       = item.seats_requested || 1;
            const price       = item.total_price ?? 0;
            const canReview   = !isDriverTab && item.status === 'paid' && !reviewedIds.has(item.id);

            return (
              <article className="inquiry-card glass" key={item.id}>
                <div>
                  <div className="card-topline">
                    <span>Requested {formattedDate}</span>
                    <span className={`status ${item.status}`}>{statusLabel(item.status)}</span>
                  </div>
                  <h2>{origin} &rarr; {destination}</h2>
                  <p>
                    {isDriverTab ? 'Passenger' : 'Driver'}:{' '}
                    <strong>{isDriverTab ? item.passenger?.name : item.driver?.name}</strong>
                    {' · '}{seats} seat(s) · <strong>{formatKSh(price)}</strong>
                  </p>
                </div>

                <div className="action-row">
                  {/* Driver: accept/decline pending */}
                  {isDriverTab && item.status === 'pending' && (
                    <>
                      <button type="button" className="button success compact" onClick={() => update(item.id, 'accepted')}>
                        <Check size={16} /> Accept
                      </button>
                      <button type="button" className="button danger compact" onClick={() => update(item.id, 'declined')}>
                        <X size={16} /> Decline
                      </button>
                    </>
                  )}

                  {/* Passenger: pay when accepted */}
                  {!isDriverTab && item.status === 'accepted' && (
                    <button type="button" className="button" onClick={() => setPayingItem(item)}>
                      <WalletCards size={18} /> Pay {formatKSh(price)} via M-Pesa
                    </button>
                  )}

                  {/* Passenger: cancel pending or accepted */}
                  {!isDriverTab && ['pending', 'accepted'].includes(item.status) && (
                    <button type="button" className="button ghost compact" onClick={() => cancelBooking(item.id)}>
                      <X size={15} /> Cancel
                    </button>
                  )}

                  {/* Passenger: leave review after paid */}
                  {canReview && (
                    <button type="button" className="button ghost compact" onClick={() => setReviewItem(item)}>
                      <Star size={15} /> Rate Driver
                    </button>
                  )}

                  {/* Status note for other states */}
                  {!isDriverTab && !['accepted', 'pending'].includes(item.status) && !canReview && (
                    <div className="status-note">
                      <Clock size={16} /> {statusLabel(item.status)}
                    </div>
                  )}
                  {isDriverTab && item.status !== 'pending' && (
                    <div className="status-note">
                      <Clock size={16} /> {statusLabel(item.status)}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {payingItem && <PayModal item={payingItem} onClose={() => setPayingItem(null)} onPaid={handlePaid} />}
      {reviewItem && <ReviewModal booking={reviewItem} onClose={() => setReviewItem(null)} onSubmit={submitReview} />}
    </section>
  );
}
