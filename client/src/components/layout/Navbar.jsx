import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Navigation, LogOut, User as UserIcon, PlusCircle, Compass } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-3 group">
            <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg group-hover:bg-orange-500/20 transition">
              <Navigation className="w-5 h-5 text-orange-500" />
            </div>
            <span className="font-bold text-lg text-white tracking-wide">
              Ride<span className="text-orange-500">Together</span>
            </span>
          </Link>

          {/* Navigation Links / User Profile */}
          {user ? (
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <Compass className="w-4 h-4 text-orange-400" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/create-ride"
                className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition shadow-lg shadow-orange-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Ride</span>
              </Link>

              <div className="h-4 w-px bg-slate-800 hidden sm:block" />

              <div className="flex items-center space-x-3 pl-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-orange-400 font-bold text-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden md:inline text-sm font-medium text-slate-200">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition shadow-lg shadow-orange-500/20"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
