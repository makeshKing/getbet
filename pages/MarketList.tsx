import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MarketCard } from '../components/MarketCard';
import { FeaturedMarketCarousel, MarketSlide } from '../components/FeaturedMarketCarousel';
import { Sidebar } from '../components/Sidebar';
import { Button } from '../components/ui/Button';
import {
    Search, ArrowUpDown, TrendingUp, Clock, BarChart3,
    Check, Zap, Flame, Globe2, Bitcoin, Trophy, Landmark, FlaskConical,
    Music, Tag, Star, Shield, Target, Rocket, Crown, Heart, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '../lib/theme';

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
    const [featuredIndex, setFeaturedIndex] = useState(0);

    const { markets, categories } = useApp();

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

    // Separate featured markets (top trending)
    const featuredMarkets = useMemo(() => {
        return [...markets].filter(m => !m.outcome && m.isTrending).sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 5);
    }, [markets]);

    const carouselSlides: MarketSlide[] = useMemo(() => {
        return featuredMarkets.map(m => {
            const isVs = m.subcategory === 'Head-to-Head' && m.candidateA && m.candidateB;
            const isMultiOutcome = !isVs && m.outcomes && m.outcomes.length > 0;
            
            const outcomes = [];
            if (isVs) {
                outcomes.push({ name: m.candidateA!.name, icon: m.candidateA!.imageUrl, payoutMultiplier: m.probability > 0 ? 100/m.probability : 0, probability: m.probability, color: m.candidateA!.color || '#ef4444' });
                outcomes.push({ name: m.candidateB!.name, icon: m.candidateB!.imageUrl, payoutMultiplier: (100 - m.probability) > 0 ? 100/(100-m.probability) : 0, probability: 100 - m.probability, color: m.candidateB!.color || '#3b82f6' });
            } else if (isMultiOutcome) {
                const colors = ['#4B9EFF', '#FF4444', '#C8CCD0', '#9B6FFF', '#00CC88', '#FF8C42'];
                m.outcomes!.slice(0, 3).forEach((o, i) => {
                    outcomes.push({ name: o.name, payoutMultiplier: o.probability > 0 ? 100/o.probability : 0, probability: o.probability, color: colors[i % colors.length] });
                });
            } else {
                outcomes.push({ name: 'Yes', payoutMultiplier: m.probability > 0 ? 100/m.probability : 0, probability: m.probability, color: '#00E5CC' });
                outcomes.push({ name: 'No', payoutMultiplier: (100 - m.probability) > 0 ? 100/(100-m.probability) : 0, probability: 100 - m.probability, color: '#FF4444' });
            }

            // Real date labels spanning ~Jun 18 → Jun 25
            const chartData = [];
            const baseDate = new Date(2026, 5, 18, 0, 0, 0, 0);
            for (let i = 0; i <= 30; i++) {
                const point: any = { date: format(new Date(baseDate.getTime() + i * 6 * 3600 * 1000), 'MMM d') };
                const progress = i / 30;
                outcomes.forEach(o => {
                    const target = o.probability;
                    const noise = (Math.random() - 0.5) * 20 * (1 - progress);
                    const startPoint = Math.max(0, Math.min(100, target + (Math.random() - 0.5) * 40));
                    let val = startPoint + (target - startPoint) * progress + noise;
                    if (i === 30) val = target;
                    point[o.name] = Math.max(0, Math.min(100, val));
                });
                chartData.push(point);
            }

            const catIcon = resolveIcon(CATEGORIES.find(c => c.id === m.category)?.icon as any);
            const IconComponent = catIcon as any;

            return {
                id: m.id,
                category: { label: m.category || 'Market', icon: <IconComponent size={14} /> },
                title: m.title,
                outcomes,
                chartData,
                news: m.description,
                volume: m.volume || 0,
                marketCount: m.outcomes ? m.outcomes.length : 2
            };
        });
    }, [featuredMarkets, CATEGORIES]);

    const currentSort = SORT_OPTIONS.find(o => o.id === sortBy);

    const handleNextFeatured = () => {
        setFeaturedIndex((prev) => (prev + 1) % featuredMarkets.length);
    };

    const handlePrevFeatured = () => {
        setFeaturedIndex((prev) => (prev - 1 + featuredMarkets.length) % featuredMarkets.length);
    };

    // Group filtered markets by category for rendering sections
    const marketsByCategory = useMemo(() => {
        const grouped: Record<string, typeof markets> = {};
        filteredMarkets.forEach(m => {
            if (!grouped[m.category]) grouped[m.category] = [];
            grouped[m.category].push(m);
        });
        return grouped;
    }, [filteredMarkets]);

    const showFeatured = featuredMarkets.length > 0 && !searchTerm && !categoryFilter && filterStatus === 'active';

    return (
        <div className="min-h-screen pb-24 bg-[#0A0C10]">

            {/* ── Sticky Controls Bar ── */}
            <div className="sticky top-14 z-30 border-b border-[#1F2937] bg-[#0A0C10]/90 backdrop-blur-xl">
                <div className="max-w-[1300px] mx-auto px-4 md:px-6">
                    <div className="flex items-center gap-2 py-3">
                        <label htmlFor="market-search" className="sr-only">Search markets</label>
                        <div className="relative flex-1 min-w-0 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={15} />
                            <input
                                id="market-search"
                                type="text"
                                placeholder="Search markets..."
                                className="w-full pl-9 pr-4 py-2 bg-[#111827] border border-transparent focus:border-indigo-500/50 rounded-xl text-sm focus:outline-none text-white placeholder-slate-500 font-bold transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Removed active/resolved toggle as regular users should never see resolved markets */}
                        <div className="hidden bg-[#111827] rounded-xl p-0.5 border border-slate-800/80 shrink-0" role="group">
                            <button className="px-3 py-1.5 rounded-[10px] text-xs font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm">
                                ACTIVE
                            </button>
                        </div>

                        <div className="relative shrink-0 ml-auto">
                            <button
                                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                                    isSortMenuOpen
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-[#111827] text-slate-300 border-slate-800/80 hover:border-slate-700'
                                }`}
                            >
                                <ArrowUpDown size={13} />
                                <span className="hidden sm:inline">{currentSort?.label || 'Sort'}</span>
                            </button>

                            {isSortMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsSortMenuOpen(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-52 bg-[#111827] rounded-2xl shadow-2xl border border-slate-800 py-2 z-50 overflow-hidden">
                                        <div className="px-4 py-2 border-b border-slate-800/80 mb-1">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sort By</span>
                                        </div>
                                        {SORT_OPTIONS.map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => { setSortBy(option.id); setIsSortMenuOpen(false); }}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold transition-colors ${
                                                    sortBy === option.id
                                                        ? 'bg-indigo-500/20 text-indigo-400'
                                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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

                    <div className="flex gap-2 pb-3 overflow-x-auto no-scrollbar">
                        {CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            const active = categoryFilter === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategoryFilter(cat.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-150 border shrink-0 ${
                                        active
                                            ? 'bg-[#00D4AA] text-[#0A0C10] border-[#00D4AA]'
                                            : 'bg-transparent text-[#9CA3AF] border-[#1F2937] hover:text-[#F9FAFB]'
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
            <div className="max-w-[1300px] mx-auto px-0 md:px-6 pt-1 md:pt-3 pb-6">
                

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
                    
                    {/* ── Left Column: Main Content ── */}
                    <div className="space-y-4 md:space-y-8 min-w-0">
                        {/* ── Featured Section ── */}
                        {showFeatured && carouselSlides.length > 0 && (
                            <div className="space-y-2 md:space-y-4">
                                <div className="w-full max-w-full overflow-hidden px-0">
                                <FeaturedMarketCarousel
                                    slides={carouselSlides}
                                    onSelectMarket={onMarketClick}
                                />
                                </div>

                                {/* Informational Cards */}
                                <div className="grid grid-cols-2 gap-2 md:gap-3 px-4 md:px-0">
                                    <div className="bg-[#15171C] border border-[#22252B] rounded-xl p-3 flex flex-col gap-1.5 cursor-pointer hover:border-white/20 transition-colors">
                                        <span className="text-[#00D4AA]"><Landmark size={18} /></span>
                                        <div className="flex items-center justify-between">
                                            <p className="text-white text-xs font-bold leading-tight">Markets over Monopolies</p>
                                        </div>
                                        <p className="text-[#9AA0A6] text-[10px] leading-snug">Fair markets protect consumers</p>
                                    </div>
                                    <div className="bg-[#15171C] border border-[#22252B] rounded-xl p-3 flex flex-col gap-1.5 cursor-pointer hover:border-white/20 transition-colors">
                                        <span className="text-[#00D4AA]"><Shield size={18} /></span>
                                        <div className="flex items-center justify-between">
                                            <p className="text-white text-xs font-bold leading-tight">Responsible trading</p>
                                        </div>
                                        <p className="text-[#9AA0A6] text-[10px] leading-snug">Tools and tips for trading smart</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Market Grids Grouped by Category ── */}
                        {filteredMarkets.length > 0 ? (
                            <div className="space-y-10 px-4 md:px-0">
                                {Object.entries(marketsByCategory).map(([category, catMarkets]) => (
                                    <div key={category} className="space-y-4">
                                        <h2 className="text-xl font-bold flex items-center gap-1 cursor-pointer hover:text-[#00D4AA] transition-colors duration-150 w-max tracking-tight" style={{ color: TEXT_PRIMARY }}>
                                            {category} <ChevronRight size={20} style={{ color: ACCENT }} />
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {catMarkets.map((market) => (
                                                <MarketCard key={market.id} market={market} onClick={onMarketClick} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-24">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-[#111827] rounded-[2rem] mb-5 border border-slate-800">
                                    <Search size={36} className="text-slate-600" />
                                </div>
                                <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">No results</h3>
                                <p className="text-sm font-medium text-slate-500 mb-8">
                                    {searchTerm ? `No markets match "${searchTerm}"` : 'No markets found in this category.'}
                                </p>
                                <Button
                                    variant="outline"
                                    className="rounded-xl uppercase tracking-widest text-[10px] font-black h-11 px-8 border-slate-700 text-white hover:bg-slate-800"
                                    onClick={() => { setSearchTerm(''); setCategoryFilter(''); setSortBy('trending'); }}
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* ── Right Column: Sidebar ── */}
                    <div className="mt-8 xl:mt-0 xl:block">
                        <div className="sticky top-40">
                            <Sidebar markets={markets} onMarketClick={onMarketClick} />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
