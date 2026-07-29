import { Camera, Car, CreditCard, CheckCircle2, Phone, Save, ShieldCheck, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import StarRating from '../components/StarRating.jsx';
import { api } from '../services/api.js';
import { useAuth } from '../state/AuthContext.jsx';

export default function ProfilePage() {
  const { currentUser, token, updateUser } = useAuth();
  const isDriver = currentUser.role === 'driver';

  const [form, setForm] = useState({
    name: currentUser.name || '',
    bio: currentUser.bio || '',
    photoUrl: currentUser.photoUrl || '',
    vehicleModel: currentUser.vehicleModel || '',
    licensePlate: currentUser.licensePlate || '',
    mpesaPhone: currentUser.mpesaPhone || '',
  });

  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isDriver && currentUser.id) {
      api(`/reviews/driver/${currentUser.id}`, { token })
        .then((data) => setReviews(data.reviews || []))
        .catch((err) => setMessage(err.message));
    }
  }, [currentUser.id, isDriver, token]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await updateUser(form);
      setMessage('Profile and vehicle details saved successfully.');
    } catch (err) {
      setMessage(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page profile-page">
      <div className="profile-hero glass">
        {form.photoUrl ? (
          <img src={form.photoUrl} alt="" className="profile-photo" />
        ) : (
          <div className="profile-photo photo-empty">
            <Camera size={34} />
          </div>
        )}
        <div className="profile-hero-info">
          <div className="badge-row">
            <span className="eyebrow">{isDriver ? 'Nairobi Verified Driver' : 'Registered Passenger'}</span>
            {isDriver && (
              <span className="verified-driver-pill">
                <CheckCircle2 size={13} /> NTSA Verified Driver
              </span>
            )}
          </div>
          <h1>{form.name}</h1>
          <p>{form.bio || 'Add a short bio so riders and drivers can get to know you.'}</p>

          <div className="rating-summary-row">
            <StarRating value={Math.round(currentUser.rating || 4.9)} label="Profile rating" />
            <span className="rating-num">★ {currentUser.rating || '4.9'} / 5.0</span>
          </div>

          {isDriver && (
            <div className="driver-specs-pills">
              <span className="spec-pill"><Car size={14} /> {form.vehicleModel}</span>
              <span className="spec-pill"><CreditCard size={14} /> Plate: {form.licensePlate}</span>
              <span className="spec-pill"><Phone size={14} /> Payout: {form.mpesaPhone}</span>
            </div>
          )}
        </div>
      </div>

      <div className="profile-grid">
        <form className="form-card glass" onSubmit={save}>
          <h2>{isDriver ? 'Edit Driver & Vehicle Profile' : 'Edit Profile'}</h2>

          <label>
            Display Name
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>

          <label>
            Short Bio
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows="3"
              placeholder="e.g. Experienced daily commuter driving Roysambu - KICC CBD route. Safe & punctual."
            />
          </label>

          <label>
            Profile Photo URL
            <span className="input-with-icon">
              <Camera size={18} />
              <input
                type="text"
                value={form.photoUrl}
                onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                placeholder="https://..."
              />
            </span>
          </label>

          {isDriver && (
            <>
              <div className="section-divider-title">
                <Car size={16} /> Vehicle & M-Pesa Details
              </div>

              <div className="form-grid two">
                <label>
                  Vehicle Model & Color
                  <input
                    type="text"
                    value={form.vehicleModel}
                    onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
                    placeholder="e.g. Toyota Fielder (Silver)"
                  />
                </label>

                <label>
                  License Plate Number
                  <input
                    type="text"
                    value={form.licensePlate}
                    onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
                    placeholder="e.g. KDA 392L"
                  />
                </label>
              </div>

              <label>
                M-Pesa Payout Phone Number
                <span className="input-with-icon">
                  <Phone size={18} />
                  <input
                    type="tel"
                    value={form.mpesaPhone}
                    onChange={(e) => setForm({ ...form, mpesaPhone: e.target.value })}
                    placeholder="e.g. 0712345678"
                  />
                </span>
              </label>
            </>
          )}

          <button type="submit" className="button" disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Profile & Vehicle Info'}
          </button>

          {message && <div className="state-bar success">{message}</div>}
        </form>

        <div className="reviews-column">
          {isDriver && (
            <div className="review-list glass">
              <div className="card-title-row">
                <Star size={20} className="header-icon" />
                <div>
                  <h3>Passenger Reviews</h3>
                  <span>Feedback from past rides</span>
                </div>
              </div>

              {reviews.length === 0 ? (
                <div className="empty-state">
                  <h2>No reviews yet</h2>
                  <p>Reviews will appear here as passengers complete trips with you.</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <article className="review-card glass" key={review.id}>
                    <div className="card-topline">
                      <strong>{review.reviewer?.name || 'Passenger'}</strong>
                      <StarRating value={review.rating} label="Review rating" />
                    </div>
                    <p>{review.comment}</p>
                  </article>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

