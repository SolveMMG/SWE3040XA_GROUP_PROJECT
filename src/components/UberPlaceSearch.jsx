import { Crosshair, MapPin, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getCurrentUserLocation, hasGoogleMapsKey, loadGoogleMaps, searchOpenStreetMap } from '../utils/googleMaps.js';

const NAIROBI_POPULAR_PLACES = [
  { id: 'nbi-1', name: 'Roysambu (TRM Mall)', address: 'Thika Road, Roysambu, Nairobi', lat: -1.218000, lng: 36.887000 },
  { id: 'nbi-2', name: 'Westlands (Sarit Centre)', address: 'Karuna Road, Westlands, Nairobi', lat: -1.261300, lng: 36.804100 },
  { id: 'nbi-3', name: 'Kilimani (Yaya Centre)', address: 'Argwings Kodhek Rd, Kilimani, Nairobi', lat: -1.291700, lng: 36.786500 },
  { id: 'nbi-4', name: 'Nairobi CBD (KICC)', address: 'Harambee Avenue, City Square, Nairobi', lat: -1.288500, lng: 36.823200 },
  { id: 'nbi-5', name: 'Upper Hill (KNH Hospital)', address: 'Hospital Road, Upper Hill, Nairobi', lat: -1.299500, lng: 36.807500 },
  { id: 'nbi-6', name: 'Gigiri (UN Environment HQ)', address: 'UN Avenue, Gigiri, Nairobi', lat: -1.233100, lng: 36.816900 },
  { id: 'nbi-7', name: 'Karen (The Hub)', address: 'Dagoretti Road, Karen, Nairobi', lat: -1.319700, lng: 36.711800 },
  { id: 'nbi-8', name: 'JKIA Airport Nairobi', address: 'Airport South Rd, Embakasi, Nairobi', lat: -1.332800, lng: 36.927500 },
  { id: 'nbi-9', name: 'Lavington Mall', address: 'James Gichuru Rd, Lavington, Nairobi', lat: -1.278500, lng: 36.768100 },
  { id: 'nbi-10', name: 'Ngong Road (Junction Mall)', address: 'Ngong Road, Dagoretti, Nairobi', lat: -1.298900, lng: 36.752300 },
  { id: 'nbi-11', name: 'Thika Road Mall (TRM)', address: 'Thika Superhighway, Roysambu, Nairobi', lat: -1.218500, lng: 36.887200 },
  { id: 'nbi-12', name: 'Garden City Mall', address: 'Thika Superhighway, Kasarani, Nairobi', lat: -1.232500, lng: 36.878500 },
  { id: 'nbi-13', name: 'Kasarani Stadium', address: 'Kasarani-Mwiki Road, Nairobi', lat: -1.225500, lng: 36.897800 },
  { id: 'nbi-14', name: 'Two Rivers Mall', address: 'Limuru Road, Ruaka, Nairobi', lat: -1.210500, lng: 36.797800 },
  { id: 'nbi-15', name: 'Waiyaki Way (ABC Place)', address: 'Waiyaki Way, Westlands, Nairobi', lat: -1.264500, lng: 36.781200 },
];

