
import React, { memo } from 'react';
import { Market, Side } from '../types';
import { TrendingUp, RefreshCw, Bookmark, Gift, Zap, Radio, Award } from 'lucide-react';

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
    const isBinary = !isVs && !isMultiOutcome;

    // Circular gauge
    const gaugeRadius = 20;
    const gaugeCx = 26;
    const gaugeCy = 26;
    const gaugeCircumference = 2 * Math.PI * gaugeRadius;
    const gaugeOffset = gaugeCircumference - (market.probability / 100) * gaugeCircumference;

    // Color for probability gauge
    const prob = market.probability;
    const gaugeColor = prob >= 60 ? '#10b981' : prob >= 40 ? '#f59e0b' : '#ef4444';

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`Market: ${market.title}`}
            className="bg-white dark:bg-[#161b2e] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all duration-200 cursor-pointer group flex flex-col h-full relative overflow-hidden"
            onClick={() => onClick(market.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(market.id); }}
        >
            {/* Trending / Live / New badge */}
            {(market.isTrending || isResolved) && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                    {isResolved ? (
                        <span className="flex items-center gap-1 bg-slate-700/80 text-slate-200 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-slate-600/50">
                            <Award size={8} /> Resolved
                        </span>
                    ) : market.isTrending && (
                        <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-500/20">
                            <Zap size={8} /> New
                        </span>
                    )}
                </div>
            )}

            {/* LIVE indicator */}
            {!isResolved && market.isTrending && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1 text-red-500">
                    <Radio size={9} className="animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Live</span>
                </div>
            )}

            <div className="p-4 flex flex-col h-full">

                {/* ── Header: Image + Title + Gauge ── */}
                <div className="flex items-start gap-3 mb-4 pt-2">
                    {/* Image(s) */}
                    <div className="shrink-0">
                        {isVs ? (
                            <div className="flex -space-x-2.5 items-center">
                                <img
                                    src={market.candidateA?.imageUrl}
                                    className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-800 object-cover bg-slate-100 dark:bg-slate-700 shadow-sm"
                                    loading="lazy"
                                    alt={market.candidateA?.name}
                                />
                                <img
                                    src={market.candidateB?.imageUrl}
                                    className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-800 object-cover bg-slate-100 dark:bg-slate-700 shadow-sm"
                                    loading="lazy"
                                    alt={market.candidateB?.name}
                                />
                            </div>
                        ) : (
                            <img
                                src={market.imageUrl}
                                alt={market.title}
                                className="w-9 h-9 rounded-xl object-cover bg-slate-100 dark:bg-slate-700 shadow-sm"
                                loading="lazy"
                            />
                        )}
                    </div>

                    {/* Title */}
                    <h3 className="flex-1 min-w-0 text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight line-clamp-2 tracking-tight">
                        {market.title}
                    </h3>

                    {/* Probability gauge — only for binary non-vs markets */}
                    {isBinary && (
                        <div className="shrink-0 flex flex-col items-center">
                            <div className="relative w-[52px] h-[52px] flex items-center justify-center">
                                <svg viewBox="0 0 52 52" width="52" height="52" className="absolute inset-0 -rotate-90">
                                    <circle cx={gaugeCx} cy={gaugeCy} r={gaugeRadius} fill="none" stroke="currentColor" strokeWidth="3.5" className="text-slate-100 dark:text-slate-700/70" />
                                    <circle
                                        cx={gaugeCx} cy={gaugeCy} r={gaugeRadius}
                                        fill="none"
                                        stroke={isResolved ? '#6366f1' : gaugeColor}
                                        strokeWidth="3.5"
                                        strokeDasharray={gaugeCircumference}
                                        strokeDashoffset={isResolved ? 0 : gaugeOffset}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                                    />
                                </svg>
                                <div className="flex flex-col items-center z-10">
                                    <span className="text-[11px] font-black text-slate-900 dark:text-white leading-none">
                                        {isResolved ? market.outcome : `${market.probability}%`}
                                    </span>
                                    {!isResolved && (
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Up</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Outcome Rows ── */}
                <div className="space-y-1.5 flex-1 mb-3">
                    {/* Head-to-Head: show candidate buttons */}
                    {isVs ? (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                className={`flex items-center justify-center py-2 px-3 rounded-xl text-sm font-black transition-all border-2 ${
                                    market.outcome === 'YES'
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                } ${market.outcome === 'NO' ? 'opacity-25' : ''}`}
                                onClick={(e) => { e.stopPropagation(); onClick(market.id); }}
                                aria-label={`Buy ${market.candidateA?.name}`}
                            >
                                {market.candidateA?.name.split(' ').slice(-1)[0]}
                            </button>
                            <button
                                className={`flex items-center justify-center py-2 px-3 rounded-xl text-sm font-black transition-all border-2 ${
                                    market.outcome === 'NO'
                                        ? 'bg-red-500 border-red-500 text-white'
                                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/40 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'
                                } ${market.outcome === 'YES' ? 'opacity-25' : ''}`}
                                onClick={(e) => { e.stopPropagation(); onClick(market.id); }}
                                aria-label={`Buy ${market.candidateB?.name}`}
                            >
                                {market.candidateB?.name.split(' ').slice(-1)[0]}
                            </button>
                        </div>
                    ) : isMultiOutcome ? (
                        /* Multi-outcome: list top outcomes with probability + Yes/No buttons */
                        <>
                            {market.outcomes!.slice(0, 3).map((outcome, idx) => (
                                <div
                                    key={outcome.id}
                                    className="flex items-center gap-2 group/row px-1 py-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); onClick(market.id); }}
                                >
                                    {/* Outcome name */}
                                    <span className="flex-1 min-w-0 text-xs font-bold text-slate-700 dark:text-slate-300 truncate leading-tight">
                                        {outcome.name}
                                    </span>
                                    {/* Probability */}
                                    <span className={`text-xs font-black w-10 text-right tabular-nums ${
                                        outcome.probability >= 60 ? 'text-emerald-500' :
                                        outcome.probability >= 30 ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'
                                    }`}>
                                        {outcome.probability}%
                                    </span>
                                    {/* Yes/No pill buttons */}
                                    <div className="flex gap-1 shrink-0">
                                        <button
                                            className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-md border border-emerald-200/70 dark:border-emerald-700/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors uppercase tracking-wide"
                                            aria-label={`Yes on ${outcome.name}`}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            className="px-2 py-0.5 bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 text-[10px] font-black rounded-md border border-red-200/70 dark:border-red-700/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors uppercase tracking-wide"
                                            aria-label={`No on ${outcome.name}`}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {market.outcomes!.length > 3 && (
                                <div className="text-[10px] font-bold text-slate-400 px-1 mt-1">
                                    +{market.outcomes!.length - 3} more outcomes
                                </div>
                            )}
                        </>
                    ) : (
                        /* Binary (YES/NO) market */
                        <>
                            {/* Yes row */}
                            <div className="flex items-center gap-2 px-1 py-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <span className="flex-1 text-xs font-bold text-slate-700 dark:text-slate-300">Yes</span>
                                <span className={`text-xs font-black w-10 text-right tabular-nums ${
                                    market.probability >= 60 ? 'text-emerald-500' :
                                    market.probability >= 30 ? 'text-amber-500' : 'text-slate-400'
                                }`}>
                                    {market.probability}%
                                </span>
                                <div className="flex gap-1 shrink-0">
                                    <button
                                        className={`px-2 py-0.5 text-[10px] font-black rounded-md border uppercase tracking-wide transition-colors ${
                                            market.outcome === 'YES'
                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-700/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                                        } ${market.outcome === 'NO' ? 'opacity-30' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); onClick(market.id); }}
                                        aria-label="Buy Yes"
                                    >
                                        Yes
                                    </button>
                                    <button
                                        className={`px-2 py-0.5 text-[10px] font-black rounded-md border uppercase tracking-wide transition-colors ${
                                            market.outcome === 'NO'
                                                ? 'bg-red-500 border-red-500 text-white'
                                                : 'bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 border-red-200/70 dark:border-red-700/30 hover:bg-red-100 dark:hover:bg-red-900/50'
                                        } ${market.outcome === 'YES' ? 'opacity-30' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); onClick(market.id); }}
                                        aria-label="Buy No"
                                    >
                                        No
                                    </button>
                                </div>
                            </div>

                            {/* No row */}
                            <div className="flex items-center gap-2 px-1 py-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <span className="flex-1 text-xs font-bold text-slate-700 dark:text-slate-300">No</span>
                                <span className={`text-xs font-black w-10 text-right tabular-nums ${
                                    (100 - market.probability) >= 60 ? 'text-emerald-500' :
                                    (100 - market.probability) >= 30 ? 'text-amber-500' : 'text-slate-400'
                                }`}>
                                    {100 - market.probability}%
                                </span>
                                <div className="flex gap-1 shrink-0">
                                    <button
                                        className={`px-2 py-0.5 text-[10px] font-black rounded-md border uppercase tracking-wide transition-colors ${
                                            market.outcome === 'NO'
                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-700/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                                        } ${market.outcome === 'YES' ? 'opacity-30' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); onClick(market.id); }}
                                        aria-label="Buy Yes (on No)"
                                    >
                                        Yes
                                    </button>
                                    <button
                                        className={`px-2 py-0.5 text-[10px] font-black rounded-md border uppercase tracking-wide transition-colors ${
                                            market.outcome === 'YES'
                                                ? 'bg-red-500 border-red-500 text-white'
                                                : 'bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 border-red-200/70 dark:border-red-700/30 hover:bg-red-100 dark:hover:bg-red-900/50'
                                        } ${market.outcome === 'NO' ? 'opacity-30' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); onClick(market.id); }}
                                        aria-label="Buy No (on No)"
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/70 text-[10px] font-bold text-slate-400 mt-auto">
                    <div className="flex items-center gap-2">
                        {market.isTrending && !isResolved && (
                            <span className="text-amber-500 font-black uppercase tracking-widest">+ New</span>
                        )}
                        <span className="flex items-center gap-1 text-slate-400">
                            {fmt(market.volume)} Vol.
                            <RefreshCw size={9} className="opacity-40" />
                        </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                            aria-label="Gift / Reward"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Gift size={11} />
                        </button>
                        <button
                            className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                            aria-label="Save market"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Bookmark size={11} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

MarketCard.displayName = 'MarketCard';
