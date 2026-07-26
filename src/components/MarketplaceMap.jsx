import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_NAIROBI_CENTER, formatKSh, hasGoogleMapsKey, loadGoogleMaps, loadOpenStreetMap, toLatLngLiteral } from '../utils/googleMaps.js';

export default function MarketplaceMap({
  rides = [],
  selectedRideId,
  onSelectRide,
  originLocation,
  destinationLocation,
  onMapClickLocation,
}) {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [mapEngine, setMapEngine] = useState(hasGoogleMapsKey() ? 'google' : 'osm');
  const [status, setStatus] = useState('loading');
  const googleStateRef = useRef({ map: null, markers: [], directionsRenderer: null, infoWindow: null, pickupMarker: null, dropoffMarker: null });

  // Google Maps rendering logic
  useEffect(() => {
    if (!hasGoogleMapsKey()) {
      setMapEngine('osm');
      return undefined;
    }

    let active = true;
    loadGoogleMaps()
      .then((google) => {
        if (!active || !mapRef.current) return;

        const state = googleStateRef.current;
        if (!state.map) {
          state.map = new google.maps.Map(mapRef.current, {
            center: DEFAULT_NAIROBI_CENTER,
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
          });
          state.infoWindow = new google.maps.InfoWindow();
          state.directionsRenderer = new google.maps.DirectionsRenderer({
            map: state.map,
            suppressMarkers: false,
            polylineOptions: { strokeColor: '#0c6b5c', strokeWeight: 5, strokeOpacity: 0.85 },
          });

          // Map click to set pickup location
          const geocoder = new google.maps.Geocoder();
          state.map.addListener('click', (e) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              const res = status === 'OK' ? results?.[0] : null;
              onMapClickLocation?.({
                name: res?.address_components?.[0]?.long_name || res?.formatted_address || 'Selected Map Location',
                address: res?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
                placeId: res?.place_id || '',
                lat,
                lng,
              });
            });
          });
        }

        // Clear driver markers
        state.markers.forEach((m) => m.setMap(null));
        state.markers = [];
        state.directionsRenderer.setDirections({ routes: [] });

        if (state.pickupMarker) state.pickupMarker.setMap(null);
        if (state.dropoffMarker) state.dropoffMarker.setMap(null);

        const bounds = new google.maps.LatLngBounds();
        let hasBounds = false;

        // Render Customer Pickup Location Pin
        const pickupPt = toLatLngLiteral(originLocation);
        if (pickupPt) {
          bounds.extend(pickupPt);
          hasBounds = true;
          state.pickupMarker = new google.maps.Marker({
            position: pickupPt,
            map: state.map,
            title: `Your Pickup: ${originLocation.name || originLocation.address}`,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 11,
              fillColor: '#10b981',
              fillOpacity: 1,
              strokeWeight: 3,
              strokeColor: '#ffffff',
            },
          });
        }

        // Render Customer Dropoff Location Pin
        const dropoffPt = toLatLngLiteral(destinationLocation);
        if (dropoffPt) {
          bounds.extend(dropoffPt);
          hasBounds = true;
          state.dropoffMarker = new google.maps.Marker({
            position: dropoffPt,
            map: state.map,
            title: `Your Dropoff: ${destinationLocation.name || destinationLocation.address}`,
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 7,
              fillColor: '#0c6b5c',
              fillOpacity: 1,
              strokeWeight: 3,
              strokeColor: '#ffffff',
            },
          });
        }

        // Render Active Drivers across Nairobi
        rides.forEach((ride) => {
          const originPt = toLatLngLiteral(ride.pickupLocation);
          const isSelected = String(ride.id) === String(selectedRideId);

          if (originPt) {
            bounds.extend(originPt);
            hasBounds = true;

            const driverMarker = new google.maps.Marker({
              position: originPt,
              map: state.map,
              title: `${ride.seller?.name || 'Driver'} · ${ride.pickup}`,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: isSelected ? 9 : 7,
                fillColor: isSelected ? '#0c6b5c' : '#3b82f6',
                fillOpacity: 0.9,
                strokeWeight: 2,
                strokeColor: '#ffffff',
              },
            });

            driverMarker.addListener('click', () => {
              onSelectRide?.(ride.id);
              const distKm = ride.distance_miles ? (ride.distance_miles * 1.60934).toFixed(1) : null;
              const formattedPrice = formatKSh(ride.price);

              const contentHtml = `
                <div style="padding: 10px; max-width: 230px; font-family: system-ui, sans-serif;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #0c6b5c; font-weight: 700; margin-bottom: 4px;">
                    ${distKm ? `⚡ ${distKm} km away` : 'Driver Location'}
                  </div>
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #1e293b;">${ride.seller?.name || 'Driver'}</h4>
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">${ride.pickup} &rarr; ${ride.dropoff}</p>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 12px; color: #059669; font-weight: 700;">★ ${ride.seller?.rating || '4.9'} rating</span>
                    <strong style="font-size: 14px; color: #0c6b5c;">${formattedPrice}/seat</strong>
                  </div>
                  <button id="view-ride-${ride.id}" style="width: 100%; background: #0c6b5c; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;">Select Driver</button>
                </div>
              `;
              state.infoWindow.setContent(contentHtml);
              state.infoWindow.open(state.map, driverMarker);

              setTimeout(() => {
                const btn = document.getElementById(`view-ride-${ride.id}`);
                if (btn) {
                  btn.onclick = () => {
                    navigate(`/rides/${ride.id}`, {
                      state: {
                        customPickup: originLocation,
                        customDropoff: destinationLocation,
                      },
                    });
                  };
                }
              }, 100);
            });

            state.markers.push(driverMarker);
          }

          // If selected driver, draw route
          if (isSelected && pickupPt && originPt) {
            const directionsService = new google.maps.DirectionsService();
            directionsService.route(
              {
                origin: pickupPt,
                destination: originPt,
                travelMode: google.maps.TravelMode.DRIVING,
              },
              (result, routeStatus) => {
                if (routeStatus === 'OK' && active) {
                  state.directionsRenderer.setDirections(result);
                }
              },
            );
          }
        });

        if (hasBounds) {
          state.map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        } else {
          state.map.setCenter(DEFAULT_NAIROBI_CENTER);
        }

        setStatus('ready');
      })
      .catch(() => {
        if (active) {
          setMapEngine('osm');
        }
      });

    return () => {
      active = false;
    };
  }, [rides, selectedRideId, onSelectRide, originLocation, destinationLocation, onMapClickLocation, navigate]);

  // Leaflet / OpenStreetMap fallback
  useEffect(() => {
    if (mapEngine !== 'osm') return undefined;
    let active = true;

    loadOpenStreetMap()
      .then((L) => {
        if (!active || !mapRef.current) return;
        if (!leafletMapRef.current) {
          leafletMapRef.current = L.map(mapRef.current).setView([DEFAULT_NAIROBI_CENTER.lat, DEFAULT_NAIROBI_CENTER.lng], 11);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(leafletMapRef.current);
        }

        const map = leafletMapRef.current;
        map.eachLayer((layer) => {
          if (!layer._url) map.removeLayer(layer);
        });

        const bounds = [];
        const pickupPt = toLatLngLiteral(originLocation);
        if (pickupPt) {
          bounds.push([pickupPt.lat, pickupPt.lng]);
          L.circleMarker([pickupPt.lat, pickupPt.lng], {
            radius: 10,
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 1,
          }).addTo(map).bindPopup('Your Pickup Location');
        }

        rides.forEach((ride) => {
          const originPt = toLatLngLiteral(ride.pickupLocation);
          if (originPt) {
            bounds.push([originPt.lat, originPt.lng]);
            const marker = L.circleMarker([originPt.lat, originPt.lng], {
              radius: 7,
              color: '#0c6b5c',
              fillColor: '#3b82f6',
              fillOpacity: 0.9,
            }).addTo(map);
            marker.bindPopup(`<b>${ride.seller?.name || 'Driver'}</b><br/>${ride.pickup}<br/>Price: ${formatKSh(ride.price)}`);
            marker.on('click', () => onSelectRide?.(ride.id));
          }
        });

        if (bounds.length > 0) map.fitBounds(bounds, { padding: [30, 30] });
        setStatus('ready');
      })
      .catch(() => setStatus('error'));

    return () => {
      active = false;
    };
  }, [mapEngine, rides, originLocation, onSelectRide]);

  return (
    <div className="marketplace-map-container">
      <div ref={mapRef} className="marketplace-map-canvas" aria-label="Interactive Nairobi Driver Map" />
      {status === 'loading' && <div className="state-bar">Loading Nairobi Drivers Map...</div>}
    </div>
  );
}
