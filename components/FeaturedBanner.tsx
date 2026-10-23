
import React, { useMemo } from 'react';
import { Market } from '../types';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface FeaturedBannerProps {
  market: Market;
  onClick: (id: string) => void;
}

export const FeaturedBanner: React.FC<FeaturedBannerProps> = ({ market, onClick }) => {
  // Mock data for the chart to match the visual style (multi-line)
  const data = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      name: i,
      value1: 45 + Math.random() * 10 + (i > 25 ? 10 : 0), // Green line
      value2: 40 + Math.random() * 5, // Blue line
      value3: 35 + Math.random() * 8, // Black line
    }));
  }, []);

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden group mb-8">
      
      {/* Brand Watermark */}
      <div className="absolute top-6 right-6 text-kalshi-green font-bold text-xl tracking-tight opacity-100 select-none pointer-events-none">
          Kalshi
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Content */}
        <div className="lg:col-span-5 flex flex-col h-full relative z-10">
            <div className="flex items-start gap-5 mb-8">
                <img 
                    src={market.imageUrl} 
                    alt={market.title} 
                    className="w-24 h-24 rounded-2xl object-cover shadow-sm bg-white/50 flex-shrink-0" 
                />
                <div className="pt-1">
                     <h2 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight mb-2 tracking-tight capitalize">
                        {market.title}
                    </h2>
                </div>
            </div>

            {/* Sub Markets List (Mocked for visual clone) */}
            <div className="space-y-2 mb-8 flex-1">
                {[
                    { label: 'Before Jun 2026', prob: 54, color: 'bg-emerald-500' },
                    { label: 'Before May 2026', prob: 49, color: 'bg-blue-500' },
                    { label: 'Before Apr 2026', prob: 41, color: 'bg-slate-800 dark:bg-slate-200' }
                ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between group cursor-pointer hover:bg-white/40 dark:hover:bg-slate-800/40 p-2 -mx-2 rounded-lg transition-colors" onClick={() => onClick(market.id)}>
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                            <span className="text-base font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-base font-bold text-slate-900 dark:text-white w-10 text-right">{item.prob}%</span>
                            <div className="flex gap-1.5">
                                <button className="px-3 py-1 bg-transparent border border-[#00D964] text-[#00D964] text-xs font-bold rounded-full transition-colors">Yes</button>
                                <button className="px-3 py-1 bg-transparent border border-[#FF4D4D] text-[#FF4D4D] text-xs font-bold rounded-full transition-colors">No</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* News Snippet */}
            <div className="mt-auto">
                <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                    <span className="font-bold text-slate-900 dark:text-white mr-1.5">News</span>
                    <span>·</span>
                    <span className="ml-1.5">
                        Russian President Vladimir Putin spoke with Venezuela's Nicolás Maduro to express support after recent developments...
                    </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-400 font-medium">
                        $39,595 Vol
                    </div>
                    <div className="flex items-center gap-2">
                         <button className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 transition-colors">
                             <ChevronLeft size={16} />
                         </button>
                         <span className="text-xs text-slate-400 font-medium">Trump eyes Warsh</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Chart */}
        <div className="lg:col-span-7 relative h-[350px] lg:h-auto min-h-[350px] bg-white/50 dark:bg-black/20 rounded-xl border border-white/40 dark:border-white/5 backdrop-blur-sm">
             <div className="h-full w-full pt-8">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                             <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 100]} orientation="right" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} tickCount={5} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'rgba(255,255,255,0.9)' }}
                        />
                         <Area 
                            type="step" 
                            dataKey="value1" 
                            stroke="#10b981" 
                            strokeWidth={2} 
                            fill="url(#gradEmerald)" 
                        />
                         <Area 
                            type="step" 
                            dataKey="value2" 
                            stroke="#3b82f6" 
                            strokeWidth={2} 
                            fill="url(#gradBlue)" 
                        />
                        <Area 
                            type="step" 
                            dataKey="value3" 
                            stroke="#1e293b" 
                            strokeWidth={2} 
                            fill="transparent" 
                            strokeDasharray="4 4"
                        />
                    </AreaChart>
                 </ResponsiveContainer>
             </div>
             
             {/* Bottom Link Arrow */}
             <div className="absolute bottom-4 right-0">
                 <div className="flex items-center gap-2 text-slate-400 text-xs font-medium cursor-pointer hover:text-slate-600 transition-colors">
                     <span>Reefer reschedule?</span>
                     <button className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-1.5 rounded-full shadow-sm hover:bg-white transition-colors">
                         <ChevronRight size={14} className="text-slate-600 dark:text-slate-300" />
                     </button>
                 </div>
             </div>
             
             {/* Date Labels (Mocked) */}
             <div className="absolute bottom-0 left-0 w-full flex justify-between px-8 pb-2 text-[10px] text-slate-400 font-medium">
                 <span>Dec 12</span>
                 <span>Dec 12</span>
                 <span>Dec 13</span>
                 <span>Dec 13</span>
                 <span>Dec 14</span>
             </div>
        </div>
      </div>
    </div>
  );
};
