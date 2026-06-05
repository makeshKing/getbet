
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MarketCard } from '../components/MarketCard';
import { Button } from '../components/ui/Button';
import { Search, ArrowUpDown, TrendingUp, Clock, BarChart3, Check, Filter, Zap } from 'lucide-react';
import { Market } from '../types';

interface MarketListProps {
    onMarketClick: (id: string) => void;
}

type SortOption = 'trending' | 'volume' | 'ending-soon' | 'newest';

export const MarketList: React.FC<MarketListProps> = ({ onMarketClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'active' | 'resolved'>('active');
    const [sortBy, setSortBy] = useState<SortOption>('trending');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    const { markets } = useApp();

    const sortOptions = [
        { id: 'trending', label: 'Trending', icon: TrendingUp },
        { id: 'volume', label: 'Highest Volume', icon: BarChart3 },
        { id: 'ending-soon', label: 'Ending Soon', icon: Clock },
        { id: 'newest', label: 'Newest', icon: Zap },
    ];

    const filteredMarkets = useMemo(() => {
        let result = markets.filter(m => {
            const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase());
            const isResolved = !!m.outcome;
            const matchesStatus = filterStatus === 'active' ? !isResolved : isResolved;
            return matchesSearch && matchesStatus;
        });

        // Apply Sorting
        return [...result].sort((a, b) => {
            switch (sortBy) {
                case 'trending':
                    return (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0);
                case 'volume':
                    return (b.volume || 0) - (a.volume || 0);
                case 'ending-soon':
                    return new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime();
                case 'newest':
                    return new Date(b.startDate || b.closeDate).getTime() - new Date(a.startDate || a.closeDate).getTime();
                default:
                    return 0;
            }
        });
    }, [markets, searchTerm, sortBy, filterStatus]);

    return (
        <div className="min-h-screen pb-20">
            {/* Search Header */}
            <div className="sticky top-16 z-30 pt-4 pb-4 px-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-xl transition-all">
                <div className="max-w-7xl mx-auto flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search all markets..."
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white placeholder-slate-500 font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filter Status Switch */}
                    <div className="flex bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl p-1 border border-slate-200/50 dark:border-slate-700/50">
                        <button
                            onClick={() => setFilterStatus('active')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filterStatus === 'active' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setFilterStatus('resolved')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filterStatus === 'resolved' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Resolved
                        </button>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black transition-all border ${isSortMenuOpen ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                        >
                            <ArrowUpDown size={16} />
                            <span className="hidden sm:inline uppercase tracking-widest text-[10px]">Sort</span>
                        </button>

                        {isSortMenuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsSortMenuOpen(false)}
                                />
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right overflow-hidden">
                                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort By</span>
                                    </div>
                                    {sortOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => {
                                                setSortBy(option.id as SortOption);
                                                setIsSortMenuOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-colors ${sortBy === option.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <option.icon size={16} className={sortBy === option.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                                                {option.label}
                                            </div>
                                            {sortBy === option.id && <Check size={16} />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <button className="md:hidden p-2.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl text-slate-500 active-scale">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                    Explore Markets
                    <span className="text-[10px] font-black bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg tracking-widest">
                        {filteredMarkets.length}
                    </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredMarkets.map(market => (
                        <MarketCard key={market.id} market={market} onClick={onMarketClick} />
                    ))}
                </div>

                {filteredMarkets.length === 0 && (
                    <div className="text-center py-20 animate-fade-in-up">
                        <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-[2.5rem] inline-block mb-4">
                            <Search size={48} className="text-slate-300 mx-auto" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tight">No results</h3>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Try adjusting your keywords.</p>
                        <Button
                            variant="outline"
                            className="mt-8 rounded-2xl uppercase tracking-widest text-[10px] font-black h-12 px-8"
                            onClick={() => {
                                setSearchTerm('');
                                setSortBy('trending');
                            }}
                        >
                            Clear Search
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
