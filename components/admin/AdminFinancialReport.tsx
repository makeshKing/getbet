
import React, { useState, useMemo, useEffect } from 'react';
import { getAllLedger } from '../../services/supabaseService';
import { LedgerEntry, LedgerType } from '../../types';
import { ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp, Activity, Clock } from 'lucide-react';

type TimePeriod = 'today' | 'week' | 'month' | 'all';

interface FinancialStats {
    deposits: { total: number; count: number; average: number };
    withdrawals: { total: number; count: number; average: number };
    netFlow: number;
}

export const AdminFinancialReport: React.FC = () => {
    const [period, setPeriod] = useState<TimePeriod>('today');
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);

    useEffect(() => {
        getAllLedger().then(setLedger);
    }, []);

    // Helper to check if a date is in the current period
    const isInPeriod = (dateStr: string, p: TimePeriod) => {
        const date = new Date(dateStr);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (p === 'all') return true;
        if (p === 'today') return date >= startOfDay;

        if (p === 'week') {
            const startOfWeek = new Date(startOfDay);
            startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay()); // Start of week (Sunday)
            return date >= startOfWeek;
        }

        if (p === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return date >= startOfMonth;
        }
        return false;
    };

    const stats = useMemo(() => {
        const filtered = ledger.filter(l => isInPeriod(l.createdAt, period));

        const deposits = filtered.filter(l => l.type === LedgerType.DEPOSIT && l.status === 'COMPLETED');
        const withdrawals = filtered.filter(l => l.type === LedgerType.WITHDRAWAL && l.status === 'COMPLETED');

        const depositTotal = deposits.reduce((sum, l) => sum + l.amount, 0);
        const withdrawalTotal = withdrawals.reduce((sum, l) => sum + Math.abs(l.amount), 0); // Withdrawal amounts might be stored as negative or positive. Let's check mockStore. Usually withdrawals are negative in ledger or just type separated.
        // Checking mockStore.ts: requestWithdrawal does `amount: -amountCents`. So they are negative.
        // We need absolute value for "Total Withdrawals".

        return {
            deposits: {
                total: depositTotal,
                count: deposits.length,
                average: deposits.length ? depositTotal / deposits.length : 0
            },
            withdrawals: {
                total: Math.abs(withdrawalTotal),
                count: withdrawals.length,
                average: withdrawals.length ? Math.abs(withdrawalTotal) / withdrawals.length : 0
            },
            netFlow: depositTotal - Math.abs(withdrawalTotal) // Cash generated
        };
    }, [ledger, period]);

    const pendingStats = useMemo(() => {
        const pDeposits = ledger.filter(l => l.type === LedgerType.DEPOSIT && l.status === 'PENDING');
        const pWithdrawals = ledger.filter(l => l.type === LedgerType.WITHDRAWAL && l.status === 'PENDING');
        return {
            deposits: pDeposits.length,
            withdrawals: pWithdrawals.length
        };
    }, [ledger]);

    const formatMoney = (cents: number) => `Rs. ${(Math.abs(cents) / 100).toLocaleString('en-NP', { minimumFractionDigits: 2 })}`;

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header & Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                        <Activity className="text-indigo-500" />
                        Financial Report
                    </h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                        Track system liquidity and transaction flows
                    </p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-600/50">
                    {(['today', 'week', 'month', 'all'] as TimePeriod[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${period === p
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            {p === 'all' ? 'All Time' : p === 'today' ? 'Today' : `This ${p}`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Deposits */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ArrowDownLeft size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
                                <ArrowDownLeft size={24} />
                            </div>
                            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Deposits</span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                            {formatMoney(stats.deposits.total)}
                        </h3>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-t border-slate-100 dark:border-slate-700/50 pt-3 mt-3">
                            <span>{stats.deposits.count} transactions</span>
                            <span>Avg: {formatMoney(stats.deposits.average)}</span>
                        </div>
                    </div>
                </div>

                {/* Total Withdrawals */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ArrowUpRight size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400">
                                <ArrowUpRight size={24} />
                            </div>
                            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Withdrawals</span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                            {formatMoney(stats.withdrawals.total)}
                        </h3>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-t border-slate-100 dark:border-slate-700/50 pt-3 mt-3">
                            <span>{stats.withdrawals.count} processed</span>
                            <span>Avg: {formatMoney(stats.withdrawals.average)}</span>
                        </div>
                    </div>
                </div>

                {/* Net Cash Flow */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-3 rounded-2xl ${stats.netFlow >= 0 ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                                <Wallet size={24} />
                            </div>
                            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Net Cash Flow</span>
                        </div>
                        <h3 className={`text-3xl font-black mb-1 ${stats.netFlow >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {stats.netFlow >= 0 ? '+' : '-'}{formatMoney(Math.abs(stats.netFlow))}
                        </h3>
                        <div className="text-[11px] font-bold text-slate-500 border-t border-slate-100 dark:border-slate-700/50 pt-3 mt-3">
                            Liquidity Change ({period})
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Requests & Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Pending Actions Status */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/20">
                        <div className="flex items-center gap-3 mb-2">
                            <Clock className="text-amber-500" size={20} />
                            <h4 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-widest">Pending Actions</h4>
                        </div>
                        <div className="space-y-3 mt-4">
                            <div className="flex justify-between items-center py-2 border-b border-amber-200/50 dark:border-amber-800/20">
                                <span className="text-xs font-bold text-amber-800 dark:text-amber-200">Deposits</span>
                                <span className="bg-white dark:bg-amber-950 px-2 py-1 rounded-lg text-xs font-black text-amber-600 dark:text-amber-400 shadow-sm">
                                    {pendingStats.deposits}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-xs font-bold text-amber-800 dark:text-amber-200">Withdrawals</span>
                                <span className="bg-white dark:bg-amber-950 px-2 py-1 rounded-lg text-xs font-black text-amber-600 dark:text-amber-400 shadow-sm">
                                    {pendingStats.withdrawals}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 text-center">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">All times in local system time</p>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>

                {/* Visualization (Simple Bar Chart via CSS) */}
                <div className="lg:col-span-3 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-8">Transaction Volume Distribution</h3>

                    <div className="h-48 flex items-end justify-center gap-16 px-4">
                        {/* Deposit Bar */}
                        <div className="flex flex-col items-center gap-3 w-24 group cursor-default">
                            <div className="text-xs font-bold text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                                {formatMoney(stats.deposits.total)}
                            </div>
                            <div
                                className="w-full bg-emerald-500 rounded-t-xl transition-all duration-500 relative hover:bg-emerald-400"
                                style={{
                                    height: `${Math.max(4, (stats.deposits.total / (Math.max(stats.deposits.total, stats.withdrawals.total, 1))) * 100)}%`,
                                    opacity: stats.deposits.total > 0 ? 1 : 0.1
                                }}
                            >
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deposits</span>
                        </div>

                        {/* Withdrawal Bar */}
                        <div className="flex flex-col items-center gap-3 w-24 group cursor-default">
                            <div className="text-xs font-bold text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                                {formatMoney(stats.withdrawals.total)}
                            </div>
                            <div
                                className="w-full bg-rose-500 rounded-t-xl transition-all duration-500 hover:bg-rose-400"
                                style={{
                                    height: `${Math.max(4, (stats.withdrawals.total / (Math.max(stats.deposits.total, stats.withdrawals.total, 1))) * 100)}%`,
                                    opacity: stats.withdrawals.total > 0 ? 1 : 0.1
                                }}
                            >
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Withdrawals</span>
                        </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50 flex justify-center text-center">
                        <p className="text-xs text-slate-500 max-w-md">
                            Showing comparison between total inflow and outflow for period: <span className="font-bold text-slate-900 dark:text-white uppercase">{period === 'all' ? 'All Time' : period}</span>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
