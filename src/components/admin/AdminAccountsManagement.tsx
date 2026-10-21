import React, { useState, useEffect } from 'react';
import {
  Shield,
  UserPlus,
  Trash2,
  Edit2,
  KeyRound,
  Mail,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  AdminAccount,
  getLocalAdminAccounts,
  addAdminAccount,
  updateAdminAccount,
  deleteAdminAccount
} from '../../services/staffService';

export const AdminAccountsManagement: React.FC = () => {
  const [admins, setAdmins] = useState<AdminAccount[]>(() => getLocalAdminAccounts());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminAccount | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'manager'>('admin');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setAdmins(e.detail);
      } else {
        setAdmins(getLocalAdminAccounts());
      }
    };
    window.addEventListener('gidhaur_admins_updated', handleUpdate);
    return () => window.removeEventListener('gidhaur_admins_updated', handleUpdate);
  }, []);

  const togglePasswordVisibility = (adminId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [adminId]: !prev[adminId]
    }));
  };

  const openAddModal = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('admin');
    setPhone('');
    setFormError(null);
    setEditingAdmin(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (admin: AdminAccount) => {
    setName(admin.name);
    setEmail(admin.email);
    setPassword(admin.password || '');
    setRole(admin.role === 'manager' ? 'manager' : 'admin');
    setPhone(admin.phone || '');
    setFormError(null);
    setEditingAdmin(admin);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanName) {
      setFormError('Admin name is required.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      setFormError('Password must be at least 4 characters long.');
      return;
    }

    try {
      if (editingAdmin) {
        await updateAdminAccount(editingAdmin.id, {
          name: cleanName,
          email: cleanEmail,
          password: cleanPassword,
          role: editingAdmin.role === 'master_admin' ? 'master_admin' : role,
          phone: phone.trim()
        });
        setSuccessMessage(`Admin "${cleanName}" updated successfully!`);
      } else {
        const exists = admins.some((a) => a.email.toLowerCase() === cleanEmail);
        if (exists) {
          setFormError('An admin with this email already exists.');
          return;
        }
        await addAdminAccount({
          name: cleanName,
          email: cleanEmail,
          password: cleanPassword,
          role,
          phone: phone.trim()
        });
        setSuccessMessage(`New admin "${cleanName}" created successfully!`);
      }

      setAdmins(getLocalAdminAccounts());
      setIsAddModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save admin account.');
    }
  };

  const handleDelete = async () => {
    if (!deletingAdmin) return;
    const success = await deleteAdminAccount(deletingAdmin.id);
    if (success) {
      setSuccessMessage(`Admin "${deletingAdmin.name}" removed successfully.`);
      setAdmins(getLocalAdminAccounts());
    } else {
      setFormError('Primary Master Admin account cannot be deleted.');
    }
    setDeletingAdmin(null);
    setTimeout(() => {
      setSuccessMessage(null);
      setFormError(null);
    }, 3500);
  };

  return (
    <div className="bg-white rounded-xl border border-indigo-200/80 p-4 sm:p-5 space-y-4 shadow-sm shadow-indigo-500/5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm uppercase tracking-[0.14em] text-slate-900">
              ADMIN ACCOUNTS
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
              {admins.length}
            </span>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase tracking-[0.12em] transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
          id="add-admin-btn"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>ADD ADMIN</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Admin Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {admins.map((admin) => {
          const isMaster = admin.role === 'master_admin' || admin.id === 'admin-master';
          const isPwVisible = visiblePasswords[admin.id];

          return (
            <div
              key={admin.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isMaster
                  ? 'bg-amber-50/40 border-amber-200/90 shadow-2xs'
                  : 'bg-indigo-50/20 border-indigo-200/70 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 border ${
                      isMaster
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    {admin.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {admin.name}
                      </span>
                      {isMaster ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
                          PRIMARY MASTER
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                          {admin.role === 'manager' ? 'MANAGER' : 'ADMIN'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 mt-0.5 truncate">
                      <Mail className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="truncate">{admin.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditModal(admin)}
                    className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-100/70 border border-transparent hover:border-indigo-200 transition-colors cursor-pointer"
                    title="Edit Admin"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {!isMaster && (
                    <button
                      onClick={() => setDeletingAdmin(admin)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                      title="Delete Admin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-3 h-3 text-indigo-500" />
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">PIN:</span>
                  <span className="font-mono text-slate-900 font-bold">
                    {isPwVisible ? (admin.password || 'admin123') : '••••••••'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility(admin.id)}
                  className="text-indigo-500 hover:text-indigo-700 p-1 transition-colors cursor-pointer"
                  title={isPwVisible ? 'Hide password' : 'Show password'}
                >
                  {isPwVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Admin Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-indigo-200 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <UserPlus className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-extrabold text-sm uppercase tracking-[0.14em] text-slate-900">
                  {editingAdmin ? 'EDIT ADMINISTRATOR' : 'ADD ADMINISTRATOR'}
                </h4>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-800 mb-1">
                  FULL NAME
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikash Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-indigo-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-800 mb-1">
                  LOGIN EMAIL
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. vikash@gidhaurbakery.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-indigo-200 text-xs font-mono font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-800 mb-1">
                  LOGIN PASSWORD
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400" />
                  <input
                    type="text"
                    required
                    placeholder="Min 4 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-indigo-200 text-xs font-mono font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-800 mb-1">
                    ROLE
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-indigo-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="admin">Full Admin</option>
                    <option value="manager">Store Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-800 mb-1">
                    PHONE (OPTIONAL)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400" />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-8 pr-2 py-2 rounded-lg bg-white border border-indigo-200 text-xs font-mono font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase tracking-[0.1em] transition-colors cursor-pointer shadow-xs"
                >
                  {editingAdmin ? 'UPDATE' : 'CREATE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-rose-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600 block">
                CONFIRM REMOVAL
              </span>
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-900">
                DELETE {deletingAdmin.name}?
              </h4>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAdmin(null)}
                className="flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
