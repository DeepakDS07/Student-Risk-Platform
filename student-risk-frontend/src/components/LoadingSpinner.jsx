import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ text = 'Loading...', size = 'default' }) => {
  const iconSize = size === 'small' ? 'w-4 h-4' : size === 'large' ? 'w-8 h-8' : 'w-6 h-6';

  return (
    <div className="flex flex-col items-center justify-center p-6 text-slate-400 gap-3">
      <Loader2 className={`${iconSize} animate-spin text-teal-400`} />
      {text && <span className="text-sm font-medium">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
