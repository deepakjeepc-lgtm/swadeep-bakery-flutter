import React, { useState, useMemo, memo } from 'react';
import {
  ArrowLeft,
  Search,
  Check,
  Plus,
  Trash2,
  Layers,
  Save,
  Tag,
  AlertCircle
} from 'lucide-react';
import { Product } from '../../types';
import {
  saveProductGroup,
  unlinkEntireGroup
} from '../../services/productService';

interface ProductLinkGroupScreenProps {
  product?: Product | null;
  allProducts: Product[];
  onBack: () => void;
  onSuccess: (message: string) => void;
}

export const ProductLinkGroupScreen: React.FC<ProductLinkGroupScreenProps> = memo(({
  product,
  allProducts,
  onBack,
  onSuccess
}) => {
  const existingGroups = useMemo(() => {
    const map = new Map<string, { groupId: string; groupName: string; count: number; items: Product[] }>();
    for (const p of allProducts) {
      if (p.groupId) {
        const item = map.get(p.groupId) || {
          groupId: p.groupId,
          groupName: p.groupName || 'Variant Group',
          count: 0,
          items: []
        };
        item.count += 1;
        item.items.push(p);
        map.set(p.groupId, item);
      }
    }
    return Array.from(map.values());
  }, [allProducts]);

  const initialGroupId = useMemo(() => {
    if (product?.groupId) {
      return product.groupId;
    }
    return 'new';
  }, [product]);

  const [activeGroupId, setActiveGroupId] = useState<string>(initialGroupId);

  const [groupNameInput, setGroupNameInput] = useState<string>(() => {
    if (product?.groupId && product?.groupName) {
      return product.groupName;
    }
    if (product && !product.groupId) {
      const baseName = product.name.replace(/\s*\d+.*$/, '').trim();
      return baseName ? `${baseName} Collection` : `${product.name} Options`;
    }
    return '';
  });

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() => {
    if (product?.groupId) {
      return allProducts.filter((p) => p.groupId === product.groupId).map((p) => p.id);
    }
    if (product) {
      return [product.id];
    }
    return [];
  });

  const [originalProductIds, setOriginalProductIds] = useState<string[]>(() => {
    if (product?.groupId) {
      return allProducts.filter((p) => p.groupId === product.groupId).map((p) => p.id);
    }
    return [];
  });

  const [customLabels, setCustomLabels] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (product?.groupId) {
      allProducts
        .filter((p) => p.groupId === product.groupId)
        .forEach((p) => {
          if (p.groupVariantLabel) {
            map[p.id] = p.groupVariantLabel;
          }
        });
    } else if (product?.groupVariantLabel) {
      map[product.id] = product.groupVariantLabel;
    }
    return map;
  });

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleSelectGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    setIsConfirmingDelete(false);
    setStatusMessage(null);

    if (groupId === 'new') {
      setGroupNameInput('');
      setSelectedProductIds(product && !product.groupId ? [product.id] : []);
      setOriginalProductIds([]);
      setCustomLabels({});
    } else {
      const matched = existingGroups.find((g) => g.groupId === groupId);
      if (matched) {
        setGroupNameInput(matched.groupName);
        const ids = matched.items.map((p) => p.id);
        setSelectedProductIds(ids);
        setOriginalProductIds(ids);
        const labels: Record<string, string> = {};
        matched.items.forEach((p) => {
          if (p.groupVariantLabel) {
            labels[p.id] = p.groupVariantLabel;
          }
        });
        setCustomLabels(labels);
      }
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of allProducts) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set);
  }, [allProducts]);

  const filteredCatalog = useMemo(() => {
    return allProducts.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.groupName && p.groupName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allProducts, selectedCategory, searchQuery]);

  const includedProducts = useMemo(() => {
    const idSet = new Set(selectedProductIds);
    return allProducts.filter((p) => idSet.has(p.id));
  }, [allProducts, selectedProductIds]);

  const handleToggleProduct = (targetProd: Product) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(targetProd.id)) {
        return prev.filter((id) => id !== targetProd.id);
      } else {
        return [...prev, targetProd.id];
      }
    });
  };

  const handleLabelChange = (productId: string, val: string) => {
    setCustomLabels((prev) => ({
      ...prev,
      [productId]: val
    }));
  };

  const handleSaveGroup = async () => {
    const cleanName = groupNameInput.trim();
    if (!cleanName) {
      setStatusMessage('Please enter a group name.');
      return;
    }

    if (selectedProductIds.length === 0) {
      setStatusMessage('Please select at least 1 product.');
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const finalGroupId = activeGroupId === 'new' ? `group_${Date.now()}` : activeGroupId;

      await saveProductGroup({
        groupId: finalGroupId,
        groupName: cleanName,
        productIds: selectedProductIds,
        itemLabels: customLabels,
        previousProductIds: originalProductIds
      });

      onSuccess(`✓ Group "${cleanName}" saved (${selectedProductIds.length} products)`);
    } catch (err: any) {
      console.error('Error saving product group:', err);
      setStatusMessage(`Error saving group: ${err?.message || 'Please try again'}`);
      setIsSaving(false);
    }
  };

  const handleDissolveGroup = async () => {
    if (activeGroupId === 'new') return;

    setIsSaving(true);
    setStatusMessage(null);

    try {
      await unlinkEntireGroup(activeGroupId, allProducts);
      onSuccess(`✓ Group "${groupNameInput}" dissolved.`);
    } catch (err: any) {
      console.error('Error dissolving group:', err);
      setStatusMessage(`Failed to delete group: ${err?.message || 'Please try again'}`);
      setIsSaving(false);
      setIsConfirmingDelete(false);
    }
  };

  return (
    <div className="space-y-5 pb-20 animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-sky-50/90 via-white to-indigo-50/70 border border-sky-200/80 rounded-xl px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-sky-50 border border-sky-200 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-700 transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <h2 className="font-extrabold text-sm sm:text-base uppercase tracking-[0.14em] text-slate-900 truncate">
            Link &amp; Group Products
          </h2>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveGroup}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold uppercase tracking-[0.12em] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {isSaving ? 'Saving...' : `Save Group (${selectedProductIds.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Group Switcher Tabs */}
      <div className="bg-white p-3 rounded-xl border border-sky-100 shadow-2xs flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => handleSelectGroup('new')}
          className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-[0.1em] shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeGroupId === 'new'
              ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
              : 'bg-sky-50/50 hover:bg-sky-100/80 text-sky-800 border-sky-200/80'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Group</span>
        </button>

        <div className="h-5 w-px bg-slate-200 shrink-0 mx-1" />

        {existingGroups.map((g) => {
          const isCurrent = activeGroupId === g.groupId;
          return (
            <button
              key={g.groupId}
              type="button"
              onClick={() => handleSelectGroup(g.groupId)}
              className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-[0.08em] shrink-0 transition-colors flex items-center gap-2 cursor-pointer ${
                isCurrent
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-indigo-50/40 hover:bg-indigo-100/70 text-indigo-900 border-indigo-200/80'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{g.groupName}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isCurrent ? 'bg-white/20 text-white' : 'bg-white text-indigo-700 border border-indigo-200/60'
                }`}
              >
                {g.count}
              </span>
            </button>
          );
        })}
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 1. Group Name Input Box */}
      <div className="bg-sky-50/40 p-4 sm:p-5 rounded-xl border border-sky-200/80 shadow-xs shadow-sky-500/5 space-y-2">
        <label className="block text-[10px] font-bold text-sky-800 uppercase tracking-[0.14em]">
          GROUP NAME / COLLECTION TITLE <span className="text-rose-500">*</span>
        </label>

        <div className="relative">
          <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-500" />
          <input
            type="text"
            value={groupNameInput}
            onChange={(e) => setGroupNameInput(e.target.value)}
            placeholder="e.g. Red Bull Flavours, Foil Balloon Numbers (0-9)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-sky-200 focus:border-sky-500 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* 2. Selected Products in this Group */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-indigo-200/80 shadow-sm shadow-indigo-500/5 space-y-3.5">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-indigo-100">
          <h3 className="font-extrabold text-xs uppercase tracking-[0.16em] text-indigo-950">
            LINKED PRODUCTS ({includedProducts.length})
          </h3>
          <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 uppercase">
            {includedProducts.length} LINKED
          </span>
        </div>

        {includedProducts.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              No products linked yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {includedProducts.map((prod) => (
              <div
                key={prod.id}
                className="p-3 rounded-xl bg-indigo-50/30 border border-indigo-200/80 flex items-center gap-3 relative"
              >
                <div className="w-14 aspect-[4/3] rounded-lg overflow-hidden bg-white border border-indigo-100 shrink-0 relative">
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className={`w-full h-full ${
                        prod.imageFit === 'contain' ? 'object-contain p-0.5 bg-white' : 'object-cover bg-white'
                      }`}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono font-bold text-indigo-400 text-xs">
                      {prod.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-xs text-slate-900 truncate">
                      {prod.name}
                    </h4>
                    <span className="font-mono font-bold text-xs text-indigo-700 shrink-0">
                      ₹{prod.price}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-indigo-400 shrink-0" />
                    <input
                      type="text"
                      value={customLabels[prod.id] ?? prod.groupVariantLabel ?? ''}
                      onChange={(e) => handleLabelChange(prod.id, e.target.value)}
                      placeholder={`Label (e.g. ${prod.name.split(' ')[0]})`}
                      className="w-full px-2 py-1 rounded-md bg-white border border-indigo-200 focus:border-indigo-500 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleProduct(prod)}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-200 hover:border-rose-200"
                  title="Remove from group"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Catalog Products Selector */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <h3 className="font-extrabold text-xs uppercase tracking-[0.16em] text-slate-900">
            SELECT CATALOG ITEMS
          </h3>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-500" />
            <input
              type="text"
              placeholder="Filter catalog items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-sky-50/30 border border-sky-200 focus:border-sky-500 focus:bg-white text-xs placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Category Filter Strip */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-sky-600 text-white font-bold shadow-2xs'
                : 'bg-sky-50/60 text-slate-600 hover:bg-sky-100/70 font-medium'
            }`}
          >
            All ({allProducts.length})
          </button>
          {categories.map((c) => {
            const count = allProducts.filter((p) => p.category === c).length;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  selectedCategory === c
                    ? 'bg-sky-600 text-white font-bold shadow-2xs'
                    : 'bg-sky-50/60 text-slate-600 hover:bg-sky-100/70 font-medium'
                }`}
              >
                {c} ({count})
              </button>
            );
          })}
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {filteredCatalog.map((prod) => {
            const isSelected = selectedProductIds.includes(prod.id);
            const isInOtherGroup = prod.groupId && prod.groupId !== activeGroupId;

            return (
              <div
                key={prod.id}
                onClick={() => handleToggleProduct(prod)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                  isSelected
                    ? 'bg-sky-50/70 border-sky-500 shadow-2xs'
                    : 'bg-white hover:border-sky-300 border-slate-200'
                }`}
              >
                <div className="w-12 aspect-[4/3] rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0 relative">
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className={`w-full h-full ${
                        prod.imageFit === 'contain' ? 'object-contain p-0.5 bg-white' : 'object-cover bg-white'
                      }`}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono font-bold text-slate-400 text-[10px]">
                      {prod.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {prod.name}
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-900 ml-1 shrink-0">
                      ₹{prod.price}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-slate-500 font-medium truncate">
                      {prod.category}
                    </span>
                    {isInOtherGroup && (
                      <span className="text-[9px] font-mono text-amber-800 bg-amber-50 px-1 rounded border border-amber-200 truncate max-w-[90px]">
                        {prod.groupName || 'Linked'}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-sky-600 text-white'
                      : 'border border-slate-300 bg-white text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sticky Actions Bar */}
      <div className="sticky bottom-3 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-sky-200 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {activeGroupId !== 'new' && (
            <div>
              {isConfirmingDelete ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg p-2">
                  <span className="text-xs font-bold text-rose-900">
                    Dissolve "{groupNameInput}"?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDissolveGroup}
                      disabled={isSaving}
                      className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? 'Deleting...' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      disabled={isSaving}
                      className="px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  disabled={isSaving}
                  className="px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Dissolve Group</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 text-center"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveGroup}
            disabled={isSaving}
            className="flex-1 sm:flex-initial px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold uppercase tracking-[0.12em] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-center shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {isSaving ? 'Saving...' : `Save Group (${selectedProductIds.length})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
});

ProductLinkGroupScreen.displayName = 'ProductLinkGroupScreen';
