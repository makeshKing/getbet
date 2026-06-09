
import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Position, Side } from '../types';
import { useApp } from '../context/AppContext';
import { useCurrency } from '../context/CurrencyContext';
import { TrendingUp, TrendingDown, Info, Zap } from 'lucide-react';

interface SellDialogProps {
    isOpen: boolean;
    onClose: () => void;
    position: Position | null;
    marketTitle: string;
    currentPrice: number;
}

export const SellDialog: React.FC<SellDialogProps> = ({
    isOpen,
    onClose,
    position,
    marketTitle,
    currentPrice
}) => {
    const { sell } = useApp();
  const { formatMoney } = useCurrency();
    const [quantity, setQuantity] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && position) {
            setQuantity(position.quantity.toString());
            // Small delay for the dialog animation to settle
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [isOpen, position]);

    if (!position) return null;

    const qtyToSell = Number(quantity) || 0;
    const proceeds = qtyToSell * currentPrice;
    const costBasis = position.avgPrice * qtyToSell;
    const realizedPL = proceeds - costBasis;
    const roi = costBasis > 0 ? (realizedPL / costBasis) * 100 : 0;

    const handleSell = async () => {
        const numQty = parseInt(quantity);
        if (!numQty || numQty <= 0 || numQty > position.quantity) return;

        try {
            await sell(position.marketId, position.side, currentPrice, numQty, position.outcomeId);
            onClose();
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={`Sell ${position.side} Shares`}>
            <div className="space-y-5 animate-fade-in-up">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 opacity-70">Portfolio Asset</p>
                    <h4 className="text-sm text-slate-900 dark:text-white font-black leading-tight line-clamp-2">{marketTitle}</h4>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                    <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Buy Avg</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{formatMoney(position.avgPrice)}</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Market Price</span>
                        <span className="text-sm font-black text-emerald-500 tabular-nums">{formatMoney(currentPrice)}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Shares to exit</label>
                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">Max: {position.quantity}</span>
                    </div>
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="w-full h-16 px-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-2xl font-black focus:outline-none focus:border-indigo-500 bg-white/20 dark:bg-slate-950 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                            value={quantity}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= position.quantity)) {
                                    setQuantity(val);
                                }
                            }}
                        />
                        <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/40 p-2 rounded-xl"
                            onClick={() => setQuantity(position.quantity.toString())}
                        >
                            Max
                        </button>
                    </div>
                </div>

                <div className={`rounded-2xl p-5 border shadow-sm transition-colors ${realizedPL >= 0 ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            {realizedPL >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Est. Return</span>
                        </div>
                        <span className={`text-sm font-black tabular-nums ${realizedPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {realizedPL >= 0 ? '+' : ''}{formatMoney(Math.abs(realizedPL))} ({roi.toFixed(1)}%)
                        </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-200/20 dark:border-white/5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Withdrawal Total</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{formatMoney(proceeds)}</span>
                    </div>
                </div>

                <div className="pt-3 space-y-3">
                    <Button
                        className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-black uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        onClick={handleSell}
                        disabled={!qtyToSell || qtyToSell > position.quantity}
                    >
                        <Zap size={18} /> Confirm Sale
                    </Button>
                    <button onClick={onClose} className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 hover:text-slate-600 transition-colors">Cancel Transaction</button>
                </div>

                <div className="flex items-start gap-2 text-[9px] text-slate-400 font-bold leading-relaxed opacity-60 px-2 uppercase tracking-tighter">
                    <Info size={10} className="mt-0.5 shrink-0" />
                    <p>Proceeds are instantly credited to your Kit wallet upon trade execution.</p>
                </div>
            </div>
        </Dialog>
    );
};
