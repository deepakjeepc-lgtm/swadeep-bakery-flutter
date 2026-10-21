import React, { useState, useMemo, useRef, useEffect, memo, useCallback } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Loader2,
  X,
  GripVertical
} from 'lucide-react';
import { Product } from '../../types';
import {
  DEFAULT_CATEGORIES,
  getCachedCategoryIcons,
  saveCategories,
  CategoryDetail,
  renameCategoryInProducts,
  getCachedDefaultLandingCategory,
  saveDefaultLandingCategory
} from '../../services/categoryService';
import { CategoryIconPicker } from './CategoryIconPicker';
import { renderCategoryIcon, CategoryVisual } from '../../utils/categoryIcons';
import { triggerHaptic } from '../../utils/haptics';

interface CategoryManagementScreenProps {
  categories: string[];
  products: Product[];
  iconsMap?: Record<string, CategoryDetail>;
  defaultLandingCategory?: string;
  onBack: () => void;
  onCategoriesChange?: (
    newCategories: string[],
    newIcons?: Record<string, CategoryDetail>,
    newDefaultLandingCat?: string
  ) => void;
}

interface CategoryRowProps {
  cat: string;
  index: number;
  totalCount: number;
  itemCount: number;
  isFirst: boolean;
  isEditing: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  visual?: CategoryVisual;
  editNameInput: string;
  onEditInputChange: (val: string) => void;
  onSaveRename: (index: number, cat: string) => void;
  onCancelRename: () => void;
  onStartEditing: (index: number, cat: string) => void;
  onMoveToFront: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onOpenIconPicker: (cat: string, index: number) => void;
  onInitDelete: (cat: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onTouchStartDrag: (e: React.TouchEvent, index: number) => void;
}

const CategoryItemRow: React.FC<CategoryRowProps> = memo(({
  cat,
  index,
  itemCount,
  isFirst,
  isEditing,
  isDragging,
  isDragOver,
  visual,
  editNameInput,
  onEditInputChange,
  onSaveRename,
  onCancelRename,
  onStartEditing,
  onOpenIconPicker,
  onInitDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onTouchStartDrag
}) => {
  return (
    <div
      data-category-index={index}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`overflow-x-auto no-scrollbar transition-all duration-150 rounded-xl ${
        isDragging ? 'opacity-40 border border-dashed border-indigo-500 bg-indigo-50/50' : ''
      } ${
        isDragOver ? 'border-t-2 border-indigo-600' : ''
      }`}
    >
      <div
        className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border transition-all flex items-center justify-between gap-3 min-w-[360px] sm:min-w-0 ${
          isFirst
            ? 'bg-amber-50/40 border-amber-200/90 hover:border-amber-300 shadow-2xs'
            : 'bg-white border-slate-200/90 hover:border-indigo-200 hover:bg-indigo-50/20'
        } ${isDragging ? 'bg-indigo-50/40' : ''}`}
        style={{ contain: 'content' }}
      >
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editNameInput}
              onChange={(e) => onEditInputChange(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white rounded-lg border border-indigo-500 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveRename(index, cat);
                if (e.key === 'Escape') onCancelRename();
              }}
            />
            <button
              type="button"
              onClick={() => onSaveRename(index, cat)}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
              title="Save Rename"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onCancelRename}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
              {/* Drag Handle */}
              <div
                onTouchStart={(e) => onTouchStartDrag(e, index)}
                className="p-1 text-slate-400 hover:text-indigo-600 cursor-grab active:cursor-grabbing shrink-0 transition-colors touch-none select-none"
                title="Drag to reorder"
                aria-label={`Drag ${cat} to reorder`}
              >
                <GripVertical className="w-4 h-4" />
              </div>

              {/* Position Badge */}
              <span
                className={`w-7 h-7 rounded-lg border text-[11px] font-mono font-bold flex items-center justify-center shrink-0 ${
                  isFirst
                    ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                }`}
              >
                #{index + 1}
              </span>

              {/* Category Icon Button */}
              <button
                type="button"
                onClick={() => onOpenIconPicker(cat, index)}
                className="w-8 h-8 rounded-lg bg-violet-50/70 hover:bg-violet-100 border border-violet-200/80 hover:border-violet-400 flex items-center justify-center text-violet-700 transition-colors shrink-0 cursor-pointer"
                title={`Change icon for "${cat}"`}
              >
                {renderCategoryIcon(visual, cat, 'w-4 h-4 text-violet-700')}
              </button>

              {/* Category Name */}
              <div className="flex items-center gap-2 shrink-0 min-w-[90px]">
                <span className="font-bold text-xs sm:text-sm text-slate-900 whitespace-nowrap">
                  {cat}
                </span>
                {isFirst && (
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider rounded-md bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 shrink-0">
                    1ST
                  </span>
                )}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-lg border shrink-0 ${
                  itemCount > 0
                    ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'}
              </span>

              <button
                type="button"
                onClick={() => onStartEditing(index, cat)}
                className="w-8 h-8 rounded-lg border border-indigo-200/80 hover:border-indigo-400 text-indigo-600 hover:bg-indigo-50 bg-white flex items-center justify-center transition-colors cursor-pointer"
                title="Rename category"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onInitDelete(cat)}
                className="w-8 h-8 rounded-lg border border-rose-200/70 hover:border-rose-300 text-rose-500 hover:text-rose-600 hover:bg-rose-50 bg-white flex items-center justify-center transition-colors cursor-pointer"
                title="Delete category"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export const CategoryManagementScreen: React.FC<CategoryManagementScreenProps> = memo(({
  categories: initialCategories,
  products,
  iconsMap: initialIconsMap,
  defaultLandingCategory: initialDefaultLandingCat,
  onBack,
  onCategoriesChange
}) => {
  const categoryCounts = useMemo(() => {
    return products.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [products]);

  const [localCategories, setLocalCategories] = useState<string[]>(initialCategories);
  const [newCatInput, setNewCatInput] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [activeCategoryForIcon, setActiveCategoryForIcon] = useState<string | null>(null);
  const [categoryIcons, setCategoryIcons] = useState<Record<string, CategoryDetail>>(() => {
    return initialIconsMap || getCachedCategoryIcons();
  });

  const [defaultLandingCat, setDefaultLandingCat] = useState<string>(() => {
    return initialDefaultLandingCat || getCachedDefaultLandingCategory();
  });
  const [isSavingLandingCat, setIsSavingLandingCat] = useState(false);

  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    setLocalCategories(initialCategories);
  }, [initialCategories]);

  const saveDebounceRef = useRef<number | null>(null);

  const persistCategoryOrder = useCallback((catsToSave: string[], iconsToSave?: Record<string, CategoryDetail>) => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }
    saveDebounceRef.current = window.setTimeout(async () => {
      try {
        await saveCategories(catsToSave, iconsToSave || categoryIcons);
      } catch (err) {
        console.warn('Background category save note:', err);
      }
    }, 450);
  }, [categoryIcons]);

  useEffect(() => {
    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, []);

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const touchActiveIndexRef = useRef<number | null>(null);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setLocalCategories((prev) => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      persistCategoryOrder(copy);
      queueMicrotask(() => {
        onCategoriesChange?.(copy, categoryIcons, defaultLandingCat);
      });
      return copy;
    });
    setFeedback('✓ Category order updated');
    setTimeout(() => setFeedback(null), 2000);
  }, [categoryIcons, defaultLandingCat, onCategoriesChange, persistCategoryOrder]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    triggerHaptic('medium');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx((prev) => (prev !== index ? index : prev));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== index) {
      handleReorder(draggedIdx, index);
      triggerHaptic('success');
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  }, [draggedIdx, handleReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  }, []);

  const handleTouchStartDrag = useCallback((e: React.TouchEvent, index: number) => {
    touchActiveIndexRef.current = index;
    setDraggedIdx(index);
    triggerHaptic('medium');
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchActiveIndexRef.current === null) return;
    const touch = e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const rowEl = el?.closest('[data-category-index]');
    if (rowEl) {
      const targetIdx = Number(rowEl.getAttribute('data-category-index'));
      if (!isNaN(targetIdx) && targetIdx !== dragOverIdx) {
        setDragOverIdx(targetIdx);
        triggerHaptic('selection');
      }
    }
  }, [dragOverIdx]);

  const handleTouchEnd = useCallback(() => {
    if (touchActiveIndexRef.current !== null && dragOverIdx !== null && touchActiveIndexRef.current !== dragOverIdx) {
      handleReorder(touchActiveIndexRef.current, dragOverIdx);
      triggerHaptic('success');
    }
    touchActiveIndexRef.current = null;
    setDraggedIdx(null);
    setDragOverIdx(null);
  }, [dragOverIdx, handleReorder]);

  const handleMoveToFront = useCallback((idx: number) => {
    if (idx === 0) return;
    setLocalCategories((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      persistCategoryOrder(copy);
      queueMicrotask(() => {
        onCategoriesChange?.(copy, categoryIcons, defaultLandingCat);
      });
      return copy;
    });
  }, [categoryIcons, defaultLandingCat, onCategoriesChange, persistCategoryOrder]);

  const handleMoveUp = useCallback((idx: number) => {
    if (idx === 0) return;
    setLocalCategories((prev) => {
      const copy = [...prev];
      const temp = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx] = temp;
      persistCategoryOrder(copy);
      queueMicrotask(() => {
        onCategoriesChange?.(copy, categoryIcons, defaultLandingCat);
      });
      return copy;
    });
  }, [categoryIcons, defaultLandingCat, onCategoriesChange, persistCategoryOrder]);

  const handleMoveDown = useCallback((idx: number) => {
    setLocalCategories((prev) => {
      if (idx >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = temp;
      persistCategoryOrder(copy);
      queueMicrotask(() => {
        onCategoriesChange?.(copy, categoryIcons, defaultLandingCat);
      });
      return copy;
    });
  }, [categoryIcons, defaultLandingCat, onCategoriesChange, persistCategoryOrder]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatInput.trim();
    if (!trimmed) return;

    if (localCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setFeedback(`"${trimmed}" already exists.`);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    const updated = [...localCategories, trimmed];
    setLocalCategories(updated);
    setNewCatInput('');
    setIsSaving(true);
    setFeedback(`✓ "${trimmed}" added`);

    try {
      await saveCategories(updated, categoryIcons);
      queueMicrotask(() => {
        onCategoriesChange?.(updated, categoryIcons, defaultLandingCat);
      });
    } catch (err: any) {
      setFeedback(`Error adding category: ${err?.message || 'failed'}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleStartEditing = useCallback((idx: number, cat: string) => {
    setEditingIdx(idx);
    setEditingName(cat);
  }, []);

  const handleCancelRename = useCallback(() => {
    setEditingIdx(null);
    setEditingName('');
  }, []);

  const handleSaveRename = useCallback(async (idx: number, oldName: string) => {
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingIdx(null);
      return;
    }

    if (
      localCategories.some(
        (c, i) => i !== idx && c.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setFeedback(`"${trimmed}" already exists.`);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setIsSaving(true);
    const updated = [...localCategories];
    updated[idx] = trimmed;

    const updatedIcons = { ...categoryIcons };
    if (updatedIcons[oldName]) {
      updatedIcons[trimmed] = updatedIcons[oldName];
      delete updatedIcons[oldName];
      setCategoryIcons(updatedIcons);
    }

    let nextLanding = defaultLandingCat;
    if (defaultLandingCat === oldName) {
      nextLanding = trimmed;
      setDefaultLandingCat(trimmed);
      saveDefaultLandingCategory(trimmed).catch(() => {});
    }

    setLocalCategories(updated);
    setEditingIdx(null);

    try {
      await saveCategories(updated, updatedIcons);
      await renameCategoryInProducts(oldName, trimmed);
      queueMicrotask(() => {
        onCategoriesChange?.(updated, updatedIcons, nextLanding);
      });
      setFeedback(`✓ Renamed "${oldName}" to "${trimmed}"`);
    } catch (err: any) {
      setFeedback(`Error: ${err?.message || 'failed'}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  }, [categoryIcons, defaultLandingCat, editingName, localCategories, onCategoriesChange]);

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    const updated = localCategories.filter((c) => c !== categoryToDelete);
    const updatedIcons = { ...categoryIcons };
    delete updatedIcons[categoryToDelete];

    let nextLanding = defaultLandingCat;
    if (defaultLandingCat === categoryToDelete) {
      nextLanding = updated[0] || 'Bakery';
      setDefaultLandingCat(nextLanding);
      saveDefaultLandingCategory(nextLanding).catch(() => {});
    }

    setLocalCategories(updated);
    setCategoryIcons(updatedIcons);
    setIsSaving(true);

    try {
      await saveCategories(updated, updatedIcons);
      queueMicrotask(() => {
        onCategoriesChange?.(updated, updatedIcons, nextLanding);
      });
      setFeedback(`✓ Deleted category "${categoryToDelete}"`);
    } catch (err: any) {
      setFeedback(`Error: ${err?.message || 'failed'}`);
    } finally {
      setIsSaving(false);
      setCategoryToDelete(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleConfirmResetToDefaults = async () => {
    setShowResetModal(false);
    setIsSaving(true);
    setLocalCategories(DEFAULT_CATEGORIES);

    try {
      await saveCategories(DEFAULT_CATEGORIES, categoryIcons);
      queueMicrotask(() => {
        onCategoriesChange?.(DEFAULT_CATEGORIES, categoryIcons, defaultLandingCat);
      });
      setFeedback('✓ Restored default categories');
    } catch (err: any) {
      setFeedback(`Error resetting: ${err?.message || 'failed'}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleOpenIconPicker = useCallback((cat: string) => {
    setActiveCategoryForIcon(cat);
    setIsIconPickerOpen(true);
  }, []);

  const handleSaveIcon = (visual: CategoryVisual) => {
    if (!activeCategoryForIcon) return;

    const updatedIcons: Record<string, CategoryDetail> = {
      ...categoryIcons,
      [activeCategoryForIcon]: {
        name: activeCategoryForIcon,
        iconType: visual.iconType,
        iconValue: visual.iconValue,
      },
    };
    setCategoryIcons(updatedIcons);
    setIsIconPickerOpen(false);

    saveCategories(localCategories, updatedIcons).catch(() => {});
    queueMicrotask(() => {
      onCategoriesChange?.(localCategories, updatedIcons, defaultLandingCat);
    });

    setFeedback(`✓ Updated icon for "${activeCategoryForIcon}"`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSelectDefaultLanding = async (newLandingCat: string) => {
    setDefaultLandingCat(newLandingCat);
    setIsSavingLandingCat(true);

    try {
      await saveDefaultLandingCategory(newLandingCat);
      queueMicrotask(() => {
        onCategoriesChange?.(localCategories, categoryIcons, newLandingCat);
      });
      setFeedback(`✓ Default landing set to "${newLandingCat}"`);
    } catch (err: any) {
      setFeedback(`Error saving default category: ${err?.message || 'failed'}`);
    } finally {
      setIsSavingLandingCat(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="space-y-5 pb-12 animate-fadeIn max-w-4xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/80 via-white to-amber-50/60 border border-indigo-100 rounded-xl px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-200 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700 transition-colors cursor-pointer shrink-0 shadow-2xs"
            id="category-screen-back-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="font-extrabold text-sm sm:text-base uppercase tracking-[0.14em] text-slate-900 truncate">
              Categories &amp; Order
            </h2>
            <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-100/80 border border-indigo-200 px-2 py-0.5 rounded-md tabular-nums shrink-0">
              {localCategories.length} TOTAL
            </span>
          </div>
        </div>

        {isSaving && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-[11px] font-mono font-bold uppercase shrink-0">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Syncing</span>
          </div>
        )}
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono font-bold flex items-center gap-2 shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Create New Category & Default Landing Tab Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-7 bg-indigo-50/40 p-4 rounded-xl border border-indigo-200/80 shadow-xs shadow-indigo-500/5">
            <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700 mb-2">
              CREATE CATEGORY
            </label>
            <form onSubmit={handleAddCategory} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New category name (e.g. Burgers, Beverages)..."
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                className="flex-1 bg-white px-3 py-2 rounded-lg border border-indigo-200 focus:border-indigo-500 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none min-w-0"
              />
              <button
                type="submit"
                disabled={!newCatInput.trim() || isSaving}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-[11px] uppercase tracking-[0.12em] transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          <div className="md:col-span-5 bg-amber-50/40 p-4 rounded-xl border border-amber-200/80 shadow-xs shadow-amber-500/5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800">
                DEFAULT LANDING TAB
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                HOME
              </span>
            </div>

            <select
              value={defaultLandingCat}
              onChange={(e) => handleSelectDefaultLanding(e.target.value)}
              disabled={isSavingLandingCat}
              className="w-full px-3 py-2 rounded-lg bg-white border border-amber-200 focus:border-amber-500 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="All">
                All ({categoryCounts['All'] || products.length} items)
              </option>
              {localCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({categoryCounts[cat] || 0} items)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category List Section */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-sm shadow-indigo-500/5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-extrabold text-xs uppercase tracking-[0.16em] text-indigo-950">
              MENU CATEGORIES
            </h3>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div
            className="space-y-2"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {localCategories.map((cat, idx) => (
              <CategoryItemRow
                key={cat}
                cat={cat}
                index={idx}
                totalCount={localCategories.length}
                itemCount={categoryCounts[cat] || 0}
                isFirst={idx === 0}
                isEditing={editingIdx === idx}
                isDragging={draggedIdx === idx}
                isDragOver={dragOverIdx === idx}
                visual={categoryIcons[cat]}
                editNameInput={editingName}
                onEditInputChange={setEditingName}
                onSaveRename={handleSaveRename}
                onCancelRename={handleCancelRename}
                onStartEditing={handleStartEditing}
                onMoveToFront={handleMoveToFront}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onOpenIconPicker={handleOpenIconPicker}
                onInitDelete={setCategoryToDelete}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onTouchStartDrag={handleTouchStartDrag}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Reset Categories Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white max-w-sm w-full p-6 rounded-xl border border-amber-200 shadow-xl space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600 block">
                RESTORE DEFAULTS
              </span>
              <h3 className="font-bold text-slate-900 text-base">
                Restore Default Categories?
              </h3>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-[0.1em] hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetToDefaults}
                className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] cursor-pointer"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white max-w-sm w-full p-6 rounded-xl border border-rose-200 shadow-xl space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600 block">
                DELETE CATEGORY
              </span>
              <h3 className="font-bold text-slate-900 text-base">
                Delete "{categoryToDelete}"?
              </h3>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-[0.1em] hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Icon Picker Modal */}
      {isIconPickerOpen && activeCategoryForIcon && (
        <CategoryIconPicker
          categoryName={activeCategoryForIcon}
          currentVisual={categoryIcons[activeCategoryForIcon]}
          onClose={() => setIsIconPickerOpen(false)}
          onSelect={handleSaveIcon}
        />
      )}
    </div>
  );
});
