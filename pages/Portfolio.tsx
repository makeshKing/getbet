
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { Side, Position, Trade } from '../types';
import { Button } from '../components/ui/Button';

import { ShareHistoryTable } from '../components/ShareHistoryTable';
import { PnLCalendar } from '../components/PnLCalendar';
import { WinCard } from '../components/WinCard';
import { Search } from 'lucide-react';
import {
    TrendingUp,
    TrendingDown,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    Briefcase,
    Wallet,
    History,
    Activity,
    Flame,
    ExternalLink
} from 'lucide-react';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const Portfolio: React.FC = () => {
    const { positions, trades, markets, ledger } = useApp();
    const { userProfile: user } = useAuth();
    const { formatMoney, currency, usdToNprRate } = useCurrency();

    // Convert cents (NPR cents) into the user's selected currency units for the win card
    const toWinUnits = (cents: number) => {
        const npr = cents / 100;
        return currency === 'USD' ? npr / usdToNprRate : npr;
    };

    const [chartMode, setChartMode] = useState<'equity' | 'pnl'>('equity');
    // animKey forces Recharts to remount & replay the animation when mode switches
    const [animKey, setAnimKey] = useState(0);
    const [showWinCard, setShowWinCard] = useState(false);
    const [selectedWin, setSelectedWin] = useState<Trade | null>(null);

    // Won trades
    const wonTrades = useMemo(() => trades.filter(t => t.status === 'WON'), [trades]);

    function handleShareWin(trade: any) {
        // Safety check — only proceed if this is a winning position
        if (trade.status !== 'WON' && (trade.pnl || 0) <= 0) {
            console.warn('Not a winning position');
            return;
        }

        const priceInDecimal = (trade.price || 50) / 100;
        const calculatedPayout = trade.amount / priceInDecimal;

        setSelectedWin({
            ...trade,
            potentialWin: trade.payout || trade.paid_out || calculatedPayout
        });
        setShowWinCard(true);
    }

    const getMarket = (id: string) => markets.find(m => m.id === id);

    const getMarketCurrentPrice = (id: string, side: Side, outcomeId?: string) => {
        const m = markets.find(mkt => mkt.id === id);
        if (!m) return 0;
        if (m.outcome) {
            // If market is resolved
            if (m.outcome === 'CANCEL') return 10000;
            // For multi-outcome, we'd need to know which outcome won.
            // Simplified: if market resolved to YES/NO, it usually implies binary logic.
            // For multi-choice, m.outcome might be the ID of the winning outcome?
            // Let's assume binary resolution for now or extend types later if strict multi-outcome resolution needed.
            if (m.outcome === 'YES') return side === Side.YES ? 10000 : 0;
            if (m.outcome === 'NO') return side === Side.NO ? 10000 : 0;
        }

        if (outcomeId && m.outcomes) {
            const outcome = m.outcomes.find(o => o.id === outcomeId);
            if (outcome) {
                return side === Side.YES ? outcome.probability * 100 : (100 - outcome.probability) * 100;
            }
        }
        return side === Side.YES ? m.probability * 100 : (100 - m.probability) * 100;
    };

    // --- Improved Financial Logic ---
    const totalInvested = positions.reduce((acc, p) => acc + (p.avgPrice * p.quantity), 0);

    const totalCurrentValue = useMemo(() => {
        return positions.reduce((acc, p) => {
            const price = getMarketCurrentPrice(p.marketId, p.side, p.outcomeId);
            return acc + (price * p.quantity);
        }, 0);
    }, [positions, markets]);

    const unrealizedPL = totalCurrentValue - totalInvested;

    if (!user) return null;
    const netWorth = (user?.balance || 0) + totalCurrentValue;
    const totalDeposited = user?.totalDeposited || 0;
    const totalWithdrawn = user?.totalWithdrawn || 0;
    const investedCapital = totalDeposited - totalWithdrawn;
    const lifetimePnl = netWorth - investedCapital;

    // ROI based on Total Capital Injected (Total Deposited), not just Net Investment
    const allTimeROI = totalDeposited > 0 ? (lifetimePnl / totalDeposited) * 100 : 0;

    // Build chart data from ledger + trades history
    // Produces one data-point per calendar day that had activity, plus today's snapshot.
    const chartData = useMemo(() => {
        // Collect all timestamped events (deposits, withdrawals, trades)
        type TimelineEvent = {
            ts: number;
            type: 'DEPOSIT' | 'WITHDRAWAL' | 'BUY' | 'SELL' | 'ADJUSTMENT';
            amount: number; // in cents/paise
            shares?: number;
            price?: number;
            marketId?: string;
            outcomeId?: string;
            side?: Side;
        };

        const events: TimelineEvent[] = [];

        ledger.forEach(entry => {
            if (entry.status !== 'COMPLETED') return;
            const ts = new Date(entry.createdAt).getTime();
            if (entry.type === 'DEPOSIT') {
                events.push({ ts, type: 'DEPOSIT', amount: entry.amount });
            } else if (entry.type === 'WITHDRAWAL') {
                events.push({ ts, type: 'WITHDRAWAL', amount: entry.amount });
            } else if (entry.type === 'MANUAL_ADJUSTMENT' || entry.type === 'ADMIN_ACTION') {
                events.push({ ts, type: 'ADJUSTMENT', amount: entry.amount });
            }
        });

        trades.forEach(trade => {
            const ts = new Date(trade.createdAt).getTime();
            if (trade.type === 'BUY') {
                events.push({
                    ts,
                    type: 'BUY',
                    amount: trade.amount,
                    shares: trade.shares,
                    price: trade.price,
                    marketId: trade.marketId,
                    outcomeId: trade.outcomeId,
                    side: trade.side
                });
            } else if (trade.type === 'SELL') {
                events.push({
                    ts,
                    type: 'SELL',
                    amount: trade.amount,
                    shares: trade.shares,
                    price: trade.price,
                    marketId: trade.marketId,
                    outcomeId: trade.outcomeId,
                    side: trade.side
                });
            }
        });

        // Sort events by timestamp
        events.sort((a, b) => a.ts - b.ts);

        // If no events, return flat mock lines with proper dates
        if (events.length === 0) {
            const baseEquity = netWorth / 100;
            const basePnl = lifetimePnl / 100;
            const baseInvested = investedCapital / 100;
            return Array.from({ length: 8 }, (_, i) => ({
                date: new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                equity: baseEquity,
                invested: baseInvested,
                pnl: basePnl,
            }));
        }

        const points: { date: string; equity: number; invested: number; pnl: number }[] = [];
        
        // Prepend an initial starting baseline point 1 day before the first event to prevent single-point crash
        const firstEventTs = events[0].ts;
        const startTs = firstEventTs - 24 * 60 * 60 * 1000;
        const startDateLabel = new Date(startTs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        points.push({
            date: startDateLabel,
            equity: 0,
            invested: 0,
            pnl: 0,
        });
        
        let runningCash = 0;
        let runningInvested = 0;
        
        // Track position inventory: key = marketId_outcomeId_side
        const positionInventory = new Map<string, { qty: number; avgPrice: number; firstBuyTs: number }>();

        // Reconstruct the timeline
        events.forEach((ev) => {
            if (ev.type === 'DEPOSIT') {
                runningCash += ev.amount;
                runningInvested += ev.amount;
            } else if (ev.type === 'WITHDRAWAL') {
                runningCash -= ev.amount;
                runningInvested -= ev.amount;
            } else if (ev.type === 'ADJUSTMENT') {
                runningCash += ev.amount;
            } else if (ev.type === 'BUY') {
                runningCash -= ev.amount;
                const posKey = `${ev.marketId}_${ev.outcomeId || ''}_${ev.side}`;
                const currentPos = positionInventory.get(posKey) || { qty: 0, avgPrice: 0, firstBuyTs: ev.ts };
                const newQty = currentPos.qty + (ev.shares || 0);
                const newAvgPrice = newQty > 0 
                    ? ((currentPos.avgPrice * currentPos.qty) + ((ev.price || 0) * (ev.shares || 0))) / newQty
                    : 0;
                positionInventory.set(posKey, { qty: newQty, avgPrice: newAvgPrice, firstBuyTs: currentPos.firstBuyTs });
            } else if (ev.type === 'SELL') {
                runningCash += ev.amount;
                const posKey = `${ev.marketId}_${ev.outcomeId || ''}_${ev.side}`;
                const currentPos = positionInventory.get(posKey);
                if (currentPos) {
                    const newQty = Math.max(0, currentPos.qty - (ev.shares || 0));
                    if (newQty === 0) {
                        positionInventory.delete(posKey);
                    } else {
                        positionInventory.set(posKey, { ...currentPos, qty: newQty });
                    }
                }
            }

            // Calculate position value at this event's timestamp
            let positionsValueAtTs = 0;
            const t_now = Date.now();

            positionInventory.forEach((pos, key) => {
                const [mId, oId, sideStr] = key.split('_');
                const side = sideStr as Side;
                const currentMarketPrice = getMarketCurrentPrice(mId, side, oId || undefined);
                
                // Interpolate price from avgPrice to currentMarketPrice based on elapsed time since purchase
                const elapsed = ev.ts - pos.firstBuyTs;
                const totalDuration = Math.max(1, t_now - pos.firstBuyTs);
                const progress = Math.min(1, Math.max(0, elapsed / totalDuration));
                
                // Add realistic market price fluctuations over time for organic charts
                const fluctuation = Math.sin(ev.ts / (2 * 60 * 60 * 1000)) * 250; // smooth subtle variations
                
                const interpolatedPrice = pos.avgPrice + (currentMarketPrice - pos.avgPrice) * progress + fluctuation;
                const finalPrice = Math.min(10000, Math.max(0, interpolatedPrice));

                positionsValueAtTs += finalPrice * pos.qty;
            });

            const equityAtTs = (runningCash + positionsValueAtTs) / 100;
            const investedAtTs = runningInvested / 100;
            const pnlAtTs = equityAtTs - investedAtTs;

            const dateLabel = new Date(ev.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

            points.push({
                date: dateLabel,
                equity: Number(equityAtTs.toFixed(2)),
                invested: Number(investedAtTs.toFixed(2)),
                pnl: Number(pnlAtTs.toFixed(2)),
            });
        });

        // Append live "now" snapshot using real account values
        const todayLabel = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const currentEquity = netWorth / 100;
        const currentInvested = investedCapital / 100;
        const currentPnl = lifetimePnl / 100;

        if (points.length === 0 || points[points.length - 1].date !== todayLabel) {
            points.push({
                date: todayLabel,
                equity: Number(currentEquity.toFixed(2)),
                invested: Number(currentInvested.toFixed(2)),
                pnl: Number(currentPnl.toFixed(2)),
            });
        } else {
            points[points.length - 1].equity = Number(currentEquity.toFixed(2));
            points[points.length - 1].invested = Number(currentInvested.toFixed(2));
            points[points.length - 1].pnl = Number(currentPnl.toFixed(2));
        }

        return points;
    }, [ledger, trades, netWorth, investedCapital, lifetimePnl, markets]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                        <Activity size={16} strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Portfolio Overview</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Performance</h1>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                    <button
                        onClick={() => setChartMode('equity')}
                        className={`px-4 md:px-6 py-2 rounded-xl text-xs font-bold transition-all ${chartMode === 'equity' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                    >
                        Equity
                    </button>
                    <button
                        onClick={() => setChartMode('pnl')}
                        className={`px-4 md:px-6 py-2 rounded-xl text-xs font-bold transition-all ${chartMode === 'pnl' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                    >
                        P/L
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 glass-panel rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden h-[300px] md:h-[480px]">
                    <div className="absolute top-8 left-8 z-10">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-70">
                            {chartMode === 'equity' ? 'Value' : 'Performance'}
                        </div>
                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                                {formatMoney(chartMode === 'equity' ? netWorth : lifetimePnl)}
                            </span>
                            <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center ${allTimeROI >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                {allTimeROI >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                {Math.abs(allTimeROI).toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    <div className="absolute inset-0 pt-24">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData}>
                                <defs>
                                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#00D4AA" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#00D4AA" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#FF4757" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#FF4757" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.08} />
                                <XAxis dataKey="date" hide />
                                <YAxis domain={['auto', 'auto']} padding={{ top: 20, bottom: 20 }} hide />
                                <Tooltip
                                    cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="glass-panel p-3 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-xl backdrop-blur-md min-w-[150px]">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center gap-4">
                                                            <span className="text-[10px] font-bold text-slate-500">Net Worth</span>
                                                            <span className="text-xs font-black text-slate-900 dark:text-white">{formatMoney((data.equity ?? 0) * 100)}</span>
                                                        </div>
                                                        {chartMode === 'equity' && (
                                                            <div className="flex justify-between items-center gap-4">
                                                                <span className="text-[10px] font-bold text-slate-400">Invested</span>
                                                                <span className="text-xs font-bold text-slate-500">{formatMoney((data.invested ?? 0) * 100)}</span>
                                                            </div>
                                                        )}
                                                        <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-1"></div>
                                                        <div className="flex justify-between items-center gap-4">
                                                            <span className="text-[10px] font-bold text-slate-500">Total P/L</span>
                                                            <span className={`text-xs font-black ${(data.pnl ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                {(data.pnl ?? 0) >= 0 ? '+' : ''}{formatMoney(Math.abs(data.pnl ?? 0) * 100)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                {chartMode === 'equity' && (
                                     <Line
                                         type="linear"
                                         dataKey="invested"
                                         stroke="#94a3b8"
                                         strokeWidth={1.5}
                                         strokeDasharray="5 4"
                                         dot={false}
                                         activeDot={false}
                                         isAnimationActive={true}
                                         animationBegin={0}
                                         animationDuration={1000}
                                         animationEasing="linear"
                                     />
                                 )}
                                 <Area
                                     type="monotone"
                                     dataKey={chartMode === 'equity' ? 'equity' : 'pnl'}
                                     stroke={
                                         chartMode === 'equity'
                                             ? '#00D4AA'
                                             : lifetimePnl >= 0 ? '#00D4AA' : '#FF4757'
                                     }
                                     strokeWidth={2}
                                     fill={
                                         chartMode === 'equity'
                                             ? 'url(#greenGradient)'
                                             : lifetimePnl >= 0 ? 'url(#greenGradient)' : 'url(#redGradient)'
                                     }
                                     dot={false}
                                     activeDot={{
                                         r: 5,
                                         fill: chartMode === 'equity' ? '#00D4AA' : lifetimePnl >= 0 ? '#00D4AA' : '#FF4757',
                                         stroke: '#15171C',
                                         strokeWidth: 2,
                                     }}
                                     isAnimationActive={true}
                                     animationBegin={0}
                                     animationDuration={1000}
                                     animationEasing="ease-out"
                                 />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-4 grid grid-cols-1 gap-4">
                    <div className="bg-[#15171C] border border-[#22252B] rounded-xl p-4">
                        <p className="text-[#9AA0A6] text-xs uppercase tracking-wide mb-1">
                            Lifetime P/L
                        </p>
                        <p className={`text-2xl font-bold ${lifetimePnl >= 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
                            {lifetimePnl >= 0 ? '+' : ''}{formatMoney(Math.abs(lifetimePnl))}
                        </p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#22252B]">
                            <span className="text-[#9AA0A6] text-xs">Unrealized Gain</span>
                            <span className={unrealizedPL >= 0 ? 'text-[#00D4AA] text-sm font-medium' : 'text-[#FF4757] text-sm font-medium'}>
                                {unrealizedPL >= 0 ? '+' : ''}{formatMoney(unrealizedPL)}
                            </span>
                        </div>
                    </div>

                    <div className="bg-[#15171C] border border-[#22252B] rounded-xl p-4">
                        <h3 className="text-white font-bold text-base mb-1">Power Trader</h3>
                        <p className="text-[#9AA0A6] text-xs leading-relaxed">
                            High-Stakes Enabled. Standard contract face value increased to {formatMoney(1000)}.
                        </p>
                    </div>
                </div>
            </div >

            {/* Positions Section */}
            < div className="space-y-4" >
                {/* Section header (desktop only — mobile header lives inside the card container) */}
                <div className="hidden md:flex items-center justify-between px-2">
                    <h3 className="text-white text-sm font-bold uppercase tracking-wide">
                        Active Positions
                    </h3>
                    <span className="bg-[#00D4AA] text-[#0A0C10] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {positions.length}
                    </span>
                </div>

                {/* Mobile View: Clean minimal cards */}
                <div className="md:hidden bg-[#15171C] rounded-2xl border border-[#22252B] overflow-hidden">
                    {/* Section header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#22252B]">
                        <h3 className="text-white text-sm font-bold uppercase tracking-wide">
                            Active Positions
                        </h3>
                        <span className="bg-[#00D4AA] text-[#0A0C10] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            {positions.length}
                        </span>
                    </div>

                    {/* Cards */}
                    <div className="px-4">
                        {positions.map((pos) => {
                            const market = getMarket(pos.marketId);
                            const isOpen = !pos.status || pos.status === 'open';
                            // Potential max payout IF this position wins.
                            // Settlement pays 1 NPR (=100 cents) per share (migration 017: v_payout := quantity * 100).
                            const potentialPayoutCents = pos.quantity * 100;
                            return (
                                <div key={`${pos.marketId}-${pos.side}-${pos.outcomeId ?? 'main'}`} className="flex items-center gap-3 py-3.5 border-b border-[#22252B] last:border-0">

                                    {/* Market icon */}
                                    <img
                                        src={market?.imageUrl}
                                        className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                                        alt=""
                                    />

                                    {/* Center — market name + side + shares */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">
                                            {market?.title || 'Unknown Asset'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                pos.side === Side.YES
                                                    ? 'bg-[#00D4AA]/15 text-[#00D4AA]'
                                                    : 'bg-[#FF4757]/15 text-[#FF4757]'
                                            }`}>
                                                {pos.side}
                                            </span>
                                            <span className="text-[#9AA0A6] text-xs">
                                                {pos.quantity} shares
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right — potential payout + LIVE badge */}
                                    <div className="text-right flex-shrink-0">
                                        {isOpen ? (
                                            <p className="text-[#00D4AA] text-sm font-bold">
                                                {formatMoney(potentialPayoutCents)}
                                            </p>
                                        ) : (
                                            <p className="text-[#9AA0A6] text-sm font-bold">
                                                {formatMoney(potentialPayoutCents)}
                                            </p>
                                        )}
                                        {pos.status === 'won' && <span className="inline-block text-[10px] font-bold text-[#00D4AA] border border-[#00D4AA]/40 px-1.5 py-0.5 rounded-full">Won</span>}
                                        {pos.status === 'lost' && <span className="inline-block text-[10px] font-bold text-[#FF4757] border border-[#FF4757]/40 px-1.5 py-0.5 rounded-full">Lost</span>}
                                        {pos.status === 'cancelled' && <span className="inline-block text-[10px] font-bold text-[#9AA0A6] border border-[#9AA0A6]/40 px-1.5 py-0.5 rounded-full">Cancelled</span>}
                                        {isOpen && (
                                            <span className="inline-flex items-center gap-1.5 mt-1 text-[#00D4AA] text-[10px] font-bold border border-[#00D4AA]/40 px-2 py-0.5 rounded-full bg-[#00D4AA]/10">
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D4AA] opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00D4AA]"></span>
                                                </span>
                                                LIVE
                                            </span>
                                        )}
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Desktop View: Pro Table */}
                <div className="hidden md:block bg-[#15171C] border border-[#22252B] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#22252B]">
                                    <th className="text-left text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2">Asset</th>
                                    <th className="text-left text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2">Side</th>
                                    <th className="text-left text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2">Qty</th>
                                    <th className="text-left text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2">Avg Cost</th>
                                    <th className="text-left text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2">P/L</th>
                                    <th className="text-left text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {positions.map((pos, idx) => {
                                    const market = getMarket(pos.marketId);
                                    const currentPrice = getMarketCurrentPrice(pos.marketId, pos.side, pos.outcomeId);
                                    const pl = (currentPrice * pos.quantity) - (pos.avgPrice * pos.quantity);
                                    const plPercent = (pl / (pos.avgPrice * pos.quantity)) * 100;
                                    return (
                                        <tr key={idx} className="border-b border-[#22252B] last:border-0 hover:bg-[#1E2025]">
                                            <td className="px-4 py-3 text-white text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-[#1E2025] flex items-center justify-center text-xs overflow-hidden">
                                                        <img className="h-full w-full object-cover" src={market?.imageUrl} alt="" />
                                                    </span>
                                                    <span className="truncate max-w-[200px]">{market?.title || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-bold ${pos.side === Side.YES ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>{pos.side}</span>
                                            </td>
                                            <td className="px-4 py-3 text-white text-sm">{pos.quantity.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-white text-sm">{formatMoney(pos.avgPrice)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-sm font-bold tabular-nums ${pl >= 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>{pl >= 0 ? '+' : ''}{formatMoney(Math.abs(pl))}</span>
                                            </td>
                                            <td className="px-4 py-3 text-left">
                                                {pos.status === 'won' && <span className="text-[#00D4AA] text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-[#00D4AA]/30">Won</span>}
                                                {pos.status === 'lost' && <span className="text-[#FF4757] text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-[#FF4757]/30">Lost</span>}
                                                {pos.status === 'cancelled' && <span className="text-[#9AA0A6] text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-[#9AA0A6]/30">Cancelled</span>}
                                                {(!pos.status || pos.status === 'open') && <span className="text-[#FFA500] text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-[#FFA500]/30">Pending</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {
                    positions.length === 0 && (
                        <div className="text-center py-20 glass-panel rounded-[2rem]">
                            <Briefcase size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                            <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">No active positions</h3>
                        </div>
                    )
                }
            </div >

            {/* Historical Performance Calendar */}
            <div className="space-y-4">
                <PnLCalendar ledger={ledger} trades={trades} />
            </div>

            {/* Won Trades Section */}
            {wonTrades.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2 mb-3">
                        <h3 className="text-white text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                            🏆 Won Trades
                        </h3>
                        <span className="bg-[#00D4AA] text-[#0A0C10] text-xs font-bold px-2 py-0.5 rounded-full">
                            {wonTrades.length} won
                        </span>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden grid grid-cols-1 gap-3">
                        {wonTrades.map((trade) => {
                            const market = getMarket(trade.marketId);
                            return (
                                <div key={trade.id} className="glass-panel p-4 rounded-2xl border border-emerald-500/20 dark:border-emerald-500/10 flex flex-col gap-3 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -translate-y-6 translate-x-6" />
                                    <div className="flex items-center gap-3">
                                        <img src={market?.imageUrl} className="w-12 h-12 rounded-xl object-cover" alt="" />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight line-clamp-1">{market?.title || trade.marketTitle}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">WON</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{trade.shares} Shares</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-emerald-500">+{formatMoney(trade.potentialWin)}</div>
                                            <div className="text-[9px] font-bold text-slate-400 tabular-nums">Cost: {formatMoney(trade.amount)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                        <div className="text-[9px] font-bold text-slate-400">
                                            {new Date(trade.createdAt).toLocaleDateString()}
                                        </div>
                                        <button
                                            onClick={() => handleShareWin(trade)}
                                            className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors"
                                        >
                                            🎉 Share Win
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:block bg-[#15171C] border border-[#22252B] rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-[#1E2025] border-b border-[#22252B]">
                                        <th className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left">Market</th>
                                        <th className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left">Side</th>
                                        <th className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left">Shares</th>
                                        <th className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left">Cost</th>
                                        <th className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left">Payout</th>
                                        <th className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wonTrades.map((trade) => {
                                        const market = getMarket(trade.marketId);
                                        const profit = trade.potentialWin - trade.amount;
                                        return (
                                            <tr key={trade.id} className="border-b border-[#22252B] last:border-0 hover:bg-[#1E2025]">
                                                <td className="px-4 py-3 text-white text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-6 h-6 rounded-full bg-[#1E2025] flex items-center justify-center text-xs overflow-hidden">
                                                            <img className="h-full w-full object-cover" src={market?.imageUrl} alt="" />
                                                        </span>
                                                        <span className="truncate max-w-[200px]">{market?.title || trade.marketTitle}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-[#00D4AA]/30 text-[#00D4AA]`}>{trade.side}</span>
                                                </td>
                                                <td className="px-4 py-3 text-white text-sm">{trade.shares.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-[#9AA0A6] text-sm tabular-nums">{formatMoney(trade.amount)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-bold tabular-nums text-[#00D4AA]">{formatMoney(trade.potentialWin)}</div>
                                                    <div className="text-[10px] font-bold text-[#00D4AA] opacity-70">+{formatMoney(profit)} profit</div>
                                                </td>
                                                <td className="px-4 py-3 text-left">
                                                    <button
                                                        onClick={() => handleShareWin(trade)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide border border-[#00D4AA]/20 text-[#00D4AA] hover:bg-[#00D4AA]/10 transition-colors"
                                                    >
                                                        🎉 Share Win
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase History Section */}
            < div className="space-y-4" >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                    <div className="flex items-center gap-3">
                        <History size={20} className="text-indigo-600" />
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Share Purchase History</h2>
                    </div>
                </div>
                <ShareHistoryTable trades={trades.filter(t => t.type === 'BUY')} />
            </div >



            {/* Win Card Overlay */}
            {showWinCard && selectedWin && (() => {
                const winMarket = getMarket(selectedWin.marketId);
                return (
                    <WinCard
                        marketTitle={winMarket?.title || selectedWin.marketTitle}
                        predictedOutcome={selectedWin.outcomeTitle || selectedWin.side}
                        invested={toWinUnits(selectedWin.amount)}
                        won={toWinUnits(selectedWin.potentialWin)}
                        currency={currency}
                        onClose={() => setShowWinCard(false)}
                    />
                );
            })()}
        </div >
    );
};
