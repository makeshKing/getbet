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
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700 transition-colors">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-emerald-500 text-white">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Market</th>
              <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Side</th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Shares</th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  {new Date(trade.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white max-w-xs truncate" title={trade.marketTitle}>
                  {trade.marketTitle}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${trade.side === 'YES'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                    {trade.side}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                  {trade.shares}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-500 dark:text-slate-400">
                  {formatMoney(trade.price)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-slate-900 dark:text-white">
                  {formatMoney(trade.amount)}
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
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