
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
        <div className="bg-[#FFA500]/10 border border-[#FFA500]/30 rounded-xl px-4 py-3">
          <span className="text-[#FFA500] text-sm font-medium">
            Available to withdraw: <span className="font-bold">{formatMoney(withdrawableBalance)}</span>
          </span>
        </div>

        <div>
          <p className="text-[#9AA0A6] text-xs uppercase tracking-wide mb-1.5">
            Amount (NPR)
          </p>
          <div className="bg-[#1E2025] border border-[#22252B] rounded-xl px-4 py-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="bg-transparent text-white text-lg font-medium outline-none w-full focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[#9AA0A6] text-xs uppercase tracking-wide mb-1.5">
              Payment Method
            </p>
            <div className="relative">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-[#1E2025] border border-[#22252B] rounded-xl px-4 py-3 text-white text-sm font-bold appearance-none cursor-pointer focus:border-[#00D4AA] outline-none"
              >
                <option value="esewa">eSewa</option>
                <option value="khalti">Khalti</option>
                <option value="bank">Bank Transfer</option>
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9AA0A6] pointer-events-none">▾</span>
            </div>
          </div>

          <div>
            <p className="text-[#9AA0A6] text-xs uppercase tracking-wide mb-1.5">
              Account Name
            </p>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Name on account"
              className="w-full bg-[#1E2025] border border-[#22252B] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#00D4AA] placeholder-[#9AA0A6]"
            />
          </div>

          <div>
            <p className="text-[#9AA0A6] text-xs uppercase tracking-wide mb-1.5">
              {method === 'bank' ? 'Bank Account Number & Bank Name' : `${method === 'esewa' ? 'eSewa' : 'Khalti'} ID / Number`}
            </p>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={method === 'bank' ? '0000000000000 (Nabil Bank)' : '9800000000'}
              className="w-full bg-[#1E2025] border border-[#22252B] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#00D4AA] placeholder-[#9AA0A6]"
            />
          </div>
        </div>

        {error && <div className="text-[#FF4757] text-sm font-bold bg-[#FF4757]/10 p-3 rounded-lg border border-[#FF4757]/30">{error}</div>}

        <button
          onClick={handleWithdraw}
          className="w-full bg-[#00D4AA] text-[#0A0C10] font-bold py-3.5 rounded-xl text-sm uppercase tracking-wide hover:bg-[#00bfa0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!amount || !destination || !accountName}
        >
          Request Withdrawal
        </button>
      </div>
    </Dialog>
  );
};
