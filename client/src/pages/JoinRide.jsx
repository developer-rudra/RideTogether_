import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Compass, AlertCircle, Loader2 } from 'lucide-react';

export default function JoinRide() {
  const { rideCode } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAutoJoin = async () => {
      if (!rideCode) {
        setError('Invalid invite link');
        setLoading(false);
        return;
      }

      try {
        const res = await api.post('/rides/join', { rideCode });
        if (res.data.success) {
          const ride = res.data.ride;
          if (ride.status === 'ACTIVE') {
            navigate(`/ride/${ride._id}/map`, { replace: true });
          } else {
            navigate(`/ride/${ride._id}/lobby`, { replace: true });
          }
        }
      } catch (err) {
        setError(err.message || 'Unable to join ride. Link may be invalid or expired.');
        setLoading(false);
      }
    };

    handleAutoJoin();
  }, [rideCode, navigate]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-6 shadow-xl">
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl inline-block text-orange-500">
          <Compass className="w-8 h-8" />
        </div>

        {loading ? (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white">Joining Ride #{rideCode}...</h2>
            <p className="text-sm text-slate-400">Validating invitation link and permissions</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center space-x-3 text-rose-400 text-sm text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm transition"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
