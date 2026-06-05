
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { LedgerTable } from '../components/LedgerTable';

import { DepositDialog } from '../components/DepositDialog';
import { WithdrawDialog } from '../components/WithdrawDialog';
import { Button } from '../components/ui/Button';
import { Wallet, ArrowDownCircle, ArrowUpCircle, ShieldCheck, User as UserIcon, Search, Camera, Edit2, Check, X } from 'lucide-react';

export const Profile: React.FC = () => {
  const { ledger, trades } = useApp();
  const { userProfile: user, updateProfile, uploadAvatar } = useAuth();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ name: editName, phone: editPhone });
      setIsEditing(false);
    } catch (e: any) {
      alert('Failed to update profile: ' + e.message);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const url = await uploadAvatar(file);
      await updateProfile({ avatarUrl: url });
    } catch (e: any) {
      alert('Failed to upload avatar: ' + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const formatMoney = (cents: number) => {
    return `Rs. ${(cents / 100).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Sidebar / User Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#1a1d26] p-6 rounded-lg border border-slate-200 dark:border-[#2d3342] shadow-sm text-center transition-colors relative">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <Edit2 size={16} />
              </button>
            ) : (
              <div className="absolute top-4 right-4 flex space-x-2">
                <button onClick={handleSaveProfile} className="text-emerald-500 hover:text-emerald-600">
                  <Check size={18} />
                </button>
                <button onClick={() => setIsEditing(false)} className="text-red-400 hover:text-red-500">
                  <X size={18} />
                </button>
              </div>
            )}
            
            <div className="w-24 h-24 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full mb-4 flex items-center justify-center overflow-hidden border-2 border-slate-100 dark:border-slate-600 relative group">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className={`w-full h-full object-cover ${isUploading ? 'opacity-50' : ''}`} />
              ) : (
                <UserIcon size={40} className={`text-slate-400 ${isUploading ? 'opacity-50' : ''}`} />
              )}
              {isEditing && (
                <div 
                  className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={24} className="text-white" />
                </div>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>

            {isEditing ? (
              <div className="space-y-3 mt-4 text-left">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
                  <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Enter phone number" className="w-full px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 truncate">{user.email}</div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-900 dark:text-[#f5f9fc]">{user.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 truncate">{user.email}</p>
                {user.phone && <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{user.phone}</p>}
                {!user.phone && <p className="text-sm text-slate-400 dark:text-slate-500 mb-4 italic">No phone added</p>}
              </>
            )}

            <div className="mt-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">
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
