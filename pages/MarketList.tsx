
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MarketCard } from '../components/MarketCard';
import { Button } from '../components/ui/Button';
import {
    Search, ArrowUpDown, TrendingUp, Clock, BarChart3,
    Check, Zap, Flame, Globe2, Bitcoin, Trophy, Landmark, FlaskConical,
    Music, Tag, Star, Shield, Target, Rocket, Crown, Heart
} from 'lucide-react';
import { Market } from '../types';

// Map of icon name strings (stored in DB) to Lucide components
const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
    Landmark, Bitcoin, Trophy, FlaskConical, BarChart3, TrendingUp,
    Music, Tag, Star, Shield, Target, Rocket, Crown, Heart, Globe2, Flame, Zap,
};

const resolveIcon = (name?: string): React.FC<{ size?: number; className?: string }> =>
    (name && ICON_MAP[name]) ? ICON_MAP[name] : Tag;

interface MarketListProps {
    onMarketClick: (id: string) => void;
}

type SortOption = 'trending' | 'volume' | 'ending-soon' | 'newest';

// Static "All" entry; dynamic categories come from AppContext
const ALL_CATEGORY = { id: '', label: 'All', icon: Globe2 };

const SORT_OPTIONS: { id: SortOption; label: string; icon: React.FC<{ size?: number }> }[] = [
    { id: 'trending', label: 'Trending', icon: Flame },
    { id: 'volume', label: 'Highest Volume', icon: BarChart3 },
    { id: 'ending-soon', label: 'Ending Soon', icon: Clock },
    { id: 'newest', label: 'Newest', icon: Zap },
];

export const MarketList: React.FC<MarketListProps> = ({ onMarketClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'active' | 'resolved'>('active');
    const [sortBy, setSortBy] = useState<SortOption>('trending');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    const { markets, categories } = useApp();

    // Build the full category list: "All" first, then dynamic DB categories
    const CATEGORIES = useMemo(() => [
        ALL_CATEGORY,
        ...categories.map(cat => ({
            id: cat.name,
            label: cat.name,
            icon: resolveIcon(cat.icon),
            color: cat.color,
        }))
    ], [categories]);

    const filteredMarkets = useMemo(() => {
        let result = markets.filter(m => {
            const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase());
            const isResolved = !!m.outcome;
            const matchesStatus = filterStatus === 'active' ? !isResolved : isResolved;
            const matchesCategory = !categoryFilter || m.category === categoryFilter;
            return matchesSearch && matchesStatus && matchesCategory;
        });

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
    }, [markets, searchTerm, sortBy, filterStatus, categoryFilter]);

    const currentSort = SORT_OPTIONS.find(o => o.id === sortBy);

    return (
        <div className="min-h-screen pb-24">

            {/* ── Sticky Controls Bar ── */}
            <div className="sticky top-14 z-30 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4">
                    {/* Top row: search + active/resolved + sort */}
                    <div className="flex items-center gap-2 py-3">
                        {/* Search */}
                        <label htmlFor="market-search" className="sr-only">Search markets</label>
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                            <input
                                id="market-search"
                                type="text"
                                placeholder="Search all markets..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-100/60 dark:bg-slate-800/60 border border-transparent focus:border-indigo-400/50 dark:focus:border-indigo-600/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white placeholder-slate-400 font-semibold transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Active / Resolved toggle */}
                        <div
                            className="flex bg-slate-100/60 dark:bg-slate-800/60 rounded-xl p-0.5 border border-slate-200/60 dark:border-slate-700/60 shrink-0"
                            role="group"
                            aria-label="Market status filter"
                        >
                            {(['active', 'resolved'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    aria-pressed={filterStatus === s}
                                    className={`px-3 py-1.5 rounded-[10px] text-xs font-black uppercase tracking-widest transition-all ${
                                        filterStatus === s
                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* Sort dropdown */}
                        <div className="relative shrink-0">
                            <button
                                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                                aria-expanded={isSortMenuOpen}
                                aria-haspopup="listbox"
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                                    isSortMenuOpen
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                                        : 'bg-slate-100/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-400/40 dark:hover:border-indigo-600/40'
                                }`}
                            >
                                <ArrowUpDown size={13} />
                                <span className="hidden sm:inline">{currentSort?.label || 'Sort'}</span>
                            </button>

                            {isSortMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsSortMenuOpen(false)}
                                        aria-hidden="true"
                                    />
                                    <div
                                        role="listbox"
                                        aria-label="Sort options"
                                        className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/70 dark:border-slate-700/70 py-2 z-50 overflow-hidden animate-fade-in-up"
                                        style={{ animationDuration: '0.15s' }}
                                    >
                                        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort By</span>
                                        </div>
                                        {SORT_OPTIONS.map((option) => (
                                            <button
                                                key={option.id}
                                                role="option"
                                                aria-selected={sortBy === option.id}
                                                onClick={() => { setSortBy(option.id); setIsSortMenuOpen(false); }}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold transition-colors ${
                                                    sortBy === option.id
                                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <option.icon size={14} />
                                                    {option.label}
                                                </div>
                                                {sortBy === option.id && <Check size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Category chips — horizontal scroll */}
                    <div className="flex gap-2 pb-3 overflow-x-auto no-scrollbar" role="group" aria-label="Category filter">
                        {CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            const active = categoryFilter === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategoryFilter(cat.id)}
                                    aria-pressed={active}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0 ${
                                        active
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                                            : 'bg-slate-100/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-400/40 dark:hover:border-indigo-600/40 hover:text-indigo-600 dark:hover:text-indigo-400'
                                    }`}
                                >
                                    <Icon size={11} />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Market Grid ── */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Section heading */}
                <div className="flex items-center gap-3 mb-5">
                    <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest">
                        {categoryFilter || 'All'} Markets
                    </h2>
                    <span className="text-[10px] font-black bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-500/10 px-2 py-0.5 rounded-lg tracking-widest border border-indigo-500/10">
                        {filteredMarkets.length}
                    </span>
                    {sortBy !== 'trending' && (
                        <span className="hidden sm:flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-auto">
                            <TrendingUp size={11} />
                            {currentSort?.label}
                        </span>
                    )}
                </div>

                {filteredMarkets.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                        {filteredMarkets.map((market) => (
                            <div key={market.id} className="market-card-container">
                                <MarketCard market={market} onClick={onMarketClick} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 animate-fade-in-up">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[2rem] mb-5">
                            <Search size={36} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">No results</h3>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8">
                            {searchTerm ? `No markets match "${searchTerm}"` : 'No markets found in this category.'}
                        </p>
                        <Button
                            variant="outline"
                            className="rounded-2xl uppercase tracking-widest text-[10px] font-black h-11 px-8"
                            onClick={() => { setSearchTerm(''); setCategoryFilter(''); setSortBy('trending'); }}
                        >
                            Clear Filters
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
