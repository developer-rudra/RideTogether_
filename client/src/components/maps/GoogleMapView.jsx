import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Navigation, AlertTriangle } from 'lucide-react';

/**
 * Dark Map Styles for Google Maps Platform matching RideTogether dark theme
 */
const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ea580c" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#020617" }] }
];

export default function GoogleMapView({
  ride,
  riders,
  userLocation,
  onSelectRider
}) {
  const mapRef = useRef(null);
  const googleMapInstance = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setLoadError('No Google Maps API key found in VITE_GOOGLE_MAPS_API_KEY.');
      return;
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry']
    });

    loader
      .load()
      .then((google) => {
        if (!mapRef.current) return;

        // Default map center (User location or Mumbai default)
        const defaultCenter = userLocation
          ? { lat: userLocation.latitude, lng: userLocation.longitude }
          : { lat: 18.9438, lng: 72.8232 };

        const map = new google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 12,
          styles: DARK_MAP_STYLES,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false
        });

        googleMapInstance.current = map;
        setMapLoaded(true);
      })
      .catch((err) => {
        console.error('Google Maps Loader error:', err);
        setLoadError('Failed to load Google Maps JS API.');
      });
  }, [apiKey]);

  // Update Markers and Polyline whenever riders or locations change
  useEffect(() => {
    if (!mapLoaded || !googleMapInstance.current || !window.google) return;

    const google = window.google;
    const map = googleMapInstance.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    // 1. Add Start Location Marker if lat/lng available
    if (ride?.startLocation?.lat && ride?.startLocation?.lng) {
      const startPos = { lat: ride.startLocation.lat, lng: ride.startLocation.lng };
      const startMarker = new google.maps.Marker({
        position: startPos,
        map,
        title: `Start: ${ride.startLocation.address}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
      markersRef.current.push(startMarker);
      bounds.extend(startPos);
      hasPoints = true;
    }

    // 2. Add Destination Marker if lat/lng available
    if (ride?.destination?.lat && ride?.destination?.lng) {
      const destPos = { lat: ride.destination.lat, lng: ride.destination.lng };
      const destMarker = new google.maps.Marker({
        position: destPos,
        map,
        title: `Destination: ${ride.destination.address}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#f97316',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
      markersRef.current.push(destMarker);
      bounds.extend(destPos);
      hasPoints = true;
    }

    // 3. Add Rider Live Markers
    riders.forEach((r) => {
      if (r.location?.latitude && r.location?.longitude) {
        const pos = { lat: r.location.latitude, lng: r.location.longitude };
        const isEmergency = r.status === 'Emergency';

        const riderMarker = new google.maps.Marker({
          position: pos,
          map,
          title: `${r.user?.name} (${r.status || 'Riding'})`,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: isEmergency ? '#ef4444' : '#38bdf8',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });

        riderMarker.addListener('click', () => {
          if (onSelectRider) onSelectRider(r);
        });

        markersRef.current.push(riderMarker);
        bounds.extend(pos);
        hasPoints = true;
      }
    });

    // Fit map to show all active markers
    if (hasPoints) {
      map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
    }
  }, [mapLoaded, riders, ride, userLocation]);

  if (!apiKey || loadError) {
    return null; // Fallback to RideMap dark canvas when key absent
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-none" />
    </div>
  );
}
