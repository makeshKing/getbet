
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Side, Position } from '../types';
import { Button } from '../components/ui/Button';
import { SellDialog } from '../components/SellDialog';
import { ShareHistoryTable } from '../components/ShareHistoryTable';
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
    Target,
    Flame,
    ExternalLink
} from 'lucide-react';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const Portfolio: React.FC = () => {
    const { positions, trades, markets, ledger } = useApp();
    const { userProfile: user } = useAuth();
    const [selectedPos, setSelectedPos] = useState<Position | null>(null);
    const [chartMode, setChartMode] = useState<'equity' | 'pnl'>('equity');
    // animKey forces Recharts to remount & replay the animation when mode switches
    const [animKey, setAnimKey] = useState(0);

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
            // 1. Try to get real-time price from market
            let price = 0;
            const m = getMarket(p.marketId);
            if (m) {
                if (p.outcomeId && m.outcomes) {
                    const o = m.outcomes.find(oc => oc.id === p.outcomeId);
                    if (o) price = p.side === Side.YES ? o.probability * 100 : (100 - o.probability) * 100;
                } else {
                    price = p.side === Side.YES ? m.probability * 100 : (100 - m.probability) * 100;
                }
            }
            return acc + (price * p.quantity);
        }, 0);
    }, [positions]);

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
        type RawEvent = { ts: number; balanceDelta: number; pnlDelta: number; invested: number };
        const events: RawEvent[] = [];

        // Ledger events (deposits / withdrawals)
        ledger.forEach(entry => {
            if (entry.status !== 'COMPLETED') return;
            const ts = new Date(entry.createdAt).getTime();
            const amount = entry.amount / 100; // convert paise → Rs
            if (entry.type === 'DEPOSIT') {
                events.push({ ts, balanceDelta: amount, pnlDelta: 0, invested: amount });
            } else if (entry.type === 'WITHDRAWAL') {
                events.push({ ts, balanceDelta: amount, pnlDelta: 0, invested: amount });
            } else if (entry.type === 'TRADE_PROFIT') {
                events.push({ ts, balanceDelta: amount, pnlDelta: amount, invested: 0 });
            } else if (entry.type === 'TRADE_LOSS') {
                events.push({ ts, balanceDelta: amount, pnlDelta: amount, invested: 0 });
            }
        });

        // Trade buy/sell events for richer granularity
        trades.forEach(trade => {
            const ts = new Date(trade.createdAt).getTime();
            if (trade.type === 'BUY') {
                events.push({ ts, balanceDelta: -(trade.amount / 100), pnlDelta: 0, invested: trade.amount / 100 });
            } else if (trade.type === 'SELL') {
                const pnl = trade.status === 'WON'
                    ? (trade.amount / 100)
                    : -(trade.amount / 100);
                events.push({ ts, balanceDelta: trade.amount / 100, pnlDelta: pnl, invested: 0 });
            }
        });

        if (events.length === 0) {
            // No history — show a flat line anchored at current values with 8 phantom points
            const baseEquity = netWorth / 100;
            const basePnl = lifetimePnl / 100;
            const baseInvested = investedCapital / 100;
            return Array.from({ length: 8 }, (_, i) => ({
                date: '',
                equity: baseEquity,
                invested: baseInvested,
                pnl: basePnl,
            }));
        }

        // Sort ascending by timestamp
        events.sort((a, b) => a.ts - b.ts);

        // Group by calendar day, accumulate running totals
        const dayMap = new Map<string, { equity: number; invested: number; pnl: number }>();
        let runningEquity = 0;
        let runningInvested = 0;
        let runningPnl = 0;

        events.forEach(ev => {
            runningEquity += ev.balanceDelta;
            runningInvested += ev.invested;
            runningPnl += ev.pnlDelta;
            const dayKey = new Date(ev.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            dayMap.set(dayKey, {
                equity: runningEquity,
                invested: runningInvested,
                pnl: runningPnl,
            });
        });

        // Convert map to sorted array and append today's live snapshot
        const points = Array.from(dayMap.entries()).map(([date, v]) => ({
            date,
            equity: Math.max(0, v.equity),
            invested: Math.max(0, v.invested),
            pnl: v.pnl,
        }));

        // Append live "now" snapshot using real account values
        const todayLabel = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (points.length === 0 || points[points.length - 1].date !== todayLabel) {
            points.push({
                date: todayLabel,
                equity: netWorth / 100,
                invested: investedCapital / 100,
                pnl: lifetimePnl / 100,
            });
        } else {
            // Update today's point with live values
            points[points.length - 1].equity = netWorth / 100;
            points[points.length - 1].invested = investedCapital / 100;
            points[points.length - 1].pnl = lifetimePnl / 100;
        }

        return points;
    }, [ledger, trades, netWorth, investedCapital, lifetimePnl]);

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
                        onClick={() => { setChartMode('equity'); setAnimKey(k => k + 1); }}
                        className={`px-4 md:px-6 py-2 rounded-xl text-xs font-bold transition-all ${chartMode === 'equity' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                    >
                        Equity
                    </button>
                    <button
                        onClick={() => { setChartMode('pnl'); setAnimKey(k => k + 1); }}
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
                                Rs. {(chartMode === 'equity' ? netWorth / 100 : lifetimePnl / 100).toLocaleString()}
                            </span>
                            <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center ${allTimeROI >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                {allTimeROI >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                {Math.abs(allTimeROI).toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    <div className="absolute inset-0 pt-24">
                        <ResponsiveContainer width="100%" height="100%">
                            {/* animKey forces full remount → replays enter animation on mode switch */}
                            <ComposedChart key={animKey} data={chartData}>
                                <defs>
                                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="pnlGradPos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="pnlGradNeg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.08} />
                                <XAxis dataKey="date" hide />
                                <YAxis domain={['auto', 'auto']} hide />
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
                                                            <span className="text-xs font-black text-slate-900 dark:text-white">Rs. {(data.equity ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                        {chartMode === 'equity' && (
                                                            <div className="flex justify-between items-center gap-4">
                                                                <span className="text-[10px] font-bold text-slate-400">Invested</span>
                                                                <span className="text-xs font-bold text-slate-500">Rs. {(data.invested ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                        )}
                                                        <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-1"></div>
                                                        <div className="flex justify-between items-center gap-4">
                                                            <span className="text-[10px] font-bold text-slate-500">Total P/L</span>
                                                            <span className={`text-xs font-black ${(data.pnl ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                {(data.pnl ?? 0) >= 0 ? '+' : ''}Rs. {(data.pnl ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                                        type="monotone"
                                        dataKey="invested"
                                        stroke="#94a3b8"
                                        strokeWidth={1.5}
                                        strokeDasharray="5 4"
                                        dot={false}
                                        activeDot={false}
                                        isAnimationActive={true}
                                        animationBegin={0}
                                        animationDuration={1200}
                                        animationEasing="ease-out"
                                    />
                                )}
                                <Area
                                    type="monotone"
                                    dataKey={chartMode === 'equity' ? 'equity' : 'pnl'}
                                    stroke={
                                        chartMode === 'equity'
                                            ? '#6366f1'
                                            : lifetimePnl >= 0 ? '#10b981' : '#ef4444'
                                    }
                                    strokeWidth={2.5}
                                    fill={
                                        chartMode === 'equity'
                                            ? 'url(#equityGrad)'
                                            : lifetimePnl >= 0 ? 'url(#pnlGradPos)' : 'url(#pnlGradNeg)'
                                    }
                                    dot={false}
                                    activeDot={{
                                        r: 5,
                                        fill: chartMode === 'equity' ? '#6366f1' : lifetimePnl >= 0 ? '#10b981' : '#ef4444',
                                        stroke: '#fff',
                                        strokeWidth: 2,
                                    }}
                                    isAnimationActive={true}
                                    animationBegin={100}
                                    animationDuration={1400}
                                    animationEasing="ease-out"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-4 grid grid-cols-1 gap-4">
                    <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl"><Target size={24} /></div>
                            <div className="text-right">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lifetime P/L</div>
                                <div className={`text-xl font-black ${lifetimePnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {lifetimePnl >= 0 ? '+' : ''}Rs. {(lifetimePnl / 100).toFixed(2)}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 pt-4">
                            <div className="flex justify-between text-xs font-bold border-t border-slate-100 dark:border-slate-800 pt-3">
                                <span className="text-slate-500">Unrealized Gain</span>
                                <span className={unrealizedPL >= 0 ? 'text-emerald-500' : 'text-red-500'}>Rs. {(unrealizedPL / 100).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between bg-slate-900 dark:bg-indigo-950 text-white relative overflow-hidden">
                        <div className="absolute -right-6 -bottom-6 text-white opacity-5"><Flame size={120} /></div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-black mb-1">Power Trader</h3>
                            <p className="text-xs text-indigo-200 leading-relaxed opacity-70 tracking-tight">High Stakes Enabled. Standard contract face value increased to Rs. 10.00.</p>
                        </div>
                    </div>
                </div>
            </div >

            {/* Positions Section */}
            < div className="space-y-4" >
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <PieChart size={20} className="text-indigo-600" />
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Active Positions</h2>
                    </div>
                    <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-1 rounded-full uppercase tracking-widest">{positions.length}</span>
                </div>

                {/* Mobile View: Snappy Cards (YouTube Style) */}
                <div className="md:hidden grid grid-cols-1 gap-3">
                    {positions.map((pos, idx) => {
                        const market = getMarket(pos.marketId);
                        const currentPrice = getMarketCurrentPrice(pos.marketId, pos.side, pos.outcomeId);
                        const pl = (currentPrice * pos.quantity) - (pos.avgPrice * pos.quantity);
                        return (
                            <div key={idx} className="glass-panel p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-3 active:scale-[0.98] transition-all" onClick={() => setSelectedPos(pos)}>
                                <div className="flex items-center gap-3">
                                    <img src={market?.imageUrl} className="w-12 h-12 rounded-xl object-cover" alt="" />
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight line-clamp-1">{market?.title || 'Unknown Asset'}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${pos.side === Side.YES ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'}`}>{pos.side}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{pos.quantity} Shares</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-black ${pl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {pl >= 0 ? '+' : ''}Rs.{(pl / 100).toFixed(1)}
                                        </div>
                                        <div className="text-[9px] font-bold text-slate-400 tabular-nums">@Rs.{currentPrice / 100}</div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-500 uppercase tracking-widest">
                                        <Target size={10} /> Buy: Rs.{pos.avgPrice / 100}
                                    </div>
                                    <button className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1 uppercase tracking-widest">
                                        Sell Now <ExternalLink size={10} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Desktop View: Pro Table */}
                <div className="hidden md:block glass-panel rounded-[2rem] shadow-sm overflow-hidden border border-slate-200/50 dark:border-slate-800/50">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Asset</th>
                                    <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Side</th>
                                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg Cost</th>
                                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">P/L</th>
                                    <th className="px-8 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {positions.map((pos, idx) => {
                                    const market = getMarket(pos.marketId);
                                    const currentPrice = getMarketCurrentPrice(pos.marketId, pos.side, pos.outcomeId);
                                    const pl = (currentPrice * pos.quantity) - (pos.avgPrice * pos.quantity);
                                    const plPercent = (pl / (pos.avgPrice * pos.quantity)) * 100;
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-indigo-900/10 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <img className="h-10 w-10 rounded-xl object-cover" src={market?.imageUrl} alt="" />
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-black text-slate-900 dark:text-white truncate">{market?.title || 'Unknown'}</div>
                                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{market?.category}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 ${pos.side === Side.YES ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20' : 'bg-red-500/5 text-red-600 border-red-500/20'}`}>{pos.side}</span>
                                            </td>
                                            <td className="px-6 py-5 text-right text-xs font-black text-slate-700 dark:text-slate-300">{pos.quantity.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-right text-xs text-slate-400 font-bold tabular-nums">Rs.{(pos.avgPrice / 100).toFixed(2)}</td>
                                            <td className="px-6 py-5 text-right">
                                                <div className={`text-sm font-black tabular-nums ${pl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{pl >= 0 ? '+' : ''}Rs.{(pl / 100).toFixed(2)}</div>
                                                <div className={`text-[9px] font-black ${pl >= 0 ? 'text-emerald-500' : 'text-red-500'} opacity-70`}>{pl >= 0 ? '+' : ''}{plPercent.toFixed(1)}%</div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <Button size="sm" variant="kalshi" className="h-9 px-4 text-[9px] font-black uppercase tracking-widest" onClick={() => setSelectedPos(pos)}>Sell Position</Button>
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

            <SellDialog
                isOpen={!!selectedPos}
                onClose={() => setSelectedPos(null)}
                position={selectedPos}
                marketTitle={selectedPos ? getMarket(selectedPos.marketId)?.title || '' : ''}
                currentPrice={selectedPos ? getMarketCurrentPrice(selectedPos.marketId, selectedPos.side, selectedPos.outcomeId) : 0}
            />
        </div >
    );
};
