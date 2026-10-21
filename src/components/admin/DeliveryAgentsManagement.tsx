import React, { useState } from 'react';
import {
  Bike,
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
  Smartphone
} from 'lucide-react';
import { DeliveryAgent } from '../../types';
import { addDeliveryAgent, updateDeliveryAgent, deleteDeliveryAgent } from '../../services/staffService';

interface DeliveryAgentsManagementProps {
  agents: DeliveryAgent[];
  onDirectViewAgent?: (agent: DeliveryAgent) => void;
}

export const DeliveryAgentsManagement = React.memo<DeliveryAgentsManagementProps>(({
  agents,
  onDirectViewAgent
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<DeliveryAgent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<DeliveryAgent | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState('Bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setVehicleType('Bike');
    setVehicleNumber('');
    setFormError(null);
    setEditingAgent(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (agent: DeliveryAgent) => {
    setEditingAgent(agent);
    setName(agent.name);
    setPhone(agent.phone);
    setEmail(agent.email);
    setPassword(agent.password || 'password123');
    setVehicleType(agent.vehicleType || 'Bike');
    setVehicleNumber(agent.vehicleNumber || '');
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
      if (editingAgent) {
        await updateDeliveryAgent(editingAgent.id, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          vehicleType,
          vehicleNumber: vehicleNumber.trim()
        });
      } else {
        await addDeliveryAgent({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          vehicleType,
          vehicleNumber: vehicleNumber.trim(),
          status: 'active'
        });
      }
      setIsAddModalOpen(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save delivery agent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (agent: DeliveryAgent) => {
    const nextStatus = agent.status === 'active' ? 'inactive' : 'active';
    await updateDeliveryAgent(agent.id, { status: nextStatus });
  };

  const handleConfirmDelete = async () => {
    if (!deletingAgent) return;
    setIsDeleting(true);
    try {
      await deleteDeliveryAgent(deletingAgent.id);
      setDeletingAgent(null);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to delete delivery agent');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyCredentials = (agent: DeliveryAgent) => {
    const text = `Gidhaur Bakery Delivery Portal Login:\nEmail: ${agent.email}\nPassword: ${agent.password || 'password123'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(agent.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.phone.includes(searchQuery) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-sky-50/90 via-white to-indigo-50/70 rounded-xl border border-sky-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Bike className="w-4 h-4" />
          </div>
          <h2 className="font-extrabold text-sm sm:text-base uppercase tracking-[0.14em] text-slate-900">
            DELIVERY AGENTS
          </h2>
          <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100/80 border border-sky-200 px-2 py-0.5 rounded-md">
            {agents.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-500" />
            <input
              type="text"
              placeholder="Filter rider, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-sky-200 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          {onDirectViewAgent && agents.length > 0 && (
            <button
              onClick={() => onDirectViewAgent(agents[0])}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-sky-50 border border-sky-200 text-sky-800 font-bold text-[11px] uppercase tracking-[0.1em] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Directly view rider screen"
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden md:inline">LIVE SCREEN</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] uppercase tracking-[0.12em] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            id="add-delivery-agent-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD RIDER</span>
          </button>
        </div>
      </div>

      {/* Agents Cards Grid */}
      {filteredAgents.length === 0 ? (
        <div className="bg-white p-10 text-center rounded-xl border border-sky-200/70 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mx-auto">
            <Bike className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">
            NO DELIVERY AGENTS FOUND
          </h3>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] uppercase tracking-[0.12em] cursor-pointer"
          >
            + ADD FIRST RIDER
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className={`bg-white p-4 rounded-xl border transition-all flex flex-col justify-between ${
                agent.status === 'active'
                  ? 'border-sky-200/80 hover:border-sky-400 shadow-sm shadow-sky-500/5'
                  : 'border-slate-200 opacity-65 bg-slate-50/70'
              }`}
              id={`agent-card-${agent.id}`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-800 border border-sky-200 flex items-center justify-center font-bold text-xs shrink-0">
                      <Bike className="w-4 h-4 text-sky-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        {agent.name}
                      </h3>
                      <span className="inline-block px-1.5 py-0.5 rounded-md bg-sky-50 border border-sky-200/80 text-[10px] font-mono font-bold text-sky-800 uppercase tracking-wider mt-0.5">
                        {agent.vehicleType || 'Bike'} {agent.vehicleNumber ? `· ${agent.vehicleNumber}` : ''}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(agent)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                      agent.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <Power className="w-2.5 h-2.5" />
                    <span>{agent.status === 'active' ? 'ACTIVE' : 'INACTIVE'}</span>
                  </button>
                </div>

                <div className="space-y-1.5 bg-sky-50/35 p-3 rounded-lg border border-sky-200/60 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase tracking-wider">
                      <Phone className="w-3 h-3 text-sky-500" /> Phone
                    </span>
                    <a href={`tel:${agent.phone}`} className="font-mono font-bold text-slate-900 hover:underline">
                      {agent.phone}
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase tracking-wider">
                      <Mail className="w-3 h-3 text-sky-500" /> Email
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-800 truncate max-w-[160px]">
                      {agent.email}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700 pt-1.5 border-t border-sky-200/60">
                    <span className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase tracking-wider">
                      <KeyRound className="w-3 h-3 text-sky-500" /> PIN
                    </span>
                    <span className="font-mono text-[11px] font-bold text-sky-950 bg-white px-2 py-0.5 rounded border border-sky-200">
                      {agent.password || 'password123'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-200/70">
                    <span className="text-[9px] text-emerald-700 font-bold block uppercase tracking-wider">DELIVERED</span>
                    <span className="font-mono font-extrabold text-sm text-emerald-950">
                      {agent.totalDeliveredCount || 0}
                    </span>
                  </div>
                  <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-200/70">
                    <span className="text-[9px] text-indigo-700 font-bold block uppercase tracking-wider">ACTIVE NOW</span>
                    <span className="font-mono font-extrabold text-sm text-indigo-950">
                      {agent.activeOrdersCount || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {onDirectViewAgent && (
                    <button
                      onClick={() => onDirectViewAgent(agent)}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>OPEN SCREEN</span>
                    </button>
                  )}

                  <button
                    onClick={() => copyCredentials(agent)}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-50/70 hover:bg-sky-100 border border-sky-200 text-sky-900 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedId === agent.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-sky-600" />
                        <span>COPY</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(agent)}
                    className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 border border-transparent hover:border-sky-200 transition-colors cursor-pointer"
                    title="Edit Agent"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingAgent(agent)}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                    title="Delete Agent"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Delivery Agent Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-md w-full p-5 rounded-xl shadow-2xl border border-sky-200 space-y-4">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                  <Bike className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-extrabold text-sm uppercase tracking-[0.14em] text-slate-900">
                  {editingAgent ? 'EDIT DELIVERY AGENT' : 'ADD DELIVERY AGENT'}
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
                <label className="block text-[10px] font-bold text-sky-800 uppercase tracking-[0.14em] mb-1">
                  FULL NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-sky-200 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-sky-800 uppercase tracking-[0.14em] mb-1">
                    PHONE NUMBER *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-sky-200 text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-sky-800 uppercase tracking-[0.14em] mb-1">
                    VEHICLE TYPE
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-sky-200 text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="Bike">Motorcycle / Bike</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Electric Vehicle">Electric Bike / EV</option>
                    <option value="Bicycle">Bicycle</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-sky-800 uppercase tracking-[0.14em] mb-1">
                  VEHICLE NUMBER PLATE (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BR 46 A 1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-sky-200 text-xs font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-900">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>RIDER LOGIN CREDENTIALS</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-sky-800 uppercase tracking-[0.14em] mb-1">
                    LOGIN EMAIL *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="rider.rahul@gidhaurbakery.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-sky-200 text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-sky-800 uppercase tracking-[0.14em] mb-1">
                    PASSWORD *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="rider123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-sky-200 text-xs font-mono focus:outline-none focus:border-sky-500"
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
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{editingAgent ? 'UPDATE' : 'CREATE'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAgent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-rose-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600 block">
                CONFIRM REMOVAL
              </span>
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-900">
                REMOVE {deletingAgent.name}?
              </h4>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAgent(null)}
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

DeliveryAgentsManagement.displayName = 'DeliveryAgentsManagement';
