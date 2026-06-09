
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { LayoutDashboard, Users, FileText, Settings, ShieldAlert, ArrowLeft, CheckCircle, Wallet, LogOut, TrendingUp, PlusCircle, Tag } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeView, onNavigate }) => {
  const { userProfile, loading } = useAuth();

  // Show spinner while auth state is resolving
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!userProfile || userProfile.role !== Role.ADMIN) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">404</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">Page not found or access denied.</p>
        <button
          onClick={() => onNavigate('home')}
          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Return Home
        </button>
      </div>
    );
  }

  const menuItems = [
    { id: 'admin-home', label: 'Admin Home', icon: LayoutDashboard },
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin-users', label: 'Users', icon: Users },
    { id: 'admin-markets', label: 'Markets', icon: FileText },
    { id: 'admin-market-create', label: 'Create Market', icon: PlusCircle },
    { id: 'admin-categories', label: 'Categories', icon: Tag },
    { id: 'admin-declared-markets', label: 'Declared Markets', icon: CheckCircle },
    { id: 'admin-deposits', label: 'Deposits', icon: Wallet },
    { id: 'admin-withdrawals', label: 'Withdrawals', icon: ShieldAlert },
    { id: 'admin-financials', label: 'Financials', icon: TrendingUp },
    { id: 'admin-settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 hidden md:block border-r border-white/5">
        <div className="p-4">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 px-3">Terminal v2.1</div>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center px-4 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeView === item.id || (activeView === 'admin-resolve-market' && item.id === 'admin-declared-markets')
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <item.icon size={18} className="mr-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-white/5 mt-auto space-y-2">
          <button
            onClick={() => onNavigate('home')}
            className="w-full flex items-center px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} className="mr-4" />
            Return to Kit
          </button>
          <button
            onClick={() => onNavigate('admin-login')}
            className="w-full flex items-center px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
          >
            <LogOut size={18} className="mr-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-40 border-b border-white/10">
          <span className="font-black text-xs uppercase tracking-widest">Admin Terminal</span>
          <select
            value={activeView}
            onChange={(e) => onNavigate(e.target.value)}
            className="bg-slate-800 text-white border-none rounded-lg text-xs p-2 font-bold focus:ring-0"
          >
            {menuItems.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
          </select>
        </div>
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
