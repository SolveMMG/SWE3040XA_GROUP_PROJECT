import { Camera, Save } from 'lucide-react';
import { useState } from 'react';
import StarRating from '../components/StarRating.jsx';
import { reviews } from '../data/mockData.js';
import { useAuth } from '../state/AuthContext.jsx';

export default function ProfilePage() {
  const { currentUser, updateUser } = useAuth();
  const isDriver = currentUser.role === 'driver';
  const [form, setForm] = useState({
    name: currentUser.name,
    bio: currentUser.bio,
    skills: currentUser.skills.join(', '),
    photoUrl: currentUser.photoUrl,
  });
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [localReviews, setLocalReviews] = useState(reviews);
  const [saved, setSaved] = useState(false);

  const updateField = (field, value) => {
    setSaved(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = (event) => {
    event.preventDefault();
    updateUser({
      ...form,
      skills: form.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
    });
    setSaved(true);
  };

  const addReview = (event) => {
    event.preventDefault();
    if (!reviewText.trim()) return;
    setLocalReviews((current) => [
      { id: crypto.randomUUID(), author: currentUser.name, rating, text: reviewText.trim() },
      ...current,
    ]);
    setReviewText('');
    setRating(5);
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
        <div>
          <span className="eyebrow">{isDriver ? 'Driver profile' : 'Customer profile'}</span>
          <h1>{form.name}</h1>
          <p>
            {form.bio ||
              (isDriver
                ? 'Add a short bio so other riders know who they are sharing the trip with.'
                : 'Add a short bio so others can learn more about you on the platform.')}
          </p>
          <StarRating value={Math.round(currentUser.rating || 0)} label="Profile rating" />
          <div className="detail-list">
            <span>{isDriver ? 'Driver account' : 'Customer account'}</span>
            <span>{currentUser.phone}</span>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <form className="form-card glass" onSubmit={saveProfile}>
          <h2>Edit profile</h2>
          <label>
            Display name
            <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
          </label>
          <label>
            Bio
            <textarea value={form.bio} onChange={(event) => updateField('bio', event.target.value)} rows="4" />
          </label>
          <label>
            Skills and trust tags
            <input value={form.skills} onChange={(event) => updateField('skills', event.target.value)} />
          </label>
          <label>
            Profile photo URL
            <span className="input-with-icon">
              <Camera size={18} />
              <input value={form.photoUrl} onChange={(event) => updateField('photoUrl', event.target.value)} />
            </span>
          </label>
          <button type="submit" className="button">
            <Save size={18} />
            Save profile
          </button>
          {saved && <div className="state-bar success">Profile updated locally.</div>}
        </form>

        <div className="reviews-column">
          <div className="role-summary glass">
            <h2>{isDriver ? 'Driver details' : 'Customer preferences'}</h2>
            {isDriver ? (
              <>
                <p>Vehicle: {currentUser.driverProfile?.vehicle}</p>
                <p>Plate: {currentUser.driverProfile?.licensePlate}</p>
                <p>Seats: {currentUser.driverProfile?.seats}</p>
              </>
            ) : (
              <>
                <p>Home area: {currentUser.customerProfile?.homeArea}</p>
                <p>Payment preference: {currentUser.customerProfile?.preferredPayment}</p>
              </>
            )}
          </div>
          {isDriver ? (
            <div className="review-list">
              {localReviews.map((review) => (
                <article className="review-card glass" key={review.id}>
                  <div className="card-topline">
                    <strong>{review.author}</strong>
                    <StarRating value={review.rating} label={`${review.author} rating`} />
                  </div>
                  <p>{review.text}</p>
                </article>
              ))}
            </div>
          ) : (
            <form className="review-form glass" onSubmit={addReview}>
              <h2>Leave a review</h2>
              <StarRating value={rating} onChange={setRating} label="New review rating" />
              <textarea
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                placeholder="Share what made the ride work well..."
                rows="4"
              />
              <button type="submit" className="button">
                Submit review
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
