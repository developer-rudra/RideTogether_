import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { socket, connectSocket } from '../sockets/socket';
import {
  calculateHaversineDistance,
  formatDistance,
  getGoogleMapsNavUrl,
  timeAgo,
  isLocationStale
} from '../utils/geoUtils';
import {
  Navigation,
  MapPin,
  Phone,
  Compass,
  AlertTriangle,
  Radio,
  Users,
  Bell,
  ArrowLeft,
  Square,
  ShieldAlert,
  Fuel,
  Coffee,
  Utensils,
  Zap,
  Activity,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import GoogleMapView from '../components/maps/GoogleMapView';

const RIDER_STATUSES = [
  { id: 'Riding', label: 'Riding', icon: Navigation, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 'Short Break', label: 'Break', icon: Coffee, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { id: 'Refueling', label: 'Fuel', icon: Fuel, color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  { id: 'Food Break', label: 'Food', icon: Utensils, color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { id: 'Emergency', label: 'Emergency', icon: ShieldAlert, color: 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse font-bold' },
];

export default function RideMap() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Current User GPS State
  const [userLocation, setUserLocation] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [currentStatus, setCurrentStatus] = useState('Riding');

  // Real-time Map of all active riders in room: Map<userId, riderState>
  const [ridersMap, setRidersMap] = useState(new Map());
  const [notifications, setNotifications] = useState([]);

  // Selected Rider details modal / bottom sheet
  const [selectedRider, setSelectedRider] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);

  // Separation alert threshold (meters)
  const SEPARATION_THRESHOLD_METERS = 800;

  // Ref for geolocation watch ID
  const watchIdRef = useRef(null);

  // 1. Fetch initial Ride details
  useEffect(() => {
    const fetchRide = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/rides/${rideId}`);
        if (res.data.success) {
          setRide(res.data.ride);
          if (res.data.ride.status === 'COMPLETED') {
            alert('This ride has already ended.');
            navigate('/dashboard');
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load ride details.');
      } finally {
        setLoading(false);
      }
    };

    fetchRide();
  }, [rideId]);

  // 2. Setup Browser Geolocation watchPosition
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    const handlePosSuccess = (pos) => {
      const { latitude, longitude, accuracy, speed, heading } = pos.coords;
      const coords = { latitude, longitude, accuracy, speed: speed || 0, heading: heading || 0 };
      setUserLocation(coords);
      setGeoError('');

      // Emit GPS location update to socket room
      if (rideId) {
        socket.emit('location:update', {
          rideId,
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
          timestamp: new Date().toISOString()
        });
      }
    };

    const handlePosError = (err) => {
      console.warn('Geolocation watch error:', err);
      if (err.code === 1) {
        setGeoError('Location permission denied. Please allow location access to share live GPS.');
      } else if (err.code === 2) {
        setGeoError('Location position unavailable.');
      } else {
        setGeoError('Location request timed out.');
      }
    };

    // Options for high accuracy GPS tracking
    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 3000
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosSuccess,
      handlePosError,
      options
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [rideId]);

  // 3. Setup Socket.IO Event Handlers
  useEffect(() => {
    if (!rideId || !user) return;

    connectSocket();

    // Join ride room
    socket.emit('ride:join', { rideId, user });

    // Received initial room rider states
    const onInitialState = (data) => {
      const newMap = new Map();
      if (data.riders) {
        data.riders.forEach((r) => {
          newMap.set(r.user._id, r);
        });
      }
      setRidersMap(newMap);
    };

    // Received location broadcast from another rider
    const onLocationBroadcast = (data) => {
      const { userId, location, lastUpdated } = data;
      setRidersMap((prevMap) => {
        const nextMap = new Map(prevMap);
        const existing = nextMap.get(userId) || {};
        nextMap.set(userId, {
          ...existing,
          location,
          lastUpdated,
          online: true
        });
        return nextMap;
      });
    };

    // Received status broadcast from a rider
    const onStatusBroadcast = (data) => {
      const { userId, userName, status, timestamp } = data;
      setRidersMap((prevMap) => {
        const nextMap = new Map(prevMap);
        const existing = nextMap.get(userId) || {};
        nextMap.set(userId, {
          ...existing,
          status,
          lastUpdated: timestamp
        });
        return nextMap;
      });

      // Add to notification feed
      addNotification({
        id: Date.now(),
        type: status === 'Emergency' ? 'EMERGENCY' : 'STATUS',
        text: `${userName} changed status to "${status}"`,
        timestamp: new Date().toLocaleTimeString()
      });
    };

    const onMemberJoined = (data) => {
      addNotification({
        id: Date.now(),
        type: 'JOIN',
        text: `${data.user.name} joined the ride`,
        timestamp: new Date().toLocaleTimeString()
      });
    };

    const onMemberLeft = (data) => {
      addNotification({
        id: Date.now(),
        type: 'LEAVE',
        text: `${data.userName} went offline`,
        timestamp: new Date().toLocaleTimeString()
      });
    };

    socket.on('ride:initial_state', onInitialState);
    socket.on('location:broadcast', onLocationBroadcast);
    socket.on('status:broadcast', onStatusBroadcast);
    socket.on('member:joined', onMemberJoined);
    socket.on('member:left', onMemberLeft);

    return () => {
      socket.emit('ride:leave');
      socket.off('ride:initial_state', onInitialState);
      socket.off('location:broadcast', onLocationBroadcast);
      socket.off('status:broadcast', onStatusBroadcast);
      socket.off('member:joined', onMemberJoined);
      socket.off('member:left', onMemberLeft);
    };
  }, [rideId, user]);

  const addNotification = (notif) => {
    setNotifications((prev) => [notif, ...prev].slice(0, 20));
  };

  const handleStatusChange = (newStatus) => {
    setCurrentStatus(newStatus);
    socket.emit('status:update', { rideId, status: newStatus });
  };

  const handleEndRide = async () => {
    if (!window.confirm('Are you sure you want to end this group ride for all members?')) return;

    try {
      const res = await api.post(`/rides/${rideId}/end`);
      if (res.data.success) {
        socket.emit('status:update', { rideId, status: 'Completed' });
        navigate('/dashboard');
      }
    } catch (err) {
      alert(err.message || 'Failed to end ride.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-slate-400">
        Initializing Shared Map...
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <p className="text-rose-400 font-semibold">{error || 'Ride details unavailable'}</p>
        <Link to="/dashboard" className="inline-block px-4 py-2 bg-slate-800 text-white rounded-xl text-sm">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isLeader = ride.createdBy?._id === user?._id;
  const ridersList = Array.from(ridersMap.values());

  // Check separation for each rider relative to current user location
  const ridersWithDistance = ridersList.map((r) => {
    let distanceMeters = null;
    let isSeparated = false;

    if (userLocation && r.location) {
      distanceMeters = calculateHaversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        r.location.latitude,
        r.location.longitude
      );
      if (distanceMeters > SEPARATION_THRESHOLD_METERS && r.user._id !== user._id) {
        isSeparated = true;
      }
    }

    return {
      ...r,
      distanceMeters,
      isSeparated
    };
  });

  return (
    <div className="relative h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden flex flex-col md:flex-row">
      {/* MAP CANVAS (Interactive Dark Grid Visualization & Google Maps Fallback Container) */}
      <div className="relative flex-1 bg-slate-950 border-r border-slate-800 flex items-center justify-center overflow-hidden select-none">
        {/* Decorative Grid Lines to simulate map background */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:24px_24px]" />
        
        {/* Map Top Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3">
          <div className="bg-slate-900/90 backdrop-blur border border-slate-800 px-4 py-2 rounded-xl flex items-center space-x-3 shadow-lg">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>{ride.name}</span>
                <span className="text-[10px] px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono rounded">
                  #{ride.rideCode}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {ride.startLocation?.address} → {ride.destination?.address}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-2 rounded-xl text-xs flex items-center space-x-2 shadow-lg">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-mono">{ridersList.length} Active Riders</span>
            </div>

            {isLeader && (
              <button
                onClick={handleEndRide}
                className="px-3.5 py-2 bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-400 font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-lg"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>End Ride</span>
              </button>
            )}
          </div>
        </div>

        {/* GPS Status / Warnings Banner */}
        {geoError && (
          <div className="absolute top-20 left-4 right-4 z-20 bg-rose-500/90 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-xl border border-rose-400/40">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{geoError}</span>
          </div>
        )}

        {/* Google Maps JS API View or Interactive Canvas Fallback */}
        {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
          <GoogleMapView
            ride={ride}
            riders={ridersWithDistance}
            userLocation={userLocation}
            onSelectRider={setSelectedRider}
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
          {/* Centered Map Canvas Grid Representation */}
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="relative w-full max-w-2xl h-80 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-2xl overflow-hidden">
              
              {/* Animated Route Line */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line
                  x1="15%"
                  y1="80%"
                  x2="85%"
                  y2="20%"
                  stroke="#f97316"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                  className="animate-pulse"
                />
              </svg>

              {/* Start Location Node */}
              <div className="absolute left-[12%] bottom-[15%] flex flex-col items-center z-10">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-emerald-400 mt-1 bg-slate-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  START: {ride.startLocation?.address}
                </span>
              </div>

              {/* Destination Node */}
              <div className="absolute right-[12%] top-[15%] flex flex-col items-center z-10">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-500/20">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-orange-400 mt-1 bg-slate-950/80 px-2 py-0.5 rounded border border-orange-500/30">
                  DEST: {ride.destination?.address}
                </span>
              </div>

              {/* Rider Live Markers on Map */}
              <div className="absolute inset-0 pointer-events-auto">
                {ridersWithDistance.map((r, index) => {
                  const isMe = r.user?._id === user?._id;
                  const isEmergency = r.status === 'Emergency';
                  
                  // Position layout calculations across simulated map segment
                  const posX = 25 + (index * 22) % 50;
                  const posY = 70 - (index * 20) % 50;

                  return (
                    <div
                      key={r.user?._id || index}
                      onClick={() => setSelectedRider(r)}
                      style={{ left: `${posX}%`, top: `${posY}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition transform hover:scale-110 z-20"
                    >
                      <div className="relative flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-xl transition ${
                          isEmergency
                            ? 'bg-rose-500 border-rose-300 text-white animate-bounce'
                            : isMe
                            ? 'bg-orange-500 border-white text-white ring-4 ring-orange-500/30'
                            : 'bg-slate-800 border-sky-400 text-sky-400'
                        }`}>
                          {r.user?.name ? r.user.name.charAt(0).toUpperCase() : 'R'}
                        </div>

                        {/* Floating Marker Label */}
                        <div className="mt-1 px-2.5 py-1 bg-slate-900/90 border border-slate-800 rounded-lg text-center backdrop-blur shadow-md">
                          <p className="text-[11px] font-bold text-white flex items-center space-x-1">
                            <span>{isMe ? 'You' : r.user?.name}</span>
                            {isEmergency && <ShieldAlert className="w-3 h-3 text-rose-400" />}
                          </p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            isEmergency ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {r.status || 'Riding'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            <p className="text-xs text-slate-500 max-w-md">
              Shared map active. Google Maps direction integration is enabled for 1-click navigation to any rider.
            </p>
          </div>
        </div>
        )}

        {/* Floating Status Update Control Bar */}
        <div className="absolute bottom-4 left-4 right-4 z-30 max-w-xl mx-auto">
          <div className="bg-slate-900/95 backdrop-blur border border-slate-800 p-3 rounded-2xl shadow-2xl space-y-2">
            <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider text-center">Broadcast Your Rider Status</p>
            <div className="flex items-center justify-between gap-1.5 overflow-x-auto">
              {RIDER_STATUSES.map((st) => {
                const Icon = st.icon;
                const isSelected = currentStatus === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => handleStatusChange(st.id)}
                    className={`flex-1 min-w-[70px] py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition border ${
                      isSelected
                        ? `${st.color} shadow-lg ring-1 ring-orange-500/50`
                        : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px]">{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE PANEL / BOTTOM SHEET: Rider Cards & Event Feed */}
      <div className="w-full md:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col h-full z-20">
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-white text-sm">Group Riders ({ridersWithDistance.length})</h3>
          </div>
          {userLocation && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
              GPS Lock Active
            </span>
          )}
        </div>

        {/* Rider List Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {ridersWithDistance.map((r) => {
            const isMe = r.user?._id === user?._id;
            const isEmergency = r.status === 'Emergency';
            const stale = isLocationStale(r.lastUpdated);

            return (
              <div
                key={r.user?._id || Math.random()}
                onClick={() => setSelectedRider(r)}
                className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2.5 ${
                  isEmergency
                    ? 'bg-rose-950/30 border-rose-500/50 hover:bg-rose-950/50'
                    : r.isSeparated
                    ? 'bg-amber-950/20 border-amber-500/40 hover:bg-amber-950/30'
                    : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                      isEmergency
                        ? 'bg-rose-500 text-white'
                        : isMe
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-800 text-sky-400 border border-slate-700'
                    }`}>
                      {r.user?.name ? r.user.name.charAt(0).toUpperCase() : 'R'}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white flex items-center space-x-1.5">
                        <span>{r.user?.name} {isMe && '(You)'}</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {r.distanceMeters !== null
                          ? isMe
                            ? 'Your location'
                            : `${formatDistance(r.distanceMeters)} away`
                          : 'Location pending'}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                    isEmergency
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {r.status || 'Riding'}
                  </span>
                </div>

                {/* Separation Warning Tag */}
                {r.isSeparated && (
                  <div className="bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-[11px] text-amber-400 flex items-center space-x-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Possible Rider Separation ({formatDistance(r.distanceMeters)})</span>
                  </div>
                )}

                {/* Card Action Buttons (Call / Navigate) */}
                <div className="flex items-center space-x-2 pt-1">
                  {r.location && (
                    <a
                      href={getGoogleMapsNavUrl(r.location.latitude, r.location.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 font-semibold rounded-lg text-xs transition flex items-center justify-center space-x-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Navigate</span>
                    </a>
                  )}

                  {r.user?.phone ? (
                    <a
                      href={`tel:${r.user.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition flex items-center justify-center space-x-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Call</span>
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic px-2">No phone</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Notification Feed */}
        <div className="border-t border-slate-800 p-4 space-y-3 bg-slate-950/60 max-h-48 overflow-y-auto">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Bell className="w-3.5 h-3.5 text-orange-400" />
            <span>Live Ride Events</span>
          </div>

          {notifications.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No ride alerts yet</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`text-xs p-2 rounded-lg border ${
                    n.type === 'EMERGENCY'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{n.text}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{n.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
