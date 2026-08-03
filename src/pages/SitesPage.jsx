import { ExternalLink, ImageIcon, MapPinned, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import GooglePlacePicker from '../components/GooglePlacePicker.jsx';
import SitesMap from '../components/SitesMap.jsx';
import { api } from '../services/api.js';
import { useAuth } from '../state/AuthContext.jsx';

const PLACEHOLDER_IMAGES = {
  'Roysambu': 'https://images.unsplash.com/photo-1569336415962-a4bd9f609cd1?w=200&h=150&fit=crop',
  'Westlands': 'https://images.unsplash.com/photo-1570464197285-9949814674a7?w=200&h=150&fit=crop',
  'Kilimani': 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=200&h=150&fit=crop',
  'CBD': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=150&fit=crop',
  'KICC': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=150&fit=crop',
  'Upper Hill': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=150&fit=crop',
  'KNH': 'https://images.unsplash.com/photo-1587351021759-3772687fe598?w=200&h=150&fit=crop',
  'TRM': 'https://images.unsplash.com/photo-1569336415962-a4bd9f609cd1?w=200&h=150&fit=crop',
  'Sarit': 'https://images.unsplash.com/photo-1570464197285-9949814674a7?w=200&h=150&fit=crop',
  'Yaya': 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=200&h=150&fit=crop',
  'Home': 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=150&fit=crop',
  'Work': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=150&fit=crop',
  'Gym': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=150&fit=crop',
  'Campus': 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&h=150&fit=crop',
  'default': 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=200&h=150&fit=crop'
};

const getSiteImage = (site) => {
  const name = (site.name || '').toLowerCase();
  const address = (site.address || '').toLowerCase();
  for (const [key, url] of Object.entries(PLACEHOLDER_IMAGES)) {
    if (name.includes(key.toLowerCase()) || address.includes(key.toLowerCase())) {
      return url;
    }
  }
  return PLACEHOLDER_IMAGES.default;
};

const emptySite = { name: '', address: '', placeId: '', lat: '', lng: '' };

export default function SitesPage() {
  const { token } = useAuth();
  const [sites, setSites] = useState([]);
  const [form, setForm] = useState(emptySite);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(() => {
    api('/sites')
      .then((data) => setSites(data.sites || []))
      .catch((err) => setMessage(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updatePlace = useCallback((location) => {
    setForm((current) => ({
      ...current,
      ...location,
      name: current.name || location.name || location.address || '',
    }));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!form.lat || !form.lng) {
      setMessage('Please select a location from the map or picker.');
      return;
    }

    try {
      await api('/sites', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          address: form.address,
          placeId: form.placeId,
          latitude: Number(form.lat),
          longitude: Number(form.lng),
        }),
      });
      setForm(emptySite);
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  // Optimistic UI Deletion
  const remove = async (id) => {
    setMessage('');
    const previousSites = sites;

    // Immediately remove from UI
    setSites((current) => current.filter((s) => s.id !== id));

    try {
      await api(`/sites/${id}`, { token, method: 'DELETE' });
    } catch (err) {
      // Rollback UI state if server request fails
      setSites(previousSites);
      setMessage(err.message || 'Failed to delete location.');
    }
  };

  const filteredSites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sites;
    return sites.filter(
      (site) =>
        site.name?.toLowerCase().includes(query) ||
        site.address?.toLowerCase().includes(query)
    );
  }, [sites, searchQuery]);

  return (
    <section className="page form-page sites-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Saved locations</span>
          <h1>Manage your frequent pickup and destination sites.</h1>
        </div>
      </div>

      {sites.length > 0 && (
        <div className="sites-map-wrapper glass">
          <SitesMap sites={filteredSites} />
        </div>
      )}

      <div className="sites-layout">
        <form className="form-card glass" onSubmit={submit}>
          <h2>Add New Saved Site</h2>
          <label>
            Site Custom Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Work, Home, Gym, Campus"
              required
            />
          </label>

          <GooglePlacePicker
            id="site-location"
            label="Google Maps Location"
            value={form}
            onChange={updatePlace}
          />

          <button type="submit" className="button">
            <Plus size={18} /> Add site
          </button>
          {message && <p className="state-bar danger">{message}</p>}
        </form>

        <div className="site-list glass">
          <div className="site-list-header">
            <h2>Your Saved Locations ({filteredSites.length})</h2>
            {sites.length > 0 && (
              <div className="search-input-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Filter sites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            )}
          </div>

          {sites.length === 0 ? (
            <div className="empty-state">
              <MapPinned size={28} />
              <h2>No pickup sites available yet.</h2>
              <p>Add your frequent pickup or dropoff spots for easy 1-click selection.</p>
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="empty-state">
              <Search size={28} />
              <h2>No matching sites found.</h2>
              <p>Try searching for a different name or address.</p>
            </div>
          ) : (
            filteredSites.map((site) => (
              <article className="site-card" key={site.id}>
                <div className="site-card-image-wrapper">
                  <img
                    src={getSiteImage(site)}
                    alt={site.name}
                    className="site-card-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                <div className="site-card-info">
                  <h2>{site.name}</h2>
                  <p>{site.address}</p>
                  <span className="site-coords">
                    {site.latitude}, {site.longitude}
                  </span>
                </div>
                <div className="site-card-actions">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="icon-button"
                    title="Open in Google Maps"
                    aria-label="Open in Google Maps"
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => remove(site.id)}
                    aria-label="Delete site"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
