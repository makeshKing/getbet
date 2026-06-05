import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Role, KycStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';

export const AdminUsers: React.FC = () => {
  const { allUsers: users, adminCreateUser, adminUpdateUserRole, adminAdjustBalance, adminUpdateKycStatus } = useApp();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceAdjust, setBalanceAdjust] = useState<string>('');

  // KYC Modal State
  const [kycUser, setKycUser] = useState<User | null>(null);

  // Create User State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>(Role.USER);

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserName) {
      alert("Please fill all fields");
      return;
    }
    try {
      await adminCreateUser(newUserEmail, newUserPassword, newUserName, newUserRole);
      setIsCreateOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole(Role.USER);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRoleToggle = async (u: User) => {
    const newRole = u.role === Role.ADMIN ? Role.USER : Role.ADMIN;
    if (confirm(`Change ${u.name}'s role to ${newRole}?`)) {
      await adminUpdateUserRole(u.id, newRole);
    }
  };

  const handleBalanceAdjust = async () => {
    if (!selectedUser || !balanceAdjust) return;
    const amount = parseFloat(balanceAdjust) * 100;
    await adminAdjustBalance(selectedUser.id, amount, "Manual Adjustment via Admin Panel");
    setSelectedUser(null);
    setBalanceAdjust('');
  };

  const handleKycAction = async (status: KycStatus) => {
    if (!kycUser) return;
    await adminUpdateKycStatus(kycUser.id, status);
    setKycUser(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <Button onClick={() => setIsCreateOpen(true)}>Create User</Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">KYC Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {users.map(u => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center mr-3 font-bold text-xs text-slate-600">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={u.role === Role.ADMIN ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}>
                    {u.role}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  ${(u.balance / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 ${u.kycStatus === KycStatus.APPROVED ? 'bg-green-100 text-green-800' :
                    u.kycStatus === KycStatus.REJECTED ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {u.kycStatus}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button onClick={() => setSelectedUser(u)} className="text-indigo-600 hover:text-indigo-900">Adjust Balance</button>
                  <span className="text-slate-300">|</span>
                  {u.kycStatus === KycStatus.PENDING && (
                    <button onClick={() => setKycUser(u)} className="text-amber-600 hover:text-amber-900">Review KYC</button>
                  )}
                  {u.role !== Role.ADMIN && (
                    <button onClick={() => handleRoleToggle(u)} className="text-slate-600 hover:text-slate-900">Make Admin</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Balance Adjust Modal */}
      <Dialog
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={`Adjust Balance for ${selectedUser?.name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Enter a positive amount to credit, or negative to debit.
          </p>
          <input
            type="number"
            value={balanceAdjust}
            onChange={(e) => setBalanceAdjust(e.target.value)}
            placeholder="-50.00"
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
          />
          <Button onClick={handleBalanceAdjust} disabled={!balanceAdjust}>
            Execute Adjustment
          </Button>
        </div>
      </Dialog>

      {/* KYC Review Modal */}
      <Dialog
        isOpen={!!kycUser}
        onClose={() => setKycUser(null)}
        title="Review KYC Documents"
      >
        <div className="space-y-4">
          <div className="bg-slate-100 p-4 rounded-md text-center border-dashed border-2 border-slate-300">
            <p className="text-slate-400 text-sm">No files uploaded in mock mode.</p>
            <div className="h-24 w-full bg-slate-200 mt-2 rounded"></div>
          </div>
          <p className="text-sm">User: <strong>{kycUser?.name}</strong> ({kycUser?.email})</p>
          <div className="flex space-x-3">
            <Button className="flex-1" variant="success" onClick={() => handleKycAction(KycStatus.APPROVED)}>Approve</Button>
            <Button className="flex-1" variant="danger" onClick={() => handleKycAction(KycStatus.REJECTED)}>Reject</Button>
          </div>
        </div>
      </Dialog>

      {/* Create User Modal */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New User"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md"
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md"
              value={newUserEmail}
              onChange={e => setNewUserEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md"
              value={newUserPassword}
              onChange={e => setNewUserPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Role</label>
            <select
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md"
              value={newUserRole}
              onChange={e => setNewUserRole(e.target.value as Role)}
            >
              <option value={Role.USER}>User</option>
              <option value={Role.ADMIN}>Admin</option>
            </select>
          </div>
          <Button onClick={handleCreateUser} className="w-full">Create Account</Button>
        </div>
      </Dialog>
    </div>
  );
};
