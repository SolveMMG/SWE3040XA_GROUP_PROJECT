import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const empty = {
  origin: '',
  destination: '',
  departure_time: '',
  seats_available: 2,
  price_per_seat: 150,
};

export default function CreateListingPage({ mode = 'create' }) {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(mode === 'edit');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode !== 'edit' || !rideId) return;
    api
      .get(`/rides/${rideId}`)
      .then(({ data }) => {
        const r = data.ride;
        setForm({
          origin: r.origin,
          destination: r.destination,
          departure_time: r.departure_time?.slice(0, 16) || '',
          seats_available: r.seats_available,
          price_per_seat: r.price_per_seat,
        });
      })
      .catch(() => setError('Could not load ride.'))
      .finally(() => setLoading(false));
  }, [mode, rideId]);

  const updateField = (field, value) => {
    setError('');
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (mode === 'edit') {
        await api.put(`/rides/${rideId}`, form);
      } else {
        await api.post('/rides', form);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save ride.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="page">
        <div className="state-bar glass">Loading...</div>
      </section>
    );
  }

  return (
    <section className="page form-page">
      <div>
        <span className="eyebrow">{mode === 'edit' ? 'Edit ride' : 'Offer a ride'}</span>
        <h1>
          {mode === 'edit' ? 'Update your ride listing.' : 'Create a clear, trustworthy ride listing.'}
        </h1>
      </div>

      <form className="form-card glass" onSubmit={handleSubmit}>
        <div className="form-grid two">
          <label>
            Origin
            <input
              value={form.origin}
              onChange={(e) => updateField('origin', e.target.value)}
              placeholder="e.g. CBD Kencom"
              required
            />
          </label>
          <label>
            Destination
            <input
              value={form.destination}
              onChange={(e) => updateField('destination', e.target.value)}
              placeholder="e.g. USIU-Africa"
              required
            />
          </label>
        </div>
        <label>
          Departure time
          <input
            type="datetime-local"
            value={form.departure_time}
            onChange={(e) => updateField('departure_time', e.target.value)}
            required
          />
        </label>
        <div className="form-grid two">
          <label>
            Seats available
            <input
              type="number"
              min="1"
              max="6"
              value={form.seats_available}
              onChange={(e) => updateField('seats_available', Number(e.target.value))}
              required
            />
          </label>
          <label>
            Price per seat (KES)
            <input
              type="number"
              min="0"
              value={form.price_per_seat}
              onChange={(e) => updateField('price_per_seat', Number(e.target.value))}
              required
            />
          </label>
        </div>
        {error && <div className="state-bar danger">{error}</div>}
        <button type="submit" className="button" disabled={submitting}>
          <Save size={18} />
          {submitting ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Publish ride'}
        </button>
      </form>
    </section>
  );
}
