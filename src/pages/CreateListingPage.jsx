import { ImagePlus, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { rides } from '../data/mockData.js';

const emptyRide = {
  title: '',
  description: '',
  category: 'Commute',
  price: 8,
  pickup: '',
  dropoff: '',
  seats: 2,
  image: '',
};

export default function CreateListingPage({ mode = 'create' }) {
  const { rideId } = useParams();
  const existingRide = rides.find((ride) => ride.id === rideId);
  const initialRide = useMemo(() => (mode === 'edit' && existingRide ? existingRide : emptyRide), [existingRide, mode]);
  const [form, setForm] = useState(initialRide);
  const [saved, setSaved] = useState(false);

  const updateField = (field, value) => {
    setSaved(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSaved(true);
  };

  return (
    <section className="page form-page">
      <div>
        <span className="eyebrow">{mode === 'edit' ? 'Edit ride' : 'Offer a ride'}</span>
        <h1>{mode === 'edit' ? 'Update your ride listing.' : 'Create a clear, trustworthy ride listing.'}</h1>
      </div>

      <form className="form-card glass" onSubmit={handleSubmit}>
        <label>
          Ride title
          <input value={form.title} onChange={(event) => updateField('title', event.target.value)} required />
        </label>
        <label>
          Description
          <textarea
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            rows="4"
            required
          />
        </label>
        <div className="form-grid">
          <label>
            Category
            <select value={form.category} onChange={(event) => updateField('category', event.target.value)}>
              <option>Commute</option>
              <option>Airport</option>
              <option>Campus</option>
              <option>Event</option>
              <option>Weekend</option>
            </select>
          </label>
          <label>
            Price per seat
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
            />
          </label>
          <label>
            Seats
            <input
              type="number"
              min="1"
              max="6"
              value={form.seats}
              onChange={(event) => updateField('seats', event.target.value)}
            />
          </label>
        </div>
        <div className="form-grid two">
          <label>
            Pickup
            <input value={form.pickup} onChange={(event) => updateField('pickup', event.target.value)} required />
          </label>
          <label>
            Drop-off
            <input value={form.dropoff} onChange={(event) => updateField('dropoff', event.target.value)} required />
          </label>
        </div>
        <label>
          Image URL
          <span className="input-with-icon">
            <ImagePlus size={18} />
            <input value={form.image} onChange={(event) => updateField('image', event.target.value)} />
          </span>
        </label>
        <button type="submit" className="button">
          <Save size={18} />
          {mode === 'edit' ? 'Save changes' : 'Publish mock ride'}
        </button>
        {saved && <div className="state-bar success">Saved locally. Person C can connect this form to the API later.</div>}
      </form>
    </section>
  );
}
