import React from 'react';
import { AdminWithdrawalQueue } from '../components/AdminWithdrawalQueue';
import { ShieldCheck } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <div className="p-2 bg-slate-900 text-white rounded mr-3">
            <ShieldCheck size={24} />
        </div>
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500">Manage users, markets, and financial operations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AdminWithdrawalQueue />
        
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-400">
            More admin tools coming soon...
        </div>
      </div>
    </div>
  );
};
