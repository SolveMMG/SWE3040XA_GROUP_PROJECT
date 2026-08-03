import { ArrowRight, Calendar, Car, Clock, Compass, DollarSign, MapPin, Navigation, Plus, Route, Save, ShieldCheck, Sparkles, Trash2, UsersRound, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GooglePlacePicker from '../components/GooglePlacePicker.jsx';
import GoogleRouteMap from '../components/GoogleRouteMap.jsx';
import { api, rideFromApi } from '../services/api.js';
import { useAuth } from '../state/AuthContext.jsx';
import { calculateHaversineKm, formatKSh } from '../utils/googleMaps.js';

const ROUTE_PRESETS = [
  {
    name: 'Roysambu ➔ KICC CBD',
    pickup: { address: 'Roysambu (TRM Mall), Thika Road', placeId: 'trm-1', lat: -1.2180, lng: 36.8870 },
    dropoff: { address: 'Nairobi CBD (KICC), Harambee Ave', placeId: 'kicc-1', lat: -1.2885, lng: 36.8232 },
    recommendedPrice: 350,
  },
  {
    name: 'Westlands ➔ Nairobi National Park',
    pickup: { address: 'Westlands (Sarit Centre), Ring Rd', placeId: 'sarit-1', lat: -1.2618, lng: 36.8048 },
    dropoff: { address: 'Nairobi National Park Main Gate', placeId: 'nnp-1', lat: -1.3733, lng: 36.8584 },
    recommendedPrice: 450,
  },
  {
    name: 'Gigiri UN ➔ Karura Forest',
    pickup: { address: 'UN Avenue, Gigiri, Nairobi', placeId: 'gigiri-1', lat: -1.2325, lng: 36.8164 },
    dropoff: { address: 'Karura Forest Gate C, Muthaiga', placeId: 'karura-1', lat: -1.2407, lng: 36.8290 },
    recommendedPrice: 250,
  },
  {
    name: 'Ngong Road ➔ Upper Hill',
    pickup: { address: 'Junction Mall, Ngong Road', placeId: 'junction-1', lat: -1.2982, lng: 36.7628 },
    dropoff: { address: 'Upper Hill Commercial District', placeId: 'upperhill-1', lat: -1.2970, lng: 36.8140 },
    recommendedPrice: 300,
  },
];

const getDefaultDepartureTime = (hoursFromNow = 1) => {
  const now = new Date();
  now.setHours(now.getHours() + hoursFromNow);
  now.setMinutes(0);
  return now.toISOString().slice(0, 16);
};

export default function CreateListingPage({ mode = 'create' }) {
  const { rideId } = useParams();
  const { token, currentUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    pickup: '',
    dropoff: '',
    departureTime: getDefaultDepartureTime(1),
    price: 350,
    seats: 3,
    pickupLocation: null,
    dropoffLocation: null,
    notes: '',
  });

  const [message, setMessage]       = useState('');
  const [success, setSuccess]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [priceEdited, setPriceEdited] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && rideId) {
      api(`/rides/${rideId}`)
        .then((data) => {
          const ride = rideFromApi(data);
          setForm({
            ...ride,
            departureTime: ride.dateTime ? new Date(ride.dateTime).toISOString().slice(0, 16) : getDefaultDepartureTime(1),
            notes: ride.notes || '',
          });
        })
        .catch((err) => setMessage(err.message));
    }
  }, [mode, rideId]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const setLocation = useCallback((field, location) => {
    setForm((current) => {
      const updated = {
        ...current,
        [field]: location,
        [field === 'pickupLocation' ? 'pickup' : 'dropoff']: location?.name || location?.address || '',
      };

      // Auto-suggest price only if the user hasn't manually set one
      if (!priceEdited && updated.pickupLocation?.lat && updated.dropoffLocation?.lat) {
        const km = calculateHaversineKm(
          updated.pickupLocation.lat,
          updated.pickupLocation.lng,
          updated.dropoffLocation.lat,
          updated.dropoffLocation.lng,
        );
        const suggested = Math.max(150, Math.round(150 + km * 15));
        updated.price = suggested;
      }
      return updated;
    });
  }, [priceEdited]);

  const applyPreset = (preset) => {
    setPriceEdited(false);
    setForm((current) => ({
      ...current,
      pickup: preset.pickup.address,
      dropoff: preset.dropoff.address,
      pickupLocation: preset.pickup,
      dropoffLocation: preset.dropoff,
      price: preset.recommendedPrice,
    }));
  };

  const applyTimePreset = (type) => {
    const now = new Date();
    if (type === '1h') now.setHours(now.getHours() + 1);
    else if (type === '3h') now.setHours(now.getHours() + 3);
    else if (type === 'tomorrow-am') {
      now.setDate(now.getDate() + 1);
      now.setHours(7, 30, 0, 0);
    } else if (type === 'tomorrow-pm') {
      now.setDate(now.getDate() + 1);
      now.setHours(17, 0, 0, 0);
    }
    setForm((current) => ({ ...current, departureTime: now.toISOString().slice(0, 16) }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setSuccess('');

    if (!form.pickup || !form.dropoff) {
      setMessage('Please specify both pickup and drop-off locations.');
      setSubmitting(false);
      return;
    }

    const body = {
      origin: form.pickup,
      destination: form.dropoff,
      departureTime: new Date(form.departureTime).toISOString(),
      seatsAvailable: Number(form.seats),
      pricePerSeat: Number(form.price),
      originPlaceId: form.pickupLocation?.placeId,
      originLatitude: form.pickupLocation?.lat,
      originLongitude: form.pickupLocation?.lng,
      destinationPlaceId: form.dropoffLocation?.placeId,
      destinationLatitude: form.dropoffLocation?.lat,
      destinationLongitude: form.dropoffLocation?.lng,
      notes: form.notes,
    };

    try {
      await api(mode === 'edit' ? `/rides/${rideId}` : '/rides', {
        token,
        method: mode === 'edit' ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });

      setSuccess(mode === 'edit' ? 'Ride updated successfully!' : 'Ride offer published successfully to your Driver Dashboard!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err) {
      setMessage(err.message || 'Failed to publish ride offer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Are you sure you want to delete this ride listing? This action cannot be undone.');
    if (!confirmed) return;

    setDeleting(true);
    setMessage('');
    setSuccess('');
    try {
      await api(`/rides/${rideId}`, { token, method: 'DELETE' });
      setSuccess('Ride listing deleted successfully.');
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      setMessage(err.message || 'Failed to delete ride listing.');
    } finally {
      setDeleting(false);
    }
  };

  const hasRouteCoordinates = Boolean(form.pickupLocation?.lat && form.dropoffLocation?.lat);
  const rawKm = hasRouteCoordinates
    ? calculateHaversineKm(form.pickupLocation, form.dropoffLocation)
    : null;
  const distanceKm = rawKm !== null && !Number.isNaN(rawKm) ? Number(rawKm).toFixed(1) : null;

  return (
    <section className="page form-page create-ride-page">
      <div className="section-heading-row">
        <div>
          <span className="eyebrow"><Car size={14} /> Driver Ride Publisher</span>
          <h1>{mode === 'edit' ? 'Edit Your Ride Offer' : 'Publish a Live Nairobi Ride Offer'}</h1>
          <p className="page-desc">Offer available seats to Nairobi passengers commuting on your route.</p>
        </div>
      </div>

      {/* Quick Route Presets */}
      <div className="route-presets-box glass">
        <span className="preset-label"><Sparkles size={14} /> Popular Quick Commute Routes:</span>
        <div className="preset-pills">
          {ROUTE_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="preset-btn"
              onClick={() => applyPreset(preset)}
            >
              <Navigation size={13} /> {preset.name}
            </button>
          ))}
        </div>
      </div>

      <form className="form-card glass offer-ride-card" onSubmit={submit}>
        <div className="form-grid two map-fields">
          <GooglePlacePicker
            id="pickup-location"
            label="Pickup Station / Location"
            value={form.pickupLocation}
            onChange={(location) => setLocation('pickupLocation', location)}
          />
          <GooglePlacePicker
            id="dropoff-location"
            label="Drop-off Destination"
            value={form.dropoffLocation}
            onChange={(location) => setLocation('dropoffLocation', location)}
          />
        </div>

        {/* Live Route Map & Distance Indicator */}
        {hasRouteCoordinates && (
          <div className="route-preview-container">
            <div className="route-preview-header">
              <span className="group-label"><Route size={15} /> Calculated Route ({distanceKm} km)</span>
              <span className="route-badge">Suggested Fare: {formatKSh(Math.max(150, Math.round(150 + distanceKm * 15)))}</span>
            </div>
            <GoogleRouteMap
              origin={form.pickupLocation}
              destination={form.dropoffLocation}
              originLabel={form.pickup}
              destinationLabel={form.dropoff}
            />
          </div>
        )}

        {/* Departure Time & Quick Time Presets */}
        <div className="departure-section">
          <label>
            <Clock size={16} /> Departure Date & Time
            <input
              type="datetime-local"
              value={form.departureTime}
              onChange={(e) => setField('departureTime', e.target.value)}
              required
            />
          </label>

          <div className="time-quick-presets">
            <span>Quick Time:</span>
            <button type="button" className="time-btn" onClick={() => applyTimePreset('1h')}>+ 1 Hour</button>
            <button type="button" className="time-btn" onClick={() => applyTimePreset('3h')}>+ 3 Hours</button>
            <button type="button" className="time-btn" onClick={() => applyTimePreset('tomorrow-am')}>Tomorrow 7:30 AM</button>
            <button type="button" className="time-btn" onClick={() => applyTimePreset('tomorrow-pm')}>Tomorrow 5:00 PM</button>
          </div>
        </div>

        {/* Pricing & Seat Capacity */}
        <div className="form-grid two">
          <label>
            Price per Seat (KSh)
            <span className="input-with-icon">
              <DollarSign size={18} />
              <input
                type="number"
                min="1"
                step="any"
                value={form.price}
                onChange={(e) => { setPriceEdited(true); setField('price', e.target.value); }}
                required
              />
            </span>
          </label>

          <label>
            Available Seats for Passengers
            <span className="input-with-icon">
              <UsersRound size={18} />
              <input
                type="number"
                min="1"
                max="8"
                value={form.seats}
                onChange={(e) => setField('seats', e.target.value)}
                required
              />
            </span>
          </label>
        </div>

        {/* Driver Notes Input */}
        <label>
          Pickup Instructions / Vehicle Notes (Optional)
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="e.g. Toyota Fielder Silver (KDA 392L) - AC, luggage space available, pickup near TRM main gate."
          />
        </label>

        {message && <div className="state-bar danger">{message}</div>}
        {success && <div className="state-bar success">{success}</div>}

        <div className="form-actions-row">
          <button type="submit" className="button big" disabled={submitting}>
            <Save size={18} /> {submitting ? 'Publishing...' : mode === 'edit' ? 'Save Ride Changes' : 'Publish Live Ride Offer'}
          </button>
          {mode === 'edit' && (
            <button type="button" className="button danger" onClick={handleDelete} disabled={deleting}>
              <Trash2 size={18} /> {deleting ? 'Deleting...' : 'Delete Ride Listing'}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

