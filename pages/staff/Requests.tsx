import React, { useState } from 'react';
import { AdminDepositQueue } from '../../components/AdminDepositQueue';
import { AdminWithdrawalQueue } from '../../components/AdminWithdrawalQueue';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

export const StaffRequestsPage: React.FC = () => {
  const { userProfile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals'>('deposits');

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  if (!userProfile || (userProfile.role !== 'ADMIN' && userProfile.role !== 'STAFF')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] p-4 md:p-6">
      <h1 className="text-white text-2xl font-bold mb-6">Deposit & Withdrawal Requests</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('deposits')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'deposits' ? 'bg-[#00D4AA] text-black' : 'bg-[#15171C] text-[#9AA0A6] hover:bg-[#1A1C23]'
          }`}
        >
          Deposits
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'withdrawals' ? 'bg-[#00D4AA] text-black' : 'bg-[#15171C] text-[#9AA0A6] hover:bg-[#1A1C23]'
          }`}
        >
          Withdrawals
        </button>
      </div>

      <div className="bg-[#15171C] border border-[#22252B] rounded-xl p-6">
        {activeTab === 'deposits' && <AdminDepositQueue />}
        {activeTab === 'withdrawals' && <AdminWithdrawalQueue />}
      </div>
    </div>
  );
};
