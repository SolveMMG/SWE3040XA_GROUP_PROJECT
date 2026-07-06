import { AlertCircle, Clock, MapPin, Search, SlidersHorizontal, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const FILTERS = ['All', 'Commute', 'Airport', 'Campus', 'Event', 'Weekend'];

export default function MarketplacePage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    const params = {};
    if (query.trim()) params.q = query.trim();

    api
      .get('/rides', { params, signal: controller.signal })
      .then(({ data }) => setRides(data.rides || []))
      .catch((err) => {
        if (err.name !== 'CanceledError') setError('Could not load rides. Please try again.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query]);

  const visible = filter === 'All' ? rides : rides.filter((r) => r.category === filter);

  return (
    <section className="page">
      <div className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Smart carpooling</span>
          <h1>Find a cleaner, calmer way across town.</h1>
          <p>Browse open seats, filter by ride type, and send a request when the route fits your day.</p>
        </div>
        <div className="hero-metrics glass">
          <div>
            <strong>248</strong>
            <span>weekly shared rides</span>
          </div>
          <div>
            <strong>4.8</strong>
            <span>average rider rating</span>
          </div>
          <div>
            <strong>32%</strong>
            <span>estimated CO2 savings</span>
          </div>
        </div>
      </div>

      <div className="toolbar glass">
        <label className="search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search origin, destination..."
          />
        </label>
        <div className="filter-row" aria-label="Category filter">
          <SlidersHorizontal size={18} />
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              className={item === filter ? 'chip active' : 'chip'}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="state-bar glass">Loading rides...</div>}
      {error && <div className="state-bar danger">{error}</div>}

      {!loading && !error && visible.length === 0 ? (
        <div className="empty-state glass">
          <AlertCircle size={24} />
          <h2>No rides found</h2>
          <p>Try a broader search or choose a different filter.</p>
        </div>
      ) : (
        <div className="ride-grid">
          {visible.map((ride) => (
            <Link to={`/rides/${ride.id}`} className="ride-card glass" key={ride.id}>
              {ride.photo_url && <img src={ride.photo_url} alt="" />}
              <div className="ride-card-body">
                <div className="card-topline">
                  <span>{ride.category || 'Commute'}</span>
                  <strong>KES {ride.price_per_seat}</strong>
                </div>
                <h2>
                  {ride.origin} → {ride.destination}
                </h2>
                <div className="detail-list compact-details">
                  <span>
                    <MapPin size={16} />
                    {ride.origin}
                  </span>
                  <span>
                    <Clock size={16} />
                    {new Date(ride.departure_time).toLocaleString()}
                  </span>
                  <span>
                    <UsersRound size={16} />
                    {ride.seats_available} seats
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
