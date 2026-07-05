import { AlertCircle, Clock, MapPin, Search, SlidersHorizontal, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { categories, rides } from '../data/mockData.js';
import { useMemo, useState } from 'react';

export default function MarketplacePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(false);

  const filteredRides = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rides.filter((ride) => {
      const matchesCategory = category === 'All' || ride.category === category;
      const matchesQuery =
        !term ||
        [ride.title, ride.route, ride.pickup, ride.dropoff, ride.category].some((field) =>
          field.toLowerCase().includes(term),
        );
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const handleQuery = (event) => {
    setLoading(true);
    setQuery(event.target.value);
    window.setTimeout(() => setLoading(false), 180);
  };

  return (
    <section className="page">
      <div className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Smart carpooling</span>
          <h1>Find a cleaner, calmer way across town.</h1>
          <p>
            Browse open seats, filter by ride type, and send a request when the route fits your day.
          </p>
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
          <input value={query} onChange={handleQuery} placeholder="Search route, pickup, destination..." />
        </label>
        <div className="filter-row" aria-label="Category filter">
          <SlidersHorizontal size={18} />
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={item === category ? 'chip active' : 'chip'}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="state-bar glass">Refreshing ride matches...</div>}

      {!loading && filteredRides.length === 0 ? (
        <div className="empty-state glass">
          <AlertCircle size={24} />
          <h2>No rides found</h2>
          <p>Try a broader route search or choose a different category.</p>
        </div>
      ) : (
        <div className="ride-grid">
          {filteredRides.map((ride) => (
            <Link to={`/rides/${ride.id}`} className="ride-card glass" key={ride.id}>
              <img src={ride.image} alt="" />
              <div className="ride-card-body">
                <div className="card-topline">
                  <span>{ride.category}</span>
                  <strong>${ride.price}</strong>
                </div>
                <h2>{ride.title}</h2>
                <p>{ride.route}</p>
                <div className="detail-list compact-details">
                  <span>
                    <MapPin size={16} />
                    {ride.pickup}
                  </span>
                  <span>
                    <Clock size={16} />
                    {ride.date}, {ride.time}
                  </span>
                  <span>
                    <UsersRound size={16} />
                    {ride.seats} seats
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
