
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Market, Outcome } from '../../types';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { Filter, MoreVertical, CheckCircle, Clock, Swords } from 'lucide-react';

interface AdminDeclaredMarketsProps {
    onResolveClick: (id: string) => void;
}

export const AdminDeclaredMarkets: React.FC<AdminDeclaredMarketsProps> = ({ onResolveClick }) => {
  const { markets, adminUpdateMarketField } = useApp();
  const { formatMoney } = useCurrency();
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
  
  // Filters
  const [filterTitle, setFilterTitle] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  // Removed useEffect for subscribe

  const handleToggleLock = async (id: string, current: boolean) => {
      await adminUpdateMarketField(id, 'isLocked', !current);
  };

  const handleToggleTrending = async (id: string, current: boolean) => {
      await adminUpdateMarketField(id, 'isTrending', !current);
  };

  const filteredMarkets = markets.filter(m => {
      const matchTitle = (m.title || '').toLowerCase().includes(filterTitle.toLowerCase());
      const matchCategory = filterCategory === 'All' || m.category === filterCategory;
      const matchTab = activeTab === 'pending' ? !m.outcome : !!m.outcome;
      return matchTitle && matchCategory && matchTab;
  });

  const categories = Array.from(new Set(markets.map(m => m.category)));

  const getProfitLoss = (vol: number) => {
      const isPositive = vol % 2 === 0;
      const amount = (vol * 0.05 / 100).toFixed(2);
      return { isPositive, amount };
  };

  const renderOutcome = (m: Market) => {
      if (!m.outcome) return '-';
      const isVs = m.subcategory === 'Head-to-Head' && m.candidateA && m.candidateB;
      
      if (isVs) {
          const winner = m.outcome === Outcome.YES ? m.candidateA! : m.candidateB!;
          return (
              <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                      <img src={winner.imageUrl} className="w-5 h-5 rounded-full object-cover border" style={{ borderColor: winner.color }} />
                      <span className="font-black text-[10px] uppercase truncate max-w-[80px]" style={{ color: winner.color }}>{winner.name.split(' ').pop()}</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.outcome} Winner</span>
              </div>
          );
      }

      return (
          <span className={`font-black text-xs uppercase tracking-widest ${m.outcome === 'YES' ? 'text-emerald-500' : m.outcome === 'NO' ? 'text-red-500' : 'text-slate-500'}`}>
              {m.outcome}
          </span>
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Market Resolution</h1>
            <p className="text-sm text-slate-500 font-medium">Finalize and settle predictions.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                <Clock size={14} /> Pending
            </button>
            <button
                onClick={() => setActiveTab('resolved')}
                className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${activeTab === 'resolved' ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                <CheckCircle size={14} /> Resolved
            </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="bg-slate-50/50 dark:bg-slate-900/50 px-8 py-4 grid grid-cols-12 gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
            <div className="col-span-4">Market Assets</div>
            <div className="col-span-2">Volume / Probability</div>
            <div className="col-span-1 text-center">Lock</div>
            <div className="col-span-1 text-center">Trend</div>
            <div className="col-span-2 text-center">{activeTab === 'resolved' ? 'Winning Outcome' : 'Projected P/L'}</div>
            <div className="col-span-2 text-right">Action</div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredMarkets.length === 0 ? (
                <div className="p-20 text-center">
                    <div className="inline-flex bg-slate-50 dark:bg-slate-900 p-4 rounded-full mb-4">
                        <CheckCircle size={32} className="text-slate-200 dark:text-slate-700" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No markets in this queue</p>
                </div>
            ) : filteredMarkets.map(m => {
                const pl = getProfitLoss(m.volume || 0);
                const isVs = m.subcategory === 'Head-to-Head' && m.candidateA && m.candidateB;
                return (
                    <div key={m.id} className="grid grid-cols-12 gap-4 px-8 py-5 items-center hover:bg-slate-50 dark:hover:bg-indigo-900/10 transition-colors group">
                        <div className="col-span-4 flex items-center space-x-4">
                            <div className="relative">
                                {isVs ? (
                                    <div className="flex -space-x-3">
                                        <img src={m.candidateA?.imageUrl} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 object-cover" />
                                        <img src={m.candidateB?.imageUrl} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 object-cover" />
                                    </div>
                                ) : (
                                    <img src={m.imageUrl} alt="" className="h-10 w-10 rounded-xl object-cover bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-black text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors" title={m.title}>{m.title}</div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                    {isVs && <Swords size={10} className="text-indigo-500" />}
                                    {m.category} • {m.subcategory || 'General'}
                                </div>
                            </div>
                        </div>
                        
                        <div className="col-span-2">
                             <div className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{formatMoney(m.volume || 0)}</div>
                             <div className="text-[10px] font-bold text-indigo-500 uppercase tabular-nums">{m.probability}% Prob</div>
                        </div>

                        <div className="col-span-1 flex justify-center">
                            <Switch checked={!!m.isLocked} onChange={() => handleToggleLock(m.id, !!m.isLocked)} />
                        </div>

                        <div className="col-span-1 flex justify-center">
                            <Switch checked={!!m.isTrending} onChange={() => handleToggleTrending(m.id, !!m.isTrending)} />
                        </div>

                        <div className="col-span-2 text-center">
                            {activeTab === 'resolved' ? (
                                renderOutcome(m)
                            ) : (
                                <div className="flex flex-col items-center">
                                    <span className={`text-xs font-black tabular-nums ${pl.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {pl.isPositive ? '+' : '-'}{formatMoney(parseFloat(pl.amount.replace(/,/g, '')) * 100)}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Est. House Fee</span>
                                </div>
                            )}
                        </div>

                        <div className="col-span-2 flex justify-end">
                             {!m.outcome ? (
                                 <Button 
                                    onClick={() => onResolveClick(m.id)}
                                    variant="secondary"
                                    className="h-9 px-4 text-[9px] font-black uppercase tracking-widest border-2 border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white"
                                 >
                                    Declare Now
                                 </Button>
                             ) : (
                                 <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                                     <CheckCircle size={14} strokeWidth={3} />
                                     <span className="text-[9px] font-black uppercase tracking-widest">Settled</span>
                                 </div>
                             )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};
