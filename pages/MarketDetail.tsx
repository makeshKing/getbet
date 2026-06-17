import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Side } from '../types';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { Calendar, MessageCircle, Share2, Download, ListFilter, ChevronDown, ChevronUp, Search, Info, Activity, Clock, ArrowLeft, Heart, MoreHorizontal } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { getMarketRecentTrades, RecentTrade } from '../services/supabaseService';
import { format } from 'date-fns';

interface MarketDetailProps {
   marketId: string;
   onBack: () => void;
}

const TIME_FILTERS = ['6H', '1D', '1W', '1M', 'ALL'];

export const MarketDetail: React.FC<MarketDetailProps> = ({ marketId, onBack }) => {
   const { addToast } = useToast();
   const { markets, buy } = useApp();
   const { userProfile } = useAuth();
   const market = markets.find(m => m.id === marketId);
   
   const [activeSide, setActiveSide] = useState<Side>(Side.YES);
   const [activeOutcomeId, setActiveOutcomeId] = useState<string | undefined>(undefined);
   const [quantity, setQuantity] = useState<string>('');
   const [isProcessing, setIsProcessing] = useState(false);

   const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
   const [tradesLoading, setTradesLoading] = useState(true);

   // Chart & Interactivity state
   const [activeTimeFilter, setActiveTimeFilter] = useState('ALL');
   const [chartHistory, setChartHistory] = useState<any[]>([]);
   const [chartLoading, setChartLoading] = useState(true);
   const [showError, setShowError] = useState(false);
   
   // UI states
   const [isTradePanelOpen, setIsTradePanelOpen] = useState(false);

   // Hide mobile bottom nav when trade panel is open
   useEffect(() => {
      const nav = document.getElementById('mobile-bottom-nav');
      if (nav) {
         if (isTradePanelOpen) {
            nav.style.display = 'none';
         } else {
            nav.style.display = '';
         }
      }
      return () => {
         if (nav) nav.style.display = '';
      }
   }, [isTradePanelOpen]);

   const [isRulesOpen, setIsRulesOpen] = useState(false);

   // Realtime local outcomes state
   const [localOutcomes, setLocalOutcomes] = useState(market?.outcomes || []);

   // Refs
   const tradePanelRef = useRef<HTMLDivElement>(null);
   const chartContainerRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
     if (market?.outcomes && market.outcomes.length > 0) {
       const colors = ['#4B8BFF', '#FF4444', '#888888'];
       setLocalOutcomes(market.outcomes.map((o, i) => ({
         ...o,
         color: colors[i % colors.length]
       })));
     } else if (market) {
       // Binary market: synthesize a single outcome so the chart has a line to draw
       setLocalOutcomes([{
         id: 'value',
         name: market.title || 'Yes',
         probability: market.probability || 50,
         color: '#00E5CC',
       }]);
     }
   }, [market?.outcomes, market?.probability]);

   useEffect(() => {
      if (!marketId) return;
      let isMounted = true;
      setTradesLoading(true);
      getMarketRecentTrades(marketId, 50)
         .then(data => { if (isMounted) setRecentTrades(data); })
         .catch(console.error)
         .finally(() => { if (isMounted) setTradesLoading(false); });
      return () => { isMounted = false; };
   }, [marketId, isProcessing]);

   useEffect(() => {
     if (!marketId) return;
     const channel = supabase.channel(`outcomes-${marketId}`)
       .on('postgres_changes', {
         event: 'UPDATE', schema: 'public', table: 'outcomes',
         filter: `market_id=eq.${marketId}`
       }, (payload) => {
         setLocalOutcomes(prev => prev.map(o => o.id === payload.new.id ? { ...o, probability: payload.new.probability } : o));
       })
       .subscribe();
     return () => { supabase.removeChannel(channel); };
   }, [marketId]);

   useEffect(() => {
     if (!marketId || !market) return;
     let isMounted = true;
     setChartLoading(true);

     const fetchHistory = async () => {
       const now = new Date();
       let startDate = new Date(0);
       if (activeTimeFilter === '6H') startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
       else if (activeTimeFilter === '1D') startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
       else if (activeTimeFilter === '1W') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
       else if (activeTimeFilter === '1M') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

       const outcomeIds = market.outcomes?.map(o => o.id) || [];
       
       const { data, error } = await supabase.from('probability_history')
         .select('outcome_id, probability, recorded_at')
         .in('outcome_id', outcomeIds.length > 0 ? outcomeIds : ['main'])
         .gte('recorded_at', startDate.toISOString())
         .order('recorded_at', { ascending: true });

       if (error || !data || data.length === 0) {
         const points: any[] = [];
         let currentProbs = (market.outcomes && market.outcomes.length > 0) 
            ? market.outcomes.map(o => ({ id: o.id, val: o.probability }))
            : [{ id: 'value', val: market.probability || 50 }];

         for (let i = 0; i <= 60; i++) {
            let timeStep = 86400000;
            if (activeTimeFilter === '6H') timeStep = 360000;
            else if (activeTimeFilter === '1D') timeStep = 3600000;
            const time = new Date(now.getTime() - i * timeStep);
            const point: any = { timestamp: time.getTime() };
            currentProbs.forEach((p) => {
               point[p.id] = Math.round(p.val);
               const seed = market.id.charCodeAt(0) + p.id.charCodeAt(0) + i;
               const random = Math.sin(seed) * 10000;
               const baseProb = (market.outcomes && market.outcomes.length > 0)
                  ? market.outcomes[0].probability
                  : (market.probability || 50);
               const lo = Math.max(1, baseProb - 25);
               const hi = Math.min(99, baseProb + 25);
               p.val = Math.max(lo, Math.min(hi, p.val - ((random - Math.floor(random)) - 0.5) * 3));
            });
            points.unshift(point);
         }
         if (isMounted) setChartHistory(points);
       } else {
         const grouped = data.reduce((acc: any, row: any) => {
           const exactTime = new Date(row.recorded_at).getTime();
           if (!acc[exactTime]) acc[exactTime] = { timestamp: exactTime };
           acc[exactTime][row.outcome_id] = row.probability;
           return acc;
         }, {});
         if (isMounted) setChartHistory(Object.values(grouped).sort((a: any, b: any) => a.timestamp - b.timestamp));
       }
       if (isMounted) setChartLoading(false);
     };

     fetchHistory();
     return () => { isMounted = false; };
   }, [marketId, activeTimeFilter, market]);

   if (!market) {
      return (
         <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[#000]">
            <h2 className="text-xl font-bold text-white mb-2 uppercase">Market Not Found</h2>
            <Button onClick={onBack} variant="primary">Return Home</Button>
         </div>
      );
   }

   useEffect(() => {
     if (market) {
       document.title = market.title.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()) + " | PredictKit";
     }
   }, [market?.title]);

   useEffect(() => {
     if (!activeOutcomeId && localOutcomes.length > 0) {
       setActiveOutcomeId(localOutcomes[0].id);
     }
   }, [localOutcomes, activeOutcomeId]);

   const getProbability = () => {
      if (activeOutcomeId && localOutcomes.length > 0) {
         const outcome = localOutcomes.find(o => o.id === activeOutcomeId);
         return outcome ? outcome.probability : 50;
      }
      return market.probability || 50;
   };

    const selectedOutcome = localOutcomes.find(o => o.id === activeOutcomeId) || localOutcomes[0];
    const yes_price = selectedOutcome ? Math.round(selectedOutcome.probability) : 50;
    const no_price = selectedOutcome ? Math.round(100 - selectedOutcome.probability) : 50;

    const price = activeSide === Side.YES ? yes_price / 100 : no_price / 100;
    const inputDollars = parseFloat(quantity) || 0;
    const maxPayout = inputDollars > 0 && price > 0
       ? parseFloat((inputDollars / price).toFixed(2))
       : 0;

    const currentPrice = activeSide === Side.YES ? yes_price * 100 : no_price * 100;
    const numContracts = Math.floor((inputDollars * 100) / (activeSide === Side.YES ? yes_price : no_price || 1));

    const resolutionDate = (() => {
       try {
          return market.closeDate ? format(new Date(market.closeDate), 'MMM d, yyyy') : 'Jul 18, 2028';
       } catch (e) {
          return 'Jul 18, 2028';
       }
    })();

   const handleOrder = async () => {
      if (inputDollars <= 0 || numContracts <= 0) {
         setShowError(true);
         return;
      }
      setShowError(false);
      setIsProcessing(true);
      try {
         await buy(market.id, activeSide, currentPrice, numContracts, activeOutcomeId);
         addToast('Order placed successfully!', 'success');
         setQuantity('');
         setIsTradePanelOpen(false);
      } catch (e: any) {
         addToast(e.message, 'error');
      } finally {
         setIsProcessing(false);
      }
   };

   const formatVol = (cents: number) => {
      return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
   };

   const selectOutcomeForTrade = (id: string, side: Side) => {
      setActiveOutcomeId(id);
      setActiveSide(side);
      if (window.innerWidth < 1024) {
         setIsTradePanelOpen(true);
      } else {
         tradePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
   };

    // DOM-based hover handlers — no React state changes, no re-renders, no animation replay
    const handleChartMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
       const rect = chartContainerRef.current?.getBoundingClientRect();
       if (!rect || !chartHistory.length) return;

       const rightMargin = 40; // matches LineChart margin.right
       const chartWidth = rect.width - rightMargin;
       const x = e.clientX - rect.left;
       const index = Math.round((x / chartWidth) * (chartHistory.length - 1));
       const clampedIndex = Math.max(0, Math.min(index, chartHistory.length - 1));
       const point = chartHistory[clampedIndex];
       if (!point) return;

       // Update legend values directly via DOM
       localOutcomes.forEach(o => {
          const el = document.getElementById(`legend-val-${o.id}`);
          if (el && point[o.id] !== undefined) {
             el.textContent = `${Number(point[o.id]).toFixed(localOutcomes.length === 1 ? 0 : 1)}${localOutcomes.length === 1 ? '% chance' : '%'}`;
          }
       });

       // Update cursor line position via DOM
       const cursorEl = document.getElementById('chart-hover-cursor');
       if (cursorEl) {
          const pct = (clampedIndex / (chartHistory.length - 1)) * 100;
          cursorEl.style.left = `${pct}%`;
          cursorEl.style.display = 'block';
       }
    };

    const handleChartMouseLeave = () => {
       // Reset legend to current live values
       localOutcomes.forEach(o => {
          const el = document.getElementById(`legend-val-${o.id}`);
          if (el) {
             el.textContent = `${Number(o.probability).toFixed(localOutcomes.length === 1 ? 0 : 1)}${localOutcomes.length === 1 ? '% chance' : '%'}`;
          }
       });
       // Hide cursor line
       const cursorEl = document.getElementById('chart-hover-cursor');
       if (cursorEl) cursorEl.style.display = 'none';
    };

    const handleChartTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
       if (!e.touches[0]) return;
       const rect = chartContainerRef.current?.getBoundingClientRect();
       if (!rect || !chartHistory.length) return;

       const rightMargin = 40;
       const chartWidth = rect.width - rightMargin;
       const x = e.touches[0].clientX - rect.left;
       const index = Math.round((x / chartWidth) * (chartHistory.length - 1));
       const clampedIndex = Math.max(0, Math.min(index, chartHistory.length - 1));
       const point = chartHistory[clampedIndex];
       if (!point) return;

       localOutcomes.forEach(o => {
          const el = document.getElementById(`legend-val-${o.id}`);
          if (el && point[o.id] !== undefined) {
             el.textContent = `${Number(point[o.id]).toFixed(localOutcomes.length === 1 ? 0 : 1)}${localOutcomes.length === 1 ? '% chance' : '%'}`;
          }
       });

       const cursorEl = document.getElementById('chart-hover-cursor');
       if (cursorEl) {
          const pct = (clampedIndex / (chartHistory.length - 1)) * 100;
          cursorEl.style.left = `${pct}%`;
          cursorEl.style.display = 'block';
       }
    };

    const handleChartTouchEnd = () => {
       handleChartMouseLeave();
    };

   return (
      <div className="min-h-screen bg-[#080808] lg:pb-24 text-white flex flex-col font-sans selection:bg-[#00D964]/30 relative">
         
         {/* MOBILE TOP NAVIGATION REMOVED */}

         <div className="max-w-[1200px] mx-auto w-full px-0 lg:px-4 py-4 lg:py-8 flex flex-col lg:flex-row gap-8 lg:gap-12 flex-1">
            
            {/* LEFT COLUMN: Main Content */}
            <div className="lg:flex-1 flex flex-col min-w-0">
               
               {/* Header Section */}
               <div className="px-4 lg:px-0 mb-6">
                  {/* Breadcrumb */}
                  <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1.5">
                     {market.category || 'SPORTS'} · {market.subcategory || 'SOCCER'} · FIFA WORLD CUP
                  </div>
                  
                  <div className="flex justify-between items-start mb-1.5">
                     <h1 className="text-xl sm:text-[24px] md:text-[32px] font-bold text-white leading-tight break-words tracking-tight max-w-2xl capitalize">{market.title}</h1>
                     {/* Desktop icons */}
                     <div className="hidden lg:flex items-center gap-4 text-gray-400 pt-1">
                        <Calendar size={18} className="cursor-pointer hover:text-white transition-colors" />
                        <MessageCircle size={18} className="cursor-pointer hover:text-white transition-colors" />
                        <Share2 size={18} className="cursor-pointer hover:text-white transition-colors" />
                        <Download size={18} className="cursor-pointer hover:text-white transition-colors" />
                     </div>
                  </div>
                  
                  {/* Countdown Row */}
                  <div className="text-[12px] text-gray-400 font-medium">
                     Begins in 34 days · Jul 19, 3:00pm EDT
                  </div>
               </div>

               {/* Chart Area */}
               <div className="mb-0 relative group w-full">
                  
                  {/* Chart Legend (inline) — values updated via DOM, no re-renders */}
                  <div className="flex justify-between items-center mb-0 px-4 lg:px-0 flex-wrap gap-y-1">
                     {localOutcomes.length === 1 ? (
                        <div className="flex items-center gap-3">
                           <span id={`legend-val-${localOutcomes[0].id}`} className="text-white font-bold text-2xl md:text-3xl">
                              {Number(localOutcomes[0].probability).toFixed(0)}% chance
                           </span>
                           <span className="text-[#00E5CC] font-bold text-base md:text-lg flex items-center">
                              ▲ 30.6
                           </span>
                        </div>
                     ) : (
                        <div className="flex items-center gap-2 md:gap-3 lg:gap-6 flex-wrap">
                           {localOutcomes.map(outcome => (
                              <div key={outcome.id} className="flex items-center gap-1.5 md:gap-2 text-xs md:text-[13px] font-medium">
                                 <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" style={{ backgroundColor: outcome.color || '#3B82F6' }} />
                                 <span className="text-gray-400">{outcome.name}</span>
                                 <span id={`legend-val-${outcome.id}`} className="text-white font-bold">{Number(outcome.probability).toFixed(1)}%</span>
                              </div>
                           ))}
                        </div>
                     )}
                     <div className="text-[11px] md:text-[13px] font-bold text-gray-400 tracking-tight select-none pointer-events-none pr-4 lg:pr-0">PredictKit</div>
                  </div>

                  {/* Chart Container — mouse events here, NOT on LineChart, to avoid re-renders */}
                  <div 
                     ref={chartContainerRef}
                     className="h-40 md:h-[180px] lg:h-[220px] w-full relative"
                     onMouseMove={handleChartMouseMove}
                     onMouseLeave={handleChartMouseLeave}
                     onTouchMove={handleChartTouchMove}
                     onTouchEnd={handleChartTouchEnd}
                     onTouchCancel={handleChartTouchEnd}
                  >
                     {/* DOM-based cursor line — positioned absolutely, updated via JS */}
                     <div
                        id="chart-hover-cursor"
                        className="absolute top-0 bottom-0 w-px pointer-events-none"
                        style={{ display: 'none', zIndex: 10, background: 'rgba(255,255,255,0.2)' }}
                     />

                     {chartLoading ? (
                        /* Skeleton loading state while data fetches */
                        <div className="w-full h-full flex flex-col justify-end gap-2 pb-4 px-2">
                           <div className="w-full h-[2px] bg-gradient-to-r from-[#15171C] via-[#00E5CC]/30 to-[#15171C] rounded animate-pulse" />
                           <div className="flex gap-1 items-end h-32">
                              {Array.from({ length: 40 }).map((_, i) => (
                                 <div
                                    key={i}
                                    className="flex-1 bg-[#1E2025] rounded-sm animate-pulse"
                                    style={{
                                       height: `${30 + Math.sin(i * 0.4) * 20 + Math.random() * 15}%`,
                                       animationDelay: `${i * 20}ms`
                                    }}
                                 />
                              ))}
                           </div>
                           <div className="flex justify-between px-2">
                              {['May', 'Jun'].map(d => (
                                 <span key={d} className="text-[#9AA0A6] text-xs animate-pulse">{d}</span>
                              ))}
                           </div>
                        </div>
                     ) : chartHistory.length > 0 ? (
                        /* Smooth fade-in after animation */
                        <div
                           className="w-full h-full"
                           style={{
                              opacity: 1,
                              transition: 'opacity 500ms ease-in-out'
                           }}
                        >
                        {/* key={activeTimeFilter} forces re-mount & re-animation on filter change */}
                        <ResponsiveContainer key={activeTimeFilter} width="100%" height="100%">
                           <LineChart 
                             data={chartHistory} 
                             margin={{ top: 10, right: 40, left: 0, bottom: 5 }}
                           >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} horizontal={true} stroke="#2A2D35" opacity={0.5} />
                              <XAxis
                                 dataKey="timestamp"
                                 type="number"
                                 domain={['dataMin', 'dataMax']}
                                 axisLine={false}
                                 tickLine={false}
                                 tickFormatter={(tick) => format(tick, 'MMM')}
                                 tick={{ fill: '#9AA0A6', fontSize: 10 }}
                                 dy={10}
                                 minTickGap={40}
                                 tickCount={4}
                              />
                              <YAxis
                                 orientation="right"
                                 domain={['auto', 'auto']}
                                 axisLine={false}
                                 tickLine={false}
                                 tick={{ fill: '#9AA0A6', fontSize: 10 }}
                                 tickFormatter={(val) => `${val}%`}
                                 tickCount={4}
                                 width={36}
                                 dx={10}
                              />
                              <Tooltip cursor={false} content={() => null} />
                              
                              {/* Line draw animation — plays once on mount, never on hover */}
                              {localOutcomes.length > 0 ? (
                                 localOutcomes.map((outcome) => (
                                    <Line
                                       key={outcome.id}
                                       type="monotone"
                                       dataKey={outcome.id}
                                       stroke={outcome.color || '#3B82F6'}
                                       strokeWidth={2}
                                       dot={false}
                                       activeDot={false}
                                       isAnimationActive={true}
                                       animationBegin={0}
                                       animationDuration={1200}
                                       animationEasing="ease-out"
                                    />
                                 ))
                              ) : null}
                           </LineChart>
                        </ResponsiveContainer>
                         </div>
                      ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm font-bold">
                            No chart data available
                         </div>
                      )}
                  </div>

                  {/* Chart controls rows */}
                  <div className="px-4 lg:px-0">
                     <div className="flex items-center justify-between mt-2 mb-4 gap-2">
                         <div className="flex items-center gap-2 md:gap-3 shrink-0">
                            <span className="px-2 py-0.5 rounded-full border border-[#00E5CC] text-[#00E5CC] text-[10px] font-bold uppercase tracking-wide">
                               No fees
                            </span>
                            <span className="text-xs md:text-[13px] font-medium text-[#9AA0A6]">
                               {formatVol(market.volume || 3140658200)} vol
                            </span>
                         </div>
                         <div className="flex gap-2 md:gap-4 text-xs md:text-[13px] font-bold text-[#9AA0A6] overflow-x-auto no-scrollbar">
                            {TIME_FILTERS.map(tf => (
                               <button 
                                 key={tf}
                                 onClick={() => setActiveTimeFilter(tf)}
                                 className={`px-2 py-1 md:px-3 transition-colors border-none bg-transparent whitespace-nowrap ${activeTimeFilter === tf ? 'text-white' : 'hover:text-gray-300'}`}
                               >
                                 {tf}
                               </button>
                            ))}
                         </div>
                      </div>
                     
                     <div className="flex items-center justify-between border-b border-[#1E2440] pb-2 mb-2 mt-4">
                        <div className="text-xs font-medium text-gray-500 w-[120px] text-center">Chance</div>
                        <div className="flex justify-end gap-4 text-gray-400">
                           <ListFilter size={14} className="cursor-pointer" />
                           <Search size={14} className="cursor-pointer" />
                        </div>
                     </div>
                  </div>
               </div>

               {/* Outcomes List (Mobile Style Cards) */}
               <div className="flex flex-col px-4 lg:px-0 mt-4">
                  {localOutcomes.map((outcome, idx) => {
                     const isLast = idx === localOutcomes.length - 1;
                     const price = outcome.probability.toFixed(1);
                     const noPrice = (100 - outcome.probability).toFixed(1);
                     const changeStr = Math.floor(Math.random() * 10) / 10;
                     const isUp = Math.random() > 0.5;
                     
                     return (
                        <div 
                           key={outcome.id} 
                           className={`flex flex-col gap-2 md:gap-3 py-3 md:py-4 lg:py-5 lg:grid lg:grid-cols-[1fr_auto_auto] lg:items-center hover:bg-[#1E2440]/30 transition-colors cursor-pointer group ${!isLast ? 'border-b border-[#1E2440]' : ''}`}
                        >
                           {/* Top Line Mobile / Left Col Desktop */}
                           <div className="flex items-center justify-between lg:justify-start lg:gap-4 w-full">
                              <div className="flex items-center gap-2 md:gap-3">
                                 {outcome.icon ? (
                                    outcome.icon.length <= 4 ? (
                                       <div className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-xl md:text-2xl shrink-0">{outcome.icon}</div>
                                    ) : (
                                       <img src={outcome.icon} className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover shrink-0" alt={outcome.name} />
                                    )
                                 ) : (
                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs md:text-sm font-bold text-white shrink-0">
                                       {outcome.name.charAt(0)}
                                    </div>
                                 )}
                                 <span className="text-white font-medium text-sm md:text-[15px]">{outcome.name}</span>
                              </div>
                              <div className="flex items-center gap-2 lg:w-32 lg:justify-center">
                                 <span className="text-white font-bold text-lg md:text-[19px]">{price}%</span>
                                 <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isUp ? 'text-[#00D964]' : 'text-[#FF4D4D]'}`}>
                                    {isUp ? '▲' : '▼'} {changeStr}
                                 </span>
                              </div>
                           </div>
                           
                           {/* Bottom Line Mobile / Right Col Desktop */}
                           <div className="flex items-center gap-2 w-full lg:w-[180px] lg:justify-end">
                              <button 
                                 onClick={(e) => { e.stopPropagation(); selectOutcomeForTrade(outcome.id, Side.YES); }} 
                                 className={`flex-1 lg:flex-none lg:w-[84px] h-10 md:h-auto md:py-1 border border-[#00D964] rounded-full md:rounded-xl text-[13px] md:text-[12px] font-bold transition-colors ${(activeOutcomeId === outcome.id && activeSide === Side.YES) ? 'bg-[#00D964] text-black' : 'bg-transparent text-[#00D964]'}`}
                              >
                                 Yes {price}¢
                              </button>
                              <button 
                                 onClick={(e) => { e.stopPropagation(); selectOutcomeForTrade(outcome.id, Side.NO); }} 
                                 className={`flex-1 lg:flex-none lg:w-[84px] h-10 md:h-auto md:py-1 border border-[#FF4D4D] rounded-full md:rounded-xl text-[13px] md:text-[12px] font-bold transition-colors ${(activeOutcomeId === outcome.id && activeSide === Side.NO) ? 'bg-[#FF4D4D] text-white' : 'bg-transparent text-[#FF4D4D]'}`}
                              >
                                 No {noPrice}¢
                              </button>
                           </div>
                        </div>
                     );
                  })}
                  <div className="text-sm text-gray-400 font-medium mt-4 cursor-pointer hover:text-white">
                     More markets
                  </div>
               </div>

               {/* Market Rules Section */}
               <div className="px-4 lg:px-0 mt-12 mb-8">
                  <div 
                     className="flex justify-between items-center cursor-pointer border-b border-[#1E2440] pb-3"
                     onClick={() => setIsRulesOpen(!isRulesOpen)}
                  >
                     <h2 className="text-xl font-bold text-white">Market Rules</h2>
                     {isRulesOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>

                  {isRulesOpen && (
                     <div className="pt-4 space-y-4">
                        <div className="flex justify-between items-center">
                           <button className="flex items-center gap-1.5 text-[#00D964] text-[13px] font-bold">
                              Spain <ChevronDown size={14} />
                           </button>
                           <Info size={16} className="text-gray-400" />
                        </div>
                        <p className="text-[13px] text-gray-300 leading-relaxed">
                           If Spain wins the 2026 Men's World Cup, then the market resolves to <span className="text-[#00D964]">Yes</span>. 
                           Sources from <strong>Fox Sports, ESPN</strong>, and <strong>The Wall Street Journal</strong>.
                        </p>
                        <p className="text-[13px] text-gray-300 leading-relaxed">
                           This market and these products have not been endorsed by FIFA. Any references to "FIFA", the "FIFA World Cup", or any other associated marks are descriptive only, and do not indicate an endorsement of this product or any affiliation between FIFA and Kalshi.
                        </p>
                        <p className="text-[13px] text-gray-400 italic">
                           Note: this event is mutually exclusive.
                        </p>
                        <div className="flex gap-4 pt-4 border-t border-[#1E2440]">
                           <button className="px-4 py-2 border border-[#333] rounded-lg text-[13px] font-bold text-gray-300">View full rules</button>
                           <button className="px-4 py-2 border border-[#333] rounded-lg text-[13px] font-bold text-gray-300">Help center</button>
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* Mobile Bottom Trading Panel */}
            {isTradePanelOpen && (
               <>
                  {/* Backdrop */}
                  <div
                     className="fixed inset-0 bg-black/50 z-[45] lg:hidden"
                     onClick={() => setIsTradePanelOpen(false)}
                  />

                  {/* Bottom Sheet */}
                  <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#15171C] rounded-t-3xl flex flex-col lg:hidden"
                     style={{ maxHeight: '90vh' }}>

                     {/* Drag handle + close button */}
                     <div className="flex items-center justify-center pt-3 pb-1 relative flex-shrink-0">
                        <div className="w-10 h-1 bg-gray-600 rounded-full cursor-pointer" onClick={() => setIsTradePanelOpen(false)} />
                        <button
                           onClick={() => setIsTradePanelOpen(false)}
                           className="absolute right-4 top-3 text-gray-400 hover:text-white"
                        >
                           ✕
                        </button>
                     </div>

                     {/* Scrollable content */}
                     <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">

                        {/* BUY / SELL tabs */}
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex gap-4">
                              <span className="text-white text-sm font-bold border-b-2 border-white pb-1">BUY</span>
                              <span className="text-[#9AA0A6] text-sm">SELL</span>
                           </div>
                           <span className="text-[#9AA0A6] text-sm">DOLLARS ▾</span>
                        </div>

                        {/* Market name */}
                        <p className="text-[#9AA0A6] text-xs mb-1">{market.title}</p>

                        {/* Selected outcome */}
                        {activeOutcomeId && (
                           <div className="flex items-center gap-2 mb-4">
                              {selectedOutcome?.icon ? (
                                 selectedOutcome.icon.length <= 4 ? (
                                    <div className="text-xl flex items-center justify-center">{selectedOutcome.icon}</div>
                                 ) : (
                                    <img src={selectedOutcome.icon} className="w-5 h-5 rounded-full object-cover" alt="" />
                                 )
                              ) : (
                                 <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white font-bold">{selectedOutcome?.name?.charAt(0) || 'S'}</div>
                              )}
                              <span className="text-white text-lg font-bold">{selectedOutcome?.name}</span>
                           </div>
                        )}

                        {/* YES / NO buttons */}
                        <div className="flex items-center gap-2 mb-4">
                           <button onClick={() => setActiveSide(Side.YES)}
                              className={`px-5 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                                 activeSide === Side.YES
                                    ? 'bg-[#00D964] border-[#00D964] text-black'
                                    : 'bg-transparent border-[#00D964] text-[#00D964]'
                              }`}>
                              YES {yes_price}¢
                           </button>
                           <button onClick={() => setActiveSide(Side.NO)}
                              className={`px-5 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                                 activeSide === Side.NO
                                    ? 'bg-[#9AA0A6] border-[#9AA0A6] text-black'
                                    : 'bg-transparent border-[#9AA0A6] text-[#9AA0A6]'
                              }`}>
                              NO {no_price}¢
                           </button>
                           <span className="ml-auto text-[#9AA0A6] text-xs underline decoration-gray-700 underline-offset-2">3.25% Interest</span>
                        </div>

                        {/* Dollar input */}
                        <div className="flex items-center justify-between bg-[#1E2025] rounded-lg px-4 py-3 mb-4 border border-[#2A2D35] focus-within:border-gray-500 transition-colors group">
                           <span className="text-[#9AA0A6] text-sm font-medium">Dollars</span>
                           <div className="flex items-center justify-end flex-1">
                              <span className="text-white text-xl font-medium mr-1 group-focus-within:text-[#00D964] transition-colors">$</span>
                              <input
                                 type="number"
                                 inputMode="numeric"
                                 value={quantity || ''}
                                 onChange={(e) => { setQuantity(e.target.value); setShowError(false); }}
                                 placeholder="0"
                                 className="bg-transparent text-white text-right text-xl font-medium outline-none w-24 placeholder:text-[#333]"
                              />
                           </div>
                        </div>
                        {showError && (
                           <p className="text-[#FF4D4D] text-xs mb-2 text-center font-bold">Please enter an amount</p>
                        )}

                        {/* Odds */}
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-1">
                              <span className="text-[#9AA0A6] text-sm">Odds</span>
                              <span className="w-3.5 h-3.5 rounded-full border border-gray-600 text-gray-400 flex items-center justify-center text-[9px] font-bold">i</span>
                           </div>
                           <span className="text-white text-sm">{activeSide === Side.YES ? yes_price : no_price}% chance</span>
                        </div>

                        {/* Max payout */}
                        <div className="flex items-center justify-between mb-2">
                           <div>
                              <p className="text-[#9AA0A6] text-sm">Max payout</p>
                              <p className="text-[#9AA0A6] text-xs">{resolutionDate}</p>
                           </div>
                           <span className="text-white text-2xl font-bold tracking-tight">${maxPayout.toFixed(2)}</span>
                        </div>

                     </div>

                     {/* STICKY BUTTON — always visible, never hidden */}
                     <div className="flex-shrink-0 px-4 py-4 bg-[#15171C]"
                          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                        <Button
                           onClick={handleOrder}
                           disabled={isProcessing}
                           className="w-full bg-[#00D964] text-black font-bold text-base py-4 rounded-xl hover:bg-[#00c255] active:scale-[0.98] transition-all h-auto"
                        >
                           {isProcessing ? <Spinner size="sm" color="black" /> : (userProfile ? 'Place Order' : 'Sign up to trade')}
                        </Button>
                     </div>

                  </div>
               </>
            )}

            {/* DESKTOP TRADING PANEL */}
            <div className="hidden lg:block w-72 xl:w-80 flex-shrink-0">
               <div className="sticky top-6 bg-[#15171C] border border-[#22252B] rounded-2xl p-5 w-full">
                  
                  {/* Header tabs */}
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex gap-4">
                        <span className="text-white text-sm font-bold border-b-2 border-white pb-1">BUY</span>
                        <span className="text-[#9AA0A6] text-sm cursor-pointer hover:text-white">SELL</span>
                     </div>
                     <span className="text-[#9AA0A6] text-sm">DOLLARS ▾</span>
                  </div>

                  {/* Market title */}
                  <p className="text-[#9AA0A6] text-sm mb-1 capitalize">
                     {market.title}
                  </p>

                  {/* Selected outcome row (icon + bold name) */}
                  <div className="flex items-center gap-2 mb-4">
                     {selectedOutcome?.icon ? (
                        selectedOutcome.icon.length <= 4 ? (
                           <span className="text-2xl leading-none">{selectedOutcome.icon}</span>
                        ) : (
                           <img src={selectedOutcome.icon} className="w-7 h-7 rounded-sm object-cover" alt="" />
                        )
                     ) : (
                        <div className="w-7 h-7 rounded-sm bg-gray-700 flex items-center justify-center text-xs text-white font-bold shrink-0">
                           {selectedOutcome?.name?.charAt(0) || 'S'}
                        </div>
                     )}
                     <span className="text-white text-xl font-bold">
                        {selectedOutcome?.name}
                     </span>
                  </div>

                  {/* YES / NO toggle buttons + Interest link */}
                  <div className="flex items-center gap-2 mb-4">
                     {/* YES button */}
                     <button
                        onClick={() => setActiveSide(Side.YES)}
                        className={`px-4 py-1.5 rounded-xl text-[13px] font-bold transition-all ${
                           activeSide === Side.YES
                              ? 'bg-[#00D964] text-black border-2 border-[#00D964]'
                              : 'bg-transparent text-[#00D964] border-2 border-[#00D964]'
                        }`}
                     >
                        YES {yes_price}¢
                     </button>

                     {/* NO button */}
                     <button
                        onClick={() => setActiveSide(Side.NO)}
                        className={`px-4 py-1.5 rounded-xl text-[13px] font-bold transition-all ${
                           activeSide === Side.NO
                              ? 'bg-[#9AA0A6] text-black border-2 border-[#9AA0A6]'
                              : 'bg-transparent text-[#9AA0A6] border-2 border-[#9AA0A6]'
                        }`}
                     >
                        NO {no_price}¢
                     </button>

                     {/* Interest link — far right */}
                     <span className="ml-auto text-[#9AA0A6] text-xs cursor-pointer hover:text-white">
                        3.25% Interest
                     </span>
                  </div>

                  {/* Dollar amount input */}
                  <div className="flex items-center justify-between bg-[#1E2025] rounded-lg px-4 py-3 mb-1 border border-[#2A2D35] focus-within:border-gray-500 transition-colors">
                     <span className="text-[#9AA0A6] text-sm">Dollars</span>
                     <input
                        type="number"
                        min="0"
                        step="1"
                        value={quantity}
                        onChange={(e) => { setQuantity(e.target.value); setShowError(false); }}
                        placeholder="0"
                        className="bg-transparent text-white text-right text-base font-medium outline-none w-24"
                     />
                  </div>
                  {showError && <p className="text-[#FF4D4D] text-xs mb-3">Please enter an amount</p>}
                  {!showError && <div className="mb-3" />}

                  {/* Odds row */}
                  <div className="flex items-center justify-between mb-2">
                     <div className="flex items-center gap-1">
                        <span className="text-[#9AA0A6] text-sm">Odds</span>
                        <span className="text-[#9AA0A6] text-xs cursor-help" title="Probability of this outcome">ⓘ</span>
                     </div>
                     <span className="text-white text-sm font-medium">
                        {activeSide === Side.YES ? yes_price : no_price}% chance
                     </span>
                  </div>

                  {/* Max payout row */}
                  <div className="flex items-center justify-between mb-5">
                     <div>
                        <p className="text-[#9AA0A6] text-sm">Max payout</p>
                        <p className="text-[#9AA0A6] text-xs">{resolutionDate}</p>
                     </div>
                     <span className="text-white text-2xl font-bold">
                        ${maxPayout.toFixed(2)}
                     </span>
                  </div>

                  {/* CTA Button — always bright green */}
                  <button
                     onClick={handleOrder}
                     disabled={isProcessing}
                     className="w-full bg-[#00D964] text-black font-bold text-base py-3.5 rounded-xl hover:bg-[#00c255] active:scale-[0.98] transition-all flex items-center justify-center"
                  >
                     {isProcessing ? <Spinner size="sm" color="black" /> : (userProfile ? 'Place Order' : 'Sign up to trade')}
                  </button>

               </div>
            </div>

            {/* Mobile Backdrop for bottom sheet */}
            {isTradePanelOpen && (
               <div 
                  className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                  onClick={() => setIsTradePanelOpen(false)}
               ></div>
            )}

         </div>
      </div>
   );
};
