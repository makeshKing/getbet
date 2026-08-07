import React from 'react';
import { ChevronRight, Trophy, Landmark, Bitcoin, TrendingUp } from 'lucide-react';
import { Market } from '../types';
import { PromoBanner } from './PromoBanner';
import { TEXT_PRIMARY, TEXT_TERTIARY } from '../lib/theme';

interface SidebarProps {
    markets: Market[];
    onMarketClick: (id: string) => void;
}

interface CategoryRowDef {
    label: string;
    icon: React.FC<{ size?: number; className?: string }>;
    color: string;
}

const CATEGORY_ROWS: CategoryRowDef[] = [
    { label: 'World Cup', icon: Trophy, color: '#3B82F6' },
    { label: 'Elections', icon: Landmark, color: '#8B5CF6' },
    { label: 'Crypto', icon: Bitcoin, color: '#F59E0B' },
    { label: 'Finance', icon: TrendingUp, color: '#10B981' },
];

export const Sidebar: React.FC<SidebarProps> = ({ markets, onMarketClick }) => {
    const featuredMarket = React.useMemo(() => {
        return [...markets].filter(m => m.isTrending && !m.outcome)[0];
    }, [markets]);

    const trending = React.useMemo(() => {
        return [...markets]
            .filter(m => !m.outcome)
            .sort((a, b) => (b.volume || 0) - (a.volume || 0))
            .slice(0, 5)
            .map(m => {
                const yesOutcome = m.outcomes?.find(o => o.name === 'Yes') || m.outcomes?.[0] || { name: 'Yes', probability: m.probability };
                return {
                    id: m.id,
                    title: m.title,
                    context: yesOutcome.name === 'Yes' ? 'Yes' : yesOutcome.name,
                    probability: yesOutcome.probability.toFixed(0)
                };
            });
    }, [markets]);

    const categoryStats = React.useMemo(() => {
        const stats: Record<string, number> = {};
        markets.forEach(m => {
            if (!m.category) return;
            stats[m.category] = (stats[m.category] || 0) + (m.volume || 0);
        });
        
        const formatVol = (cents: number) => {
            const dollars = cents / 100;
            if (dollars >= 1_000_000_000) return '$' + (dollars / 1_000_000_000).toFixed(1) + 'B';
            if (dollars >= 1_000_000) return '$' + (dollars / 1_000_000).toFixed(1) + 'M';
            if (dollars >= 1_000) return '$' + (dollars / 1_000).toFixed(1) + 'K';
            return '$' + dollars.toLocaleString('en-US', { maximumFractionDigits: 0 });
        };

        return [
            { name: 'World Cup', icon: '🏆', color: '#4B8BFF' },
            { name: 'Elections', icon: '🏛', color: '#9B59B6' },
            { name: 'Crypto', icon: '₿', color: '#FFA500' },
            { name: 'Finance', icon: '📈', color: '#00D4AA' },
        ].map(cat => ({
            ...cat,
            volume: stats[cat.name] || 0,
            volumeFormatted: formatVol(stats[cat.name] || 0)
        })).filter(cat => cat.volume > 0);
    }, [markets]);

    const electionsMarkets = React.useMemo(() => {
        return [...markets]
            .filter(m => !m.outcome && m.category === 'Elections')
            .sort((a, b) => (b.volume || 0) - (a.volume || 0))
            .slice(0, 3)
            .map(m => {
                const yesOutcome = m.outcomes?.find(o => o.name === 'Yes') || m.outcomes?.[0] || { name: 'Yes', probability: m.probability };
                return {
                    id: m.id,
                    title: m.title,
                    context: yesOutcome.name === 'Yes' ? 'Yes' : yesOutcome.name,
                    probability: yesOutcome.probability.toFixed(0)
                };
            });
    }, [markets]);

    return (
        <div className="flex flex-col">
            {/* Compact featured promo — no big image */}
            {featuredMarket && (
                <div className="bg-[#15171C] border border-[#22252B] rounded-xl p-4 mb-3 cursor-pointer" onClick={() => onMarketClick(featuredMarket.id)}>
                <p className="text-[#00D4AA] text-xs font-bold uppercase tracking-wide mb-1">
                    Featured
                </p>
                <p className="text-white text-base font-bold mb-1 line-clamp-2">{featuredMarket.title}</p>
                <p className="text-[#9AA0A6] text-xs mb-3 line-clamp-2">{featuredMarket.description || 'Trade on the latest trending market.'}</p>
                <button className="w-full bg-[#00D4AA] text-[#0A0C10] font-bold py-2.5 rounded-xl text-sm hover:bg-[#00D4AA]/90 transition-colors">
                    Trade Now
                </button>
                </div>
            )}

            {/* Category links with colored borders + volume */}
            {categoryStats.map(cat => (
            <div key={cat.name}
                className="bg-[#15171C] border border-[#22252B] rounded-xl px-4 py-3 mb-2
                flex items-center gap-3 cursor-pointer hover:border-white/20 transition-colors"
                style={{ borderLeft: `3px solid ${cat.color}` }}
            >
                <span className="text-xl">{cat.icon}</span>
                <div className="flex-1">
                <p className="text-white text-sm font-bold">{cat.name}</p>
                <p className="text-[#9AA0A6] text-xs">{cat.volumeFormatted} total volume</p>
                </div>
                <span className="text-[#9AA0A6] font-bold text-lg">›</span>
            </div>
            ))}

            <div className="mt-4 mb-2">
            {/* Trending with subtext */}
            {trending.length > 0 && (
                <>
                <h3 className="text-white text-base font-bold mb-3 flex items-center gap-2 cursor-pointer hover:text-white/80">
                    Trending <span className="text-[#00D4AA] text-lg font-bold">›</span>
                </h3>
                {trending.map((t, i) => (
                    <div key={t.id} className="flex items-start gap-3 mb-4 cursor-pointer group" onClick={() => onMarketClick(t.id)}>
                    <span className="text-[#9AA0A6] text-sm font-bold w-4 flex-shrink-0 pt-0.5">{i+1}</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm leading-snug font-medium group-hover:underline">{t.title}</p>
                        <p className="text-[#9AA0A6] text-xs mt-1 truncate">{t.context}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-white text-sm font-bold">{t.probability}%</p>
                    </div>
                    </div>
                ))}
                </>
            )}
            
            {electionsMarkets.length > 0 && (
                <>
                <h3 className="text-white text-base font-bold mt-6 mb-3 flex items-center gap-2 cursor-pointer hover:text-white/80">
                    Politics <span className="text-[#00D4AA] text-lg font-bold">›</span>
                </h3>
                {electionsMarkets.map((t, i) => (
                    <div key={t.id} className="flex items-start gap-3 mb-4 cursor-pointer group" onClick={() => onMarketClick(t.id)}>
                    <span className="text-[#9AA0A6] text-sm font-bold w-4 flex-shrink-0 pt-0.5">{i+1}</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm leading-snug font-medium group-hover:underline">{t.title}</p>
                        <p className="text-[#9AA0A6] text-xs mt-1 truncate">{t.context}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-white text-sm font-bold">{t.probability}%</p>
                    </div>
                    </div>
                ))}
                </>
            )}
            </div>
        </div>
    );
};
