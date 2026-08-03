import { AlertCircle, Bookmark, Calendar, Clock, Crosshair, DollarSign, Filter, Layers, LayoutGrid, LogIn, Map, MapPin, Navigation, RotateCcw, Search, ShieldCheck, Sparkles, UsersRound, Zap, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MarketplaceMap from '../components/MarketplaceMap.jsx';
import UberPlaceSearch from '../components/UberPlaceSearch.jsx';
import { api, rideFromApi } from '../services/api.js';
import { useAuth } from '../state/AuthContext.jsx';
import { calculateFareFromKm, calculateHaversineKm, calculatePickupSurcharge, calculateTotalRideFare, formatKSh, getCurrentUserLocation } from '../utils/googleMaps.js';

const FAVORITE_PLACES = [
  {
    id: 'place-1',
    name: 'Nairobi National Park',
    location: 'Lang\'ata Road, Nairobi',
    category: 'Kenya Wildlife Service',
    image: 'https://national-parks.org/wp-content/uploads/2025/10/Nairobi-National-Park-herd-of-elephant.jpg',
    description: "The world's only wildlife capital park. Spot lions, rhinos & giraffes against city skyscrapers.",
    lat: -1.3733,
    lng: 36.8584,
  },
  {
    id: 'place-2',
    name: 'Giraffe Centre',
    location: 'Duma Road, Lang\'ata, Nairobi',
    category: 'AFEW Sanctuary',
    image: 'https://www.giraffecentre.org/wp-content/uploads/2016/11/giraffe_centre-get-involved-homepage-compressed.jpg',
    description: 'Get up close and hand-feed endangered Rothschild giraffes in a lush indigenous forest sanctuary.',
    lat: -1.3758,
    lng: 36.7443,
  },
  {
    id: 'place-3',
    name: 'Karura Forest',
    location: 'Limuru Road, Muthaiga, Nairobi',
    category: 'Urban Forest Reserve',
    image: 'https://c8.alamy.com/comp/KH0M03/a-waterfall-in-karura-forest-nairobi-kenya-KH0M03.jpg',
    description: 'Expansive urban forest featuring scenic waterfalls, bamboo woods, caves, and cycling trails.',
    lat: -1.2407,
    lng: 36.8290,
  },
  {
    id: 'place-4',
    name: 'KICC (Kenyatta Int. Convention Centre)',
    location: 'Harambee Avenue, CBD, Nairobi',
    category: 'Landmark & Convention Centre',
    image: 'https://cdn.getyourguide.com/image/format=auto,fit=crop,gravity=auto,quality=60,width=400,height=265,dpr=2/tour_img/b9defe0bdca84c27b17c4a041a7afaa870c91d0540acfa8585fd869a475cc41f.jpeg',
    description: 'Iconic 28-story tower offering 360-degree panoramic helipad views of Nairobi city skyline.',
    lat: -1.2885,
    lng: 36.8232,
  },
  {
    id: 'place-5',
    name: 'Hell\'s Gate National Park',
    location: 'Moi South Lake Rd, Naivasha',
    category: 'National Park & Adventure',
    image: 'https://national-parks.org/wp-content/uploads/2025/10/Hells-Gate-National-Park-canyon.jpg',
    description: 'Cycle alongside zebras amidst dramatic volcanic gorges, hot springs, and geothermal canyons.',
    lat: -0.8856,
    lng: 36.3150,
  },
  {
    id: 'place-6',
    name: 'Thika Road Mall (TRM)',
    location: 'Thika Superhighway, Roysambu, Nairobi',
    category: 'Shopping & Entertainment',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT17OLgGYfWFjc3-iFV-Pjktw87oq_DWpclTTsSfjBRv-1FabDOO5K64SBP&s=10',
    description: 'Premier shopping, dining, and leisure hub along Thika Superhighway.',
    lat: -1.2180,
    lng: 36.8870,
  },
];

const SAVED_NAIROBI_LOCATIONS = [
  { id: 'loc-1', name: 'Roysambu (TRM Mall)', address: 'Thika Road, Roysambu, Nairobi', lat: -1.218000, lng: 36.887000 },
  { id: 'loc-2', name: 'Westlands (Sarit Centre)', address: 'Karuna Road, Westlands, Nairobi', lat: -1.261300, lng: 36.804100 },
  { id: 'loc-3', name: 'Kilimani (Yaya Centre)', address: 'Argwings Kodhek Rd, Kilimani, Nairobi', lat: -1.291700, lng: 36.786500 },
  { id: 'loc-4', name: 'Nairobi CBD (KICC)', address: 'Harambee Avenue, City Square, Nairobi', lat: -1.288500, lng: 36.823200 },
  { id: 'loc-5', name: 'Upper Hill (KNH Hospital)', address: 'Hospital Road, Upper Hill, Nairobi', lat: -1.299500, lng: 36.807500 },
];

export default function MarketplacePage() {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser?.role === 'driver') {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser?.role, navigate]);

  const [originLocation, setOriginLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [seats, setSeats] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [radius, setRadius] = useState('25');

  // Primary display section: 'places' is displayed first on opening the app
  const [displaySection, setDisplaySection] = useState('places');
  const [rides, setRides] = useState([]);
  const [totalRides, setTotalRides] = useState(0);
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const fetchRides = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('query', query.trim());
      if ((!originLocation?.lat || !originLocation?.lng) && (originLocation?.name || originLocation?.address)) {
        params.set('origin', originLocation.name || originLocation.address);
      }
      if (originLocation?.lat && originLocation?.lng) {
        params.set('originLat', String(originLocation.lat));
        params.set('originLng', String(originLocation.lng));
      }
      if (date) params.set('date', date);
      if (seats) params.set('seats', seats);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (showFilters && radius) params.set('radius', radius);

      const data = await api(`/rides?${params.toString()}`);
      const mapped = (data.rides || []).map(rideFromApi);
      setRides(mapped);
      setTotalRides(data.total || mapped.length);

      if (mapped.length > 0) {
        setSelectedRideId((prev) => prev ?? mapped[0].id);
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, [query, originLocation, date, seats, maxPrice, radius, showFilters]);

  useEffect(() => {
    const timer = setTimeout(fetchRides, 300);
    return () => clearTimeout(timer);
  }, [fetchRides]);

  // Once logged in and user starts searching for a destination, automatically switch to available drivers view
  useEffect(() => {
    if (isAuthenticated && (destinationLocation || query.trim())) {
      setDisplaySection('drivers');
    }
  }, [isAuthenticated, destinationLocation, query]);

  // Request browser GPS position on load if not set
  useEffect(() => {
    if (!originLocation) {
      getCurrentUserLocation()
        .then((loc) => setOriginLocation(loc))
        .catch(() => {});
    }
  }, []);

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const loc = await getCurrentUserLocation();
      setOriginLocation(loc);
    } catch {
      alert('Could not access location. Please enable location permissions in your browser.');
    } finally {
      setLocating(false);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setOriginLocation(null);
    setDestinationLocation(null);
    setDate('');
    setSeats('');
    setMaxPrice('');
    setRadius('25');
  };

  // Calculate dynamic trip distance and fare
  const tripDistanceKm = calculateHaversineKm(originLocation, destinationLocation);
  const dynamicTripFare = tripDistanceKm !== null ? calculateFareFromKm(tripDistanceKm) : null;

  const handleSelectPlaceTemplate = (place) => {
    setDestinationLocation({
      name: place.name,
      address: place.location,
      lat: place.lat,
      lng: place.lng,
    });

    if (!isAuthenticated) {
      setShowAuthModal(true);
    } else {
      // Switch to drivers section so user can see available drivers to this site
      setDisplaySection('drivers');
    }
  };

  const hasActiveFilters = Boolean(
    query || originLocation || destinationLocation || date || seats || maxPrice,
  );

  // Display 5 available drivers preview
  const previewRides = rides.slice(0, 5);
  const remainingCount = Math.max(0, rides.length - previewRides.length);

  return (
    <section className="page marketplace-page uber-style-page">
      {/* Logged Out Hero & Platform Stats Banner */}
      {!isAuthenticated && (
        <div className="logged-out-hero glass">
          <div className="hero-text-content">
            <span className="eyebrow">Nairobi's Premium Smart Rides Platform</span>
            <h1>Explore Top Destinations & Book Instant Smart Rides</h1>
            <p>Browse favorite places around Nairobi & Kenya, select your destination, and ride with verified nearby drivers.</p>
          </div>

          <div className="platform-stats-grid">
            <div className="stat-card glass">
              <strong className="stat-number">10+</strong>
              <span className="stat-label">Active Drivers Stationed Across Nairobi</span>
            </div>
            <div className="stat-card glass">
              <strong className="stat-number">5 KSh</strong>
              <span className="stat-label">Distance Fare Rate (per 1 km step)</span>
            </div>
            <div className="stat-card glass">
              <strong className="stat-number">4.9 ★</strong>
              <span className="stat-label">Average Community Driver Rating</span>
            </div>
            <div className="stat-card glass">
              <strong className="stat-number">100%</strong>
              <span className="stat-label">M-Pesa STK Push Payment & Auto Refund</span>
            </div>
          </div>
        </div>
      )}

      {/* Search Capsule: ONLY visible for Logged In Users */}
      {isAuthenticated && (
        <div className="uber-search-card glass">
          <div className="uber-card-header">
            <div>
              <span className="eyebrow">Smart Ride Matching</span>
              <h2>Where to? Set pickup & drop-off for instant fare</h2>
            </div>
            <button
              type="button"
              className={`gps-pill-btn ${locating ? 'locating' : ''}`}
              onClick={handleUseCurrentLocation}
            >
              <Crosshair size={15} /> {locating ? 'Locating...' : 'Use My GPS Location'}
            </button>
          </div>

          <div className="uber-inputs-grid">
            <UberPlaceSearch
              label="Pickup Location"
              value={originLocation}
              onChange={setOriginLocation}
              onClear={() => setOriginLocation(null)}
              placeholder="Pickup in Nairobi (e.g. Roysambu, Westlands, Yaya, KICC...)"
            />

            <UberPlaceSearch
              label="Drop-off Destination (Anywhere in Kenya)"
              value={destinationLocation}
              onFocus={() => {
                if (isAuthenticated) setDisplaySection('drivers');
              }}
              onChange={(loc) => {
                setDestinationLocation(loc);
                if (isAuthenticated) setDisplaySection('drivers');
              }}
              onClear={() => setDestinationLocation(null)}
              placeholder="Search drop-off destination anywhere in Kenya..."
            />
          </div>

          {/* 5 Saved Nairobi Pickup Locations Chips */}
          <div className="saved-locations-container">
            <span className="saved-label"><Bookmark size={13} /> Popular Saved Spots:</span>
            <div className="saved-chips-list">
              {SAVED_NAIROBI_LOCATIONS.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  className={`saved-chip ${originLocation?.name === loc.name ? 'active' : ''}`}
                  onClick={() => setOriginLocation(loc)}
                >
                  <MapPin size={12} /> {loc.name}
                </button>
              ))}
            </div>
          </div>

          {/* Smart Ride Dynamic Fare Preview Banner */}
          {tripDistanceKm !== null && dynamicTripFare !== null && (
            <div className="uber-fare-preview-banner">
              <div className="fare-banner-left">
                <Sparkles size={20} className="sparkle-icon" />
                <div>
                  <strong>Est. Trip Distance: {tripDistanceKm.toFixed(1)} km</strong>
                  <span>Direct driver pickup & drop-off</span>
                </div>
              </div>
              <div className="fare-banner-right">
                <span className="fare-label">Base Trip Fare:</span>
                <strong className="fare-amount">{formatKSh(dynamicTripFare)}</strong>
              </div>
            </div>
          )}

          <div className="uber-toolbar-row">
            <div className="filter-chips">
              <button
                type="button"
                className={`chip ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={14} /> Filters {hasActiveFilters && '(Active)'}
              </button>
              {hasActiveFilters && (
                <button type="button" className="chip danger" onClick={resetFilters}>
                  <RotateCcw size={14} /> Clear Search
                </button>
              )}
            </div>
          </div>

          {/* Expandable Advanced Filters */}
          {showFilters && (
            <div className="filter-drawer">
              <div className="filter-field">
                <label htmlFor="filter-date"><Calendar size={14} /> Departure Date</label>
                <input
                  id="filter-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="filter-field">
                <label htmlFor="filter-seats"><UsersRound size={14} /> Min Seats Needed</label>
                <input
                  id="filter-seats"
                  type="number"
                  min="1"
                  placeholder="Any"
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                />
              </div>
              <div className="filter-field">
                <label htmlFor="filter-price"><DollarSign size={14} /> Max Fare (KSh)</label>
                <input
                  id="filter-price"
                  type="number"
                  min="0"
                  placeholder="e.g. 500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
              <div className="filter-field">
                <label htmlFor="filter-radius"><Navigation size={14} /> Max Radius</label>
                <select
                  id="filter-radius"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                >
                  <option value="5">5 miles (~8 km)</option>
                  <option value="10">10 miles (~16 km)</option>
                  <option value="25">25 miles (~40 km)</option>
                  <option value="50">50 miles (~80 km)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Display Switcher Header Bar (Places Displayed First) */}
      <div className="view-toggle-nav-container glass">
        <button
          type="button"
          className={`view-toggle-tab ${displaySection === 'places' ? 'active' : ''}`}
          onClick={() => setDisplaySection('places')}
        >
          <MapPin size={18} /> Favorite Places & Destinations ({FAVORITE_PLACES.length})
        </button>
        <button
          type="button"
          className={`view-toggle-tab ${displaySection === 'drivers' ? 'active' : ''}`}
          onClick={() => setDisplaySection('drivers')}
        >
          <Zap size={18} /> Available Drivers ({previewRides.length})
        </button>
      </div>

      {/* SECTION 1: Favorite Places & Destinations Templates (DISPLAYED FIRST) */}
      {displaySection === 'places' && (
        <div className="places-section-wrapper">
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">Explore Destinations</span>
              <h2>Popular Places & Favorite Sites to Visit</h2>
            </div>
            <button
              type="button"
              className="button secondary compact-cta-btn"
              onClick={() => setDisplaySection('drivers')}
            >
              <Zap size={16} /> View Drivers List ({previewRides.length})
            </button>
          </div>

          <div className="favorite-places-grid">
            {FAVORITE_PLACES.map((place) => (
              <article key={place.id} className="favorite-place-card glass">
                <div className="place-card-image-box">
                  <img
                    src={place.image}
                    alt={place.name}
                    className="place-card-img"
                    loading="lazy"
                  />
                  <span className="place-category-badge">{place.category}</span>
                </div>
                <div className="place-card-body">
                  <div className="place-card-header">
                    <h3>{place.name}</h3>
                    <span className="place-location-sub">
                      <MapPin size={14} /> {place.location}
                    </span>
                  </div>
                  <p className="place-description">{place.description}</p>
                  <button
                    type="button"
                    className="button place-select-btn"
                    onClick={() => handleSelectPlaceTemplate(place)}
                  >
                    <Navigation size={16} /> Ride to {place.name.split(' ')[0]}
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* CTA Box to switch/scroll to Drivers */}
          <div className="view-drivers-cta-card glass">
            <div className="cta-content">
              <Zap size={28} className="cta-icon" />
              <div>
                <h3>Ready to book a verified driver?</h3>
                <p>Choose from active drivers stationed nearby across Nairobi for your trip.</p>
              </div>
            </div>
            <button
              type="button"
              className="button cta-drivers-btn"
              onClick={() => setDisplaySection('drivers')}
            >
              <Zap size={18} /> Show Available Drivers Nearby ({previewRides.length})
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: Available Drivers List */}
      {displaySection === 'drivers' && (
        <div className="drivers-section-wrapper">
          {/* Driver Status Banner */}
          <div className="results-status-bar">
            <span>
              {originLocation?.name || originLocation?.address ? (
                <>
                  Showing <strong>{previewRides.length}</strong> available drivers closest to <strong>{originLocation.name || originLocation.address}</strong> {remainingCount > 0 && `(+${remainingCount} more drivers active)`}
                </>
              ) : (
                <>
                  Showing <strong>{previewRides.length}</strong> active drivers stationed across Nairobi {remainingCount > 0 && `(+${remainingCount} more available nearby)`}
                </>
              )}
            </span>
            {loading && <span className="loading-tag">Updating driver proximity...</span>}
          </div>

          {error && <div className="state-bar danger">{error}</div>}

          {/* Driver List View */}
          <div className="marketplace-body view-list">
            <div className="rides-list-wrapper">
              <div className="list-header-row">
                <h3><Zap size={18} /> Available Drivers Nearby</h3>
                <button
                  type="button"
                  className="button ghost compact"
                  onClick={() => setDisplaySection('places')}
                >
                  <MapPin size={16} /> Back to Places
                </button>
              </div>

              {!loading && previewRides.length === 0 ? (
                <div className="empty-state glass">
                  <AlertCircle size={28} />
                  <h2>Finding closest drivers...</h2>
                  <p>Locating drivers across Nairobi...</p>
                </div>
              ) : (
                <div className="driver-cards-list">
                  {previewRides.map((ride) => {
                    const isSelected = String(ride.id) === String(selectedRideId);
                    const distKmNum = ride.distance_miles ? ride.distance_miles * 1.60934 : 0;
                    const distKmStr = distKmNum > 0 ? distKmNum.toFixed(1) : null;
                    const pickupSurcharge = calculatePickupSurcharge(distKmNum);
                    const baseTripFare = dynamicTripFare !== null ? dynamicTripFare : calculateFareFromKm(10);
                    const totalItemFare = baseTripFare + pickupSurcharge;

                    return (
                      <div
                        key={ride.id}
                        className={`uber-driver-card glass ${isSelected ? 'selected' : ''}`}
                        onMouseEnter={() => setSelectedRideId(ride.id)}
                        onClick={() => setSelectedRideId(ride.id)}
                      >
                        <div className="driver-card-left">
                          {ride.seller?.photoUrl ? (
                            <img src={ride.seller.photoUrl} alt={ride.seller.name} className="uber-driver-avatar" />
                          ) : (
                            <div className="uber-driver-avatar initials">
                              {ride.seller?.name?.[0] || 'D'}
                            </div>
                          )}

                          <div className="driver-info-main">
                            <div className="driver-title-row">
                              <h4>{ride.seller?.name || 'Kenyan Driver'}</h4>
                              <span className="rating-badge">★ {ride.seller?.rating || '4.9'}</span>
                            </div>

                            <div className="driver-route-subtitle">
                              <span><MapPin size={12} /> From: <strong>{ride.pickup}</strong></span>
                              <span><Navigation size={12} /> To: <strong>{ride.dropoff}</strong></span>
                            </div>

                            <div className="driver-badges">
                              {distKmStr !== null && (
                                <span className="proximity-badge">
                                  <Zap size={13} /> {distKmStr} km from pickup (+{formatKSh(pickupSurcharge)})
                                </span>
                              )}
                              <span className="seats-badge">
                                <UsersRound size={13} /> {ride.seats} seats available
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="driver-card-right">
                          <div className="fare-box">
                            <strong className="fare-price">{formatKSh(ride.price)}</strong>
                            <span className="fare-sub">per seat</span>
                          </div>

                          {isAuthenticated && currentUser?.role !== 'driver' ? (
                            <Link
                              to={`/rides/${ride.id}`}
                              state={{
                                customPickup: originLocation,
                                customDropoff: destinationLocation,
                                calculatedFare: ride.price,
                                pickupDistanceKm: distKmNum,
                                tripDistanceKm: tripDistanceKm,
                              }}
                              className="button mini-button select-driver-btn"
                            >
                              Select Driver
                            </Link>
                          ) : isAuthenticated ? (
                            <button
                              type="button"
                              className="button mini-button select-driver-btn"
                              disabled
                            >
                              Bookings not allowed
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="button mini-button select-driver-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAuthModal(true);
                              }}
                            >
                              Select Driver
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sign In Required Modal for Unauthenticated Users */}
      {showAuthModal && (
        <div className="modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="modal-content glass auth-required-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="modal-icon-circle">
                <LogIn size={26} />
              </div>
              <button type="button" className="close-btn" onClick={() => setShowAuthModal(false)}>
                <X size={18} />
              </button>
            </div>
            <h2>Sign In Required</h2>
            <p>You must sign in or create an account to select a driver, request a ride, and complete payment via M-Pesa.</p>
            <div className="modal-actions-row">
              <Link to="/login" className="button">
                <LogIn size={16} /> Sign In Now
              </Link>
              <Link to="/login" className="button secondary">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

