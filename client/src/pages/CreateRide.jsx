import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PlusCircle, MapPin, Calendar, FileText, ArrowLeft, AlertCircle } from 'lucide-react';

export default function CreateRide() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [startAddress, setStartAddress] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !startAddress || !destAddress) {
      setError('Please fill in ride name, start location, and destination.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name,
        startLocation: { address: startAddress },
        destination: { address: destAddress },
        description,
        scheduledStartTime: startTime ? new Date(startTime) : new Date()
      };

      const res = await api.post('/rides', payload);
      if (res.data.success) {
        navigate(`/ride/${res.data.ride._id}/lobby`);
      }
    } catch (err) {
      setError(err.message || 'Failed to create ride. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="border-b border-slate-800 pb-4 space-y-1">
          <div className="inline-flex items-center space-x-2 text-xs font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Ride</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Plan a New Group Ride</h1>
          <p className="text-sm text-slate-400">Set the ride details and invite your friends to join</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center space-x-3 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ride Title / Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend Lonavala Expressway Cruise"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Starting Location</label>
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                <input
                  type="text"
                  required
                  value={startAddress}
                  onChange={(e) => setStartAddress(e.target.value)}
                  placeholder="e.g. Marine Drive, Mumbai"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Destination</label>
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
                <input
                  type="text"
                  required
                  value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                  placeholder="e.g. Tiger Point, Lonavala"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Scheduled Start Date & Time</label>
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" />
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description / Notes (Optional)</label>
            <div className="relative">
              <FileText className="w-5 h-5 absolute left-3 top-3 text-slate-500" />
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Fuel stop plans, meeting point details, gear requirements..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg shadow-orange-500/25 mt-4"
          >
            <span>{submitting ? 'Creating Ride...' : 'Create Ride & Open Lobby'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
