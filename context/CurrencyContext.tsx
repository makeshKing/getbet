import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useApp } from './AppContext';

export type CurrencyType = 'NPR' | 'USD';

interface CurrencyContextType {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
  formatMoney: (cents: number) => string;
  usdToNprRate: number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config } = useApp();
  
  // Default exchange rate is 130 NPR = 1 USD if not configured in Admin settings
  const usdToNprRate = config?.value?.usdToNprRate || 130.0;

  const [currency, setCurrencyState] = useState<CurrencyType>(() => {
    const saved = localStorage.getItem('predictkit_currency');
    if (saved === 'USD') return 'USD';
    return 'NPR'; // Default base currency
  });

  const setCurrency = useCallback((newCurrency: CurrencyType) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('predictkit_currency', newCurrency);
  }, []);

  const formatMoney = useCallback((cents: number) => {
    if (currency === 'NPR') {
      return `Rs. ${(cents / 100).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      // For USD, we convert cents (which are NPR cents) into USD based on the exchange rate
      const nprDollars = cents / 100;
      const usdDollars = nprDollars / usdToNprRate;
      return `$ ${usdDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }, [currency, usdToNprRate]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatMoney, usdToNprRate }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
};
