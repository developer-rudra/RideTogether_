import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import HealthCheck from './pages/HealthCheck';
import Dashboard from './pages/Dashboard';
import CreateRide from './pages/CreateRide';
import JoinRide from './pages/JoinRide';
import RideLobby from './pages/RideLobby';
import RideMap from './pages/RideMap';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/health" element={<HealthCheck />} />
              
              {/* Protected Application Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-ride"
                element={
                  <ProtectedRoute>
                    <CreateRide />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/join/:rideCode"
                element={
                  <ProtectedRoute>
                    <JoinRide />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ride/:rideId/lobby"
                element={
                  <ProtectedRoute>
                    <RideLobby />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ride/:rideId/map"
                element={
                  <ProtectedRoute>
                    <RideMap />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
