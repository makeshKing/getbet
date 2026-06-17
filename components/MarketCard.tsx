import React, { memo } from 'react';
import { Market, Side } from '../types';
import { TrendingUp, Award, Zap, Radio, Check, Globe2 } from 'lucide-react';

interface MarketCardProps {
    market: Market;
    onClick: (id: string) => void;
}

const fmt = (cents: number) => {
    const dollars = cents / 100;
    if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}m`;
    if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}k`;
    return `$${dollars.toFixed(0)}`;
};

export const MarketCard: React.FC<MarketCardProps> = memo(({ market, onClick }) => {
    const isVs = market.subcategory === 'Head-to-Head' && market.candidateA && market.candidateB;
    const isMultiOutcome = !isVs && market.outcomes && market.outcomes.length > 0;
    const isResolved = !!market.outcome;

    // Compute display outcomes
    const displayOutcomes: { id: string, name: string, probability: number, color: string }[] = [];
    if (isVs) {
        displayOutcomes.push({
            id: 'A',
            name: market.candidateA!.name,
            probability: market.probability,
            color: market.candidateA!.color || '#10b981' // emerald-500
        });
        displayOutcomes.push({
            id: 'B',
            name: market.candidateB!.name,
            probability: 100 - market.probability,
            color: market.candidateB!.color || '#3b82f6' // blue-500
        });
    } else if (isMultiOutcome) {
        market.outcomes!.slice(0, 3).forEach(o => {
            displayOutcomes.push({
                id: o.id,
                name: o.name,
                probability: o.probability,
                color: o.color || '#10b981'
            });
        });
    } else {
        // Binary
        displayOutcomes.push({
            id: 'YES',
            name: 'Yes',
            probability: market.probability,
            color: '#10b981'
        });
        displayOutcomes.push({
            id: 'NO',
            name: 'No',
            probability: 100 - market.probability,
            color: '#3b82f6'
        });
    }

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`Market: ${market.title}`}
            className="bg-[#15171C] rounded-xl border border-[#22252B] p-4 shadow-sm hover:border-slate-600 transition-all duration-200 cursor-pointer flex flex-col h-full relative"
            onClick={() => onClick(market.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(market.id); }}
        >
            {/* Header: Category / Tag */}
            <div className="flex items-center gap-2 mb-3">
                {market.imageUrl ? (
                    <img 
                        src={market.imageUrl} 
                        alt={market.category}
                        className="w-5 h-5 rounded object-cover"
                    />
                ) : (
                    <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-slate-400">
                        <Globe2 size={12} />
                    </div>
                )}
                <span className="text-[11px] font-bold text-[#9AA0A6] uppercase tracking-widest">
                    {market.subcategory || market.category || 'Market'}
                </span>
                
                {isResolved && (
                     <span className="ml-auto text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Award size={10} /> Resolved
                     </span>
                )}
            </div>

            {/* Title */}
            <h3 className="text-[15px] font-bold text-white mb-4 leading-tight tracking-tight min-h-[44px] capitalize">
                {market.title}
            </h3>

            {/* Outcomes */}
            <div className="space-y-3 flex-1">
                {displayOutcomes.map((outcome) => {
                    const payout = outcome.probability > 0 ? (100 / outcome.probability).toFixed(2) : '0.00';
                    const isWinning = isResolved && (
                        (market.outcome === 'YES' && outcome.id === 'A') ||
                        (market.outcome === 'NO' && outcome.id === 'B') ||
                        (market.outcome === 'YES' && outcome.id === 'YES') ||
                        (market.outcome === 'NO' && outcome.id === 'NO') ||
                        (market.outcome === outcome.id)
                    );
                    
                    const pcolor = isWinning ? '#10b981' : outcome.color;

                    return (
                        <div key={outcome.id} className="flex items-center justify-between group">
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="text-[13px] font-bold text-slate-200 mb-1 truncate group-hover:text-white transition-colors">
                                    {outcome.name}
                                </div>
                                <div className="h-0.5 rounded-full bg-slate-800/50 w-full relative overflow-hidden">
                                    <div 
                                        className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out" 
                                        style={{ width: `${outcome.probability}%`, backgroundColor: pcolor }}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {!isResolved && (
                                    <div className="text-[11px] font-bold text-[#9AA0A6] w-8 text-right">
                                        {payout}x
                                    </div>
                                )}
                                <div className={`inline-flex items-center justify-center min-w-[44px] h-6 px-1.5 rounded-full border text-[11px] font-black tracking-tight ${isWinning ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-emerald-500/50 text-emerald-400 bg-emerald-900/10'}`}>
                                    {isWinning ? <Check size={12} /> : `${outcome.probability}%`}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-800/50">
                <div className="flex items-center gap-2">
                    {market.isTrending && !isResolved && (
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">NEW</span>
                    )}
                </div>
                <div className="text-[10px] font-bold text-[#9AA0A6]">
                    {market.outcomes && market.outcomes.length > 0 ? `${market.outcomes.length} markets` : `${fmt(market.volume)} vol`}
                </div>
            </div>
        </div>
    );
});

MarketCard.displayName = 'MarketCard';
