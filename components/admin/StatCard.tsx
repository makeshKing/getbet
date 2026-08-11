
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  compact?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, compact }) => {
  const subTone = trendUp ? 'text-[#00D4AA]' : 'text-[#F87171]';
  return (
    <div className="bg-[#14161B] overflow-hidden rounded-2xl border border-slate-800/60 p-4 sm:p-5 shadow-sm transition-colors hover:border-slate-700/60 h-full flex flex-col">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex-shrink-0 p-2.5 rounded-xl bg-[#0A0C10] text-[#00D4AA] border border-slate-800/60">
            <Icon size={compact ? 18 : 20} />
          </div>
        )}
        <div className="min-w-0">
          <dt className="text-[10px] font-black text-[#9AA0A6] uppercase tracking-widest truncate">{title}</dt>
          <dd className="mt-0.5 text-2xl sm:text-3xl font-black text-white tabular-nums leading-none">{value}</dd>
        </div>
      </div>
      {trend && (
        <div className="mt-auto">
          <span className={`mt-3 inline-flex items-center px-2 py-0.5 rounded-md bg-[#0A0C10] text-[10px] font-black uppercase tracking-widest border border-slate-800/60 ${subTone}`}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
};
