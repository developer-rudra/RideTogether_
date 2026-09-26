import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { socket, connectSocket, disconnectSocket } from '../sockets/socket';
import { Activity, Wifi, ShieldCheck, Server, Radio } from 'lucide-react';

export default function HealthCheck() {
  const [apiHealth, setApiHealth] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [pingResponse, setPingResponse] = useState(null);

  useEffect(() => {
    // 1. Test REST API Health Endpoint
    api.get('/health')
      .then((res) => setApiHealth(res.data))
      .catch((err) => setApiError(err.message));

    // 2. Setup Socket.IO Event Listeners
    connectSocket();

    function onConnect() {
      setSocketConnected(true);
      // Send a test ping event
      socket.emit('ping:test', { clientTime: new Date().toISOString() });
    }

    function onDisconnect() {
      setSocketConnected(false);
    }

    function onPong(data) {
      setPingResponse(data);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('pong:test', onPong);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('pong:test', onPong);
      disconnectSocket();
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
        <Activity className="w-8 h-8 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">RideTogether System Status</h1>
          <p className="text-sm text-slate-400">Phase 1: Foundation Setup & Connectivity Verification</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* REST API Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-sky-400" />
              <h2 className="font-semibold text-lg text-white">REST API Service</h2>
            </div>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
              apiHealth ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {apiHealth ? 'ONLINE' : 'CONNECTING...'}
            </span>
          </div>

          {apiHealth ? (
            <div className="space-y-2 text-sm text-slate-300 bg-slate-950/50 p-4 rounded-lg border border-slate-800 font-mono">
              <p><span className="text-slate-500">Status:</span> {apiHealth.message}</p>
              <p><span className="text-slate-500">Timestamp:</span> {apiHealth.timestamp}</p>
              <p><span className="text-slate-500">Environment:</span> {apiHealth.environment}</p>
            </div>
          ) : (
            <p className="text-sm text-rose-400">{apiError || 'Checking REST API endpoint...'}</p>
          )}
        </div>

        {/* Socket.IO Real-time Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Radio className="w-5 h-5 text-orange-400" />
              <h2 className="font-semibold text-lg text-white">Socket.IO Server</h2>
            </div>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
              socketConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {socketConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

          {pingResponse ? (
            <div className="space-y-2 text-sm text-slate-300 bg-slate-950/50 p-4 rounded-lg border border-slate-800 font-mono">
              <p><span className="text-slate-500">Event:</span> {pingResponse.message}</p>
              <p><span className="text-slate-500">Server Time:</span> {pingResponse.receivedAt}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Waiting for Socket.IO handshake...</p>
          )}
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 text-xs text-slate-400 flex items-center space-x-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <span>
          Architecture foundation initialized. Ready for Phase 2: User Authentication & JWT Middleware.
        </span>
      </div>
    </div>
  );
}
