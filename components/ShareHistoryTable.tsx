import { useCurrency } from '../context/CurrencyContext';
import React, { useState, useMemo } from 'react';
import { Trade } from '../types';
import { Monitor, ChevronUp, ChevronDown } from 'lucide-react';

interface ShareHistoryTableProps {
  trades: Trade[];
}

export const ShareHistoryTable: React.FC<{trades: any[]}> = ({ trades }) => {
  const { formatMoney } = useCurrency();
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const sortedTrades = useMemo(() => {
    const sorted = [...trades];
    sorted.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;
      if (sortConfig.key === 'date') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      } else if (sortConfig.key === 'market') {
        valA = a.marketTitle;
        valB = b.marketTitle;
      } else if (sortConfig.key === 'side') {
        valA = a.side;
        valB = b.side;
      } else if (sortConfig.key === 'shares') {
        valA = a.shares;
        valB = b.shares;
      } else if (sortConfig.key === 'price') {
        valA = a.price;
        valB = b.price;
      } else if (sortConfig.key === 'total') {
        valA = a.amount;
        valB = b.amount;
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [trades, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  // DUMMY REPLACE FOR SHARE: React.FC<ShareHistoryTableProps> = ({ trades }) => {
  return (
    <div className="bg-[#15171C] border border-[#22252B] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#1E2025] border-b border-[#22252B]">
              <th onClick={() => handleSort('date')} className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
              </th>
              <th onClick={() => handleSort('market')} className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Market {sortConfig.key === 'market' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
              </th>
              <th onClick={() => handleSort('side')} className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Side {sortConfig.key === 'side' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
              </th>
              <th onClick={() => handleSort('shares')} className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Shares {sortConfig.key === 'shares' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
              </th>
              <th onClick={() => handleSort('price')} className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Price {sortConfig.key === 'price' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
              </th>
              <th onClick={() => handleSort('total')} className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Total {sortConfig.key === 'total' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTrades.map((trade) => (
              <tr key={trade.id} className="border-b border-[#22252B] last:border-0 hover:bg-[#1E2025]">
                <td className="px-4 py-3 text-white text-sm">
                  {new Date(trade.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-white text-sm max-w-xs truncate" title={trade.marketTitle}>
                  {trade.marketTitle}
                </td>
                <td className="px-4 py-3 text-left">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${trade.side === 'YES'
                      ? 'border-[#00D4AA]/30 text-[#00D4AA]'
                      : 'border-[#FF4757]/30 text-[#FF4757]'
                    }`}>
                    {trade.side}
                  </span>
                </td>
                <td className="px-4 py-3 text-white text-sm text-left">
                  {trade.shares}
                </td>
                <td className="px-4 py-3 text-[#9AA0A6] text-sm tabular-nums text-left">
                  {formatMoney(trade.price)}
                </td>
                <td className="px-4 py-3 text-white text-sm font-bold tabular-nums text-left">
                  {formatMoney(trade.amount)}
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#9AA0A6]">
                  <div className="flex flex-col items-center justify-center">
                    <Monitor className="mb-2 opacity-30" size={32} />
                    <p>No share purchase history found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};