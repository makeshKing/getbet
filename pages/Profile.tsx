
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { LedgerTable } from '../components/LedgerTable';

import { DepositDialog } from '../components/DepositDialog';
import { WithdrawDialog } from '../components/WithdrawDialog';
import { Button } from '../components/ui/Button';
import { Wallet, ArrowDownCircle, ArrowUpCircle, ShieldCheck, User as UserIcon, Search } from 'lucide-react';

export const Profile: React.FC = () => {
  const { ledger, trades } = useApp();
  const { userProfile: user } = useAuth();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const formatMoney = (cents: number) => {
    return `Rs. ${(cents / 100).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };


  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Sidebar / User Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#1a1d26] p-6 rounded-lg border border-slate-200 dark:border-[#2d3342] shadow-sm text-center transition-colors">
            <div className="w-24 h-24 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full mb-4 flex items-center justify-center overflow-hidden border-2 border-slate-100 dark:border-slate-600">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={40} className="text-slate-400" />
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-[#f5f9fc]">{user.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{user.email}</p>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">
              <ShieldCheck size={12} className="mr-1" /> Verified Level 1
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">

          {/* Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#1a1d26] dark:bg-[#1a1d26] text-[#f5f9fc] rounded-lg p-6 shadow-lg relative overflow-hidden border border-slate-700 dark:border-[#2d3342]">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Wallet size={100} />
              </div>
              <h3 className="text-slate-300 dark:text-slate-400 text-sm font-medium mb-1">Total Balance</h3>
              <div className="text-3xl font-bold mb-6">{formatMoney(user.balance)}</div>
              <div className="flex space-x-3">
                <Button variant="secondary" size="sm" className="w-full" onClick={() => setIsDepositOpen(true)}>
                  <ArrowDownCircle size={16} className="mr-1" /> Deposit
                </Button>
                <Button variant="outline" size="sm" className="w-full border-slate-600 hover:bg-slate-800 dark:hover:bg-slate-700 text-white" onClick={() => setIsWithdrawOpen(true)}>
                  <ArrowUpCircle size={16} className="mr-1" /> Withdraw
                </Button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center space-y-4 transition-colors">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="text-slate-500 dark:text-slate-400 text-sm">Withdrawable</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(user.withdrawableBalance)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="text-slate-500 dark:text-slate-400 text-sm">Total Deposited</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{formatMoney(user.totalDeposited)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 text-sm">Total Withdrawn</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{formatMoney(user.totalWithdrawn)}</span>
              </div>
            </div>
          </div>





          {/* Ledger Table Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transactions Ledger</h3>
              <Button variant="outline" size="sm" onClick={() => alert("CSV Export coming soon")}>
                Export CSV
              </Button>
            </div>
            <LedgerTable entries={ledger} />
          </div>

        </div>
      </div>

      <DepositDialog isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
      <WithdrawDialog
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        withdrawableBalance={user.withdrawableBalance}
      />
    </div>
  );
};
