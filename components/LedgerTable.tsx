
import React from 'react';
import { LedgerEntry, LedgerType } from '../types';
import { Badge } from './ui/Badge';
import { ArrowDownLeft, ArrowUpRight, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface LedgerTableProps {
  entries: LedgerEntry[];
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ entries }) => {
  const getIcon = (type: LedgerType) => {
    switch (type) {
      case LedgerType.DEPOSIT: return <ArrowDownLeft size={16} className="text-emerald-500" />;
      case LedgerType.WITHDRAWAL: return <ArrowUpRight size={16} className="text-slate-500 dark:text-slate-400" />;
      case LedgerType.TRADE_LOSS: return <ArrowUpRight size={16} className="text-red-500" />;
      default: return <AlertCircle size={16} className="text-slate-400" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'COMPLETED') return <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-medium"><CheckCircle size={12} className="mr-1" /> Settled</span>;
    if (status === 'PENDING') return <span className="flex items-center text-amber-600 dark:text-amber-400 text-xs font-medium"><ClockIcon size={12} className="mr-1" /> Pending</span>;
    if (status === 'REJECTED') return <span className="flex items-center text-red-600 dark:text-red-400 text-xs font-medium"><XCircle size={12} className="mr-1" /> Rejected</span>;
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="mr-2 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-full">{getIcon(entry.type)}</div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-200 capitalize">{entry.type.replace('_', ' ').toLowerCase()}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate" title={entry.description}>
                {entry.description}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                {new Date(entry.createdAt).toLocaleDateString()}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${entry.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200'}`}>
                {entry.amount > 0 ? '+' : ''}{(entry.amount / 100).toFixed(2)}
              </td>
               <td className="px-6 py-4 whitespace-nowrap text-right">
                {getStatusBadge(entry.status)}
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">No transaction history.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
};

const ClockIcon = ({ size, className }: { size: number, className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
