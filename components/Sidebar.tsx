import React, { useMemo } from 'react';
import { ChevronRight, Globe2, Flag, ArrowUp, ArrowDown } from 'lucide-react';
import { Market } from '../types';
import { PromoBanner } from './PromoBanner';

interface SidebarProps {
    markets: Market[];
    onMarketClick: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ markets, onMarketClick }) => {
    
    // Derived market lists for the sidebar
    const trendingMarkets = useMemo(() => {
        return [...markets].filter(m => m.isTrending && !m.outcome).slice(0, 3);
    }, [markets]);

    const newestMarkets = useMemo(() => {
        return [...markets].filter(m => !m.outcome).sort((a, b) => new Date(b.startDate || b.closeDate).getTime() - new Date(a.startDate || a.closeDate).getTime()).slice(0, 3);
    }, [markets]);

    const topMovers = useMemo(() => {
        // Mock top movers by randomly selecting from high volume markets
        return [...markets].filter(m => !m.outcome).sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 3);
    }, [markets]);

    const primariesMarkets = useMemo(() => {
        return [...markets].filter(m => !m.outcome && m.category === 'Politics').slice(0, 3);
    }, [markets]);

    return (
        <div className="flex flex-col gap-6">
            
            {/* Promo Banner */}
            <PromoBanner featuredMarket={trendingMarkets[0]} onClick={onMarketClick} />

            {/* Quick Links */}
            <div className="flex flex-col gap-3">
                <button className="flex items-center justify-between p-4 rounded-xl border border-blue-500/30 bg-blue-900/10 hover:bg-blue-900/20 transition-colors group">
                    <div className="flex items-center gap-3 text-blue-400">
                        <Globe2 size={20} />
                        <span className="font-black text-white tracking-tight">World Cup</span>
                    </div>
                    <ChevronRight size={16} className="text-blue-500 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="flex items-center justify-between p-4 rounded-xl border border-red-500/30 bg-red-900/10 hover:bg-red-900/20 transition-colors group">
                    <div className="flex items-center gap-3 text-red-500">
                        <Flag size={20} />
                        <span className="font-black text-white tracking-tight">2026 Elections</span>
                    </div>
                    <ChevronRight size={16} className="text-red-500 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Sidebar Lists */}
            <SidebarList title="Trending" markets={trendingMarkets} onClick={onMarketClick} />
            <SidebarList title="2026 Primaries" markets={primariesMarkets} onClick={onMarketClick} />
            <SidebarList title="Top movers" markets={topMovers} onClick={onMarketClick} showChange={true} isRedChange={true} />
            <SidebarList title="New" markets={newestMarkets} onClick={onMarketClick} />

        </div>
    );
};

// ── Internal Component: SidebarList ── //

interface SidebarListProps {
    title: string;
    markets: Market[];
    onClick: (id: string) => void;
    showChange?: boolean;
    isRedChange?: boolean;
}

const SidebarList: React.FC<SidebarListProps> = ({ title, markets, onClick, showChange = true, isRedChange = false }) => {
    if (markets.length === 0) return null;

    return (
        <div className="flex flex-col">
            <h3 className="text-[17px] font-black text-white flex items-center gap-1 mb-4 cursor-pointer hover:text-indigo-400 transition-colors">
                {title} <ChevronRight size={16} className="text-emerald-500" />
            </h3>
            <div className="flex flex-col gap-4">
                {markets.map((market, index) => {
                    const prob = market.probability || 50; // default for mock
                    const mockChange = Math.floor(Math.random() * 20) + 1; // 1-20
                    const changeColor = isRedChange ? 'text-[#FF4D4D]' : 'text-[#00D964]';
                    const ChangeIcon = isRedChange ? ArrowDown : ArrowUp;

                    // Extrapolate a subtext if not provided
                    const subtext = market.subcategory || market.category || 'Event';
                    
                    return (
                        <div 
                            key={market.id} 
                            className="flex items-start gap-4 group cursor-pointer"
                            onClick={() => onClick(market.id)}
                        >
                            <span className="text-sm font-black text-slate-500 w-3 shrink-0 pt-0.5">{index + 1}</span>
                            <div className="flex-1 min-w-0 pr-2">
                                <h4 className="text-[13px] font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors line-clamp-2 capitalize">
                                    {market.title}
                                </h4>
                                <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                                    {subtext}
                                </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0 pt-0.5">
                                <span className="text-xs font-black text-white">{prob}%</span>
                                {showChange && (
                                    <div className={`flex items-center text-[10px] font-black ${changeColor} mt-0.5`}>
                                        <ChangeIcon size={10} strokeWidth={3} /> {mockChange}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="border-b border-slate-800 mt-6"></div>
        </div>
    );
};
