
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
  const [methodId, setMethodId] = useState<string>('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');
  const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);

  const { requestWithdrawal, withdrawalMethods } = useApp();
  const { formatMoney, currency } = useCurrency();
  
  // Filter out methods that are misconfigured (no fields configured)
  const validWithdrawalMethods = withdrawalMethods.filter(
    m => Array.isArray(m.fieldsConfig) && m.fieldsConfig.length > 0
  );
  
  // Set default method
  useEffect(() => {
    if (!methodId && validWithdrawalMethods.length > 0) {
      setMethodId(validWithdrawalMethods[0].id);
    }
  }, [validWithdrawalMethods, methodId]);

  const selectedMethod = validWithdrawalMethods.find(m => m.id === methodId);

  const amountCents = amount ? Math.floor(parseFloat(amount) * 100) : 0;
  const amountExceeds = amountCents > withdrawableBalance;

  const isFormValid = () => {
    if (!amount || parseFloat(amount) <= 0) return false;
    if (amountExceeds) return false;
    if (!selectedMethod) return false;
    if (!selectedMethod.fieldsConfig || selectedMethod.fieldsConfig.length === 0) return false;
    for (const field of selectedMethod.fieldsConfig) {
      if (field.required && !fieldValues[field.key]?.trim()) {
        return false;
      }
    }
    return true;
  };

  const handleWithdraw = async () => {
    setSubmitAttempted(true);
    setError('');
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    
    if (amountExceeds) {
      return;
    }

    if (!selectedMethod) {
      setError("Please select a withdrawal method.");
      return;
    }
    
    if (!selectedMethod.fieldsConfig || selectedMethod.fieldsConfig.length === 0) {
      setError("This withdrawal method is misconfigured (missing fields).");
      return;
    }

    // Validate dynamic fields
    for (const field of selectedMethod.fieldsConfig) {
      if (field.required && !fieldValues[field.key]?.trim()) {
        // Handled by inline errors now
        return;
      }
    }

    try {
      const descriptionJson = {
        method_id: selectedMethod.id,
        method_name: selectedMethod.name,
        fields: fieldValues
      };
      
      await requestWithdrawal(amountCents, JSON.stringify(descriptionJson), currency);
      setAmount('');
      setFieldValues({});
      setSubmitAttempted(false);
      if (validWithdrawalMethods.length > 0) setMethodId(validWithdrawalMethods[0].id);
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
          <div className={`bg-[#1E2025] border ${amountExceeds ? 'border-[#FF4757]' : 'border-[#22252B]'} rounded-xl px-4 py-3`}>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
              placeholder="0.00"
              className="bg-transparent text-white text-lg font-medium outline-none w-full focus:outline-none"
            />
          </div>
          {amountExceeds && (
            <p className="text-[#FF4757] text-xs mt-1.5 font-medium">Amount exceeds available balance</p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[#9AA0A6] text-xs uppercase tracking-wide mb-1.5">
              Payment Method
            </p>
            {validWithdrawalMethods.length === 0 ? (
              <div className="bg-[#1E2025] border border-[#22252B] rounded-xl px-4 py-3 text-[#FF4757] text-sm">
                No withdrawal methods available.
              </div>
            ) : (
              <div className="relative">
                <select
                  value={methodId}
                  onChange={(e) => {
                    setMethodId(e.target.value);
                    setFieldValues({}); // Reset fields on method change
                    setSubmitAttempted(false);
                  }}
                  className="w-full bg-[#1E2025] border border-[#22252B] rounded-xl px-4 py-3 text-white text-sm font-bold appearance-none cursor-pointer focus:border-[#00D4AA] outline-none"
                >
                  {validWithdrawalMethods.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9AA0A6] pointer-events-none">▾</span>
              </div>
            )}
          </div>

          {selectedMethod?.instructions && (
            <div className="bg-[#1E2025]/50 border border-[#22252B] rounded-xl px-4 py-3">
              <p className="text-[#9AA0A6] text-xs leading-relaxed">
                {selectedMethod.instructions}
              </p>
            </div>
          )}

          {selectedMethod?.fieldsConfig?.map(field => {
            const isMissing = submitAttempted && field.required && !fieldValues[field.key]?.trim();
            return (
              <div key={field.key}>
                <p className="text-[#9AA0A6] text-xs uppercase tracking-wide mb-1.5">
                  {field.label} {field.required && <span className="text-[#FF4757]">*</span>}
                </p>
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={fieldValues[field.key] || ''}
                  onChange={(e) => {
                    setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }));
                    if (submitAttempted) setError('');
                  }}
                  placeholder={field.placeholder || ''}
                  className={`w-full bg-[#1E2025] border ${isMissing ? 'border-[#FF4757]' : 'border-[#22252B]'} rounded-xl px-4 py-3 text-white text-base outline-none focus:border-[#00D4AA] placeholder-[#9AA0A6]`}
                />
                {isMissing && (
                  <p className="text-[#FF4757] text-xs mt-1.5 font-medium">{field.label} is required</p>
                )}
              </div>
            );
          })}
        </div>

        {error && <div className="text-[#FF4757] text-sm font-bold bg-[#FF4757]/10 p-3 rounded-lg border border-[#FF4757]/30">{error}</div>}

        <button
          onClick={handleWithdraw}
          disabled={!isFormValid()}
          className={`w-full bg-[#00D4AA] text-[#0A0C10] font-bold py-3.5 rounded-xl text-sm uppercase tracking-wide hover:bg-[#00bfa0] transition-colors ${!isFormValid() ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Request Withdrawal
        </button>
      </div>
    </Dialog>
  );
};
