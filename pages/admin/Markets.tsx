
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Market } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Switch } from '../../components/ui/Switch';
import { Plus, Filter, SlidersHorizontal } from 'lucide-react';
import { MarketProbabilityEditor } from '../../components/admin/MarketProbabilityEditor';

interface AdminMarketsProps {
    onNavigate: (page: string) => void;
}

export const AdminMarkets: React.FC<AdminMarketsProps> = ({ onNavigate }) => {
  const { markets, adminUpdateMarketField } = useApp();
  
  // Filters
  const [filterTitle, setFilterTitle] = useState('');
  const [filterType, setFilterType] = useState('All'); 
  const [filterCategory, setFilterCategory] = useState('All');
  const [hideResolved, setHideResolved] = useState(false);

  const [editingProbabilityMarket, setEditingProbabilityMarket] = useState<Market | null>(null);

  // Removed useEffect for subscribe

  const handleToggleLock = async (id: string, current: boolean) => {
      await adminUpdateMarketField(id, 'isLocked', !current);
  };

  const handleToggleTrending = async (id: string, current: boolean) => {
      await adminUpdateMarketField(id, 'isTrending', !current);
  };

  // Filter Logic
  const filteredMarkets = markets.filter(m => {
      const matchTitle = m.title.toLowerCase().includes(filterTitle.toLowerCase());
      const matchCategory = filterCategory === 'All' || m.category === filterCategory;
      const matchResolved = hideResolved ? !m.outcome : true;
      return matchTitle && matchCategory && matchResolved;
  });

  const categories = Array.from(new Set(markets.map(m => m.category)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Markets</h1>
        <Button onClick={() => onNavigate('admin-market-create')} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus size={16} className="mr-2" /> Add New
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Title</label>
            <input 
                type="text" 
                className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="Search title..."
                value={filterTitle}
                onChange={e => setFilterTitle(e.target.value)}
            />
        </div>
        <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Type</label>
             <select 
                className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
            >
                <option value="All">All</option>
                <option value="Single">Single</option>
                <option value="Multiple">Multiple</option>
            </select>
        </div>
        <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Category</label>
            <select 
                className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
            >
                <option value="All">All</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
        <div className="flex flex-col justify-end pb-1">
            <div className="flex items-center gap-2 mb-1">
                <Switch checked={hideResolved} onChange={() => setHideResolved(!hideResolved)} />
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer" onClick={() => setHideResolved(!hideResolved)}>
                    Hide Resolved
                </label>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="bg-indigo-600 px-6 py-3 grid grid-cols-12 gap-4 text-xs font-bold text-white uppercase tracking-wider">
            <div className="col-span-3">Title</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-1">Volume</div>
            <div className="col-span-2 text-center">Live Prob</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-center">Lock</div>
            <div className="col-span-1 text-center">Trending</div>
            <div className="col-span-1 text-center">Action</div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredMarkets.map(m => (
                <div key={m.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="col-span-3 flex items-center space-x-3">
                        <img src={m.imageUrl} alt="" className="h-8 w-8 rounded-full object-cover bg-slate-200 dark:bg-slate-700" />
                        <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1" title={m.title}>{m.title}</div>
                        </div>
                    </div>
                    
                    <div className="col-span-2">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{m.category}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{m.subcategory || '-'}</div>
                    </div>

                    <div className="col-span-1 text-sm text-slate-600 dark:text-slate-300">Single</div>
                    
                    <div className="col-span-1 text-sm text-slate-600 dark:text-slate-300">
                         {(m.volume / 1000000).toFixed(1)}m
                    </div>

                    <div className="col-span-2 flex items-center justify-center gap-2">
                        {m.outcomes && m.outcomes.length > 0 ? (
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">Multi</span>
                        ) : (
                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{m.probability}%</span>
                            </div>
                        )}
                        <button
                            onClick={() => setEditingProbabilityMarket(m)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                            title="Edit Probability / Dynamics"
                        >
                            <SlidersHorizontal size={14} />
                        </button>
                    </div>

                    <div className="col-span-1">
                        {m.outcome ? (
                            <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">Declared</Badge>
                        ) : m.isLocked ? (
                            <Badge className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800">Locked</Badge>
                        ) : (
                            <Badge className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">Live</Badge>
                        )}
                    </div>

                    <div className="col-span-1 flex justify-center">
                        <Switch checked={!!m.isLocked} onChange={() => handleToggleLock(m.id, !!m.isLocked)} />
                    </div>

                    <div className="col-span-1 flex justify-center">
                        <Switch checked={!!m.isTrending} onChange={() => handleToggleTrending(m.id, !!m.isTrending)} />
                    </div>

                    <div className="col-span-1 flex justify-end">
                         <button 
                             onClick={() => onNavigate('admin-declared-markets')}
                             className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs underline transition-colors"
                         >
                             Manage
                         </button>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {editingProbabilityMarket && (
        <MarketProbabilityEditor
          market={editingProbabilityMarket}
          onClose={() => setEditingProbabilityMarket(null)}
        />
      )}
    </div>
  );
};
