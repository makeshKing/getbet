import React, { memo } from 'react';
import { Market, Side } from '../types';
import { TrendingUp, Award, Zap, Radio, Check, Globe2 } from 'lucide-react';
import { ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, categoryAccent } from '../lib/theme';

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
            color: market.candidateA!.color || '#10b981'
        });
        displayOutcomes.push({
            id: 'B',
            name: market.candidateB!.name,
            probability: 100 - market.probability,
            color: market.candidateB!.color || '#3b82f6'
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

    const accent = categoryAccent(market.category);

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`Market: ${market.title}`}
            className={`bg-[#15171C] border border-[#22252B] rounded-xl p-4 flex flex-col relative group
                ${market.status === 'resolved' || isResolved
                    ? 'opacity-70 grayscale-[20%] cursor-not-allowed'
                    : 'hover:border-white/20 transition-colors duration-200 cursor-pointer'
                }`}
            onClick={() => {
                if (market.status === 'resolved' || isResolved) return;
                onClick(market.id);
            }}
            onKeyDown={(e) => {
                if (market.status === 'resolved' || isResolved) return;
                if (e.key === 'Enter' || e.key === ' ') onClick(market.id);
            }}
        >
            {/* Lock overlay — only shows on resolved cards on hover */}
            {(market.status === 'resolved' || isResolved) && (
                <div className="absolute inset-0 z-10 rounded-xl flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-all duration-200">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-8 h-8 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        <span className="text-white text-xs font-bold uppercase tracking-wide">
                            Market Closed
                        </span>
                    </div>
                </div>
            )}
            
            {/* Category */}
            <div className="flex items-center gap-2 mb-2">
                {market.imageUrl ? (
                    <img
                        src={market.imageUrl}
                        alt={market.category}
                        className="w-4 h-4 rounded object-cover"
                    />
                ) : null}
                <p className="text-[#9AA0A6] text-[10px] font-medium uppercase tracking-widest">
                    {market.subcategory || market.category || 'Market'}
                </p>
                {(market.status === 'resolved' || isResolved) && (
                    <span className="ml-auto text-[#9AA0A6] text-[10px] font-medium uppercase">
                        RESOLVED
                    </span>
                )}
            </div>

            {/* Title */}
            <h3 className="text-white text-sm font-bold leading-snug mb-3 line-clamp-2 min-h-[40px]">
                {market.title}
            </h3>

            {/* Outcomes — max 2 */}
            <div className="flex-1">
                {displayOutcomes.slice(0, 2).map((outcome, idx, arr) => {
                    const payout = outcome.probability > 0 ? (100 / outcome.probability).toFixed(2) : '0.00';
                    const isWinning = isResolved && (
                        (market.outcome === 'YES' && outcome.id === 'A') ||
                        (market.outcome === 'NO' && outcome.id === 'B') ||
                        (market.outcome === 'YES' && outcome.id === 'YES') ||
                        (market.outcome === 'NO' && outcome.id === 'NO') ||
                        (market.outcome === outcome.id)
                    );
                    
                    const isNo = outcome.name.toLowerCase() === 'no';
                    const isYes = outcome.name.toLowerCase() === 'yes';
                    const oddsColor = isWinning ? '#00D4AA' : (isNo ? '#FF4757' : '#00D4AA');

                    return (
                        <div key={outcome.id}
                            className={`flex items-center justify-between py-1.5 ${idx < arr.length - 1 ? 'border-b border-[#22252B]' : ''}`}>
                            
                            <span className="text-white text-sm flex-1 truncate pr-2">{outcome.name}</span>
                            
                            {!isResolved && (
                                <span className="text-[#9AA0A6] text-xs mx-3">{payout}x</span>
                            )}
                            
                            <span 
                                className={`border text-xs font-bold px-2 py-0.5 rounded-full transition-all duration-150
                                    ${isWinning ? 'bg-[#00D4AA] text-[#0A0C10] border-[#00D4AA]' : ''}`}
                                style={!isWinning ? { color: oddsColor, borderColor: oddsColor } : {}}
                            >
                                {isWinning ? <Check size={12} /> : `${Math.round(outcome.probability)}%`}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-3">
                <span className="text-[#9AA0A6] text-xs">{fmt(market.volume)} vol</span>
                <span className="text-[#9AA0A6] text-xs">{market.outcomes && market.outcomes.length > 0 ? `${market.outcomes.length} markets` : `2 markets`}</span>
            </div>
        </div>
    );
});

MarketCard.displayName = 'MarketCard';
