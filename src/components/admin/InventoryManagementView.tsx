import React, { useState, useMemo, useCallback } from 'react';
import {
  Package,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Search,
  Plus,
  Minus,
  RefreshCw,
  Download,
  Printer,
  TrendingUp,
  ChevronDown,
  Boxes,
  ArrowUpDown,
  X
} from 'lucide-react';
import { Product } from '../../types';
import {
  getProductStock,
  getProductLowStockThreshold,
  isItemLowStock,
  isItemOutOfStock,
  bulkUpdateInventory,
  updateProductStockQuantity,
  exportInventoryToCSV,
  printInventoryAuditSheet
} from '../../services/inventoryService';
import { triggerHaptic } from '../../utils/haptics';

interface InventoryManagementViewProps {
  products: Product[];
  categories?: string[];
  onRefreshCatalog?: () => void;
}

type StockFilterType = 'all' | 'low_stock' | 'out_of_stock' | 'in_stock';
type StockSortType = 'name_asc' | 'lowest_stock' | 'highest_stock' | 'price_desc' | 'price_asc';

export const InventoryManagementView = React.memo<InventoryManagementViewProps>(({
  products,
  categories = [],
  onRefreshCatalog
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<StockFilterType>('all');
  const [sortBy, setSortBy] = useState<StockSortType>('lowest_stock');

  // Local state for inline editing of custom quantities before Enter/Blur
  const [editingQuantities, setEditingQuantities] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Compute KPI metrics
  const kpis = useMemo(() => {
    const totalItems = products.length;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalUnitsInStore = 0;
    let totalRetailValue = 0;

    for (const p of products) {
      const stock = getProductStock(p);
      const isOut = isItemOutOfStock(p);
      const isLow = isItemLowStock(p);

      if (isOut) {
        outOfStockCount++;
      } else {
        inStockCount++;
        if (isLow) {
          lowStockCount++;
        }
      }

      if (!isOut) {
        totalUnitsInStore += stock;
        totalRetailValue += stock * (Number(p.price) || 0);
      }
    }

    const inStockPercent = totalItems > 0 ? Math.round((inStockCount / totalItems) * 100) : 100;

    return {
      totalItems,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      totalUnitsInStore,
      totalRetailValue,
      inStockPercent
    };
  }, [products]);

  // Unique categories list
  const availableCategories = useMemo(() => {
    const catSet = new Set<string>(categories);
    products.forEach((p) => {
      if (p.category) catSet.add(p.category);
    });
    return ['all', ...Array.from(catSet)];
  }, [categories, products]);

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = products.filter((p) => {
      // Search filter
      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        const matchId = p.id.toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchId) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // Stock Status Filter
      if (filterType === 'out_of_stock' && !isItemOutOfStock(p)) return false;
      if (filterType === 'low_stock' && !isItemLowStock(p)) return false;
      if (filterType === 'in_stock' && isItemOutOfStock(p)) return false;

      return true;
    });

    // Sort
    return filtered.sort((a, b) => {
      const stockA = getProductStock(a);
      const stockB = getProductStock(b);

      switch (sortBy) {
        case 'lowest_stock':
          return stockA - stockB;
        case 'highest_stock':
          return stockB - stockA;
        case 'price_desc':
          return (b.price || 0) - (a.price || 0);
        case 'price_asc':
          return (a.price || 0) - (b.price || 0);
        case 'name_asc':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [products, searchQuery, selectedCategory, filterType, sortBy]);

  // Handle +1, -1, +5, +10, +25 quick adjust
  const handleAdjustQuantity = useCallback(
    (product: Product, delta: number) => {
      triggerHaptic('light');
      const currentStock = getProductStock(product);
      const nextStock = Math.max(0, currentStock + delta);
      updateProductStockQuantity(
        product.id,
        nextStock,
        nextStock > 0,
        getProductLowStockThreshold(product),
        products
      );
      setEditingQuantities((prev) => {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      });
      showToast(
        `${product.name}: ${delta > 0 ? `+${delta}` : delta} → ${nextStock} in stock`
      );
    },
    [products, showToast]
  );

  // Handle direct typing of stock quantity
  const handleQuantityInputChange = (productId: string, val: string) => {
    setEditingQuantities((prev) => ({ ...prev, [productId]: val }));
  };

  const handleQuantityInputBlur = (product: Product) => {
    const rawVal = editingQuantities[product.id];
    if (rawVal === undefined) return;

    const parsed = parseInt(rawVal, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      triggerHaptic('medium');
      updateProductStockQuantity(
        product.id,
        parsed,
        parsed > 0,
        getProductLowStockThreshold(product),
        products
      );
      showToast(`✓ Updated "${product.name}" stock to ${parsed}`);
    }

    setEditingQuantities((prev) => {
      const copy = { ...prev };
      delete copy[product.id];
      return copy;
    });
  };

  // Toggle Availability (Mark Out of Stock / In Stock)
  const handleToggleAvailability = (product: Product) => {
    triggerHaptic('medium');
    const currentlyOut = isItemOutOfStock(product);
    if (currentlyOut) {
      const currentStock = getProductStock(product);
      const restoredQty = currentStock > 0 ? currentStock : 25;
      updateProductStockQuantity(
        product.id,
        restoredQty,
        true,
        getProductLowStockThreshold(product),
        products
      );
      showToast(`✓ "${product.name}" marked IN STOCK (${restoredQty} units)`);
    } else {
      updateProductStockQuantity(
        product.id,
        0,
        false,
        getProductLowStockThreshold(product),
        products
      );
      showToast(`"${product.name}" marked OUT OF STOCK`);
    }
  };

  // Bulk Selection Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const handleBulkAction = (action: 'restock25' | 'add10' | 'markOut') => {
    if (selectedIds.size === 0) return;
    triggerHaptic('heavy');
    const ids = Array.from(selectedIds);

    if (action === 'restock25') {
      bulkUpdateInventory(ids, 'setQuantity', 25, products);
    } else if (action === 'add10') {
      bulkUpdateInventory(ids, 'addQuantity', 10, products);
    } else if (action === 'markOut') {
      bulkUpdateInventory(ids, 'markOutOfStock', 0, products);
    }

    showToast(`✓ Applied bulk update to ${ids.length} items`);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-900 text-white px-4 py-3 shadow-2xl flex items-center gap-2.5 border border-emerald-700 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/70 rounded-xl border border-emerald-200/80 p-4 shadow-xs">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 block">
            SMART INVENTORY CONTROL
          </span>
          <h2 className="font-extrabold text-lg sm:text-xl tracking-[0.06em] uppercase text-slate-900">
            Stock &amp; Baking Batch Manager
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportInventoryToCSV(products)}
            title="Download full inventory CSV spreadsheet"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-900 bg-white hover:bg-emerald-50 border border-emerald-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => printInventoryAuditSheet(products)}
            title="Print daily morning kitchen baking audit sheet"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>Print Audit Sheet</span>
          </button>

          {onRefreshCatalog && (
            <button
              onClick={onRefreshCatalog}
              title="Refresh inventory from local catalog"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. 5 KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Tracked Items */}
        <div className="bg-sky-50/50 rounded-xl border border-sky-200/80 p-4 space-y-1 shadow-xs shadow-sky-500/5">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">TRACKED ITEMS</span>
            <Package className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-sky-950">
            {kpis.totalItems}
          </div>
        </div>

        {/* In Stock Items */}
        <div className="bg-emerald-50/50 rounded-xl border border-emerald-200/80 p-4 space-y-1 shadow-xs shadow-emerald-500/5">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">IN STOCK</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-emerald-800">
            {kpis.inStockCount}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-amber-50/50 rounded-xl border border-amber-200/80 p-4 space-y-1 shadow-xs shadow-amber-500/5">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">LOW STOCK (≤ 5)</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-amber-800">
            {kpis.lowStockCount}
          </div>
        </div>

        {/* Out of Stock / Sold Out */}
        <div className="bg-rose-50/50 rounded-xl border border-rose-200/80 p-4 space-y-1 shadow-xs shadow-rose-500/5">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">SOLD OUT (0)</span>
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-rose-700">
            {kpis.outOfStockCount}
          </div>
        </div>

        {/* Retail Inventory Value */}
        <div className="bg-indigo-50/50 rounded-xl border border-indigo-200/80 p-4 space-y-1 col-span-2 lg:col-span-1 shadow-xs shadow-indigo-500/5">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">RETAIL VALUE</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-indigo-950">
            ₹{kpis.totalRetailValue.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* 2. SMART SEARCH & FILTER TOOLBAR */}
      <div className="bg-white rounded-xl border border-emerald-100 p-4 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Live Search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter items by name, category, or SKU..."
              className="w-full pl-8 pr-8 py-2 rounded-lg bg-emerald-50/30 border border-emerald-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category & Sort Dropdowns */}
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-emerald-50/40 border border-emerald-200 text-xs font-bold uppercase tracking-wider text-emerald-950 cursor-pointer focus:outline-hidden focus:border-emerald-500"
              >
                <option value="all">All Categories</option>
                {availableCategories
                  .filter((c) => c !== 'all')
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as StockSortType)}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-sky-50/50 border border-sky-200 text-xs font-bold uppercase tracking-wider text-sky-950 cursor-pointer focus:outline-hidden focus:border-sky-500"
              >
                <option value="lowest_stock">Lowest Stock First</option>
                <option value="highest_stock">Highest Stock First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="price_asc">Price: Low to High</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-sky-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 font-medium'
            }`}
          >
            All Items ({products.length})
          </button>

          <button
            onClick={() => setFilterType('in_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterType === 'in_stock'
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 font-medium'
            }`}
          >
            <span>In Stock ({kpis.inStockCount})</span>
          </button>

          <button
            onClick={() => setFilterType('low_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterType === 'low_stock'
                ? 'bg-amber-600 text-white font-bold shadow-2xs'
                : 'bg-amber-50/70 text-amber-800 hover:bg-amber-100 font-medium'
            }`}
          >
            <span>Low Stock ({kpis.lowStockCount})</span>
          </button>

          <button
            onClick={() => setFilterType('out_of_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterType === 'out_of_stock'
                ? 'bg-rose-600 text-white font-bold shadow-2xs'
                : 'bg-rose-50/70 text-rose-800 hover:bg-rose-100 font-medium'
            }`}
          >
            <span>Sold Out ({kpis.outOfStockCount})</span>
          </button>

          <div className="ml-auto text-xs text-slate-500 font-mono">
            Showing <strong className="text-emerald-800">{filteredProducts.length}</strong> items
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar when items selected */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-950 text-white p-3.5 rounded-xl border border-indigo-800 flex flex-wrap items-center justify-between gap-3 animate-slide-up shadow-lg">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-white text-indigo-950 font-mono text-xs font-extrabold">
              {selectedIds.size}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider">Items Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('add10')}
              className="px-3 py-1.5 rounded-lg bg-indigo-800 hover:bg-indigo-700 border border-indigo-600 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              +10 Units
            </button>
            <button
              onClick={() => handleBulkAction('restock25')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Set 25 In Stock
            </button>
            <button
              onClick={() => handleBulkAction('markOut')}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Mark Sold Out
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 text-indigo-300 hover:text-white"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. STOCK CONTROL TABLE / LIST */}
      <div className="bg-white rounded-xl border border-emerald-200/70 shadow-sm shadow-emerald-500/5 overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
              <Boxes className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">
              No inventory items found
            </h3>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold uppercase tracking-wider text-emerald-900 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-emerald-50/50 border-b border-emerald-100 text-[10px] font-bold text-emerald-900 uppercase tracking-[0.14em]">
                  <th className="py-3.5 pl-4 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === filteredProducts.length}
                      onChange={handleSelectAll}
                      className="rounded border-emerald-300 accent-emerald-600 cursor-pointer w-4 h-4"
                    />
                  </th>
                  <th className="py-3.5 px-3">Item Details</th>
                  <th className="py-3.5 px-3">Price</th>
                  <th className="py-3.5 px-3 text-center">Live Status</th>
                  <th className="py-3.5 px-3 text-center">Quick Stock Adjuster</th>
                  <th className="py-3.5 pr-4 pl-3 text-right">Instant Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const stock = getProductStock(product);
                  const isOut = isItemOutOfStock(product);
                  const isLow = isItemLowStock(product);
                  const isSelected = selectedIds.has(product.id);
                  const currentInputValue = editingQuantities[product.id] ?? String(stock);

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-emerald-50/20 transition-colors ${
                        isSelected ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 pl-4 pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(product.id)}
                          className="rounded border-emerald-300 accent-emerald-600 cursor-pointer w-4 h-4"
                        />
                      </td>

                      {/* Item Details (Thumbnail, Name, Category) */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
                              <span className="font-semibold text-indigo-700">{product.category || 'Bakery'}</span>
                              <span>·</span>
                              <span className="font-mono text-slate-400">
                                SKU: {product.id.slice(-6)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Retail Price */}
                      <td className="py-3.5 px-3 font-mono font-extrabold text-amber-900 text-xs sm:text-sm">
                        ₹{product.price}
                      </td>

                      {/* Live Stock Badge & Threshold Customizer */}
                      <td className="py-3.5 px-3 text-center">
                        <div>
                          {isOut ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold uppercase tracking-wider">
                              Sold Out (0)
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                              Low Stock ({stock})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                              In Stock ({stock})
                            </span>
                          )}

                          <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-slate-400">
                            <span>Alert if ≤</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              defaultValue={getProductLowStockThreshold(product)}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 0) {
                                  updateProductStockQuantity(product.id, stock, undefined, val, products);
                                  showToast(`✓ Alert threshold set to ≤ ${val} for "${product.name}"`);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              title="Set low stock alert threshold for this item (default 5)"
                              className="w-8 text-center font-mono font-bold text-[10px] rounded bg-amber-50/70 hover:bg-amber-100 focus:bg-white border border-amber-200 px-1 py-0.5 text-amber-900 focus:outline-hidden focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </td>

                      {/* Quick Adjust Stepper: [-5] [-1] [Direct Input] [+1] [+5] */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-sky-50/40 p-1 rounded-lg border border-sky-200/80">
                          <button
                            onClick={() => handleAdjustQuantity(product, -5)}
                            disabled={stock <= 0}
                            title="Deduct 5 items"
                            className="px-2 py-1 rounded text-[11px] font-mono font-extrabold text-sky-800 hover:bg-white transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            -5
                          </button>

                          <button
                            onClick={() => handleAdjustQuantity(product, -1)}
                            disabled={stock <= 0}
                            title="Deduct 1 item"
                            className="p-1 rounded text-sky-800 hover:bg-white transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={currentInputValue}
                            onChange={(e) => handleQuantityInputChange(product.id, e.target.value)}
                            onBlur={() => handleQuantityInputBlur(product)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleQuantityInputBlur(product);
                            }}
                            className="w-14 text-center font-mono font-bold text-xs sm:text-sm rounded bg-white border border-sky-200 py-1 px-1 focus:outline-hidden focus:border-sky-500 text-slate-900"
                            title="Type exact stock number and press Enter or click outside"
                          />

                          <button
                            onClick={() => handleAdjustQuantity(product, 1)}
                            title="Add 1 item"
                            className="p-1 rounded text-sky-800 hover:bg-white transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleAdjustQuantity(product, 5)}
                            title="Add 5 items"
                            className="px-2 py-1 rounded text-[11px] font-mono font-extrabold text-sky-800 hover:bg-white transition-colors cursor-pointer"
                          >
                            +5
                          </button>
                        </div>
                      </td>

                      {/* Quick Toggle: Mark In Stock / Out of Stock */}
                      <td className="py-3.5 pr-4 pl-3 text-right">
                        <button
                          onClick={() => handleToggleAvailability(product)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            isOut
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          }`}
                        >
                          {isOut ? 'Restock (+25)' : 'Mark Sold Out'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});

InventoryManagementView.displayName = 'InventoryManagementView';
