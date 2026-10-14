import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

const SuccessToast = ({ message, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (message && duration) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="flex items-center justify-between p-3.5 mb-4 text-sm text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 rounded-xl shadow-lg animate-fadeIn">
      <div className="flex items-center gap-2.5">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-emerald-400 hover:text-emerald-200 hover:bg-emerald-900/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SuccessToast;
