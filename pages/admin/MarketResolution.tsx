
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Market, MarketOutcome, Outcome } from '../../types';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { Check, CheckCircle, Circle, Swords, AlertTriangle, BarChart2 } from 'lucide-react';
import { getMarketResolutionPreview, MarketResolutionPreview, getMarketUserProfits, UserProfitPreview } from '../../services/supabaseService';

interface AdminMarketResolutionProps {
    marketId: string;
    onBack: () => void;
}

export const AdminMarketResolution: React.FC<AdminMarketResolutionProps> = ({ marketId, onBack }) => {
    const { markets, adminResolveMarket } = useApp();
    const { formatMoney } = useCurrency();
    const { addToast } = useToast();
    const market = markets.find(m => m.id === marketId);

    // For binary/VS markets: YES | NO | CANCEL
    // For multi-outcome markets: the outcome.id string, or 'CANCEL'
    const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
    const [preview, setPreview] = useState<MarketResolutionPreview | null>(null);
    const [userProfits, setUserProfits] = useState<UserProfitPreview[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(true);
    const [isResolving, setIsResolving] = useState(false);

    useEffect(() => {
        if (!marketId) return;
        setLoadingPreview(true);
        Promise.all([
            getMarketResolutionPreview(marketId).then(setPreview),
            getMarketUserProfits(marketId).then(setUserProfits),
        ])
            .catch(e => {
                console.error('Failed to load preview stats', e);
                addToast('Failed to load market statistics', 'error');
            })
            .finally(() => setLoadingPreview(false));
    }, [marketId]);

    if (!market) {
        return (
            <div className="p-8 text-center">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Market Not Found</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">The market ID {marketId} does not exist.</p>
                <Button onClick={onBack}>Go Back</Button>
            </div>
        );
    }

    const isVs = market.subcategory === 'Head-to-Head' && market.candidateA && market.candidateB;
    const isMultiOutcome = !isVs && market.outcomes && market.outcomes.length > 0;

    /** Friendly name for the selected outcome (for the confirmation dialog) */
    const getSelectedLabel = (): string => {
        if (!selectedOutcome) return '';
        if (selectedOutcome === 'CANCEL') return 'CANCEL (void — full refunds)';
        if (isMultiOutcome) {
            const o = market.outcomes!.find(x => x.id === selectedOutcome);
            return o ? o.name : selectedOutcome;
        }
        if (selectedOutcome === 'YES' && isVs) return market.candidateA!.name;
        if (selectedOutcome === 'NO' && isVs) return market.candidateB!.name;
        return selectedOutcome;
    };

    const handleResolve = async () => {
        if (!selectedOutcome) return;
        if (!confirm(`Irreversibly resolve "${market.title}" — Winner: ${getSelectedLabel()}?`)) return;

        setIsResolving(true);
        try {
            // For multi-outcome markets the outcome ID is passed directly.
            // The SQL function accepts any non-empty TEXT so this is safe.
            const result = await adminResolveMarket(market.id, selectedOutcome as Outcome);
            addToast(
                `Market resolved! ${result.winners} winner(s). Paid: ${formatMoney(result.total_paid)}, House: ${formatMoney(result.house_profit)}`,
                'success'
            );
            onBack();
        } catch (e: any) {
            addToast('Error resolving market: ' + e.message, 'error');
        } finally {
            setIsResolving(false);
        }
    };

    const yesPayout    = preview ? preview.yes_payout / 100 : 0;
    const yesProfit    = preview ? preview.house_if_yes / 100 : 0;
    const noPayout     = preview ? preview.no_payout / 100 : 0;
    const noProfit     = preview ? preview.house_if_no / 100 : 0;
    const totalInvested = preview ? preview.total_invested / 100 : 0;

    // ── Shared: CANCEL option card ──────────────────────────────
    const CancelCard = () => (
        <div
            onClick={() => setSelectedOutcome('CANCEL')}
            className={`border-2 rounded-3xl p-5 cursor-pointer transition-all duration-200 col-span-full ${
                selectedOutcome === 'CANCEL'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10 shadow-lg shadow-amber-500/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
            }`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                    selectedOutcome === 'CANCEL' ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                }`}>
                    {selectedOutcome === 'CANCEL' ? <Check size={18} strokeWidth={3} /> : <AlertTriangle size={16} />}
                </div>
                <div>
                    <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Void / Cancel</div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">Cancel Market (Full Refunds)</div>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">All positions refunded at cost basis. No winners or losers.</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Declare Market Outcome</h1>
                    <p className="text-sm text-slate-500 font-medium">Settle all open contracts and distribute payouts.</p>
                </div>
                <Button variant="outline" onClick={onBack} className="text-xs font-black uppercase tracking-widest">Cancel</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* ── Left Column: Market details ─── */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">
                            Market Asset Information
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4 mb-4">
                                <img src={market.imageUrl} className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700" alt={market.title} />
                                <div className="min-w-0">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-1">{market.title}</h3>
                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                                        {market.category}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Volume</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{formatMoney(market.volume || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Invested</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                                        {loadingPreview ? '...' : formatMoney(totalInvested * 100)}
                                    </span>
                                </div>
                                {isMultiOutcome ? (
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Outcomes</span>
                                        <span className="text-sm font-black text-indigo-500 tabular-nums">{market.outcomes!.length}</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Probability</span>
                                        <span className="text-sm font-black text-indigo-500 tabular-nums">{market.probability}%</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Closed On</span>
                                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                        {new Date(market.closeDate).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isVs && (
                        <div className="bg-indigo-600/5 dark:bg-indigo-900/10 rounded-3xl p-6 border border-indigo-100 dark:border-indigo-900/30">
                            <div className="flex items-center gap-3 mb-4">
                                <Swords size={20} className="text-indigo-600" />
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Versus Mode Active</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <img src={market.candidateA?.imageUrl} className="w-10 h-10 rounded-full mx-auto mb-2 object-cover border-2" style={{ borderColor: market.candidateA?.color }} alt={market.candidateA?.name} />
                                    <div className="text-[9px] font-black text-slate-900 dark:text-white truncate">{market.candidateA?.name}</div>
                                </div>
                                <div className="text-center p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <img src={market.candidateB?.imageUrl} className="w-10 h-10 rounded-full mx-auto mb-2 object-cover border-2" style={{ borderColor: market.candidateB?.color }} alt={market.candidateB?.name} />
                                    <div className="text-[9px] font-black text-slate-900 dark:text-white truncate">{market.candidateB?.name}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {isMultiOutcome && (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <BarChart2 size={16} className="text-indigo-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Probabilities</span>
                            </div>
                            <div className="space-y-2">
                                {market.outcomes!.map(o => (
                                    <div key={o.id} className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: o.color || '#6366f1' }} />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex-1 truncate">{o.name}</span>
                                        <span className="text-xs font-black text-indigo-500 tabular-nums w-10 text-right">{o.probability}%</span>
                                        {/* probability bar */}
                                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${o.probability}%`, backgroundColor: o.color || '#6366f1' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right Column: Outcome Selector ─── */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 p-8">

                        <div className="mb-8">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center">
                                <CheckCircle size={20} className="mr-3 text-emerald-500" /> Select the Winner
                            </h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1 ml-8">
                                Payouts are calculated automatically from the selected result.
                            </p>
                        </div>

                        {/* ── MULTI-OUTCOME selector ── */}
                        {isMultiOutcome ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {market.outcomes!.map(outcome => (
                                        <div
                                            key={outcome.id}
                                            onClick={() => setSelectedOutcome(outcome.id)}
                                            className={`relative border-2 rounded-2xl p-4 cursor-pointer transition-all duration-200 ${
                                                selectedOutcome === outcome.id
                                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 shadow-md shadow-emerald-500/10'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 bg-slate-50/50 dark:bg-slate-900/50'
                                            }`}
                                        >
                                            {/* Colour accent bar */}
                                            <div
                                                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl opacity-70"
                                                style={{ backgroundColor: outcome.color || '#6366f1' }}
                                            />
                                            <div className="flex items-center gap-3 pt-1">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                                                    selectedOutcome === outcome.id
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                                }`}>
                                                    {selectedOutcome === outcome.id
                                                        ? <Check size={16} strokeWidth={3} />
                                                        : <Circle size={14} className="opacity-50" />
                                                    }
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-black text-slate-900 dark:text-white leading-tight truncate">
                                                        {outcome.name}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: outcome.color || '#6366f1' }} />
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {outcome.probability.toFixed(1)}% probability
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Cancel option spans full width */}
                                <CancelCard />
                            </div>

                        ) : (
                            /* ── BINARY / VS selector (original layout) ── */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* YES / Candidate A */}
                                <div
                                    onClick={() => setSelectedOutcome('YES')}
                                    className={`group relative border-2 rounded-3xl p-6 cursor-pointer transition-all duration-300 ${
                                        selectedOutcome === 'YES'
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 shadow-lg shadow-emerald-500/10'
                                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                            selectedOutcome === 'YES' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                        }`}>
                                            {selectedOutcome === 'YES' ? <Check size={24} strokeWidth={3} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Option A (YES)</div>
                                            <div className="text-lg font-black text-slate-900 dark:text-white leading-tight truncate">
                                                {isVs ? market.candidateA?.name : 'YES'}
                                            </div>
                                        </div>
                                    </div>

                                    {isVs && (
                                        <div className="absolute top-6 right-6">
                                            <img src={market.candidateA?.imageUrl} className="w-12 h-12 rounded-full object-cover border-2 shadow-sm" style={{ borderColor: market.candidateA?.color }} alt={market.candidateA?.name} />
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs font-bold border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
                                            <span className="text-slate-400 uppercase tracking-tighter">Projected Payout</span>
                                            <span className="text-slate-900 dark:text-white tabular-nums">
                                                {loadingPreview ? '...' : formatMoney(yesPayout * 100)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-slate-400 uppercase tracking-tighter">House Profit</span>
                                            <span className={`${yesProfit >= 0 ? 'text-emerald-500' : 'text-red-500'} tabular-nums`}>
                                                {loadingPreview ? '...' : `${yesProfit >= 0 ? '+' : ''}${formatMoney(Math.abs(yesProfit) * 100)}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* NO / Candidate B */}
                                <div
                                    onClick={() => setSelectedOutcome('NO')}
                                    className={`group relative border-2 rounded-3xl p-6 cursor-pointer transition-all duration-300 ${
                                        selectedOutcome === 'NO'
                                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 shadow-lg shadow-indigo-500/10'
                                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                            selectedOutcome === 'NO' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                        }`}>
                                            {selectedOutcome === 'NO' ? <Check size={24} strokeWidth={3} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-0.5">Option B (NO)</div>
                                            <div className="text-lg font-black text-slate-900 dark:text-white leading-tight truncate">
                                                {isVs ? market.candidateB?.name : 'NO'}
                                            </div>
                                        </div>
                                    </div>

                                    {isVs && (
                                        <div className="absolute top-6 right-6">
                                            <img src={market.candidateB?.imageUrl} className="w-12 h-12 rounded-full object-cover border-2 shadow-sm" style={{ borderColor: market.candidateB?.color }} alt={market.candidateB?.name} />
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs font-bold border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
                                            <span className="text-slate-400 uppercase tracking-tighter">Projected Payout</span>
                                            <span className="text-slate-900 dark:text-white tabular-nums">
                                                {loadingPreview ? '...' : formatMoney(noPayout * 100)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-slate-400 uppercase tracking-tighter">House Profit</span>
                                            <span className={`${noProfit >= 0 ? 'text-emerald-500' : 'text-red-500'} tabular-nums`}>
                                                {loadingPreview ? '...' : `${noProfit >= 0 ? '+' : ''}${formatMoney(Math.abs(noProfit) * 100)}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Cancel option */}
                                <CancelCard />
                            </div>
                        )}

                        {/* ── User profits table ── */}
                        {selectedOutcome && selectedOutcome !== 'CANCEL' && (
                            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">
                                    Projected Winners
                                    {isMultiOutcome && selectedOutcome && (
                                        <span className="ml-2 text-emerald-500">
                                            ({market.outcomes?.find(o => o.id === selectedOutcome)?.name || selectedOutcome})
                                        </span>
                                    )}
                                </h4>
                                <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">User</th>
                                                <th className="px-4 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Invested</th>
                                                <th className="px-4 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Profit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                            {userProfits.filter(p =>
                                                isMultiOutcome
                                                    ? true  // show all for multi-outcome (can't easily filter without positions breakdown)
                                                    : String(p.side).toUpperCase() === String(selectedOutcome).toUpperCase()
                                            ).length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-6 text-center text-sm font-bold text-slate-500">
                                                        No profitable users for this outcome.
                                                    </td>
                                                </tr>
                                            ) : (
                                                userProfits
                                                    .filter(p =>
                                                        isMultiOutcome
                                                            ? true
                                                            : String(p.side).toUpperCase() === String(selectedOutcome).toUpperCase()
                                                    )
                                                    .map(p => (
                                                        <tr key={`${p.user_id}-${p.side}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    {p.avatar_url ? (
                                                                        <img src={p.avatar_url} className="h-8 w-8 rounded-full mr-3 object-cover border border-slate-200 dark:border-slate-700" alt={p.user_name} />
                                                                    ) : (
                                                                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3 text-xs font-black">
                                                                            {(p.user_name || '?').charAt(0).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <div className="text-sm font-black text-slate-900 dark:text-white">{p.user_name || 'Unknown User'}</div>
                                                                        <div className="text-[10px] text-slate-500 font-bold">{p.user_email || ''}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-bold text-slate-600 dark:text-slate-400">
                                                                {formatMoney(p.invested || 0)}
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-black text-emerald-500">
                                                                +{formatMoney(p.profit || 0)}
                                                            </td>
                                                        </tr>
                                                    ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ── Resolve button ── */}
                        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700">
                            <Button
                                className={`w-full h-14 text-sm font-black uppercase tracking-[0.2em] shadow-xl transition-all ${
                                    selectedOutcome
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.01] active:scale-[0.99]'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                }`}
                                disabled={!selectedOutcome || isResolving}
                                onClick={handleResolve}
                            >
                                <CheckCircle size={20} className="mr-3" />
                                {isResolving ? 'Resolving…' : 'Resolve & Settle All Contracts'}
                            </Button>
                            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-4 flex items-center justify-center gap-2 opacity-60">
                                <Check size={12} strokeWidth={3} /> Final Decision — No Undo Possible
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
