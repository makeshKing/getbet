import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Role, KycStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Lock, Unlock, ShieldOff } from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const {
    allUsers: users,
    adminCreateUser,
    adminUpdateUserRole,
    adminAdjustBalance,
    adminUpdateKycStatus,
    adminUpdateUserBanStatus,
  } = useApp();

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

  // Ban confirmation state
  const [banUser, setBanUser] = useState<User | null>(null);
  const [banLoading, setBanLoading] = useState(false);

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

  const handleBanToggle = async () => {
    if (!banUser) return;
    setBanLoading(true);
    try {
      await adminUpdateUserBanStatus(banUser.id, !banUser.isBanned);
      setBanUser(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBanLoading(false);
    }
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
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">KYC Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {users.map(u => (
              <tr
                key={u.id}
                className={u.isBanned ? 'bg-red-50 opacity-75' : ''}
              >
                {/* User info */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt=""
                          className={`h-8 w-8 rounded-full object-cover border ${u.isBanned ? 'border-red-300 grayscale' : 'border-slate-200'}`}
                        />
                      ) : (
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${u.isBanned ? 'bg-red-200 text-red-600' : 'bg-slate-200 text-slate-600'}`}>
                          {u.name.charAt(0)}
                        </div>
                      )}
                      {u.isBanned && (
                        <span className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5">
                          <Lock size={8} className="text-white" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-medium ${u.isBanned ? 'text-red-700 line-through' : 'text-slate-900'}`}>
                          {u.name}
                        </span>
                        {u.isBanned && (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-red-200">
                            <ShieldOff size={9} />
                            BANNED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={u.role === Role.ADMIN ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}>
                    {u.role}
                  </Badge>
                </td>

                {/* Phone */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {u.phone || '-'}
                </td>

                {/* Balance */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  ${(u.balance / 100).toFixed(2)}
                </td>

                {/* KYC */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 ${
                    u.kycStatus === KycStatus.APPROVED ? 'bg-green-100 text-green-800' :
                    u.kycStatus === KycStatus.REJECTED ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {u.kycStatus}
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {u.isBanned ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      <Lock size={10} />
                      Banned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      <Unlock size={10} />
                      Active
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="text-indigo-600 hover:text-indigo-900 transition-colors"
                    >
                      Adjust Balance
                    </button>

                    <span className="text-slate-300">|</span>

                    {u.kycStatus === KycStatus.PENDING && (
                      <>
                        <button
                          onClick={() => setKycUser(u)}
                          className="text-amber-600 hover:text-amber-900 transition-colors"
                        >
                          Review KYC
                        </button>
                        <span className="text-slate-300">|</span>
                      </>
                    )}

                    {u.role !== Role.ADMIN && (
                      <>
                        <button
                          onClick={() => handleRoleToggle(u)}
                          className="text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          Make Admin
                        </button>
                        <span className="text-slate-300">|</span>
                      </>
                    )}

                    {/* Ban / Unban — never show for admins */}
                    {u.role !== Role.ADMIN && (
                      <button
                        onClick={() => setBanUser(u)}
                        className={`flex items-center gap-1 font-semibold transition-colors ${
                          u.isBanned
                            ? 'text-green-600 hover:text-green-900'
                            : 'text-red-600 hover:text-red-900'
                        }`}
                      >
                        {u.isBanned ? (
                          <><Unlock size={12} /> Unban</>
                        ) : (
                          <><Lock size={12} /> Ban</>
                        )}
                      </button>
                    )}
                  </div>
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

      {/* Ban / Unban Confirmation Modal */}
      <Dialog
        isOpen={!!banUser}
        onClose={() => setBanUser(null)}
        title={banUser?.isBanned ? `Unban ${banUser?.name}?` : `Ban ${banUser?.name}?`}
      >
        <div className="space-y-5">
          <div className={`flex items-start gap-3 p-4 rounded-lg border ${banUser?.isBanned ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {banUser?.isBanned ? (
              <Unlock size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <Lock size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              {banUser?.isBanned ? (
                <>
                  <p className="text-sm font-semibold text-green-800">Restore account access</p>
                  <p className="text-sm text-green-700 mt-1">
                    <strong>{banUser?.name}</strong> will be able to log in and use the platform again.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-red-800">This will block the user immediately</p>
                  <p className="text-sm text-red-700 mt-1">
                    <strong>{banUser?.name}</strong> ({banUser?.email}) will see a suspended account message
                    and will not be able to access the application.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              variant={banUser?.isBanned ? 'success' : 'danger'}
              onClick={handleBanToggle}
              disabled={banLoading}
            >
              {banLoading
                ? 'Processing...'
                : banUser?.isBanned
                  ? 'Confirm Unban'
                  : 'Confirm Ban'}
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => setBanUser(null)}
              disabled={banLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
