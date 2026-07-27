let googleMapsPromise;
let openStreetMapPromise;

export const DEFAULT_NAIROBI_CENTER = { lat: -1.286389, lng: 36.817223 };

export const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export function hasGoogleMapsKey() {
  return Boolean(googleMapsApiKey);
}

export function formatKSh(amount) {
  if (amount === undefined || amount === null) return 'KSh 0';
  return `KSh ${Number(amount).toLocaleString('en-KE')}`;
}

export function loadGoogleMaps() {
  if (!hasGoogleMapsKey()) {
    return Promise.reject(new Error('Google Maps API key is missing'));
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const rejectLoad = (error) => {
        googleMapsPromise = undefined;
        reject(error instanceof Error ? error : new Error('Google Maps failed to load'));
      };
      const existing = document.querySelector('script[data-google-maps-loader="true"]');
      if (existing) {
        existing.addEventListener(
          'load',
          () => {
            if (window.google?.maps?.places) resolve(window.google);
            else rejectLoad(new Error('Google Maps loaded without the Places library'));
          },
          { once: true },
        );
        existing.addEventListener('error', () => rejectLoad(new Error('Google Maps failed to load')), { once: true });
        return;
      }

      window.__rideloopGoogleMapsReady = () => {
        if (window.google?.maps?.places) resolve(window.google);
        else rejectLoad(new Error('Google Maps loaded without the Places library'));
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        googleMapsApiKey,
      )}&libraries=places&callback=__rideloopGoogleMapsReady`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsLoader = 'true';
      script.onerror = () => rejectLoad(new Error('Google Maps failed to load'));
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}

export function toLatLngLiteral(location) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    ? { lat, lng }
    : null;
}

export function loadOpenStreetMap() {
  if (window.L) return Promise.resolve(window.L);
  if (!openStreetMapPromise) {
    openStreetMapPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-leaflet-style="true"]')) {
        const stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        stylesheet.dataset.leafletStyle = 'true';
        document.head.appendChild(stylesheet);
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => (window.L ? resolve(window.L) : reject(new Error('OpenStreetMap map library did not load')));
      script.onerror = () => {
        openStreetMapPromise = undefined;
        reject(new Error('OpenStreetMap map library failed to load'));
      };
      document.head.appendChild(script);
    });
  }
  return openStreetMapPromise;
}

export async function searchOpenStreetMap(query) {
  const term = query.trim();
  if (term.length < 3) return [];
  const params = new URLSearchParams({ format: 'jsonv2', limit: '5', q: term, countrycodes: 'ke' });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  if (!response.ok) throw new Error('Location search is unavailable');
  const results = await response.json();
  return results.map((result) => ({
    name: result.name || result.display_name.split(',')[0],
    address: result.display_name,
    placeId: `osm-${result.place_id}`,
    lat: Number(result.lat),
    lng: Number(result.lon),
  }));
}

export function getCurrentUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          if (hasGoogleMapsKey()) {
            const google = await loadGoogleMaps();
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results?.[0]) {
                resolve({
                  name: results[0].address_components?.[0]?.long_name || 'My Current Location',
                  address: results[0].formatted_address,
                  placeId: results[0].place_id,
                  lat,
                  lng,
                });
              } else {
                resolve({ name: 'My Current Location', address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, placeId: '', lat, lng });
              }
            });
          } else {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            resolve({
              name: data.name || data.address?.suburb || data.address?.city || 'My Current Location',
              address: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
              placeId: `osm-${data.place_id || 'curr'}`,
              lat,
              lng,
            });
          }
        } catch {
          resolve({ name: 'My Current Location', address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, placeId: '', lat, lng });
        }
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export function distanceInMiles(from, to, lat2, lng2) {
  let f = from;
  let t = to;
  if (typeof from === 'number' && typeof to === 'number') {
    f = { lat: from, lng: to };
    t = { lat: lat2, lng: lng2 };
  }
  if (!f || !t || f.lat === undefined || f.lng === undefined || t.lat === undefined || t.lng === undefined) {
    return null;
  }

  const radiusMiles = 3958.8;
  const dLat = ((t.lat - f.lat) * Math.PI) / 180;
  const dLng = ((t.lng - f.lng) * Math.PI) / 180;
  const fromLat = (f.lat * Math.PI) / 180;
  const toLat = (t.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radiusMiles * c;
}

export function calculateHaversineKm(from, to, lat2, lng2) {
  const miles = distanceInMiles(from, to, lat2, lng2);
  return miles !== null && !Number.isNaN(miles) ? miles * 1.60934 : null;
}

export function calculateFareFromKm(distanceKm) {
  if (distanceKm === undefined || distanceKm === null || Number.isNaN(distanceKm) || distanceKm <= 0) return 5;
  const kmSteps = Math.max(1, Math.ceil(distanceKm));
  return kmSteps * 5;
}

export function calculatePickupSurcharge(pickupDistKm) {
  if (pickupDistKm === undefined || pickupDistKm === null || Number.isNaN(pickupDistKm) || pickupDistKm <= 0) return 0;
  const kmSteps = Math.max(1, Math.ceil(pickupDistKm));
  return kmSteps * 2;
}

export function calculateTotalRideFare(tripDistKm, pickupDistKm) {
  const tripFare = calculateFareFromKm(tripDistKm);
  const pickupSurcharge = calculatePickupSurcharge(pickupDistKm);
  return tripFare + pickupSurcharge;
}

export function buildMapsUrl(origin, destination) {
  const params = new URLSearchParams();
  if (origin) params.set('api', '1');
  if (origin) params.set('origin', origin);
  if (destination) params.set('destination', destination);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
