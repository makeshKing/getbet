import React from 'react';
import { Market } from '../types';
import { X } from 'lucide-react';

interface PromoBannerProps {
    featuredMarket?: Market;
    onClick?: (id: string) => void;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({ featuredMarket, onClick }) => {
    return (
        <div 
            className="relative rounded-2xl border border-[#16332a] bg-gradient-to-b from-[#0B0F19] to-[#0A1B16] overflow-hidden p-6 flex flex-col items-center text-center cursor-pointer hover:border-[#1e4438] transition-all group" 
            onClick={() => featuredMarket && onClick && onClick(featuredMarket.id)}
        >
            <button className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-20" onClick={(e) => e.stopPropagation()}>
                <X size={16} />
            </button>
            {/* Abstract 3D graphic using CSS styling with animations */}
            <div className="w-full h-32 mb-4 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent opacity-60"></div>
                {/* Animated Abstract rings */}
                <div className="absolute w-40 h-20 border-[2px] border-emerald-500/30 rounded-[100%] animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute w-40 h-20 border-[2px] border-emerald-500/40 rounded-[100%] animate-[spin_15s_linear_infinite_reverse]"></div>
                <div className="absolute w-40 h-20 border-[2px] border-emerald-500/50 rounded-[100%] animate-[spin_12s_linear_infinite]"></div>
                <div className="absolute w-40 h-20 border-[2px] border-emerald-500/40 rounded-[100%] animate-[spin_20s_linear_infinite_reverse]"></div>
                <div className="absolute w-40 h-20 border-[2px] border-emerald-500/30 rounded-[100%] animate-[spin_8s_linear_infinite]"></div>
            </div>
            
            {featuredMarket ? (
                <>
                    <div className="flex items-center gap-2 mb-2 z-10">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-black tracking-widest uppercase">Featured Promo</span>
                    </div>
                    <h3 className="text-lg font-black text-white mb-2 tracking-tight z-10 line-clamp-2">{featuredMarket.title}</h3>
                    <p className="text-[11px] font-bold text-slate-400 leading-relaxed mb-6 px-4 z-10 line-clamp-3">
                        {featuredMarket.description || `Trade now on ${featuredMarket.title}.`}
                    </p>
                    <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0A1B16] font-black text-sm py-3 rounded-xl transition-colors z-10">
                        Trade Now
                    </button>
                </>
            ) : (
                <>
                    <h3 className="text-xl font-black text-white mb-2 tracking-tight z-10">Intro to Perpetuals</h3>
                    <p className="text-[11px] font-bold text-slate-400 leading-relaxed mb-6 px-4 z-10">
                        Trade with leverage, go long or short, and keep your position open without an expiration date. 0% fees for a limited time
                    </p>
                    <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0A1B16] font-black text-sm py-3 rounded-xl transition-colors z-10">
                        Get started
                    </button>
                </>
            )}
        </div>
    );
};
