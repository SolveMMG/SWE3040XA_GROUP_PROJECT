import { Crosshair, LocateFixed, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getCurrentUserLocation, hasGoogleMapsKey, loadGoogleMaps } from '../utils/googleMaps.js';

export default function GooglePlaceSearch({ value, onChange, onClear, placeholder = 'Search place in Kenya (e.g. Westlands, CBD, Kilimani...)' }) {
  const inputRef = useRef(null);
  const [manualValue, setManualValue] = useState(value?.address || value?.name || '');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setManualValue(value?.address || value?.name || '');
  }, [value?.address, value?.name]);

  useEffect(() => {
    if (!hasGoogleMapsKey()) return undefined;

    let active = true;
    let autocomplete;

    loadGoogleMaps()
      .then((google) => {
        if (!active || !inputRef.current) return;

        autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry', 'name', 'place_id'],
          componentRestrictions: { country: 'ke' },
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const location = place.geometry?.location;
          if (!location) return;

          const selected = {
            name: place.name || place.formatted_address || '',
            address: place.formatted_address || place.name || '',
            placeId: place.place_id || '',
            lat: location.lat(),
            lng: location.lng(),
          };
          onChange(selected);
        });
      })
      .catch(() => {});

    return () => {
      active = false;
      if (autocomplete) google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [onChange]);

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const loc = await getCurrentUserLocation();
      onChange(loc);
    } catch {
      alert('Could not access your location. Please check browser location permissions.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="place-search-wrapper">
      <label className="search-field map-search-field">
        <LocateFixed size={18} />
        <input
          ref={inputRef}
          value={manualValue}
          onChange={(event) => setManualValue(event.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          className={`mini-icon-button gps-button ${locating ? 'spinning' : ''}`}
          onClick={handleUseCurrentLocation}
          title="Use my current location as pickup spot"
        >
          <Crosshair size={16} />
        </button>
        {value && (
          <button type="button" className="mini-icon-button" onClick={onClear} aria-label="Clear map search">
            <X size={16} />
          </button>
        )}
      </label>
    </div>
  );
}
