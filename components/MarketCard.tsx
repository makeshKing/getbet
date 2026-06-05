
import React, { memo } from 'react';
import { Market, Side } from '../types';
import { TrendingUp, Swords, Clock, Bookmark, Gift, RefreshCw } from 'lucide-react';

interface MarketCardProps {
    market: Market;
    onClick: (id: string) => void;
}

export const MarketCard: React.FC<MarketCardProps> = memo(({ market, onClick }) => {
    const isVs = market.subcategory === 'Head-to-Head' && market.candidateA && market.candidateB;

    // Calculate percentage for circular gauge
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (market.probability / 100) * circumference;

    const currentPriceYes = market.probability;
    const currentPriceNo = 100 - market.probability;

    return (
        <div
            className="bg-white dark:bg-[#1e293b] rounded-xl p-4 shadow-lg hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-600 border border-slate-200 dark:border-slate-700 transition-all duration-200 cursor-pointer group flex flex-col h-full relative overflow-hidden"
            onClick={() => onClick(market.id)}
        >
            {/* Header Section: Image + Title + Gauge */}
            <div className="flex gap-3 mb-4">
                <div className="relative shrink-0 pt-1">
                    {isVs ? (
                        <div className="flex -space-x-3 items-center">
                            <img
                                src={market.candidateA?.imageUrl}
                                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover bg-slate-100 dark:bg-slate-800"
                                loading="lazy"
                            />
                            <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full p-0.5 border border-slate-200 dark:border-slate-700 z-10">
                                <Swords size={8} strokeWidth={3} />
                            </div>
                            <img
                                src={market.candidateB?.imageUrl}
                                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover bg-slate-100 dark:bg-slate-800"
                                loading="lazy"
                            />
                        </div>
                    ) : (
                        <img
                            src={market.imageUrl}
                            alt={market.title}
                            className="w-10 h-10 rounded-md object-cover bg-slate-100 dark:bg-slate-800"
                            loading="lazy"
                        />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight line-clamp-2 mb-1 tracking-tight">
                        {market.title}
                    </h3>
                </div>

                {/* Probability Gauge or Resolved Status */}
                <div className="shrink-0 flex flex-col items-center justify-start pt-1">
                    {market.outcome ? (
                        <div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-600">
                            <span className="text-[10px] font-black text-slate-900 dark:text-white">{market.outcome}</span>
                        </div>
                    ) : (
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="24"
                                    cy="24"
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    fill="transparent"
                                    className="text-slate-200 dark:text-slate-700"
                                />
                                <circle
                                    cx="24"
                                    cy="24"
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    fill="transparent"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    className="text-emerald-500 transition-all duration-1000 ease-out"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute text-[10px] font-bold text-slate-900 dark:text-white">{market.probability}%</span>
                        </div>
                    )}
                    <span className="text-[9px] text-slate-400 font-bold uppercase">{market.outcome ? 'Ended' : 'Chance'}</span>
                </div>
            </div>

            {/* Action Buttons Section */}
            <div className="mt-auto grid grid-cols-2 gap-2 mb-3">
                {/* YES / Outcome A Button */}
                <div className={`border rounded-md py-1.5 md:py-2 px-2 md:px-3 flex items-center justify-between transition-colors group/btn ${market.outcome === 'YES' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-emerald-50 dark:bg-[#1a3d35] hover:bg-emerald-100 dark:hover:bg-[#1e463d] border-emerald-200 dark:border-emerald-500/30'} ${market.outcome === 'NO' ? 'opacity-30' : ''}`}>
                    <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wide truncate pr-1 md:pr-2 ${market.outcome === 'YES' ? 'text-emerald-700 dark:text-white' : 'text-emerald-600 dark:text-emerald-500'}`}>
                        {isVs ? market.candidateA?.name.split(' ').pop() : 'Yes'}
                    </span>
                </div>

                {/* NO / Outcome B Button */}
                <div className={`border rounded-md py-1.5 md:py-2 px-2 md:px-3 flex items-center justify-between transition-colors group/btn ${market.outcome === 'NO' ? 'bg-red-500/20 border-red-500' : 'bg-slate-50 dark:bg-[#1e293b] hover:bg-slate-100 dark:hover:bg-[#253248] border-slate-200 dark:border-slate-600'} ${market.outcome === 'YES' ? 'opacity-30' : ''}`}>
                    <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wide truncate pr-1 md:pr-2 ${market.outcome === 'NO' ? 'text-red-700 dark:text-white' : 'text-red-600 dark:text-red-500'}`}>
                        {isVs ? market.candidateB?.name.split(' ').pop() : 'No'}
                    </span>
                </div>
            </div>

            {/* Footer Meta */}
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                <div className="flex items-center gap-2">
                    {market.isTrending && (
                        <div className="flex items-center text-amber-500 gap-1 uppercase tracking-wider">
                            <span className="text-[10px] font-black">+ NEW</span>
                        </div>
                    )}
                    <span>${(market.volume / 100).toLocaleString(undefined, { notation: 'compact' }).toLowerCase()} Vol.</span>
                    <RefreshCw size={10} className="ml-1 opacity-50" />
                </div>
                <div className="flex items-center gap-3">
                    <Gift size={12} className="hover:text-slate-800 dark:hover:text-slate-300 transition-colors" />
                    <Bookmark size={12} className="hover:text-slate-800 dark:hover:text-slate-300 transition-colors" />
                </div>
            </div>
        </div>
    );
});

MarketCard.displayName = 'MarketCard';
