import { ArrowLeft, CalendarClock, ExternalLink, MapPin, MessageCircle, Navigation, Route, UsersRound, WalletCards, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import GoogleRouteMap from '../components/GoogleRouteMap.jsx';
import { api, rideFromApi } from '../services/api.js';
import { useAuth } from '../state/AuthContext.jsx';
import { buildMapsUrl, distanceInMiles, formatKSh } from '../utils/googleMaps.js';

export default function ListingDetailPage() {
  const { rideId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, token } = useAuth();
  const isMountedRef = useRef(true);

  const customPickup = state?.customPickup;
  const customDropoff = state?.customDropoff;
  const calculatedFare = state?.calculatedFare;
  const pickupDistanceKm = state?.pickupDistanceKm;
  const tripDistanceKm = state?.tripDistanceKm;

  const [ride, setRide] = useState(() => ({
    id: String(rideId || '1'),
    pickup: customPickup?.name || customPickup?.address || 'Roysambu (TRM Mall)',
    dropoff: customDropoff?.name || customDropoff?.address || 'Nairobi CBD (KICC)',
    price: calculatedFare || 50,
    seats: 3,
    dateTime: new Date(),
    pickupLocation: {
      address: customPickup?.name || customPickup?.address || 'Roysambu (TRM Mall)',
      placeId: '',
      lat: customPickup?.lat || -1.2180,
      lng: customPickup?.lng || 36.8870,
    },
    dropoffLocation: {
      address: customDropoff?.name || customDropoff?.address || 'Nairobi CBD (KICC)',
      placeId: '',
      lat: customDropoff?.lat || -1.2885,
      lng: customDropoff?.lng || 36.8232,
    },
    seller: { id: 1, name: 'Samuel Njuguna (Kenyan Driver)', rating: '4.9', rideCount: 15 },
  }));

  const [message, setMessage]           = useState('');
  const [requestSent, setRequestSent]   = useState(false);
  const [dispatchInfo, setDispatchInfo] = useState(null);
  const [phoneInput, setPhoneInput]     = useState('');
  const [showPayForm, setShowPayForm]   = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState(null);
  const [paying, setPaying]             = useState(false);
  const [polling, setPolling]           = useState(false);

  // Track component mounted state for safe async updates
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!rideId) return;
    api(`/rides/${rideId}`)
      .then((data) => {
        if (data && isMountedRef.current) {
          const parsed = rideFromApi(data);
          if (parsed) setRide(parsed);
        }
      })
      .catch(() => {});
  }, [rideId]);

  if (!ride) {
    return (
      <section className="page detail-page">
        <div className="empty-state glass" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
          <h2 style={{ color: '#0f172a', margin: '0 0 12px 0' }}>{message || 'Loading driver details...'}</h2>
          <Link to="/" className="button">Back to Marketplace Rides</Link>
        </div>
      </section>
    );
  }

  const effectivePickup = customPickup?.name || customPickup?.address || ride.pickup;
  const effectivePickupCoords = customPickup?.lat && customPickup?.lng ? { lat: customPickup.lat, lng: customPickup.lng } : ride.pickupLocation;

  const effectiveDropoff = customDropoff?.name || customDropoff?.address || ride.dropoff;
  const effectiveDropoffCoords = customDropoff?.lat && customDropoff?.lng ? { lat: customDropoff.lat, lng: customDropoff.lng } : ride.dropoffLocation;

  const effectivePrice = ride.price ?? calculatedFare;

  const isOwner = currentUser?.id != null && currentUser.id === ride.seller?.id;
  const dist = distanceInMiles(effectivePickupCoords, effectiveDropoffCoords);
  const mapsUrl = buildMapsUrl(effectivePickup, effectiveDropoff);

  const pollPaymentStatus = async (bookingId) => {
    setPolling(true);
    setMessage('Waiting for M-Pesa confirmation on your phone…');
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      if (!isMountedRef.current) return;
      try {
        const res = await api(`/payments/booking/${bookingId}`, { token });
        if (!isMountedRef.current) return;

        if (res.status === 'paid') {
          setPolling(false);
          setDispatchInfo({
            driverName: ride.seller?.name || 'Driver',
            mpesaRef: res.mpesa_ref || res.mpesaRef || '—',
            totalPrice: res.amount ?? effectivePrice,
            pickup: effectivePickup,
            dropoff: effectiveDropoff,
          });
          setMessage('Payment confirmed! Your ride is booked.');
          setRequestSent(true);
          return;
        }
        if (res.status === 'failed') {
          setPolling(false);
          setMessage('M-Pesa payment was not completed. Please try again.');
          return;
        }
      } catch { /* keep polling */ }
    }
    if (isMountedRef.current) {
      setPolling(false);
      setMessage('Payment not confirmed yet — check My Inquiries for your ride status.');
      setRequestSent(true);
    }
  };

  const book = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setMessage('');
    try {
      const created = await api('/bookings', {
        token,
        method: 'POST',
        body: { rideId: Number(rideId), seatsRequested: 1, totalPrice: effectivePrice },
      });
      if (!isMountedRef.current) return;
      setPendingBookingId(created.id);
      setShowPayForm(true);
    } catch (err) {
      if (isMountedRef.current) {
        setMessage(err.message?.toLowerCase().includes('unauthorized')
          ? 'Session expired — please sign in again.'
          : (err.message || 'Booking failed. Please try again.'));
      }
    }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    const phone = phoneInput.trim();
    if (!phone) return;
    setPaying(true);
    setShowPayForm(false);
    try {
      const payRes = await api('/payments/mpesa/stk-push', {
        token,
        method: 'POST',
        body: { bookingId: pendingBookingId, phone },
      });
      if (!isMountedRef.current) return;

      if (payRes.status === 'paid') {
        setDispatchInfo({
          driverName: ride.seller?.name || 'Driver',
          mpesaRef: payRes.mpesaRef || '—',
          totalPrice: payRes.payment?.amount ?? effectivePrice,
          pickup: effectivePickup,
          dropoff: effectiveDropoff,
        });
        setMessage('Payment confirmed! Your ride is booked.');
        setRequestSent(true);
      } else {
        await pollPaymentStatus(pendingBookingId);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setMessage(err.message || 'Payment failed. Please try again.');
        setShowPayForm(true);
      }
    } finally {
      if (isMountedRef.current) {
        setPaying(false);
      }
    }
  };

  const formattedDateTime =
    ride.dateTime instanceof Date && !isNaN(ride.dateTime.getTime())
      ? ride.dateTime.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })
      : 'Flexible Departure';

  const pickupDistNum = typeof pickupDistanceKm === 'number' && !isNaN(pickupDistanceKm) ? pickupDistanceKm : 0;

  return (
    <section className="page detail-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={18} /> Back to marketplace rides
      </Link>

      <div className="detail-layout">
        <article className="detail-main glass">
          <div className="detail-content">
            <span className="eyebrow">Your Custom Trip Details</span>
            <h1>{effectivePickup} &rarr; {effectiveDropoff}</h1>

            <div className="route-box">
              <div>
                <MapPin size={18} />
                <span>Your Pickup Location</span>
                <strong>{effectivePickup}</strong>
              </div>
              <div>
                <Route size={18} />
                <span>Your Drop-off Location</span>
                <strong>{effectiveDropoff}</strong>
              </div>
              {tripDistanceKm ? (
                <div>
                  <Navigation size={18} />
                  <span>Calculated Trip Distance</span>
                  <strong>{Number(tripDistanceKm).toFixed(1)} km</strong>
                </div>
              ) : dist !== null ? (
                <div>
                  <Navigation size={18} />
                  <span>Est. Distance</span>
                  <strong>{(dist * 1.60934).toFixed(1)} km</strong>
                </div>
              ) : null}
            </div>

            {/* Google Route Map Preview */}
            <div className="detail-map-wrapper">
              <GoogleRouteMap
                origin={effectivePickupCoords}
                destination={effectiveDropoffCoords}
                originLabel={effectivePickup}
                destinationLabel={effectiveDropoff}
              />
            </div>

            <div className="detail-list">
              <span><CalendarClock size={18} /> {formattedDateTime}</span>
              <span><UsersRound size={18} /> {ride.seats || 1} seats available</span>
              {pickupDistNum > 0 && (
                <span><Navigation size={18} /> Driver is {pickupDistNum.toFixed(1)} km away from your pickup</span>
              )}
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="external-map-link">
                <ExternalLink size={16} /> Open directions in Google Maps
              </a>
            </div>
          </div>
        </article>

        <aside className="seller-panel glass">
          <div className="seller-profile-header">
            {ride.seller?.photoUrl && (
              <img src={ride.seller.photoUrl} alt={ride.seller.name} className="seller-avatar" />
            )}
            <div>
              <h2>{ride.seller.name}</h2>
              <p>★ {ride.seller.rating || '4.9'} driver rating · {ride.seller.rideCount || 0} rides completed</p>
            </div>
          </div>

          <div className="price-box">
            <span>Price per Seat</span>
            <strong>{formatKSh(effectivePrice)} <small>/ seat</small></strong>
          </div>

          {!isAuthenticated ? (
            <Link to="/login" className="button">
              <MessageCircle size={18} /> Sign in to request ride
            </Link>
          ) : currentUser?.role === 'driver' ? (
            <button type="button" className="button" disabled>
              <WalletCards size={18} /> Bookings not allowed for drivers
            </button>
          ) : !isOwner ? (
            <>
              {showPayForm ? (
                <form onSubmit={submitPayment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    Enter your M-Pesa phone number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 0712345678"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    required
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', width: '100%', boxSizing: 'border-box' }}
                  />
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                    You will receive a prompt for {formatKSh(effectivePrice)}
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="button" style={{ flex: 1 }}>
                      <WalletCards size={18} /> Send M-Pesa Prompt
                    </button>
                    <button type="button" className="button ghost" onClick={() => setShowPayForm(false)} style={{ flex: '0 0 auto' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button type="button" className="button" onClick={book} disabled={requestSent || paying || polling}>
                  <WalletCards size={18} />
                  {paying ? 'Sending M-Pesa prompt…' : polling ? 'Waiting for payment…' : requestSent ? 'Request Sent' : 'Request & Pay via M-Pesa'}
                </button>
              )}
            </>
          ) : (
            <Link to={`/rides/${ride.id}/edit`} className="button ghost">
              Edit ride listing
            </Link>
          )}

          {message && <p className={`status-note ${requestSent && !polling ? 'success' : ''}`}>{message}</p>}
        </aside>
      </div>

      {/* Driver Dispatched Confirmation Modal */}
      {dispatchInfo && (
        <div className="modal-backdrop">
          <div className="modal-content glass driver-dispatch-modal">
            <div className="modal-header-row">
              <span className="dispatch-badge">🎉 Payment Confirmed & Driver Dispatched</span>
              <button type="button" className="close-btn" onClick={() => navigate('/inquiries')}>
                <X size={18} />
              </button>
            </div>

            <h2>Driver is on the way to pick you up!</h2>

            <div className="dispatch-info-card glass">
              <div className="dispatch-driver-row">
                <div className="driver-avatar-circle">
                  {ride.seller?.name?.[0] || 'D'}
                </div>
                <div>
                  <h3>{dispatchInfo.driverName}</h3>
                  <p className="driver-sub">★ 4.9 Rating · Verified Nairobi Driver</p>
                </div>
              </div>

              <div className="dispatch-details-grid">
                {ride.vehicle && (
                  <div>
                    <span>Vehicle</span>
                    <strong>{ride.vehicle}</strong>
                  </div>
                )}
                {ride.seller?.phone && (
                  <div>
                    <span>Contact Driver</span>
                    <strong>{ride.seller.phone}</strong>
                  </div>
                )}
                <div>
                  <span>M-Pesa Receipt</span>
                  <strong>{dispatchInfo.mpesaRef !== '—' ? `#${dispatchInfo.mpesaRef} ` : ''}{formatKSh(dispatchInfo.totalPrice)}</strong>
                </div>
              </div>

              <div className="dispatch-route-row">
                <span><strong>Pickup:</strong> {dispatchInfo.pickup}</span>
                <span><strong>Drop-off:</strong> {dispatchInfo.dropoff}</span>
              </div>
            </div>

            <div className="modal-actions-row">
              <button type="button" className="button" onClick={() => navigate('/inquiries')}>
                View Ride Status in My Inquiries
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
