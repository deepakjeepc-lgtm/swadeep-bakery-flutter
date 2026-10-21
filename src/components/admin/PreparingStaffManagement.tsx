import React, { useState } from 'react';
import {
  PackageCheck,
  Plus,
  Phone,
  Mail,
  KeyRound,
  Trash2,
  Edit2,
  Search,
  Copy,
  Check,
  Power,
  Eye,
  Boxes
} from 'lucide-react';
import { PreparingStaff } from '../../types';
import { addPreparingStaff, updatePreparingStaff, deletePreparingStaff } from '../../services/staffService';

interface PreparingStaffManagementProps {
  staffList: PreparingStaff[];
  onDirectViewPrep?: (staff: PreparingStaff) => void;
}

export const PreparingStaffManagement = React.memo<PreparingStaffManagementProps>(({
  staffList,
  onDirectViewPrep
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<PreparingStaff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<PreparingStaff | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Lead Packer & Props Specialist');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setRole('Lead Packer & Props Specialist');
    setFormError(null);
    setEditingStaff(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (staff: PreparingStaff) => {
    setEditingStaff(staff);
    setName(staff.name);
    setPhone(staff.phone);
    setEmail(staff.email);
    setPassword(staff.password || 'prep123');
    setRole(staff.role);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setFormError('Please fill in Name, Phone, Email, and Password.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingStaff) {
        await updatePreparingStaff(editingStaff.id, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          role
        });
      } else {
        await addPreparingStaff({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          role,
          status: 'active'
        });
      }
      setIsAddModalOpen(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: PreparingStaff) => {
    const nextStatus = staff.status === 'active' ? 'inactive' : 'active';
    await updatePreparingStaff(staff.id, { status: nextStatus });
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    setIsDeleting(true);
    try {
      await deletePreparingStaff(deletingStaff.id);
      setDeletingStaff(null);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to delete preparing staff');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyCredentials = (staff: PreparingStaff) => {
    const text = `Preparing & Packing Staff Login:\nEmail: ${staff.email}\nPassword: ${staff.password || 'prep123'}\nPortal: ${window.location.origin}/preparing`;
    navigator.clipboard.writeText(text);
    setCopiedId(staff.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="bg-gradient-to-r from-violet-50/90 via-white to-purple-50/70 rounded-xl border border-violet-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <PackageCheck className="w-4 h-4" />
          </div>
          <h2 className="font-extrabold text-sm sm:text-base uppercase tracking-[0.14em] text-slate-900">
            PREPARING &amp; PACKING STAFF
          </h2>
          <span className="font-mono text-xs font-bold text-violet-800 bg-violet-100/80 border border-violet-200 px-2 py-0.5 rounded-md">
            {staffList.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-violet-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter staff, phone, role..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-violet-200 text-xs focus:outline-none focus:border-violet-500"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] uppercase tracking-[0.12em] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD STAFF</span>
          </button>
        </div>
      </div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white rounded-xl border border-violet-200/70 p-10 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 mx-auto">
            <Boxes className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
            NO PREPARING STAFF FOUND
          </h3>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] uppercase tracking-[0.12em] cursor-pointer"
          >
            + ADD FIRST STAFF
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStaff.map((staff) => {
            const isActive = staff.status === 'active';

            return (
              <div
                key={staff.id}
                className={`bg-white rounded-xl border p-4 flex flex-col justify-between transition-all ${
                  isActive
                    ? 'border-violet-200/80 hover:border-violet-400 shadow-sm shadow-violet-500/5'
                    : 'border-slate-200 bg-slate-50/70 opacity-65'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-800 font-mono font-bold text-xs shrink-0">
                        {staff.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">
                          {staff.name}
                        </h4>
                        <span className="inline-block px-1.5 py-0.5 rounded-md bg-violet-50 border border-violet-200/80 text-[10px] font-bold uppercase tracking-wider text-violet-800 mt-0.5">
                          {staff.role}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(staff)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors border cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      <Power className="w-2.5 h-2.5" />
                      <span>{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 bg-violet-50/35 p-3 rounded-lg border border-violet-200/60 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase tracking-wider">
                        <Phone className="w-3 h-3 text-violet-500" /> Phone
                      </span>
                      <a href={`tel:${staff.phone}`} className="font-mono font-bold text-slate-900 hover:underline">
                        {staff.phone}
                      </a>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase tracking-wider">
                        <Mail className="w-3 h-3 text-violet-500" /> Email
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-slate-800 truncate max-w-[160px]">
                        {staff.email}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700 pt-1.5 border-t border-violet-200/60">
                      <span className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase tracking-wider">
                        <KeyRound className="w-3 h-3 text-violet-500" /> PIN
                      </span>
                      <span className="font-mono text-[11px] font-bold text-violet-950 bg-white px-2 py-0.5 rounded border border-violet-200">
                        {staff.password || 'prep123'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 gap-2">
                  <div className="flex items-center gap-1.5">
                    {onDirectViewPrep && (
                      <button
                        onClick={() => onDirectViewPrep(staff)}
                        className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>OPEN PORTAL</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyCredentials(staff)}
                      className="px-2.5 py-1.5 rounded-lg bg-violet-50/70 hover:bg-violet-100 text-violet-900 text-[10px] font-bold uppercase tracking-wider transition-colors border border-violet-200 flex items-center gap-1 cursor-pointer"
                      title="Copy login details"
                    >
                      {copiedId === staff.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-violet-600" />
                          <span>COPY</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(staff)}
                      className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 border border-transparent hover:border-violet-200 transition-colors cursor-pointer"
                      title="Edit staff details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingStaff(staff)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                      title="Delete staff"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-5 rounded-xl shadow-2xl border border-violet-200 space-y-4">
            <div className="flex items-center justify-between border-b border-violet-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center">
                  <PackageCheck className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-extrabold text-sm uppercase tracking-[0.14em] text-slate-900">
                  {editingStaff ? 'EDIT PREPARING STAFF' : 'ADD PREPARING STAFF'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-violet-800 mb-1">
                  FULL NAME *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Suresh Verma"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-violet-200 text-xs font-semibold focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-violet-800 mb-1">
                  PHONE NUMBER *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-violet-200 text-xs font-mono font-semibold focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-violet-800 mb-1">
                  EMAIL ADDRESS (LOGIN ID) *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. suresh.prep@gidhaurbakery.com"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-violet-200 text-xs font-mono font-semibold focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-violet-800 mb-1">
                  LOGIN PIN / PASSWORD *
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="prep123"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-violet-200 text-xs font-mono font-bold focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-violet-800 mb-1">
                  DEPARTMENT ROLE / STATION
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-violet-200 text-xs font-semibold focus:outline-none focus:border-violet-500"
                >
                  <option value="Lead Packer & Props Specialist">Lead Packer &amp; Props Specialist</option>
                  <option value="Party Accessories & Balloons Packer">Party Accessories &amp; Balloons Packer</option>
                  <option value="Candles & Cutlery Packing Agent">Candles &amp; Cutlery Packing Agent</option>
                  <option value="General Packaging & Dispatch Associate">General Packaging &amp; Dispatch Associate</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[11px] uppercase tracking-[0.1em] transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'SAVING...' : editingStaff ? 'UPDATE' : 'CREATE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-rose-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600 block">
                CONFIRM REMOVAL
              </span>
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-900">
                REMOVE {deletingStaff.name}?
              </h4>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'DELETING...' : 'DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

PreparingStaffManagement.displayName = 'PreparingStaffManagement';
