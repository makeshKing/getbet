
import React, { useState, useEffect } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { useApp } from '../context/AppContext';
import { useCurrency } from '../context/CurrencyContext';
import { SavedAddress } from '../types';

interface WithdrawDialogProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawableBalance: number;
}

export const WithdrawDialog: React.FC<WithdrawDialogProps> = ({ isOpen, onClose, withdrawableBalance }) => {
  const [amount, setAmount] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [method, setMethod] = useState<string>('esewa');
  const [error, setError] = useState<string>('');

  const { requestWithdrawal } = useApp();
  const { formatMoney } = useCurrency();
  const handleWithdraw = async () => {
    setError('');
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    const cents = Math.floor(val * 100);

    if (cents > withdrawableBalance) {
      setError("Insufficient withdrawable funds.");
      return;
    }

    if (!destination || !accountName) {
      setError("Please fill in all payment details.");
      return;
    }

    try {
      await requestWithdrawal(cents, `${method.toUpperCase()}: ${destination} (${accountName})`);
      setAmount('');
      setDestination('');
      setAccountName('');
      setMethod('esewa');
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Withdraw Funds">
      <div className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl text-sm text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 font-medium">
          Available to withdraw: <strong>{formatMoney(withdrawableBalance)}</strong>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Amount (NPR)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
            placeholder="0.00"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
            >
              <option value="esewa">eSewa</option>
              <option value="khalti">Khalti</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Account Name</label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
              placeholder="Name on account"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              {method === 'bank' ? 'Bank Account Number & Bank Name' : `${method === 'esewa' ? 'eSewa' : 'Khalti'} ID / Number`}
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
              placeholder={method === 'bank' ? '0000000000000 (Nabil Bank)' : '9800000000'}
            />
          </div>
        </div>

        {error && <div className="text-red-500 text-sm font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">{error}</div>}

        <Button
          className="w-full py-4 text-base font-black uppercase tracking-widest"
          onClick={handleWithdraw}
          disabled={!amount || !destination || !accountName}
        >
          Request Withdrawal
        </Button>
      </div>
    </Dialog>
  );
};
