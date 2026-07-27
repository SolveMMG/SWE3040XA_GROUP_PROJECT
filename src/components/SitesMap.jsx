import { useEffect, useRef } from 'react';
import { hasGoogleMapsKey, loadGoogleMaps, loadOpenStreetMap, toLatLngLiteral } from '../utils/googleMaps.js';

const defaultCenter = { lat: 37.7749, lng: -122.4194 };

export default function SitesMap({ sites = [] }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);

  useEffect(() => {
    let active = true;

    if (hasGoogleMapsKey()) {
      loadGoogleMaps().then((google) => {
        if (!active || !mapRef.current) return;
        const map = new google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
        });

        if (sites.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        sites.forEach((site) => {
          const pt = toLatLngLiteral({ lat: site.latitude, lng: site.longitude });
          if (pt) {
            bounds.extend(pt);
            const marker = new google.maps.Marker({
              position: pt,
              map,
              title: site.name,
            });
            const info = new google.maps.InfoWindow({
              content: `<div style="font-family: system-ui; padding: 4px;"><strong>${site.name}</strong><br/>${site.address}</div>`,
            });
            marker.addListener('click', () => info.open(map, marker));
          }
        });
        map.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });
      }).catch(() => {});
    } else {
      loadOpenStreetMap().then((L) => {
        if (!active || !mapRef.current) return;
        if (!leafletMapRef.current) {
          leafletMapRef.current = L.map(mapRef.current).setView([defaultCenter.lat, defaultCenter.lng], 10);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMapRef.current);
        }
        const map = leafletMapRef.current;
        const bounds = [];
        sites.forEach((site) => {
          const pt = toLatLngLiteral({ lat: site.latitude, lng: site.longitude });
          if (pt) {
            bounds.push([pt.lat, pt.lng]);
            L.marker([pt.lat, pt.lng]).addTo(map).bindPopup(`<b>${site.name}</b><br/>${site.address}`);
          }
        });
        if (bounds.length > 0) map.fitBounds(bounds, { padding: [20, 20] });
      }).catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [sites]);

  return <div ref={mapRef} className="sites-map-canvas" aria-label="Saved sites map" />;
}
