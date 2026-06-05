import React from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/Button';
import { LedgerEntry } from '../types';

export const AdminWithdrawalQueue: React.FC = () => {
  const { getPendingWithdrawals, approveWithdrawal, rejectWithdrawal } = useApp();
  const withdrawals = getPendingWithdrawals();

  const handleApprove = async (id: string) => {
    await approveWithdrawal(id);
  };

  const handleReject = async (id: string) => {
    if (confirm('Are you sure you want to reject this withdrawal? Funds will be refunded to user.')) {
        await rejectWithdrawal(id);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">Withdrawal Review Queue</h3>
        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
            {withdrawals.length} Pending
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Destination</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {withdrawals.map((w) => (
              <tr key={w.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {w.userId}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {w.description.replace('Withdrawal to ', '')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-slate-900">
                  ${Math.abs(w.amount / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                  <Button size="sm" variant="success" onClick={() => handleApprove(w.id)}>Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => handleReject(w.id)}>Reject</Button>
                </td>
              </tr>
            ))}
            {withdrawals.length === 0 && (
                <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No pending withdrawals.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
