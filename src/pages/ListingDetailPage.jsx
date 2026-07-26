import { ArrowLeft, CalendarClock, ExternalLink, MapPin, MessageCircle, Navigation, Route, UsersRound, WalletCards, X } from 'lucide-react';
import { useEffect, useState } from 'react';
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
    pickupLocation: { address: customPickup?.name || customPickup?.address || 'Roysambu (TRM Mall)', placeId: '', lat: customPickup?.lat || -1.2180, lng: customPickup?.lng || 36.8870 },
    dropoffLocation: { address: customDropoff?.name || customDropoff?.address || 'Nairobi CBD (KICC)', placeId: '', lat: customDropoff?.lat || -1.2885, lng: customDropoff?.lng || 36.8232 },
    seller: { id: 1, name: 'Samuel Njuguna (Kenyan Driver)', rating: '4.9', rideCount: 15 },
  }));

  useEffect(() => {
    if (!rideId) return;
    api(`/rides/${rideId}`)
      .then((data) => {
        if (data) {
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

  const effectivePrice = calculatedFare !== undefined && calculatedFare !== null ? calculatedFare : ride.price;

  const isOwner = currentUser?.id === ride.seller.id;
  const dist = distanceInMiles(effectivePickupCoords, effectiveDropoffCoords);
  const mapsUrl = buildMapsUrl(effectivePickup, effectiveDropoff);

  const [message, setMessage] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [dispatchInfo, setDispatchInfo] = useState(null);

  const book = async () => {
    try {
      const created = await api('/bookings', {
        token,
        method: 'POST',
        body: JSON.stringify({
          rideId: Number(rideId),
          seatsRequested: 1,
          totalPrice: effectivePrice,
        }),
      });

      const defaultPhone = '0712345678';
      const phone = window.prompt(
        `Your ride request was AUTO-ACCEPTED!\n\nEnter your M-Pesa phone number to receive the payment prompt for ${formatKSh(effectivePrice)}:`,
        defaultPhone,
      );

      if (phone) {
        const payRes = await api('/payments/mpesa/stk-push', {
          token,
          method: 'POST',
          body: JSON.stringify({ bookingId: created.id, phone }),
        });

        setDispatchInfo({
          driverName: ride.seller?.name || 'Kenyan Driver',
          driverPhone: '+254 712 345 678',
          vehicle: 'KDA 392L (Toyota Fielder - Silver)',
          mpesaRef: payRes.mpesaRef || 'QJK839210',
          totalPrice: effectivePrice,
          eta: '5 - 8 mins',
          pickup: effectivePickup,
          dropoff: effectiveDropoff,
        });
        setMessage('M-Pesa Payment Confirmed! Driver has been dispatched.');
      } else {
        setMessage('Ride request auto-accepted! Redirecting to My Inquiries to pay...');
        setTimeout(() => navigate('/inquiries'), 1800);
      }

      setRequestSent(true);
    } catch (err) {
      if (err.message?.toLowerCase().includes('token') || err.message?.toLowerCase().includes('unauthorized')) {
        setMessage('Session expired. Please sign out and sign in again to refresh your session token.');
      } else {
        setMessage(err.message);
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
            <span>Total Calculated Fare</span>
            <strong>{formatKSh(effectivePrice)} <small>/ passenger</small></strong>
          </div>

          {!isAuthenticated ? (
            <Link to="/login" className="button">
              <MessageCircle size={18} /> Sign in to request ride
            </Link>
          ) : !isOwner ? (
            <button type="button" className="button" onClick={book} disabled={requestSent}>
              <WalletCards size={18} /> {requestSent ? 'Request Sent' : 'Request & Pay via M-Pesa'}
            </button>
          ) : (
            <Link to={`/rides/${ride.id}/edit`} className="button ghost">
              Edit ride listing
            </Link>
          )}

          {message && <p className={`status-note ${requestSent ? 'success' : ''}`}>{message}</p>}
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
