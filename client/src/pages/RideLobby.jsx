import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { socket, connectSocket } from '../sockets/socket';
import { Users, MapPin, Share2, Copy, Play, ArrowLeft, Crown, Check, Shield } from 'lucide-react';

export default function RideLobby() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [liveRiders, setLiveRiders] = useState([]);

  const fetchRideDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/rides/${rideId}`);
      if (res.data.success) {
        setRide(res.data.ride);
        // If ride is already active, direct straight to map
        if (res.data.ride.status === 'ACTIVE') {
          navigate(`/ride/${rideId}/map`, { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load ride lobby.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRideDetails();
  }, [rideId]);

  // Connect to Socket.IO and join ride room
  useEffect(() => {
    if (!rideId || !user) return;

    connectSocket();

    // Join ride room
    socket.emit('ride:join', { rideId, user });

    const onMemberJoined = (data) => {
      console.log('Member joined:', data);
      fetchRideDetails();
    };

    const onMemberLeft = (data) => {
      console.log('Member left:', data);
      fetchRideDetails();
    };

    const onRideStarted = () => {
      navigate(`/ride/${rideId}/map`, { replace: true });
    };

    socket.on('member:joined', onMemberJoined);
    socket.on('member:left', onMemberLeft);
    socket.on('status:broadcast', fetchRideDetails);

    return () => {
      socket.off('member:joined', onMemberJoined);
      socket.off('member:left', onMemberLeft);
      socket.off('status:broadcast', fetchRideDetails);
    };
  }, [rideId, user]);

  const inviteLink = `${window.location.origin}/join/${ride?.rideCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    const shareData = {
      title: `Join my RideTogether ride: ${ride?.name}`,
      text: `Join ${user?.name}'s group ride "${ride?.name}" on RideTogether! Code: ${ride?.rideCode}`,
      url: inviteLink
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share error', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleStartRide = async () => {
    try {
      setStarting(true);
      const res = await api.post(`/rides/${rideId}/start`);
      if (res.data.success) {
        // Broadcast ride start to room via socket
        socket.emit('status:update', { rideId, status: 'Riding' });
        navigate(`/ride/${rideId}/map`);
      }
    } catch (err) {
      alert(err.message || 'Failed to start ride');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-slate-400">
        Loading ride lobby...
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <p className="text-rose-400 font-semibold">{error || 'Ride lobby unavailable'}</p>
        <Link to="/dashboard" className="inline-block px-4 py-2 bg-slate-800 text-white rounded-xl text-sm">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isLeader = ride.createdBy?._id === user?._id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Lobby Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold rounded-full">
                LOBBY WAITING ROOM
              </span>
              <span className="text-xs text-slate-400">Created by {ride.createdBy?.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{ride.name}</h1>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl self-start sm:self-auto">
            <div className="text-right">
              <p className="text-[10px] uppercase font-semibold text-slate-400">Ride Code</p>
              <p className="text-lg font-mono font-bold text-orange-400 tracking-wider">{ride.rideCode}</p>
            </div>
            <button
              onClick={handleCopyLink}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
              title="Copy Ride Link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Route Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-sm">
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Start Point</p>
              <p className="text-white font-medium">{ride.startLocation?.address}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Destination</p>
              <p className="text-white font-medium">{ride.destination?.address}</p>
            </div>
          </div>
        </div>

        {/* Invite Bar */}
        <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-300 flex items-center space-x-2">
            <Share2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <span>Invite your fellow riders using WhatsApp or shareable link</span>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={handleShare}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-2"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Invite</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full sm:w-auto px-4 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-2"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Joined Members List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center space-x-2 text-lg">
              <Users className="w-5 h-5 text-sky-400" />
              <span>Group Members ({ride.members?.length || 0})</span>
            </h3>
            <span className="text-xs text-emerald-400 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Lobby Realtime Sync Active</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ride.members?.map((m) => {
              const isMemberAdmin = m.role === 'ADMIN';
              return (
                <div
                  key={m.user?._id || Math.random()}
                  className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-orange-400 font-bold text-sm">
                      {m.user?.name ? m.user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white flex items-center space-x-1.5">
                        <span>{m.user?.name}</span>
                        {isMemberAdmin && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                      </p>
                      <p className="text-xs text-slate-500">{m.user?.phone || 'No phone added'}</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md uppercase ${
                    isMemberAdmin ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {m.role}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-800">
          {isLeader ? (
            <button
              onClick={handleStartRide}
              disabled={starting}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-base transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{starting ? 'Starting Ride...' : 'START GROUP RIDE NOW'}</span>
            </button>
          ) : (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-center text-sm text-slate-400 flex items-center justify-center space-x-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Waiting for ride leader ({ride.createdBy?.name}) to start the ride...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
