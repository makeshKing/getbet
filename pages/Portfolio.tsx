
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
    History,
    Activity,
    Flame,
    ExternalLink,
    ChevronUp,
    ChevronDown,
    Eye,
    EyeOff
} from 'lucide-react';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNavigate } from 'react-router-dom';

export const Portfolio: React.FC = () => {
    const navigateRouter = useNavigate();
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
    const [hideClosedMarkets, setHideClosedMarkets] = useState(false);
    const [wonSortConfig, setWonSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'payout', direction: 'desc' });
    const [showStatCards, setShowStatCards] = useState(() => {
        try {
            const stored = localStorage.getItem('oddara_portfolio_balance_visible');
            return stored !== null ? stored === 'true' : false;
        } catch { return false; }
    });

    // Won trades — only the 5 most recent wins, sorted newest first
    const allWonTrades = useMemo(() =>
        trades
            .filter(t => t.status === 'WON')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [trades]
    );
    const wonTrades = useMemo(() => allWonTrades.slice(0, 5), [allWonTrades]);

    function handleShareWin(trade: any) {
        // Safety check — only proceed if this is a winning position
        if (trade.status !== 'WON') {
            console.warn('Not a winning position');
            return;
        }

        setSelectedWin(trade);
        setShowWinCard(true);
    }

    const getMarket = (id: string) => markets.find(m => m.id === id);

    const getMarketCurrentPrice = (id: string, side: Side, outcomeId?: string) => {
        const m = markets.find(mkt => mkt.id === id);
        if (!m) return 0;
        if (m.outcome) {
            // If market is resolved
            if (m.outcome === 'CANCEL') return 100;
            // For multi-outcome, we'd need to know which outcome won.
            // Simplified: if market resolved to YES/NO, it usually implies binary logic.
            // For multi-choice, m.outcome might be the ID of the winning outcome?
            // Let's assume binary resolution for now or extend types later if strict multi-outcome resolution needed.
            if (m.outcome === 'YES') return side === Side.YES ? 100 : 0;
            if (m.outcome === 'NO') return side === Side.NO ? 100 : 0;
        }

        if (outcomeId && m.outcomes) {
            const outcome = m.outcomes.find(o => o.id === outcomeId);
            if (outcome) {
                return side === Side.YES ? outcome.probability : (100 - outcome.probability);
            }
        }
        return side === Side.YES ? m.probability : (100 - m.probability);
    };

    // --- Improved Financial Logic ---
    const filteredPositions = useMemo(() => {
        if (!hideClosedMarkets) return positions;
        return positions.filter(pos => {
            const m = markets.find(mkt => mkt.id === pos.marketId);
            return !(m?.status === 'resolved' || m?.outcome);
        });
    }, [positions, hideClosedMarkets, markets]);

    const totalInvested = filteredPositions.reduce((acc, p) => acc + (p.avgPrice * p.quantity), 0);

    const potentialPayout = filteredPositions.reduce((acc, p) => acc + (p.quantity * (p.faceValueCents || 100)), 0);

    const sortedWonTrades = useMemo(() => {
        const sorted = [...wonTrades];
        sorted.sort((a, b) => {
            const marketA = markets.find(m => m.id === a.marketId);
            const marketB = markets.find(m => m.id === b.marketId);
            let valA: any = 0;
            let valB: any = 0;
            if (wonSortConfig.key === 'market') {
                valA = marketA?.title || a.marketTitle;
                valB = marketB?.title || b.marketTitle;
            } else if (wonSortConfig.key === 'side') {
                valA = a.side;
                valB = b.side;
            } else if (wonSortConfig.key === 'shares') {
                valA = a.shares;
                valB = b.shares;
            } else if (wonSortConfig.key === 'cost') {
                valA = a.amount;
                valB = b.amount;
            } else if (wonSortConfig.key === 'payout') {
                valA = a.potentialWin;
                valB = b.potentialWin;
            }
            if (valA < valB) return wonSortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return wonSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [wonTrades, wonSortConfig, markets]);

    const handleWonSort = (key: string) => {
        setWonSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    if (!user) return null;
    const netWorth = (user?.balance || 0);
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

            const equityAtTs = runningCash / 100;
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
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
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

                <div className="lg:col-span-4">
                    {/* Mobile-only toggle for stat cards */}
                    <button
                        onClick={() => setShowStatCards(prev => {
                            const next = !prev;
                            try { localStorage.setItem('oddara_portfolio_balance_visible', String(next)); } catch {}
                            return next;
                        })}
                        className="md:hidden flex items-center gap-1.5 mb-2 text-[#9AA0A6] hover:text-white transition-colors"
                        aria-label={showStatCards ? 'Hide balance details' : 'Show balance details'}
                    >
                        {showStatCards ? <Eye size={16} /> : <EyeOff size={16} />}
                        <span className="text-[10px] uppercase tracking-wide font-medium">
                            {showStatCards ? 'Hide' : 'Show'} balances
                        </span>
                    </button>

                    {/* On desktop (md+): always visible grid. On mobile: animated collapse. */}
                    <div
                        className={`grid grid-cols-2 gap-4 transition-all duration-300 ease-in-out overflow-hidden md:!max-h-none md:!opacity-100 ${
                            showStatCards ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                    >
                        <div className="bg-[#15171C] border border-[#22252B] rounded-xl p-4 flex flex-col justify-center">
                            <p className="text-[#9AA0A6] text-[10px] uppercase tracking-wide mb-1">
                                Total Balance
                            </p>
                            <p className="text-xl font-bold text-white truncate" title={formatMoney(netWorth)}>
                                {formatMoney(netWorth)}
                            </p>
                        </div>
                        <div className="bg-[#15171C] border border-[#22252B] rounded-xl p-4 flex flex-col justify-center">
                            <p className="text-[#9AA0A6] text-[10px] uppercase tracking-wide mb-1">
                                Withdrawable
                            </p>
                            <p className="text-xl font-bold text-[#00D4AA] truncate" title={formatMoney(user?.withdrawableBalance || 0)}>
                                {formatMoney(user?.withdrawableBalance || 0)}
                            </p>
                        </div>
                        <div className="bg-[#15171C] border border-[#22252B] rounded-xl p-4 flex flex-col justify-center">
                            <p className="text-[#9AA0A6] text-[10px] uppercase tracking-wide mb-1">
                                Deposited
                            </p>
                            <p className="text-xl font-bold text-white truncate" title={formatMoney(totalDeposited)}>
                                {formatMoney(totalDeposited)}
                            </p>
                        </div>
                        <div className="bg-[#15171C] border border-[#22252B] rounded-xl p-4 flex flex-col justify-center">
                            <p className="text-[#9AA0A6] text-[10px] uppercase tracking-wide mb-1">
                                Withdrawn
                            </p>
                            <p className="text-xl font-bold text-white truncate" title={formatMoney(totalWithdrawn)}>
                                {formatMoney(totalWithdrawn)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
            {/* ══════════════════════════════════════════════════════
                 POSITIONS SECTION — Redesigned card layout
                 ══════════════════════════════════════════════════════ */}
            <div className="space-y-0">
                {/* ── Section Header ───────────────────────────────── */}
                <div className="border-b border-[#22252B] px-4 py-3">
                    <h2 className="text-white text-sm font-bold tracking-wide">
                        Positions ({positions.length})
                    </h2>
                </div>

                {/* ── Filter Row ──────────────────────────────────── */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={hideClosedMarkets}
                            onChange={(e) => setHideClosedMarkets(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-[#3A3D45] bg-[#14161B] accent-[#00D4AA] cursor-pointer transition-all"
                        />
                        <span className="text-[#9AA0A6] text-xs">Hide Other Markets</span>
                    </label>
                </div>

                {/* ── Position Cards ──────────────────────────────── */}
                <div className="space-y-2 px-1 transition-all duration-300">
                    {filteredPositions.map((pos) => {
                        const market = getMarket(pos.marketId);
                        const currentPriceCents = getMarketCurrentPrice(pos.marketId, pos.side, pos.outcomeId);
                        const avgCostCents = pos.avgPrice;
                        const shares = pos.quantity;

                        // Value = current price × shares (in cents)
                        const valueCents = currentPriceCents * shares;
                        // Amount invested = avg price × shares (in cents)
                        const investedCents = avgCostCents * shares;
                        // PNL
                        const pnlCents = valueCents - investedCents;
                        const pnlPercent = investedCents > 0 ? (pnlCents / investedCents) * 100 : 0;
                        // Payout if won = shares × face value (locked in on position)
                        const payoutCents = shares * (pos.faceValueCents || 100);

                        // Resolve outcome label for multi-choice or binary
                        let outcomeLabel: string = pos.side; // default: YES/NO
                        let outcomeIsPositive = pos.side === Side.YES;
                        if (pos.outcomeId && market?.outcomes) {
                            const matchedOutcome = market.outcomes.find(o => o.id === pos.outcomeId);
                            if (matchedOutcome) {
                                outcomeLabel = matchedOutcome.name;
                                // Determine color: treat "Down"/"No" as red, everything else as green
                                const lowerName = matchedOutcome.name.toLowerCase();
                                outcomeIsPositive = !(lowerName === 'down' || lowerName === 'no');
                            }
                        }

                        // Get the market/outcome icon
                        let iconUrl = market?.imageUrl;
                        if (pos.outcomeId && market?.outcomes) {
                            const oc = market.outcomes.find(o => o.id === pos.outcomeId);
                            if (oc?.icon) iconUrl = oc.icon;
                        }

                        return (
                            <div
                                key={`${pos.marketId}-${pos.side}-${pos.outcomeId ?? 'main'}`}
                                onClick={() => navigateRouter(`/market/${pos.marketId}`)}
                                className="bg-[#14161B] rounded-xl p-3 border border-[#1E2025] hover:bg-[#1A1C23] hover:border-[#3A3D45] transition-all cursor-pointer"
                            >
                                {/* Row 1: Icon + Title + Share icon */}
                                <div className="flex items-start gap-2.5 mb-2">
                                    <img
                                        src={iconUrl}
                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5 ring-1 ring-[#2A2D35]"
                                        alt=""
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-[13px] font-semibold truncate leading-tight">
                                            {market?.title || 'Unknown Market'}
                                        </p>
                                        <span className={`inline-block text-[11px] font-bold mt-0.5 ${
                                            outcomeIsPositive ? 'text-[#00D4AA]' : 'text-[#FF4757]'
                                        }`}>
                                            {outcomeLabel}
                                        </span>
                                    </div>
                                    <button className="flex-shrink-0 text-[#9AA0A6] hover:text-white transition-colors p-0.5">
                                        <ExternalLink size={14} />
                                    </button>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-[#1E2025] my-2" />

                                {/* Row 2: Cur. Price / Avg. Cost  |  Shares */}
                                <div className="flex items-start justify-between mb-2.5">
                                    <div>
                                        <p className="text-[#6B7280] text-[10px] font-medium tracking-wide mb-0.5">Cur. Price / Avg. Cost</p>
                                        <p className="text-white text-[13px] font-semibold tabular-nums">
                                            {formatMoney(currentPriceCents)}{' '}
                                            <span className="text-[#6B7280]">/</span>{' '}
                                            {formatMoney(avgCostCents)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[#6B7280] text-[10px] font-medium tracking-wide mb-0.5">Shares</p>
                                        <p className="text-white text-[13px] font-semibold tabular-nums">{shares.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>

                                {/* Row 3: Value  |  PNL  |  Payout if Won */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-[#6B7280] text-[10px] font-medium tracking-wide mb-0.5">Value</p>
                                        <p className="text-white text-[13px] font-semibold tabular-nums">
                                            {formatMoney(valueCents)}
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[#6B7280] text-[10px] font-medium tracking-wide mb-0.5">PNL</p>
                                        <p className={`text-[13px] font-semibold tabular-nums ${pnlCents >= 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
                                            {pnlCents >= 0 ? '+' : '-'}{formatMoney(Math.abs(pnlCents))}{' '}
                                            <span className="text-[11px]">
                                                ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                                            </span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[#6B7280] text-[10px] font-medium tracking-wide mb-0.5">Payout if Won</p>
                                        <p className="text-[#00D4AA] text-[13px] font-semibold tabular-nums">
                                            {formatMoney(payoutCents)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Empty state ─────────────────────────────────── */}
                {positions.length === 0 && (
                    <div className="text-center py-16 px-4">
                        <Briefcase size={36} className="mx-auto text-[#3A3D45] mb-3" />
                        <h3 className="text-sm font-bold text-[#6B7280] uppercase tracking-widest">No active positions</h3>
                        <p className="text-[#4B5563] text-xs mt-1">Your open positions will appear here</p>
                    </div>
                )}
            </div>



            {/* Won Trades Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2 mb-3">
                        <h3 className="text-white text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                            🏆 Won Trades
                        </h3>
                        {allWonTrades.length > 0 && (
                            <span className="bg-[#00D4AA] text-[#0A0C10] text-xs font-bold px-2 py-0.5 rounded-full">
                                {allWonTrades.length} won
                            </span>
                        )}
                    </div>

                    {wonTrades.length === 0 && (
                        <p className="text-[#9AA0A6] text-sm text-center py-6">
                            No wins yet — your winning trades will appear here.
                        </p>
                    )}

                    {wonTrades.length > 0 && (
                    <>
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
                                            <div className="text-sm font-black text-emerald-500">+{formatMoney(trade.potentialWin / 100)}</div>
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
                                        <th onClick={() => handleWonSort('market')} className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left cursor-pointer hover:text-white transition-colors">
                                            <div className="flex items-center gap-1">
                                                Market
                                                {wonSortConfig.key === 'market' && (wonSortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                                            </div>
                                        </th>
                                        <th onClick={() => handleWonSort('side')} className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left cursor-pointer hover:text-white transition-colors">
                                            <div className="flex items-center gap-1">
                                                Side
                                                {wonSortConfig.key === 'side' && (wonSortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                                            </div>
                                        </th>
                                        <th onClick={() => handleWonSort('shares')} className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left cursor-pointer hover:text-white transition-colors">
                                            <div className="flex items-center gap-1">
                                                Shares
                                                {wonSortConfig.key === 'shares' && (wonSortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                                            </div>
                                        </th>
                                        <th onClick={() => handleWonSort('cost')} className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left cursor-pointer hover:text-white transition-colors">
                                            <div className="flex items-center gap-1">
                                                Cost
                                                {wonSortConfig.key === 'cost' && (wonSortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                                            </div>
                                        </th>
                                        <th onClick={() => handleWonSort('payout')} className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left cursor-pointer hover:text-white transition-colors">
                                            <div className="flex items-center gap-1">
                                                Payout
                                                {wonSortConfig.key === 'payout' && (wonSortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                                            </div>
                                        </th>
                                        <th className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedWonTrades.map((trade) => {
                                        const market = getMarket(trade.marketId);
                                        const payoutCents = trade.potentialWin / 100;
                                        const profit = payoutCents - trade.amount;
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
                                                    <div className="text-sm font-bold tabular-nums text-[#00D4AA]">{formatMoney(payoutCents)}</div>
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
                    </>
                    )}
                </div>

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
                </div>
                <div className="lg:col-span-4 space-y-8">
                    {/* Historical Performance Calendar */}
                    <div className="space-y-4">
                        <PnLCalendar ledger={ledger} trades={trades} />
                    </div>
                </div>
            </div>



            {/* Win Card Overlay */}
            {showWinCard && selectedWin && (() => {
                const winMarket = getMarket(selectedWin.marketId);
                return (
                    <WinCard
                        marketTitle={winMarket?.title || selectedWin.marketTitle}
                        predictedOutcome={selectedWin.outcomeTitle || selectedWin.side}
                        invested={toWinUnits(selectedWin.amount)}
                        won={toWinUnits(selectedWin.potentialWin / 100)}
                        currency={currency}
                        onClose={() => setShowWinCard(false)}
                    />
                );
            })()}
        </div >
    );
};
