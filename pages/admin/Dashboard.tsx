
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useCurrency } from '../../context/CurrencyContext';
import { StatCard } from '../../components/admin/StatCard';
import { Users, FileText, DollarSign, ShieldAlert, CheckCircle, PlusCircle, Settings, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PromoBanner } from '../../components/PromoBanner';

interface AdminDashboardProps {
    onNavigate: (page: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { adminGetStats } = useApp();
  const { formatMoney } = useCurrency();
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    totalMarkets: 0,
    totalVolume: 0,
    totalCommission: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    pendingKyc: 0,
    pendingResolutions: 0
  });

  useEffect(() => {
    adminGetStats().then(setStats);
  }, [adminGetStats]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Dashboard Overview</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">System health and management portal.</p>
        </div>
        <div className="flex gap-3">
             <Button onClick={() => onNavigate('admin-market-create')} className="bg-indigo-600 hover:bg-indigo-700 h-10 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                <PlusCircle size={14} className="mr-2" /> New Market
             </Button>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Total Users" 
            value={stats.totalUsers} 
            icon={Users} 
        />
        <StatCard 
            title="Total Volume" 
            value={formatMoney(stats.totalVolume)} 
            icon={DollarSign} 
        />
        <StatCard 
            title="Commission Earned" 
            value={formatMoney(stats.totalCommission)} 
            icon={TrendingUp} 
        />
        <StatCard 
            title="Active Markets" 
            value={stats.totalMarkets} 
            icon={FileText} 
        />
      </div>
      
      {/* Pending Actions Card */}
      <div className="grid grid-cols-1 gap-6">
        <StatCard 
            title="Pending Actions" 
            value={stats.pendingWithdrawals + stats.pendingDeposits + stats.pendingKyc + stats.pendingResolutions} 
            icon={ShieldAlert}
            trend={
                stats.pendingWithdrawals > 0 ? `${stats.pendingWithdrawals} w/d` : 
                stats.pendingDeposits > 0 ? `${stats.pendingDeposits} dep` :
                stats.pendingResolutions > 0 ? `${stats.pendingResolutions} resolutions` : undefined
            }
            trendUp={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">User-Facing Promotional Banner</h3>
            <div className="max-w-sm mx-auto">
                <PromoBanner 
                    featuredMarket={stats.totalMarkets > 0 ? { id: 'admin-preview', title: 'Featured Market Example', description: 'This is a live preview of the promotional banner that users see in the sidebar.', category: 'Sports', probability: 50, volume: 1000000, isTrending: true } as any : undefined} 
                    onClick={() => {}} 
                />
            </div>
            <p className="text-xs text-slate-500 mt-6 text-center">This banner automatically highlights the top trending market to drive user engagement.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => onNavigate('admin-market-create')}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
                >
                    <PlusCircle size={32} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-2 transition-colors" />
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">New Market</span>
                </button>
                <button 
                     onClick={() => onNavigate('admin-settings')}
                     className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500 transition-all group"
                >
                    <Settings size={32} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 mb-2 transition-colors" />
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Global Config</span>
                </button>
                <button 
                     onClick={() => {
                       adminGetStats().then(setStats);
                     }}
                     className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-green-300 dark:hover:border-green-500 transition-all group col-span-2"
                >
                    <DollarSign size={32} className="text-slate-400 group-hover:text-green-600 dark:group-hover:text-green-400 mb-2 transition-colors" />
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Refresh Stats</span>
                </button>
            </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">System Alerts</h3>
            <div className="space-y-4">
                {stats.pendingDeposits > 0 && (
                    <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                        <div className="flex items-center gap-3">
                            <DollarSign className="text-emerald-500" size={20} />
                            <div>
                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{stats.pendingDeposits} Deposits Pending</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Awaiting Reference Verification</p>
                            </div>
                        </div>
                        <button onClick={() => onNavigate('admin-deposits')} className="text-[10px] font-black text-emerald-600 underline uppercase tracking-widest">Verify</button>
                    </div>
                )}
                
                {stats.pendingResolutions > 0 && (
                    <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="text-amber-500" size={20} />
                            <div>
                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{stats.pendingResolutions} Markets to Resolve</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Outcome deadline reached</p>
                            </div>
                        </div>
                        <button onClick={() => onNavigate('admin-declared-markets')} className="text-[10px] font-black text-amber-600 underline uppercase tracking-widest">Resolve</button>
                    </div>
                )}

                {stats.pendingDeposits === 0 && stats.pendingResolutions === 0 && (
                    <div className="text-center py-6">
                        <CheckCircle size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All systems clear</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
