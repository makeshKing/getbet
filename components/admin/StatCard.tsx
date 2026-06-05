import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ElementType;
  trend?: string;
  trendUp?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp }) => {
  return (
    <div className="bg-white overflow-hidden rounded-lg shadow-sm border border-slate-200 p-5">
      <div className="flex items-center">
        {Icon && (
          <div className="flex-shrink-0 p-3 rounded-md bg-slate-100 text-slate-600 mr-4">
            <Icon size={24} />
          </div>
        )}
        <div>
          <dt className="text-sm font-medium text-slate-500 truncate">{title}</dt>
          <dd className="mt-1 text-3xl font-semibold text-slate-900">{value}</dd>
        </div>
      </div>
      {trend && (
        <div className={`mt-4 text-sm ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
           {trend}
        </div>
      )}
    </div>
  );
};
