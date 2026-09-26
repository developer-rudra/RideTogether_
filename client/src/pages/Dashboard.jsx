import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, KeyRound, MapPin, Calendar, Users, ArrowRight, Shield, Compass, Clock, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeRides, setActiveRides] = useState([]);
  const [pastRides, setPastRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const fetchRides = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rides');
      if (res.data.success) {
        setActiveRides(res.data.activeRides || []);
        setPastRides(res.data.pastRides || []);
      }
    } catch (err) {
      console.error('Failed to fetch user rides:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoinError('');
    setJoining(true);

    try {
      const res = await api.post('/rides/join', { rideCode: joinCode.trim() });
      if (res.data.success) {
        navigate(`/ride/${res.data.ride._id}/lobby`);
      }
    } catch (err) {
      setJoinError(err.message || 'Failed to join ride. Verify the ride code.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950/40 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full text-xs font-semibold">
            <Compass className="w-3.5 h-3.5" />
            <span>Rider Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Hello, {user?.name || 'Rider'} 👋
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Create a new group ride, join your friends using a ride code, or manage your active group journeys in real-time.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/create-ride"
            className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/25"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create New Ride</span>
          </Link>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active Rides (2 cols on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Compass className="w-5 h-5 text-orange-500" />
              <span>My Active & Upcoming Rides</span>
            </h2>
            <span className="text-xs font-mono px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full">
              {activeRides.length} active
            </span>
          </div>

          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
              Loading your group rides...
            </div>
          ) : activeRides.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
              <div className="p-3 bg-slate-800 text-slate-400 rounded-full inline-block">
                <Compass className="w-8 h-8" />
              </div>
              <p className="text-slate-400 text-sm">You have no active rides right now.</p>
              <Link
                to="/create-ride"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 font-semibold rounded-xl hover:bg-orange-500/20 transition text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Plan a Group Ride</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {activeRides.map((ride) => (
                <div
                  key={ride._id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                        ride.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {ride.status}
                      </span>
                      <span className="text-xs font-mono bg-slate-800 text-orange-400 px-2 py-0.5 rounded font-bold">
                        {ride.rideCode}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white">{ride.name}</h3>

                    <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs text-slate-400">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-orange-400" />
                        <span>{ride.startLocation?.address} → {ride.destination?.address}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-sky-400" />
                        <span>{ride.members?.length || 1} Riders</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 sm:self-center">
                    <button
                      onClick={() => navigate(ride.status === 'ACTIVE' ? `/ride/${ride._id}/map` : `/ride/${ride._id}/lobby`)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center space-x-2"
                    >
                      <span>{ride.status === 'ACTIVE' ? 'Open Shared Map' : 'Enter Lobby'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Past Rides Section */}
          {pastRides.length > 0 && (
            <div className="pt-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-300 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Past Completed Rides</span>
              </h3>
              <div className="space-y-3">
                {pastRides.map((ride) => (
                  <div key={ride._id} className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-slate-300">{ride.name}</p>
                      <p className="text-xs text-slate-500">{ride.startLocation?.address} to {ride.destination?.address}</p>
                    </div>
                    <span className="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded-lg font-mono">
                      COMPLETED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Quick Join by Code */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-500">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white">Quick Join Ride</h3>
                <p className="text-xs text-slate-400">Enter a 6-character ride code</p>
              </div>
            </div>

            {joinError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
                {joinError}
              </p>
            )}

            <form onSubmit={handleJoinByCode} className="space-y-3">
              <input
                type="text"
                required
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC123"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-orange-400 uppercase placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              <button
                type="submit"
                disabled={joining || !joinCode.trim()}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-sm disabled:opacity-50"
              >
                {joining ? 'Joining Ride...' : 'Join Ride'}
              </button>
            </form>
          </div>

          {/* Quick Guidance Info */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 space-y-3 text-xs text-slate-400">
            <h4 className="font-semibold text-slate-200 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Group Safety First</span>
            </h4>
            <p>
              RideTogether works seamlessly while location permissions are granted. Keep your web app active during the ride for live group tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
