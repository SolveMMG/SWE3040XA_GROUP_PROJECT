import { Crosshair, MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_NAIROBI_CENTER, getCurrentUserLocation, hasGoogleMapsKey, loadGoogleMaps, toLatLngLiteral } from '../utils/googleMaps.js';
import OpenStreetMapPicker from './OpenStreetMapPicker.jsx';

function placeToLocation(place) {
  const location = place.geometry?.location;
  return {
    name: place.name || place.formatted_address || '',
    address: place.formatted_address || place.name || '',
    placeId: place.place_id || '',
    lat: location?.lat(),
    lng: location?.lng(),
  };
}

export default function GooglePlacePicker({ label, value, onChange, id }) {
  if (!hasGoogleMapsKey()) return <OpenStreetMapPicker label={label} value={value} onChange={onChange} id={id} />;
  const inputRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [status, setStatus] = useState(hasGoogleMapsKey() ? 'loading' : 'manual');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!hasGoogleMapsKey()) return undefined;

    let active = true;
    let autocomplete;
    let map;
    let geocoder;

    loadGoogleMaps()
      .then((google) => {
        if (!active || !inputRef.current || !mapRef.current) return;

        const selectedLocation = toLatLngLiteral(value);
        const center = selectedLocation || DEFAULT_NAIROBI_CENTER;
        map = new google.maps.Map(mapRef.current, {
          center,
          zoom: selectedLocation ? 13 : 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        markerRef.current = new google.maps.Marker({
          map,
          position: selectedLocation || null,
        });
        geocoder = new google.maps.Geocoder();

        autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry', 'name', 'place_id'],
          componentRestrictions: { country: 'ke' },
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.geometry?.location) return;

          const nextLocation = placeToLocation(place);
          markerRef.current.setPosition({ lat: nextLocation.lat, lng: nextLocation.lng });
          map.panTo({ lat: nextLocation.lat, lng: nextLocation.lng });
          map.setZoom(14);
          onChange(nextLocation);
        });

        map.addListener('click', (event) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          markerRef.current.setPosition({ lat, lng });
          geocoder.geocode({ location: { lat, lng } }, (results, geocoderStatus) => {
            const result = geocoderStatus === 'OK' ? results?.[0] : null;
            onChange({
              name: result?.address_components?.[0]?.long_name || result?.formatted_address || 'Selected place in Kenya',
              address: result?.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              placeId: result?.place_id || '',
              lat,
              lng,
            });
          });
        });

        setStatus('ready');
      })
      .catch(() => setStatus('manual'));

    return () => {
      active = false;
      if (autocomplete) google.maps.event.clearInstanceListeners(autocomplete);
      if (map) google.maps.event.clearInstanceListeners(map);
    };
  }, [onChange, value?.lat, value?.lng]);

  const updateManual = (field, nextValue) => {
    onChange({
      ...value,
      [field]: field === 'lat' || field === 'lng' ? Number(nextValue) : nextValue,
    });
  };

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const loc = await getCurrentUserLocation();
      onChange(loc);
    } catch {
      alert('Could not access location. Please check browser location permissions.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="place-picker">
      <div className="picker-label-row">
        <label htmlFor={id}>{label}</label>
        <button
          type="button"
          className={`use-gps-link ${locating ? 'locating' : ''}`}
          onClick={handleUseCurrentLocation}
        >
          <Crosshair size={14} /> Use my current location
        </button>
      </div>

      <span className="input-with-icon">
        <MapPin size={18} />
        <input
          id={id}
          ref={inputRef}
          value={value?.address || value?.name || ''}
          onChange={(event) => updateManual('address', event.target.value)}
          placeholder="Type a location in Kenya (e.g. Westlands, CBD, Kilimani...)"
          required
        />
      </span>

      {status === 'manual' ? (
        <div className="coordinate-grid">
          <input
            type="number"
            step="any"
            value={value?.lat || ''}
            onChange={(event) => updateManual('lat', event.target.value)}
            placeholder="Latitude"
            required
          />
          <input
            type="number"
            step="any"
            value={value?.lng || ''}
            onChange={(event) => updateManual('lng', event.target.value)}
            placeholder="Longitude"
            required
          />
        </div>
      ) : (
        <div ref={mapRef} className="map-canvas" aria-label={`${label} map`} />
      )}
      {status === 'loading' && <div className="state-bar">Loading Google Maps...</div>}
    </div>
  );
}
