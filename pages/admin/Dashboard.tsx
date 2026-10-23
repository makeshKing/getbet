
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useCurrency } from '../../context/CurrencyContext';
import { StatCard } from '../../components/admin/StatCard';
import { Users, FileText, DollarSign, ShieldAlert, CheckCircle, PlusCircle, Settings, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
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

  // NOTE: banner config persistence is NOT implemented in the backend.
  // These are local-only UI states to reserve layout space; no data is saved.
  const [bannerEnabled, setBannerEnabled] = useState(true);

  useEffect(() => {
    adminGetStats().then(setStats);
  }, [adminGetStats]);

  const pendingTotal = stats.pendingWithdrawals + stats.pendingDeposits + stats.pendingKyc + stats.pendingResolutions;
  const pendingSub = stats.pendingResolutions > 0 ? `${stats.pendingResolutions} resolutions`
    : stats.pendingWithdrawals > 0 ? `${stats.pendingWithdrawals} w/d`
    : stats.pendingDeposits > 0 ? `${stats.pendingDeposits} dep`
    : 'all clear';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Dashboard Overview</h1>
            <p className="text-sm font-medium text-[#9AA0A6]">System health and management portal.</p>
        </div>
        <div className="flex gap-3">
             <Button onClick={() => onNavigate('admin-market-create')} className="bg-[#00D4AA] hover:brightness-110 text-black h-10 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#00D4AA]/20 border-0">
                <PlusCircle size={14} className="mr-2" /> New Market
             </Button>
        </div>
      </div>

      {/* Stats Row — 5 compact cards incl. Pending Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} compact />
        <StatCard title="Total Volume" value={formatMoney(stats.totalVolume)} icon={DollarSign} compact />
        <StatCard title="Commission Earned" value={formatMoney(stats.totalCommission)} icon={TrendingUp} compact />
        <StatCard title="Active Markets" value={stats.totalMarkets} icon={FileText} compact />
        <StatCard
            title="Pending Actions"
            value={pendingTotal}
            icon={ShieldAlert}
            trend={pendingSub}
            trendUp={pendingTotal === 0}
            compact
        />
      </div>

      {/* Promotional Banner — two-column: preview + config (reserved) */}
      <div className="bg-[#14161B] rounded-[2rem] border border-slate-800/60 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles size={16} className="text-[#00D4AA]" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">User-Facing Promotional Banner</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: live preview */}
          <div>
            <p className="text-[10px] font-black text-[#9AA0A6] uppercase tracking-widest mb-3">Live Preview</p>
            <div className={`max-w-sm transition-opacity ${bannerEnabled ? '' : 'opacity-40 pointer-events-none'}`}>
              <PromoBanner
                  featuredMarket={stats.totalMarkets > 0 ? { id: 'admin-preview', title: 'Featured Market Example', description: 'This is a live preview of the promotional banner that users see in the sidebar.', category: 'Sports', probability: 50, volume: 1000000, isTrending: true } as any : undefined}
                  onClick={() => {}}
              />
            </div>
            <p className="text-xs text-[#6B7280] mt-4">By default the banner auto-selects the top trending market in the user sidebar.</p>
          </div>

          {/* Right: configuration controls — reserved layout */}
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-black text-[#9AA0A6] uppercase tracking-widest">Configuration</p>

            {/* Enable/disable — local-only state, flagged */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0A0C10] border border-slate-800/60">
              <div>
                <p className="text-xs font-black text-white uppercase tracking-tight">Enable Banner</p>
                <p className="text-[10px] text-[#6B7280] font-bold uppercase">Show in user sidebar</p>
              </div>
              <Switch checked={bannerEnabled} onChange={setBannerEnabled} />
            </div>

            {/* Reserved controls — backend not implemented */}
            <div className="p-4 rounded-2xl bg-[#0A0C10] border border-dashed border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={14} className="text-amber-400" />
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Not yet wired</p>
              </div>
              <ul className="space-y-2 text-xs text-[#9AA0A6]">
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                  Override featured market (currently auto-selects top trending) — <span className="text-amber-400 font-bold">missing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                  Edit CTA button text (hardcoded "Trade Now") — <span className="text-amber-400 font-bold">missing</span>
                </li>
              </ul>
              <p className="text-[10px] text-[#6B7280] mt-3 leading-relaxed">Layout reserved. These controls require backend persistence (supabase <code className="text-[#9AA0A6]">banner_config</code> table) before activation.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions + System Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#14161B] rounded-[2rem] border border-slate-800/60 p-6 sm:p-8 shadow-sm">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => onNavigate('admin-market-create')}
                    className="group flex flex-col items-start justify-center p-5 bg-[#0A0C10] border border-slate-800/60 rounded-2xl hover:border-[#00D4AA]/50 hover:shadow-[0_0_15px_rgba(0,212,170,0.12)] transition-all"
                >
                    <div className="p-2.5 rounded-xl bg-[#14161B] text-[#00D4AA] border border-[#00D4AA]/20 mb-3 group-hover:scale-110 transition-transform">
                        <PlusCircle size={22} />
                    </div>
                    <span className="text-[11px] font-black text-white uppercase tracking-widest">New Market</span>
                    <span className="text-[10px] text-[#6B7280] font-bold uppercase">Create & publish</span>
                </button>
                <button
                     onClick={() => onNavigate('admin-settings')}
                     className="group flex flex-col items-start justify-center p-5 bg-[#0A0C10] border border-slate-800/60 rounded-2xl hover:border-slate-600 transition-all"
                >
                    <div className="p-2.5 rounded-xl bg-[#14161B] text-slate-300 border border-slate-700 mb-3 group-hover:scale-110 transition-transform">
                        <Settings size={22} />
                    </div>
                    <span className="text-[11px] font-black text-white uppercase tracking-widest">Global Config</span>
                    <span className="text-[10px] text-[#6B7280] font-bold uppercase">Platform settings</span>
                </button>
                <button
                     onClick={() => { adminGetStats().then(setStats); }}
                     className="group col-span-2 flex items-center justify-center gap-3 p-5 bg-[#0A0C10] border border-slate-800/60 rounded-2xl hover:border-slate-600 transition-all"
                >
                    <div className="p-2.5 rounded-xl bg-[#14161B] text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                        <DollarSign size={22} />
                    </div>
                    <div className="text-left">
                        <span className="block text-[11px] font-black text-white uppercase tracking-widest">Refresh Stats</span>
                        <span className="block text-[10px] text-[#6B7280] font-bold uppercase">Pull latest metrics</span>
                    </div>
                </button>
            </div>
        </div>

        <div className="bg-[#14161B] rounded-[2rem] border border-slate-800/60 p-6 sm:p-8 shadow-sm">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">System Alerts</h3>
            <div className="space-y-3">
                {stats.pendingDeposits > 0 && (
                    <div className="flex items-center justify-between p-4 bg-emerald-900/15 rounded-2xl border border-emerald-700/40">
                        <div className="flex items-center gap-3">
                            <DollarSign className="text-emerald-400" size={20} />
                            <div>
                                <p className="text-xs font-black text-white uppercase tracking-tight">{stats.pendingDeposits} Deposits Pending</p>
                                <p className="text-[10px] text-[#9AA0A6] font-bold uppercase">Awaiting Reference Verification</p>
                            </div>
                        </div>
                        <button onClick={() => onNavigate('admin-deposits')} className="text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:underline">Verify</button>
                    </div>
                )}

                {stats.pendingResolutions > 0 && (
                    <div className="flex items-center justify-between p-4 bg-amber-900/15 rounded-2xl border border-amber-700/40">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="text-amber-400" size={20} />
                            <div>
                                <p className="text-xs font-black text-white uppercase tracking-tight">{stats.pendingResolutions} Markets to Resolve</p>
                                <p className="text-[10px] text-[#9AA0A6] font-bold uppercase">Outcome deadline reached</p>
                            </div>
                        </div>
                        <button onClick={() => onNavigate('admin-declared-markets')} className="text-[10px] font-black text-amber-400 uppercase tracking-widest hover:underline">Resolve</button>
                    </div>
                )}

                {stats.pendingDeposits === 0 && stats.pendingResolutions === 0 && (
                    <div className="text-center py-6">
                        <CheckCircle size={32} className="text-slate-700 mx-auto mb-2" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">All systems clear</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
