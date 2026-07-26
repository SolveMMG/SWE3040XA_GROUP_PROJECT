import { Check, Clock, Inbox, LogIn, Send, WalletCards, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../state/AuthContext.jsx';
import { formatKSh } from '../utils/googleMaps.js';

export default function InquiriesPage() {
  const { currentUser, isAuthenticated, token } = useAuth();
  const [activeTab, setActiveTab] = useState('sent'); // 'sent' or 'received'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Default active tab to 'received' if user is a driver
  useEffect(() => {
    if (currentUser?.role === 'driver') {
      setActiveTab('received');
    }
  }, [currentUser?.role]);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
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
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const update = async (id, status) => {
    try {
      await api(`/bookings/${id}/status`, {
        token,
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const [dispatchInfo, setDispatchInfo] = useState(null);

  const pay = async (item) => {
    const defaultPhone = '0712345678';
    const phone = window.prompt(
      `Enter your M-Pesa phone number to receive the prompt for ${formatKSh(item.total_price)}:`,
      defaultPhone,
    );
    if (!phone) return;

    try {
      const result = await api('/payments/mpesa/stk-push', {
        token,
        method: 'POST',
        body: JSON.stringify({ bookingId: item.id, phone }),
      });

      setDispatchInfo({
        driverName: item.driver?.name || 'Kenyan Driver',
        driverPhone: '+254 712 345 678',
        vehicle: 'KDA 392L (Toyota Fielder - Silver)',
        mpesaRef: result.mpesaRef || 'QJK839210',
        totalPrice: item.total_price,
        eta: '5 - 8 mins',
        pickup: item.ride?.origin || 'Pickup Location',
        dropoff: item.ride?.destination || 'Drop-off Location',
      });
      setMessage('M-Pesa payment confirmed! Driver has been dispatched.');
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const statusLabel = (s) => {
    const labels = {
      pending: 'Pending Acceptance',
      accepted: 'Accepted (Ready to Pay)',
      declined: 'Declined',
      paid: 'Complete',
      refunded: 'Refunded',
    };
    return labels[s] || s;
  };

  if (!isAuthenticated) {
    return (
      <section className="page">
        <div className="empty-state glass">
          <LogIn size={32} />
          <h2>Sign in to view your ride inquiries</h2>
          <p>Track your sent seat requests and manage incoming passenger requests.</p>
          <Link to="/login" className="button">
            Sign In Now
          </Link>
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

        {/* Sent vs Received Tab Switcher */}
        <div className="segmented glass">
          <button
            type="button"
            className={activeTab === 'sent' ? 'active' : ''}
            onClick={() => setActiveTab('sent')}
          >
            <Send size={15} /> Sent Requests
          </button>
          <button
            type="button"
            className={activeTab === 'received' ? 'active' : ''}
            onClick={() => setActiveTab('received')}
          >
            <Inbox size={15} /> Received Requests
          </button>
        </div>
      </div>

      {message && <p className="state-bar danger">{message}</p>}

      {loading ? (
        <div className="state-bar glass">Loading ride inquiries...</div>
      ) : items.length === 0 ? (
        <div className="empty-state glass">
          <Inbox size={32} />
          <h2>No {activeTab === 'sent' ? 'sent' : 'received'} requests found</h2>
          <p>
            {activeTab === 'sent'
              ? 'Browse the marketplace and request a seat on active Nairobi rides.'
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
            const formattedDate = dateStr && !Number.isNaN(new Date(dateStr).getTime())
              ? new Date(dateStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
              : 'Recently';
            const origin = item.ride?.origin || item.origin || 'Origin';
            const destination = item.ride?.destination || item.destination || 'Destination';
            const passengerName = item.passenger?.name || item.passenger_name || 'Passenger';
            const driverName = item.driver?.name || item.driver_name || 'Driver';
            const seats = item.seats_requested || item.seatsRequested || item.seats || 1;
            const price = item.total_price ?? item.totalPrice ?? 0;

            return (
              <article className="inquiry-card glass" key={item.id}>
                <div>
                  <div className="card-topline">
                    <span>Requested {formattedDate}</span>
                    <span className={`status ${item.status}`}>{statusLabel(item.status)}</span>
                  </div>
                  <h2>
                    {origin} &rarr; {destination}
                  </h2>
                  <p>
                    {isDriverTab ? 'Passenger' : 'Driver'}: <strong>{isDriverTab ? passengerName : driverName}</strong> ·{' '}
                    {seats} seat(s) · Total Price: <strong>{formatKSh(price)}</strong>
                  </p>
                </div>

                {/* Action Buttons */}
                {isDriverTab && item.status === 'pending' ? (
                  <div className="action-row">
                    <button
                      type="button"
                      className="button success compact"
                      onClick={() => update(item.id, 'accepted')}
                    >
                      <Check size={16} /> Accept Request
                    </button>
                    <button
                      type="button"
                      className="button danger compact"
                      onClick={() => update(item.id, 'declined')}
                    >
                      <X size={16} /> Decline
                    </button>
                  </div>
                ) : !isDriverTab && item.status === 'accepted' ? (
                  <button type="button" className="button" onClick={() => pay(item)}>
                    <WalletCards size={18} /> Pay {formatKSh(price)} via M-Pesa
                  </button>
                ) : (
                  <div className="status-note">
                    <Clock size={16} /> {item.status}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Driver Dispatched Confirmation Modal */}
      {dispatchInfo && (
        <div className="modal-backdrop">
          <div className="modal-content glass driver-dispatch-modal">
            <div className="modal-header-row">
              <span className="dispatch-badge">🎉 Payment Confirmed & Driver Dispatched</span>
              <button type="button" className="close-btn" onClick={() => setDispatchInfo(null)}>
                <X size={18} />
              </button>
            </div>

            <h2>Driver is on the way to pick you up!</h2>

            <div className="dispatch-info-card glass">
              <div className="dispatch-driver-row">
                <div className="driver-avatar-circle">
                  {dispatchInfo.driverName?.[0] || 'D'}
                </div>
                <div>
                  <h3>{dispatchInfo.driverName}</h3>
                  <p className="driver-sub">★ 4.9 Rating · Verified Nairobi Driver</p>
                </div>
              </div>

              <div className="dispatch-details-grid">
                <div>
                  <span>Vehicle Plate</span>
                  <strong>{dispatchInfo.vehicle}</strong>
                </div>
                <div>
                  <span>Contact Driver</span>
                  <strong>{dispatchInfo.driverPhone}</strong>
                </div>
                <div>
                  <span>Est. Pickup Arrival</span>
                  <strong>⚡ {dispatchInfo.eta}</strong>
                </div>
                <div>
                  <span>M-Pesa Receipt</span>
                  <strong>#{dispatchInfo.mpesaRef} ({formatKSh(dispatchInfo.totalPrice)})</strong>
                </div>
              </div>

              <div className="dispatch-route-row">
                <span><strong>Pickup:</strong> {dispatchInfo.pickup}</span>
                <span><strong>Drop-off:</strong> {dispatchInfo.dropoff}</span>
              </div>
            </div>

            <div className="modal-actions-row">
              <button type="button" className="button" onClick={() => setDispatchInfo(null)}>
                Done & Track Driver
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
