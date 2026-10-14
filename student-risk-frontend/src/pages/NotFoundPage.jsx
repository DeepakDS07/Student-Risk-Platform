import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-bold text-slate-100 mb-2">404 - Page Not Found</h1>
      <p className="text-sm text-slate-400 max-w-md mb-6">
        The requested URL or resource could not be found. Please check your address or return to your dashboard.
      </p>
      <Link
        to="/login"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-teal-600/20 transition-all"
      >
        <Home className="w-4 h-4" />
        Return to Login / Dashboard
      </Link>
    </div>
  );
};

export default NotFoundPage;
