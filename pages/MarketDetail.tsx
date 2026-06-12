
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { Market, Side } from '../types';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { ArrowLeft, Share2, AlertCircle, Swords, FileText, Wallet, TrendingUp, Activity, Clock } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getMarketRecentTrades, RecentTrade } from '../services/supabaseService';

interface MarketDetailProps {
   marketId: string;
   onBack: () => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
   if (active && payload && payload.length) {
      return (
         <div className="bg-white dark:bg-[#1a1d26]/95 backdrop-blur-xl border border-slate-200 dark:border-white/5 p-3 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 min-w-[140px]">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2">{label}</p>
            <div className="space-y-1.5">
               {payload.map((entry: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                     <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate max-w-[80px]">
                           {entry.name === 'value' ? 'Prob' : entry.name}
                        </span>
                     </div>
                     <span className="text-xs font-black text-slate-900 dark:text-[#f5f9fc] tabular-nums">
                        {entry.value}%
                     </span>
                  </div>
               ))}
            </div>
         </div>
      );
   }
   return null;
};

export const MarketDetail: React.FC<MarketDetailProps> = ({ marketId, onBack }) => {
   const { addToast } = useToast();
   const { formatMoney } = useCurrency();
   const { markets, buy, trades } = useApp();
   const { userProfile } = useAuth();
   const market = markets.find(m => m.id === marketId);
   const [activeSide, setActiveSide] = useState<Side>(Side.YES);
   const [activeOutcomeId, setActiveOutcomeId] = useState<string | undefined>(undefined);
   const [quantity, setQuantity] = useState<string>('');
   const [isProcessing, setIsProcessing] = useState(false);
   const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
   const [tradesLoading, setTradesLoading] = useState(true);

   useEffect(() => {
      if (!marketId) return;
      let isMounted = true;
      setTradesLoading(true);
      getMarketRecentTrades(marketId, 50)
         .then(data => {
            if (isMounted) setRecentTrades(data);
         })
         .catch(console.error)
         .finally(() => {
            if (isMounted) setTradesLoading(false);
         });
      
      return () => { isMounted = false; };
   }, [marketId, isProcessing]); // Re-fetch when a new trade is processed

   const isVs = market?.subcategory === 'Head-to-Head' && market.candidateA && market.candidateB;

   const chartData = useMemo(() => {
      if (!market) return [];
      const points: any[] = [];
      const now = new Date();
      const steps = 30; // More points for smoother animation

      if (market.outcomes && market.outcomes.length > 0) {
         // Multi-outcome: Walk backwards from current probability
         // This ensures the right-most point (now) matches the actual current stat
         let currentProbs = market.outcomes.map(o => ({ id: o.id, val: o.probability }));

         for (let i = 0; i <= steps; i++) {
            const time = new Date(now.getTime() - i * 30 * 60 * 1000);
            const point: any = {
               time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            currentProbs.forEach((p) => {
               point[p.id] = Math.round(p.val);

               // Calculate previous step (walking backwards)
               // Use deterministic random based on id + index
               const seed = market.id.charCodeAt(0) + p.id.charCodeAt(0) + i;
               const random = Math.sin(seed) * 10000;
               const fluctuation = ((random - Math.floor(random)) - 0.5) * 6; // +/- 3%

               // Update for next iteration (which is further in the past)
               p.val = Math.max(1, Math.min(99, p.val - fluctuation));
            });
            points.unshift(point); // Add to beginning of array
         }
      } else {
         // Single outcome (Standard/VS)
         let val = market.probability || 50;

         for (let i = 0; i <= steps; i++) {
            const time = new Date(now.getTime() - i * 30 * 60 * 1000);
            points.unshift({
               time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
               value: Math.round(val),
            });

            const seed = market.id.charCodeAt(0) + i;
            const random = Math.sin(seed) * 10000;
            const fluctuation = ((random - Math.floor(random)) - 0.5) * 6;
            val = Math.max(5, Math.min(95, val - fluctuation));
         }
      }
      return points;
   }, [market?.id, market?.probability, market?.outcomes]);

   if (!market) {
      return (
         <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
            <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-3xl mb-4 shadow-inner">
               <AlertCircle size={48} className="text-slate-400" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Market Expired</h2>
            <Button onClick={onBack} variant="primary">Return Home</Button>
         </div>
      );
   }

   const getProbability = () => {
      if (activeOutcomeId && market.outcomes) {
         const outcome = market.outcomes.find(o => o.id === activeOutcomeId);
         return outcome ? outcome.probability : 50;
      }
      return market.probability;
   };

   const currentProb = getProbability();
   const currentPrice = activeSide === Side.YES ? currentProb * 100 : (100 - currentProb) * 100;
   const numContracts = parseInt(quantity) || 0;
   const estimatedCost = numContracts * (currentPrice / 100);
   const potentialPayout = numContracts * 100;

   const handleOrder = async () => {
      if (numContracts <= 0) {
         addToast('Enter a valid quantity', 'error');
         return;
      }
      setIsProcessing(true);
      await new Promise(r => setTimeout(r, 800));
      try {
         await buy(market.id, activeSide, currentPrice, numContracts, activeOutcomeId);
         addToast('Order placed successfully!', 'success');
         setQuantity('');
      } catch (e: any) {
         addToast(e.message, 'error');
      } finally {
         setIsProcessing(false);
      }
   };

   const isResolved = !!market.outcome;

   const userFinalPositions = useMemo(() => {
      if (!isResolved || !market || !userProfile) return [];

      const marketTrades = trades.filter(t => t.marketId === marketId);
      if (marketTrades.length === 0) return [];

      const inventory = new Map<string, { side: Side, outcomeId?: string, qty: number, avgPrice: number }>();

      const sortedTrades = [...marketTrades].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      sortedTrades.forEach(trade => {
         const key = `${trade.side}_${trade.outcomeId || ''}`;
         const current = inventory.get(key) || { side: trade.side as Side, outcomeId: trade.outcomeId, qty: 0, avgPrice: 0 };

         if (trade.type === 'BUY') {
            const newQty = current.qty + trade.shares;
            const newAvgPrice = newQty > 0
               ? ((current.avgPrice * current.qty) + (trade.price * trade.shares)) / newQty
               : 0;
            inventory.set(key, { ...current, qty: newQty, avgPrice: newAvgPrice });
         } else if (trade.type === 'SELL') {
            const newQty = Math.max(0, current.qty - trade.shares);
            if (newQty === 0) {
               inventory.delete(key);
            } else {
               inventory.set(key, { ...current, qty: newQty });
            }
         }
      });

      const finalPositions: any[] = [];
      inventory.forEach((pos) => {
         if (pos.qty > 0) {
            const invested = pos.qty * pos.avgPrice;
            let payout = 0;

            if (market.outcome === 'CANCEL') {
               payout = invested; // Refund
            } else {
               let won = false;
               if (market.outcomes && market.outcomes.length > 0 && market.outcome !== 'YES' && market.outcome !== 'NO') {
                  if (pos.outcomeId === market.outcome && pos.side === Side.YES) won = true;
                  if (pos.outcomeId !== market.outcome && pos.side === Side.NO) won = true;
               } else {
                  if (pos.side === Side.YES && market.outcome === 'YES') won = true;
                  if (pos.side === Side.NO && market.outcome === 'NO') won = true;
               }

               if (won) payout = pos.qty * 100;
            }

            finalPositions.push({
               ...pos,
               invested,
               payout,
               profit: payout - invested
            });
         }
      });

      return finalPositions;
   }, [isResolved, market, trades, marketId, userProfile]);

   const totalProfit = userFinalPositions.reduce((acc, pos) => acc + pos.profit, 0);
   const totalPayout = userFinalPositions.reduce((acc, pos) => acc + pos.payout, 0);

   const getOutcomeName = (outcomeId: string) => {
      const o = market?.outcomes?.find(x => x.id === outcomeId);
      return o ? o.name : outcomeId;
   }

   return (
      <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#0f111a] pb-24 animate-fade-in-up flex flex-col">
         <div className="sticky top-0 z-50 bg-[#fcfcfd]/80 dark:bg-[#0f111a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 pt-[env(safe-area-inset-top)]">
            <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
               <button onClick={onBack} className="flex items-center text-xs font-black text-slate-500 dark:text-slate-400 active-scale p-2 -ml-2 uppercase tracking-widest">
                  <ArrowLeft size={18} className="mr-2" /> Back
               </button>
               <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isResolved ? 'bg-slate-500/10' : 'bg-emerald-500/10'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isResolved ? 'bg-slate-500' : 'bg-emerald-500 animate-pulse'}`} />
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isResolved ? 'text-slate-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
                     {isResolved ? 'Resolved' : 'Live'}
                  </span>
               </div>
               <button className="text-slate-400 active-scale p-2 -mr-2">
                  <Share2 size={18} />
               </button>
            </div>
         </div>

         <div className="max-w-xl mx-auto w-full px-4 py-6 space-y-6 flex-1">

            {isVs ? (
               <div className="glass-panel rounded-[2.5rem] p-6 flex flex-col items-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 flex opacity-20">
                     <div style={{ width: `${market.probability}%`, backgroundColor: market.candidateA?.color }} className="h-full transition-all duration-1000" />
                     <div style={{ width: `${100 - market.probability}%`, backgroundColor: market.candidateB?.color }} className="h-full transition-all duration-1000" />
                  </div>

                  <div className="flex items-center justify-between w-full relative z-10 gap-2 mt-2">
                     <div className={`flex flex-col items-center flex-1 transition-opacity ${isResolved && market.outcome !== 'YES' ? 'opacity-30' : 'opacity-100'}`}>
                        <div className="relative">
                           <div className="absolute inset-[-4px] rounded-full border-[3px] border-slate-100 dark:border-white/5" />
                           <div className="absolute inset-[-4px] rounded-full border-[3px] transition-all duration-1000" style={{
                              borderColor: market.candidateA?.color,
                              clipPath: `inset(0 ${100 - market.probability}% 0 0)`
                           }} />
                           <img src={market.candidateA?.imageUrl} className="w-20 h-20 rounded-full object-cover p-1.5 bg-white dark:bg-slate-900 shadow-xl" />
                           <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-white/10 rounded-lg px-2 py-0.5 shadow-xl">
                              <span className="text-[10px] font-black text-slate-900 dark:text-white tabular-nums">{market.probability}%</span>
                           </div>
                        </div>
                        <h2 className="mt-4 text-[13px] font-black text-slate-900 dark:text-white text-center leading-tight line-clamp-1 uppercase tracking-tighter">{market.candidateA?.name}</h2>
                     </div>

                     <div className="flex flex-col items-center opacity-30 px-2 mt-4">
                        <Swords size={20} className="text-slate-400 dark:text-white" />
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] mt-1 text-slate-400 dark:text-white">VS</span>
                     </div>

                     <div className={`flex flex-col items-center flex-1 transition-opacity ${isResolved && market.outcome !== 'NO' ? 'opacity-30' : 'opacity-100'}`}>
                        <div className="relative">
                           <div className="absolute inset-[-4px] rounded-full border-[3px] border-slate-100 dark:border-white/5" />
                           <div className="absolute inset-[-4px] rounded-full border-[3px] transition-all duration-1000" style={{
                              borderColor: market.candidateB?.color,
                              clipPath: `inset(0 0 0 ${market.probability}%)`
                           }} />
                           <img src={market.candidateB?.imageUrl} className="w-20 h-20 rounded-full object-cover p-1.5 bg-white dark:bg-slate-900 shadow-xl" />
                           <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-white/10 rounded-lg px-2 py-0.5 shadow-xl">
                              <span className="text-[10px] font-black text-slate-900 dark:text-white tabular-nums">{100 - market.probability}%</span>
                           </div>
                        </div>
                        <h2 className="mt-4 text-[13px] font-black text-slate-900 dark:text-white text-center leading-tight line-clamp-1 uppercase tracking-tighter">{market.candidateB?.name}</h2>
                     </div>
                  </div>
               </div>
            ) : (
               <div className="glass-panel rounded-3xl p-6 flex gap-5 items-center">
                  <img src={market.imageUrl} className="w-20 h-20 rounded-2xl object-cover shadow-lg border-2 border-white dark:border-white/5" alt={market.title} />
                  <div className="flex-1">
                     <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] block mb-1">{market.category}</span>
                     <h1 className="text-lg font-black text-slate-900 dark:text-white leading-snug tracking-tight break-words">{market.title}</h1>
                  </div>
               </div>
            )}

            {/* Chart Section - Polymarket Style */}
            <div className="bg-white dark:bg-[#1a1d26] rounded-2xl p-6 min-h-[350px] flex flex-col relative overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-xl">
               {/* Chart Header */}
               <div className="flex items-start justify-between mb-6">
                  <div>
                     <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{isResolved ? (market.outcome === 'CANCEL' ? 'VOID' : '100') : market.probability}%</span>
                        <span className="text-lg font-bold text-slate-500 dark:text-slate-400">chance</span>
                     </div>
                     <div className="flex items-center gap-2 mt-1">
                        {isResolved ? (
                           <span className="text-slate-400 text-sm font-bold flex items-center">
                              Market Finalized
                           </span>
                        ) : (
                           <>
                              <span className="text-emerald-400 text-sm font-bold flex items-center">
                                 ▲ {Math.floor(Math.random() * 5) + 1}%
                              </span>
                              <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">Today</span>
                           </>
                        )}
                     </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-50">
                     <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                     </div>
                     <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">PredictKit</span>
                  </div>
               </div>

               <div className="w-full h-[240px] relative">
                  {chartData.length > 0 && (
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                           <XAxis
                              dataKey="time"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                              dy={10}
                              interval="preserveStartEnd"
                           />
                           <YAxis
                              orientation="right"
                              domain={[0, 100]}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                              tickFormatter={(value) => `${value}%`}
                              dx={5}
                           />
                           <Tooltip
                              content={<CustomTooltip />}
                              cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }}
                              isAnimationActive={false}
                           />
                           {market.outcomes && market.outcomes.length > 0 ? (
                              market.outcomes.map((outcome) => (
                                 <Line
                                    key={outcome.id}
                                    type="monotone"
                                    dataKey={outcome.id}
                                    name={outcome.name}
                                    stroke={outcome.color || '#6366f1'}
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: outcome.color || '#6366f1' }}
                                    animationDuration={1500}
                                 />
                              ))
                           ) : (
                              <Line
                                 type="monotone"
                                 dataKey="value"
                                 stroke="#0ea5e9"
                                 strokeWidth={3}
                                 dot={false}
                                 activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: '#0ea5e9' }}
                                 animationDuration={1500}
                              />
                           )}
                        </LineChart>
                     </ResponsiveContainer>
                  )}
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between px-2">
                  <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Trade Execution</h3>
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-lg">Settlement NPR</span>
               </div>

               <div className={`glass-panel rounded-[2.5rem] p-6 sm:p-8 space-y-8 shadow-2xl border-2 ${isResolved ? 'border-slate-200 dark:border-slate-800 opacity-90' : 'border-indigo-500/10'}`}>
                  {isResolved ? (
                     <div className="text-center py-8 space-y-4">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                           {market.outcome === 'CANCEL' ? <AlertCircle size={32} className="text-slate-400" /> : <TrendingUp size={32} className="text-emerald-500" />}
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Market Resolved</h2>
                        <div className="bg-slate-50 dark:bg-white/5 inline-block px-8 py-4 rounded-2xl border border-slate-200 dark:border-white/5">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Winning Outcome</span>
                           <span className="text-xl font-black text-indigo-600 dark:text-emerald-400">
                              {market.outcomes && market.outcomes.length > 0 && market.outcome !== 'CANCEL' && market.outcome !== 'YES' && market.outcome !== 'NO'
                                 ? getOutcomeName(market.outcome)
                                 : market.outcome}
                           </span>
                        </div>
                        <p className="text-sm font-medium text-slate-500 max-w-xs mx-auto">
                           Trading has ended for this market. Payouts for winning positions have been processed.
                        </p>
                     </div>
                  ) : (
                     <>
                        {market.outcomes && market.outcomes.length > 0 ? (
                           <div className="space-y-4">
                              <div className="space-y-2">
                                 {market.outcomes.map(outcome => (
                                    <div
                                       key={outcome.id}
                                       onClick={() => { setActiveOutcomeId(outcome.id); setActiveSide(Side.YES); }}
                                       className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 group ${activeOutcomeId === outcome.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                                    >
                                       <div className="flex-1 min-w-0 sm:mr-4 w-full">
                                          <div className="text-sm font-black text-slate-900 dark:text-white mb-0.5 truncate" title={outcome.name}>{outcome.name}</div>
                                          <div className="flex items-center gap-2">
                                             <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: outcome.color || '#cbd5e1' }} />
                                             <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">{outcome.probability.toFixed(1)}% Probability</span>
                                          </div>
                                       </div>
                                       <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                                          <button
                                             onClick={(e) => { e.stopPropagation(); setActiveOutcomeId(outcome.id); setActiveSide(Side.YES); }}
                                             className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeOutcomeId === outcome.id && activeSide === Side.YES ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600'}`}
                                          >
                                             Yes {outcome.probability.toFixed(1)}¢
                                          </button>
                                          <button
                                             onClick={(e) => { e.stopPropagation(); setActiveOutcomeId(outcome.id); setActiveSide(Side.NO); }}
                                             className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeOutcomeId === outcome.id && activeSide === Side.NO ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-100 dark:hover:bg-red-950/30 hover:text-red-600'}`}
                                          >
                                             No {(100 - outcome.probability).toFixed(1)}¢
                                          </button>
                                       </div>
                                    </div>
                                 ))}
                              </div>

                              {!activeOutcomeId && (
                                 <div className="text-center p-4 text-sm text-slate-400 font-bold italic">Select an outcome above to place a trade</div>
                              )}
                           </div>
                        ) : (
                           <div className="grid grid-cols-2 gap-3">
                              <button
                                 onClick={() => setActiveSide(Side.YES)}
                                 className={`flex flex-col items-center justify-center p-3 sm:p-5 rounded-2xl sm:rounded-[1.75rem] border-2 transition-all active-scale ${activeSide === Side.YES ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500' : 'bg-slate-50 dark:bg-white/5 border-transparent'}`}
                              >
                                 <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeSide === Side.YES ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-500'}`}>
                                    {isVs ? `Win ${market.candidateA?.name.split(' ').pop()}` : 'Yes'}
                                 </span>
                                 <span className={`text-xl font-black tabular-nums ${activeSide === Side.YES ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{formatMoney(market.probability * 100)}</span>
                              </button>

                              <button
                                 onClick={() => setActiveSide(Side.NO)}
                                 className={`flex flex-col items-center justify-center p-3 sm:p-5 rounded-2xl sm:rounded-[1.75rem] border-2 transition-all active-scale ${activeSide === Side.NO ? 'bg-red-500/5 dark:bg-red-500/10 border-red-500' : 'bg-slate-50 dark:bg-white/5 border-transparent'}`}
                              >
                                 <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1 ${activeSide === Side.NO ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                                    {isVs ? `Win ${market.candidateB?.name.split(' ').pop()}` : 'No'}
                                 </span>
                                 <span className={`text-base sm:text-xl font-black tabular-nums ${activeSide === Side.NO ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{formatMoney((100 - market.probability) * 100)}</span>
                              </button>
                           </div>
                        )}

                        <div className="space-y-6">
                           <div>
                              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2.5 block">Quantity (Shares)</label>
                              <div className="relative">
                                 <input
                                    type="number"
                                    inputMode="numeric"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="0"
                                    className="w-full h-16 px-6 rounded-2xl bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 text-2xl font-black text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800"
                                 />
                                 <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1.5">
                                    <button onClick={() => setQuantity('100')} className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 active-scale shadow-sm">100</button>
                                    <button onClick={() => setQuantity('500')} className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 active-scale shadow-sm">500</button>
                                 </div>
                              </div>
                           </div>

                           <div className="bg-slate-50 dark:bg-white/5 rounded-[1.5rem] p-5 space-y-4 border border-slate-100 dark:border-white/5">
                              <div className="flex justify-between items-center text-xs">
                                 <span className="font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Investment</span>
                                 <span className="font-black text-slate-900 dark:text-white tabular-nums text-sm">{formatMoney(estimatedCost * 100)}</span>
                              </div>
                              <div className="flex justify-between items-center pt-4 border-t border-slate-200/50 dark:border-white/10">
                                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Win Potential</span>
                                 <span className="text-xl font-black text-emerald-600 dark:text-emerald-500 tabular-nums">{formatMoney(potentialPayout * 100)}</span>
                              </div>
                           </div>

                           <Button
                              className={`w-full h-16 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.3em] shadow-xl active-scale ${activeSide === Side.YES ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                              onClick={handleOrder}
                              disabled={isProcessing || numContracts <= 0 || (market.outcomes && market.outcomes.length > 0 && !activeOutcomeId)}
                           >
                              {isProcessing ? <Spinner size="sm" /> : `Execute Trade`}
                           </Button>
                        </div>
                     </>
                  )}
               </div>
            </div>

            {/* User Resolution Summary */}
            {isResolved && userFinalPositions.length > 0 && (
               <div className="space-y-4 animate-fade-in-up">
                  <div className="flex items-center gap-2 px-2">
                     <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest">Your Resolution Summary</h3>
                  </div>
                  <div className="glass-panel rounded-[2.5rem] p-6 sm:p-8 space-y-6 border-2 border-indigo-500/20 shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Wallet size={160} />
                     </div>
                     <div className="relative z-10">
                        <div className="space-y-4">
                           {userFinalPositions.map((pos, idx) => (
                              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50">
                                 <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                       <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${pos.side === Side.YES ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'}`}>
                                          {pos.side} {pos.outcomeId ? getOutcomeName(pos.outcomeId) : ''}
                                       </span>
                                       <span className="text-xs font-bold text-slate-500">{pos.qty.toLocaleString()} Shares</span>
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                       <span>Avg: {formatMoney(pos.avgPrice)}</span>
                                       <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                       <span>Invested: {formatMoney(pos.invested)}</span>
                                    </div>
                                 </div>
                                 <div className="text-left sm:text-right">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payout</div>
                                    <div className={`text-xl font-black tabular-nums tracking-tight ${pos.payout > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                                       {formatMoney(pos.payout)}
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                           <div className="bg-white/50 dark:bg-slate-900/50 px-5 py-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 flex-1">
                              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Payout</div>
                              <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                                 {formatMoney(totalPayout)}
                              </div>
                           </div>
                           <div className={`px-5 py-4 rounded-2xl border flex-1 ${totalProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'}`}>
                              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Net Profit</div>
                              <div className={`text-2xl font-black tabular-nums tracking-tight ${totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                                 {totalProfit >= 0 ? '+' : ''}{formatMoney(Math.abs(totalProfit))}
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            <div className="glass-panel rounded-[2rem] p-6 flex items-center justify-between border-2 border-slate-50 dark:border-white/5 shadow-sm active-scale">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                     <Wallet size={20} />
                  </div>
                  <div>
                     <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Wallet Balance</div>
                     <div className="text-base font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{formatMoney(userProfile?.balance || 0)}</div>
                  </div>
               </div>
               <button className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] px-4 py-2.5 bg-indigo-50 dark:bg-indigo-400/10 rounded-xl hover:bg-indigo-100 transition-colors">Add</button>
            </div>

            <div className="space-y-4 pt-4">
               <div className="flex items-center gap-2 px-2">
                  <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest">Market Integrity</h3>
               </div>
               <div className="glass-panel rounded-3xl p-6 space-y-4 border border-slate-100 dark:border-white/5">
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium break-words">
                     {market.description}
                  </p>
                  <div className="pt-5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                     <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Audit Source</span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mt-1.5">
                           <FileText size={14} /> {market.resolutionSource}
                        </span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Recent Trading Activity Feed */}
            <div className="space-y-4 pt-4">
               <div className="flex items-center gap-2 px-2">
                  <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                     <Activity size={14} /> Recent Trading Activity
                  </h3>
               </div>
               <div className="glass-panel rounded-[2rem] overflow-hidden border border-slate-100 dark:border-white/5 shadow-sm">
                  {tradesLoading ? (
                     <div className="p-8 flex justify-center items-center">
                        <Spinner size="sm" />
                     </div>
                  ) : recentTrades.length === 0 ? (
                     <div className="p-8 text-center text-sm font-bold text-slate-400">
                        No recent trades in this market.
                     </div>
                  ) : (
                     <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                           {recentTrades.map((trade) => {
                              const isBuy = trade.type === 'BUY';
                              const isYes = trade.side === 'YES';
                              return (
                                 <div key={trade.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-center gap-3">
                                       {trade.user_avatar_url ? (
                                          <img src={trade.user_avatar_url} alt={trade.user_name} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-white/10" />
                                       ) : (
                                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                                             {trade.user_name.charAt(0)}
                                          </div>
                                       )}
                                       <div>
                                          <div className="flex items-baseline gap-1.5">
                                             <span className="text-xs font-black text-slate-900 dark:text-white">{trade.user_name}</span>
                                             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                                {isBuy ? 'bought' : 'sold'}
                                             </span>
                                             <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isYes ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'}`}>
                                                {trade.outcome_id ? getOutcomeName(trade.outcome_id) : trade.side}
                                             </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                             <Clock size={10} className="text-slate-400" />
                                             <span className="text-[10px] font-medium text-slate-500">
                                                {new Date(trade.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                             </span>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="text-right">
                                       <div className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
                                          {trade.shares} shares
                                       </div>
                                       <div className="text-[10px] font-bold text-slate-500 tabular-nums">
                                          @ {formatMoney(trade.price)}
                                       </div>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  )}
               </div>
            </div>

         </div>
      </div>
   );
};
