import React from 'react';

const RiskBadge = ({ level, score }) => {
  const normLevel = (level || 'low').toLowerCase();

  let colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let label = 'Low';

  if (normLevel === 'high') {
    colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    label = 'High';
  } else if (normLevel === 'medium') {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    label = 'Medium';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${colorClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${normLevel === 'high' ? 'bg-rose-400' : normLevel === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
      {label}
      {score !== undefined && score !== null && <span className="opacity-75">({score})</span>}
    </span>
  );
};

export default RiskBadge;
