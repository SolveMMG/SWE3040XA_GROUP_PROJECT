import { MapPin, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { loadOpenStreetMap, searchOpenStreetMap, toLatLngLiteral } from '../utils/googleMaps.js';

const defaultCenter = { lat: 37.7749, lng: -122.4194 };

export default function OpenStreetMapPicker({ label, value, onChange, id }) {
  const mapNode = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [query, setQuery] = useState(value?.address || '');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const select = (location, leaflet = window.L) => {
    setQuery(location.address);
    setResults([]);
    onChange(location);
    if (!map.current || !leaflet) return;
    const point = [location.lat, location.lng];
    if (marker.current) marker.current.setLatLng(point);
    else marker.current = leaflet.circleMarker(point, { radius: 8 }).addTo(map.current);
    map.current.setView(point, 14);
  };

  useEffect(() => { setQuery(value?.address || ''); }, [value?.address]);

  useEffect(() => {
    let active = true;
    loadOpenStreetMap()
      .then((leaflet) => {
        if (!active || !mapNode.current || map.current) return;
        const selected = toLatLngLiteral(value);
        const point = selected || defaultCenter;
        map.current = leaflet.map(mapNode.current).setView([point.lat, point.lng], selected ? 13 : 11);
        leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map.current);
        if (selected) marker.current = leaflet.circleMarker([point.lat, point.lng], { radius: 8 }).addTo(map.current);
        map.current.on('click', (event) => {
          select({
            name: 'Selected place',
            address: `${event.latlng.lat.toFixed(6)}, ${event.latlng.lng.toFixed(6)}`,
            placeId: '',
            lat: event.latlng.lat,
            lng: event.latlng.lng,
          }, leaflet);
        });
      })
      .catch(() => setError('Map display is unavailable. You can still enter coordinates below.'));
    return () => {
      active = false;
      if (map.current) {
        map.current.remove();
        map.current = null;
        marker.current = null;
      }
    };
  }, []);

  const search = async () => {
    try {
      setError('');
      setResults(await searchOpenStreetMap(query));
    } catch (err) {
      setError(err.message);
    }
  };

  const update = (field, next) => onChange({
    ...value,
    [field]: field === 'lat' || field === 'lng' ? Number(next) : next,
  });

  return (
    <div className="place-picker">
      <label htmlFor={id}>
        {label}
        <span className="input-with-icon">
          <MapPin size={18} />
          <input id={id} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search OpenStreetMap" required />
        </span>
      </label>
      <button type="button" className="button ghost compact" onClick={search}><Search size={16} />Search location</button>
      {results.length > 0 && <div className="site-list">{results.map((result) => (
        <button type="button" className="site-card" key={result.placeId} onClick={() => select(result)}>{result.address}</button>
      ))}</div>}
      <div ref={mapNode} className="map-canvas" aria-label={`${label} map`} />
      <div className="coordinate-grid">
        <input type="number" step="any" value={value?.lat ?? ''} onChange={(e) => update('lat', e.target.value)} placeholder="Latitude" required />
        <input type="number" step="any" value={value?.lng ?? ''} onChange={(e) => update('lng', e.target.value)} placeholder="Longitude" required />
      </div>
      {error && <div className="state-bar danger">{error}</div>}
    </div>
  );
}
