import React from 'react';
import { Button } from '../../components/ui/Button';

interface AdminHomeProps {
  onNavigate: (page: string) => void;
}

export const AdminHome: React.FC<AdminHomeProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Admin Portal</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Manage system and user activities.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          className="glass-panel rounded-3xl p-8 border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => onNavigate('admin-dashboard')}
        >
          <div className="flex flex-col h-full">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 dark:text-indigo-400">
                <rect width="7" height="9" x="3" y="3" rx="1"></rect>
                <rect width="7" height="5" x="14" y="3" rx="1"></rect>
                <rect width="7" height="9" x="14" y="12" rx="1"></rect>
                <rect width="7" height="5" x="3" y="16" rx="1"></rect>
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Dashboard</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Overview of system metrics and statistics.</p>
            <div className="mt-auto">
              <Button variant="outline" className="w-full">View Dashboard</Button>
            </div>
          </div>
        </div>
        
        <div 
          className="glass-panel rounded-3xl p-8 border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => onNavigate('admin-users')}
        >
          <div className="flex flex-col h-full">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">User Management</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Manage user accounts and permissions.</p>
            <div className="mt-auto">
              <Button variant="outline" className="w-full">Manage Users</Button>
            </div>
          </div>
        </div>
        
        <div 
          className="glass-panel rounded-3xl p-8 border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => onNavigate('admin-markets')}
        >
          <div className="flex flex-col h-full">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Market Management</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Create and manage prediction markets.</p>
            <div className="mt-auto">
              <Button variant="outline" className="w-full">Manage Markets</Button>
            </div>
          </div>
        </div>

        <div 
          className="glass-panel rounded-3xl p-8 border-2 border-dashed border-rose-300 dark:border-rose-700 cursor-pointer hover:shadow-lg hover:border-rose-400 dark:hover:border-rose-500 transition-all group"
          onClick={() => onNavigate('admin-market-create')}
        >
          <div className="flex flex-col h-full">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600 dark:text-rose-400">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 12h8"></path>
                <path d="M12 8v8"></path>
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Create Market</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Launch a new custom prediction market with full configuration.</p>
            <div className="mt-auto">
              <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white">+ New Market</Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          className="glass-panel rounded-3xl p-8 border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => onNavigate('admin-deposits')}
        >
          <div className="flex flex-col h-full">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Financial Operations</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Handle deposits, withdrawals, and financial adjustments.</p>
            <div className="mt-auto">
              <Button variant="outline" className="w-full">View Transactions</Button>
            </div>
          </div>
        </div>
        
        <div 
          className="glass-panel rounded-3xl p-8 border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => onNavigate('admin-settings')}
        >
          <div className="flex flex-col h-full">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 dark:text-purple-400">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">System Settings</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Configure application settings and parameters.</p>
            <div className="mt-auto">
              <Button variant="outline" className="w-full">Configure</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};