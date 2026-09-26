/**
 * Geospatial utility functions for RideTogether platform
 */

/**
 * Calculates geographical distance between two points in meters using the Haversine formula.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in meters
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

/**
 * Formats distance in meters to user friendly string (m or km)
 * @param {number} distanceMeters 
 * @returns {string}
 */
export const formatDistance = (distanceMeters) => {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

/**
 * Generates Google Maps navigation URL for a given target coordinate
 * @param {number} lat 
 * @param {number} lng 
 * @returns {string}
 */
export const getGoogleMapsNavUrl = (lat, lng) => {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
};

/**
 * Checks if location update timestamp is stale (> 60 seconds old)
 * @param {string|Date} timestamp 
 * @returns {boolean}
 */
export const isLocationStale = (timestamp) => {
  if (!timestamp) return true;
  const diffMs = new Date() - new Date(timestamp);
  return diffMs > 60000;
};

/**
 * Calculates human readable relative time ago string
 * @param {string|Date} timestamp 
 * @returns {string}
 */
export const timeAgo = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};
