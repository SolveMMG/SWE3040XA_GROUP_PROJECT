import { ExternalLink, MapPinned } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { buildMapsUrl, hasGoogleMapsKey, loadGoogleMaps, toLatLngLiteral } from '../utils/googleMaps.js';
import OpenStreetMapRoute from './OpenStreetMapRoute.jsx';

export default function GoogleRouteMap({ origin, destination, originLabel, destinationLabel }) {
  if (!hasGoogleMapsKey()) return <OpenStreetMapRoute origin={origin} destination={destination} originLabel={originLabel} destinationLabel={destinationLabel} />;
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const mapsUrl = buildMapsUrl(originLabel, destinationLabel);

  useEffect(() => {
    if (!hasGoogleMapsKey()) return undefined;

    let active = true;
    let map;
    let directionsRenderer;
    setReady(false);
    setError('');

    loadGoogleMaps()
      .then((google) => {
        if (!active || !mapRef.current) return;

        const originPoint = toLatLngLiteral(origin);
        const destinationPoint = toLatLngLiteral(destination);
        const center = originPoint || destinationPoint || { lat: 37.7749, lng: -122.4194 };
        map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        if (originPoint && destinationPoint) {
          directionsRenderer = new google.maps.DirectionsRenderer({ map, suppressMarkers: false });
          const directionsService = new google.maps.DirectionsService();
          directionsService.route(
            {
              origin: originPoint,
              destination: destinationPoint,
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === 'OK') {
                directionsRenderer.setDirections(result);
                setReady(true);
              } else if (active) {
                setError('Route preview is unavailable for these locations.');
                setReady(true);
              }
            },
          );
        } else if (originPoint || destinationPoint) {
          new google.maps.Marker({ map, position: center });
        }

        if (!originPoint || !destinationPoint) setReady(true);
      })
      .catch(() => { if (active) setError('Google Maps could not be loaded.'); });

    return () => {
      active = false;
      if (directionsRenderer) directionsRenderer.setMap(null);
      if (map) google.maps.event.clearInstanceListeners(map);
    };
  }, [destination, origin]);

  return (
    <div className="route-map-panel">
      {hasGoogleMapsKey() ? (
        <div ref={mapRef} className="route-map-canvas" aria-label="Google route map" />
      ) : (
        <a className="map-fallback" href={mapsUrl} target="_blank" rel="noreferrer">
          <MapPinned size={22} />
          Open route in Google Maps
          <ExternalLink size={16} />
        </a>
      )}
      {hasGoogleMapsKey() && !ready && <div className="state-bar">Loading route map...</div>}
      {error && <div className="state-bar danger">{error} Use the link below for directions.</div>}
      {hasGoogleMapsKey() && error && (
        <a className="map-fallback" href={mapsUrl} target="_blank" rel="noreferrer">
          <MapPinned size={22} /> Open route in Google Maps <ExternalLink size={16} />
        </a>
      )}
    </div>
  );
}
