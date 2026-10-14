import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ErrorAlert = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="flex items-center justify-between p-3.5 mb-4 text-sm text-rose-300 bg-rose-950/50 border border-rose-800/60 rounded-xl shadow-lg animate-fadeIn">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-900/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ErrorAlert;