export default function UberPlaceSearch({
  value,
  onChange,
  onClear,
  onFocus: externalOnFocus,
  placeholder = 'Search location (e.g. Westlands, Yaya Centre, Sarit, KICC...)',
  label = '',
}) {
  const [inputValue, setInputValue] = useState(value?.address || value?.name || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [locating, setLocating] = useState(false);
  const containerRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const geocoderRef = useRef(null);

  useEffect(() => {
    setInputValue(value?.name || value?.address || '');
  }, [value?.name, value?.address]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize Google Maps Services
  useEffect(() => {
    if (!hasGoogleMapsKey()) return;
    loadGoogleMaps()
      .then((google) => {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        geocoderRef.current = new google.maps.Geocoder();
      })
      .catch(() => {});
  }, []);

  const handleInputChange = (text) => {
    setInputValue(text);
    const queryStr = text.trim().toLowerCase();

    if (!queryStr) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // 1. Instant Local Landmark Matching
    const localMatches = NAIROBI_POPULAR_PLACES.filter(
      (p) => p.name.toLowerCase().includes(queryStr) || p.address.toLowerCase().includes(queryStr),
    );

    if (localMatches.length > 0) {
      setSuggestions(localMatches);
      setShowDropdown(true);
    }

    // 2. Fetch Google Places or OpenStreetMap suggestions in background and merge
    if (hasGoogleMapsKey() && autocompleteServiceRef.current) {
      try {
        autocompleteServiceRef.current.getPlacePredictions(
          {
            input: text,
            componentRestrictions: { country: 'ke' },
          },
          (predictions, status) => {
            if (status === 'OK' && predictions && predictions.length > 0) {
              const googleResults = predictions.map((p) => ({
                id: p.place_id,
                name: p.structured_formatting?.main_text || p.description.split(',')[0],
                address: p.description,
                placeId: p.place_id,
              }));

              // Merge local and Google results removing duplicates
              const combined = [...localMatches];
              googleResults.forEach((g) => {
                if (!combined.some((c) => c.name.toLowerCase() === g.name.toLowerCase())) {
                  combined.push(g);
                }
              });
              setSuggestions(combined);
              setShowDropdown(true);
            }
          },
        );
      } catch (_err) {
        // Fallback already handled by local matches
      }
    } else if (localMatches.length === 0) {
      fetchOSMSuggestions(text);
    }
  };

  const fetchOSMSuggestions = async (text) => {
    try {
      const results = await searchOpenStreetMap(text);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
    } catch {
      // Keep existing suggestions if any
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setInputValue(suggestion.name || suggestion.address);
    setShowDropdown(false);

    if (hasGoogleMapsKey() && geocoderRef.current && suggestion.placeId && !suggestion.placeId.startsWith('osm-') && !suggestion.id?.startsWith('nbi-')) {
      geocoderRef.current.geocode({ placeId: suggestion.placeId }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          onChange({
            name: suggestion.name || results[0].formatted_address,
            address: results[0].formatted_address,
            placeId: suggestion.placeId,
            lat: loc.lat(),
            lng: loc.lng(),
          });
        } else {
          onChange(suggestion);
        }
      });
    } else {
      onChange(suggestion);
    }
  };

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const loc = await getCurrentUserLocation();
      setInputValue(loc.name || loc.address);
      setShowDropdown(false);
      onChange(loc);
    } catch {
      alert('Could not access your GPS location. Please check browser location permissions.');
    } finally {
      setLocating(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setShowDropdown(false);
    onClear?.();
  };

  return (
    <div className="uber-search-container" ref={containerRef}>
      {label && (
        <div className="uber-search-label-row">
          <label className="uber-label">{label}</label>
          <button
            type="button"
            className={`uber-gps-btn ${locating ? 'locating' : ''}`}
            onClick={handleUseCurrentLocation}
          >
            <Crosshair size={13} /> {locating ? 'Locating...' : 'Use my location'}
          </button>
        </div>
      )}

      <div className="uber-search-input-box">
        <MapPin size={18} className="uber-pin-icon" />
        <input
          type="text"
          className="uber-search-input"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={(e) => {
            if (inputValue.trim()) {
              handleInputChange(inputValue);
            }
            externalOnFocus?.(e);
          }}
          placeholder={placeholder}
        />
        {inputValue ? (
          <button type="button" className="uber-icon-btn" onClick={handleClear} aria-label="Clear location">
            <X size={16} />
          </button>
        ) : (
          <button
            type="button"
            className={`uber-icon-btn gps-icon-btn ${locating ? 'locating' : ''}`}
            onClick={handleUseCurrentLocation}
            title="Use current GPS location"
          >
            <Crosshair size={16} />
          </button>
        )}
      </div>

      {/* Uber/Bolt Style Suggestions Dropdown Menu */}
      {showDropdown && suggestions.length > 0 && (
        <ul className="uber-suggestions-dropdown">
          {suggestions.map((item) => (
            <li
              key={item.id || item.placeId || item.address}
              className="uber-suggestion-item"
              onClick={() => handleSelectSuggestion(item)}
            >
              <div className="suggestion-icon-circle">
                <MapPin size={16} />
              </div>
              <div className="suggestion-text">
                <strong className="suggestion-title">{item.name}</strong>
                <span className="suggestion-subtitle">{item.address}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
