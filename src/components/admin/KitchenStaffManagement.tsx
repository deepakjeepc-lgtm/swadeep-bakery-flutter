import React, { useState } from 'react';
import {
  ChefHat,
  Plus,
  Phone,
  Mail,
  KeyRound,
  CheckCircle2,
  Trash2,
  Edit2,
  Search,
  Copy,
  Check,
  ShieldCheck,
  Power,
  Eye,
  UtensilsCrossed
} from 'lucide-react';
import { KitchenStaff } from '../../types';
import { addKitchenStaff, updateKitchenStaff, deleteKitchenStaff } from '../../services/staffService';

interface KitchenStaffManagementProps {
  staffList: KitchenStaff[];
  onDirectViewChef?: (staff: KitchenStaff) => void;
}

export const KitchenStaffManagement = React.memo<KitchenStaffManagementProps>(({
  staffList,
  onDirectViewChef
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<KitchenStaff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<KitchenStaff | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Head Chef / All Stations');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setRole('Head Chef / All Stations');
    setFormError(null);
    setEditingStaff(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (staff: KitchenStaff) => {
    setEditingStaff(staff);
    setName(staff.name);
    setPhone(staff.phone);
    setEmail(staff.email);
    setPassword(staff.password || 'chef123');
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
        await updateKitchenStaff(editingStaff.id, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          role
        });
      } else {
        await addKitchenStaff({
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
      setFormError(err.message || 'Failed to save kitchen staff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: KitchenStaff) => {
    const nextStatus = staff.status === 'active' ? 'inactive' : 'active';
    await updateKitchenStaff(staff.id, { status: nextStatus });
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    setIsDeleting(true);
    try {
      await deleteKitchenStaff(deletingStaff.id);
      setDeletingStaff(null);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to delete kitchen staff');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyCredentials = (staff: KitchenStaff) => {
    const text = `Gidhaur Bakery Kitchen Portal Login:\nEmail: ${staff.email}\nPassword: ${staff.password || 'chef123'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(staff.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-amber-50/90 via-white to-orange-50/70 rounded-xl border border-amber-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <ChefHat className="w-4 h-4" />
          </div>
          <h2 className="font-extrabold text-sm sm:text-base uppercase tracking-[0.14em] text-slate-900">
            KITCHEN CHEFS &amp; STAFF
          </h2>
          <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-md">
            {staffList.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-500" />
            <input
              type="text"
              placeholder="Filter chef, station..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-amber-200 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {onDirectViewChef && staffList.length > 0 && (
            <button
              onClick={() => onDirectViewChef(staffList[0])}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[11px] uppercase tracking-[0.1em] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Directly view live kitchen screen"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">OPEN KDS</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] uppercase tracking-[0.12em] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            id="add-kitchen-staff-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD CHEF</span>
          </button>
        </div>
      </div>

      {/* Staff Cards Grid */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white p-10 text-center rounded-xl border border-amber-200/70 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <ChefHat className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">
            NO KITCHEN STAFF REGISTERED
          </h3>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] uppercase tracking-[0.12em] cursor-pointer"
          >
            + ADD FIRST CHEF
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStaff.map((staff) => (
            <div
              key={staff.id}
              className={`bg-white p-4 rounded-xl border transition-all flex flex-col justify-between ${
                staff.status === 'active'
                  ? 'border-amber-200/80 hover:border-amber-400 shadow-sm shadow-amber-500/5'
                  : 'border-slate-200 opacity-65 bg-slate-50/70'
              }`}
              id={`staff-card-${staff.id}`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                      <ChefHat className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        {staff.name}
                      </h3>
                      <span className="inline-block px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-[10px] font-bold uppercase tracking-wider text-amber-800 mt-0.5">
                        {staff.role}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(staff)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                      staff.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <Power className="w-2.5 h-2.5" />
                    <span>{staff.status === 'active' ? 'ACTIVE' : 'INACTIVE'}</span>
                  </button>
                </div>

                <div className="space-y-1.5 bg-amber-50/35 p-3 rounded-lg border border-amber-200/60 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase tracking-wider">
                      <Phone className="w-3 h-3 text-amber-500" /> Phone
                    </span>
                    <a href={`tel:${staff.phone}`} className="font-mono font-bold text-slate-900 hover:underline">
                      {staff.phone}
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase tracking-wider">
                      <Mail className="w-3 h-3 text-amber-500" /> Email
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-800 truncate max-w-[160px]">
                      {staff.email}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700 pt-1.5 border-t border-amber-200/60">
                    <span className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase tracking-wider">
                      <KeyRound className="w-3 h-3 text-amber-500" /> PIN
                    </span>
                    <span className="font-mono text-[11px] font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                      {staff.password || 'chef123'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {onDirectViewChef && (
                    <button
                      onClick={() => onDirectViewChef(staff)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>OPEN KDS</span>
                    </button>
                  )}

                  <button
                    onClick={() => copyCredentials(staff)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50/70 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedId === staff.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-amber-600" />
                        <span>COPY</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(staff)}
                    className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                    title="Edit Staff"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingStaff(staff)}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                    title="Delete Staff"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Kitchen Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-md w-full p-5 rounded-xl shadow-2xl border border-amber-200 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <ChefHat className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-extrabold text-sm uppercase tracking-[0.14em] text-slate-900">
                  {editingStaff ? 'EDIT KITCHEN STAFF' : 'ADD KITCHEN CHEF'}
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
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-[0.14em] mb-1">
                  FULL NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Singh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-amber-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-[0.14em] mb-1">
                    PHONE NUMBER *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-amber-200 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-[0.14em] mb-1">
                    STATION / ROLE
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Head Chef"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-amber-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-900">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PORTAL CREDENTIALS</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-[0.14em] mb-1">
                    LOGIN EMAIL *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="chef.vikram@gidhaurbakery.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-amber-200 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-[0.14em] mb-1">
                    PASSWORD *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="chef123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-amber-200 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
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
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{editingStaff ? 'UPDATE' : 'CREATE'}</span>
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

KitchenStaffManagement.displayName = 'KitchenStaffManagement';
