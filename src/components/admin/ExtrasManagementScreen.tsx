import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Power,
  RotateCcw
} from 'lucide-react';
import { ProductExtra } from '../../types';
import {
  getCachedExtras,
  subscribeToExtras,
  addExtra,
  updateExtra,
  deleteExtra,
  saveExtras,
  DEFAULT_PRODUCT_EXTRAS
} from '../../services/extrasService';
import { triggerHaptic } from '../../utils/haptics';

interface ExtrasManagementScreenProps {
  onBack: () => void;
}

export const ExtrasManagementScreen: React.FC<ExtrasManagementScreenProps> = ({ onBack }) => {
  const [extras, setExtras] = useState<ProductExtra[]>(() => getCachedExtras());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<ProductExtra | null>(null);
  const [deletingExtra, setDeletingExtra] = useState<ProductExtra | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | string>(20);
  const [category, setCategory] = useState('Toppings');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToExtras((items) => {
      setExtras(items);
    });
    return () => unsub();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    extras.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [extras]);

  const filteredExtras = useMemo(() => {
    return extras.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [extras, searchQuery, selectedCategory]);

  const handleOpenAdd = () => {
    setName('');
    setPrice(20);
    setCategory('Toppings');
    setEditingExtra(null);
    setFormError(null);
    setIsFormModalOpen(true);
    triggerHaptic('light');
  };

  const handleOpenEdit = (extra: ProductExtra) => {
    setName(extra.name);
    setPrice(extra.price);
    setCategory(extra.category || 'Toppings');
    setEditingExtra(extra);
    setFormError(null);
    setIsFormModalOpen(true);
    triggerHaptic('light');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const numPrice = Number(price);

    if (!cleanName) {
      setFormError('Please enter an extra name.');
      return;
    }
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError('Please enter a valid price.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingExtra) {
        await updateExtra(editingExtra.id, {
          name: cleanName,
          price: numPrice,
          category: category.trim() || 'General',
        });
        setFeedback(`✓ "${cleanName}" updated`);
      } else {
        await addExtra({
          name: cleanName,
          price: numPrice,
          category: category.trim() || 'General',
          available: true,
        });
        setFeedback(`✓ "${cleanName}" added`);
      }
      setIsFormModalOpen(false);
      setTimeout(() => setFeedback(null), 3000);
      triggerHaptic('medium');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save extra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (extra: ProductExtra) => {
    triggerHaptic('selection');
    const nextStatus = extra.available === false ? true : false;
    await updateExtra(extra.id, { available: nextStatus });
  };

  const handleConfirmDelete = async () => {
    if (!deletingExtra) return;
    setIsSubmitting(true);
    try {
      await deleteExtra(deletingExtra.id);
      setFeedback(`✓ "${deletingExtra.name}" removed`);
      setDeletingExtra(null);
      setTimeout(() => setFeedback(null), 3000);
      triggerHaptic('medium');
    } catch (err: any) {
      setFeedback(`Error deleting: ${err?.message || 'Failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreDefaults = async () => {
    setShowRestoreModal(false);
    setIsSubmitting(true);
    try {
      await saveExtras(DEFAULT_PRODUCT_EXTRAS);
      setFeedback('✓ Restored default extras');
      setTimeout(() => setFeedback(null), 3000);
      triggerHaptic('medium');
    } catch (err: any) {
      setFeedback(`Error: ${err?.message || 'Failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-20 animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-violet-50/90 via-white to-amber-50/60 border border-violet-200/80 rounded-xl px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-violet-50 border border-violet-200 text-[11px] font-bold uppercase tracking-[0.12em] text-violet-700 transition-colors cursor-pointer shrink-0 shadow-2xs"
            id="back-to-catalog-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base uppercase tracking-[0.14em] text-slate-900 truncate">
              Extras &amp; Add-ons
            </h1>
            <span className="text-[11px] font-mono font-bold text-violet-700 bg-violet-100/80 border border-violet-200 px-2 py-0.5 rounded-md tabular-nums shrink-0">
              {extras.length} ITEMS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRestoreModal(true)}
            className="px-3 py-2 rounded-lg bg-white hover:bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold uppercase tracking-[0.12em] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            id="add-extra-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Extra</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search & Underlined Category Filter Bar */}
      <div className="bg-white rounded-xl border border-violet-100 px-4 pt-3 pb-2 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-violet-600 text-white font-bold shadow-2xs'
                : 'bg-violet-50/60 text-slate-600 hover:bg-violet-100/80 hover:text-violet-900 font-medium'
            }`}
          >
            All ({extras.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-violet-600 text-white font-bold shadow-2xs'
                  : 'bg-violet-50/60 text-slate-600 hover:bg-violet-100/80 hover:text-violet-900 font-medium'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-violet-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter extras..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-violet-50/30 border border-violet-200 focus:border-violet-500 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Extras Grid */}
      {filteredExtras.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-violet-100 space-y-3">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">
            No Extras Found
          </h3>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] uppercase tracking-[0.12em] cursor-pointer"
          >
            + Create Extra
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredExtras.map((extra) => (
            <div
              key={extra.id}
              className={`bg-white p-4 rounded-xl border transition-all flex flex-col justify-between ${
                extra.available !== false
                  ? 'border-violet-200/80 hover:border-violet-400 shadow-sm shadow-violet-500/5'
                  : 'border-slate-200 bg-slate-50/70 opacity-65'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="inline-block text-[9px] font-mono font-bold text-violet-700 bg-violet-50 border border-violet-200/80 px-1.5 py-0.5 rounded-md uppercase tracking-wider mb-1">
                      {extra.category || 'TOPPING'}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {extra.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(extra)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold uppercase transition-colors shrink-0 cursor-pointer ${
                      extra.available !== false
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <Power className="w-2.5 h-2.5" />
                    <span>{extra.available !== false ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                <div className="flex items-baseline justify-between bg-amber-50/60 px-3 py-2 rounded-lg border border-amber-200/80">
                  <span className="font-mono font-extrabold text-base text-amber-950">
                    +₹{extra.price}
                  </span>
                  <span className="text-[10px] font-mono font-semibold uppercase text-amber-700">
                    PER ITEM
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(extra)}
                  className="p-1.5 rounded-lg border border-violet-200/80 hover:border-violet-400 text-violet-600 hover:bg-violet-50 transition-colors cursor-pointer"
                  title="Edit Extra"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingExtra(extra)}
                  className="p-1.5 rounded-lg border border-rose-200/80 hover:border-rose-300 text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete Extra"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Extra Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full p-6 rounded-xl shadow-xl border border-violet-200 space-y-4">
            <div className="flex items-center justify-between border-b border-violet-100 pb-3">
              <h3 className="font-extrabold text-xs uppercase tracking-[0.16em] text-violet-950">
                {editingExtra ? 'Edit Extra' : 'Add Extra'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-violet-800 uppercase tracking-[0.14em] mb-1">
                  EXTRA NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Extra Cheese, Extra Corn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-violet-200 focus:border-violet-500 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-[0.14em] mb-1">
                    PRICE (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="30"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-amber-50/40 border border-amber-200 focus:border-amber-500 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-violet-800 uppercase tracking-[0.14em] mb-1">
                    CATEGORY TAG
                  </label>
                  <input
                    type="text"
                    placeholder="Toppings"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-violet-200 focus:border-violet-500 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {['Toppings', 'Cheese & Dips', 'Seasoning', 'Dessert & Sweets', 'Party Accessories'].map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                        category === c
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-violet-50/60 text-violet-800 border-violet-200 hover:border-violet-400'
                      }`}
                    >
                      {c}
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[11px] uppercase tracking-[0.1em] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] uppercase tracking-[0.12em] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : editingExtra ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExtra && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-rose-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600 block">
                DELETE EXTRA
              </span>
              <h4 className="font-bold text-base text-slate-900">
                Delete "{deletingExtra.name}"?
              </h4>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingExtra(null)}
                className="flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Default Extras Confirmation Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-amber-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600 block">
                RESTORE DEFAULTS
              </span>
              <h4 className="font-bold text-base text-slate-900">
                Reset Default Extras?
              </h4>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRestoreDefaults}
                className="flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] text-white bg-amber-600 hover:bg-amber-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
