import { Camera, Save, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import StarRating from '../components/StarRating.jsx';
import api from '../services/api';
import { useAuth } from '../state/AuthContext.jsx';

export default function ProfilePage() {
  const { currentUser, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: currentUser?.name || '', bio: currentUser?.bio || '' });
  const [reviews, setReviews] = useState([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const isDriver = currentUser?.role === 'driver';

  useEffect(() => {
    if (isDriver && currentUser?.id) {
      api
        .get('/reviews', { params: { driverId: currentUser.id } })
        .then(({ data }) => setReviews(data.reviews || []))
        .catch(() => {});
    }
  }, [isDriver, currentUser?.id]);

  const updateField = (field, value) => {
    setSaved(false);
    setForm((f) => ({ ...f, [field]: value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await api.put('/users/me', form);
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save profile.');
    }
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await api.post('/uploads/image', formData);
      await api.put('/users/me', { photo_url: data.url });
      await refreshUser();
    } catch {
      setError('Photo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="page profile-page">
      <div className="profile-hero glass">
        {currentUser?.photo_url ? (
          <img src={currentUser.photo_url} alt="" className="profile-photo" />
        ) : (
          <div className="profile-photo photo-empty">
            <Camera size={34} />
          </div>
        )}
        <div>
          <span className="eyebrow">{isDriver ? 'Driver profile' : 'Passenger profile'}</span>
          <h1>{currentUser?.name}</h1>
          <p>{currentUser?.bio || 'No bio yet.'}</p>
          <StarRating value={Math.round(Number(currentUser?.avg_rating) || 0)} label="Profile rating" />
        </div>
      </div>

      <div className="profile-grid">
        <form className="form-card glass" onSubmit={saveProfile}>
          <h2>Edit profile</h2>
          <label>
            Display name
            <input value={form.name} onChange={(e) => updateField('name', e.target.value)} />
          </label>
          <label>
            Bio
            <textarea value={form.bio} onChange={(e) => updateField('bio', e.target.value)} rows="4" />
          </label>
          <div>
            <button
              type="button"
              className="button ghost"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload size={18} />
              {uploading ? 'Uploading...' : 'Upload photo'}
            </button>
            <input
              type="file"
              ref={fileRef}
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={uploadPhoto}
            />
          </div>
          <button type="submit" className="button">
            <Save size={18} />
            Save profile
          </button>
          {saved && <div className="state-bar success">Profile saved.</div>}
          {error && <div className="state-bar danger">{error}</div>}
        </form>

        {isDriver && (
          <div className="reviews-column">
            <div className="review-list">
              {reviews.length === 0 ? (
                <div className="empty-state glass" style={{ padding: '1.5rem' }}>
                  <p>No reviews yet.</p>
                </div>
              ) : (
                reviews.map((rev) => (
                  <article className="review-card glass" key={rev.id}>
                    <div className="card-topline">
                      <strong>{rev.reviewer?.name || 'Passenger'}</strong>
                      <StarRating value={rev.rating} label="Rating" />
                    </div>
                    <p>{rev.comment}</p>
                  </article>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
