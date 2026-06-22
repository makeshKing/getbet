import { useCurrency } from '../context/CurrencyContext';
import React from 'react';
import { Trade } from '../types';
import { Monitor } from 'lucide-react';

interface ShareHistoryTableProps {
  trades: Trade[];
}

export const ShareHistoryTable: React.FC<{trades: any[]}> = ({ trades }) => {
  const { formatMoney } = useCurrency();
  // DUMMY REPLACE FOR SHARE: React.FC<ShareHistoryTableProps> = ({ trades }) => {
  return (
    <div className="bg-[#15171C] border border-[#22252B] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#1E2025] border-b border-[#22252B]">
              <th className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left">Date</th>
              <th className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left">Market</th>
              <th className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left">Side</th>
              <th className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left">Shares</th>
              <th className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left">Price</th>
              <th className="text-[#9AA0A6] text-[10px] uppercase tracking-wide px-4 py-2 text-left">Total</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
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