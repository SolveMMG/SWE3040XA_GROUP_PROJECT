import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange, label = 'Rating' }) {
  return (
    <div className="stars" role={onChange ? 'radiogroup' : 'img'} aria-label={`${label}: ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        if (onChange) {
          return (
            <button
              key={star}
              type="button"
              className={active ? 'star active' : 'star'}
              onClick={() => onChange(star)}
              aria-label={`${star} star`}
            >
              <Star size={18} fill="currentColor" />
            </button>
          );
        }

        return <Star key={star} size={18} className={active ? 'star active' : 'star'} fill="currentColor" />;
      })}
    </div>
  );
}
