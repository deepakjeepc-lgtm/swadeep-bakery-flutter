import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  Clock,
  PackageCheck,
  ChefHat,
  Bike,
  XCircle,
  Trash2,
  Phone,
  MapPin,
  FileText,
  Receipt,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { getLocalDateString } from '../../services/orderArchiveService';

interface OrderHistoryViewProps {
  archivedOrders: Order[];
  onDeleteArchivedOrder: (orderId: string) => void;
  onClearAllHistory?: () => void;
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({
  archivedOrders,
  onDeleteArchivedOrder
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'yesterday' | 'week'>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Helper date calculations
  const now = new Date();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayDate);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return archivedOrders.filter((order) => {
      const q = searchQuery.trim().toLowerCase();
      const oId = String(order.orderId || order.id || '').toLowerCase();
      const cName = String(order.customerName || '').toLowerCase();
      const cPhone = String(order.phone || '').replace(/\D/g, '');
      const cleanQ = q.replace(/\D/g, '');

      const matchesSearch =
        !q ||
        oId.includes(q) ||
        cName.includes(q) ||
        (cleanQ && cPhone.includes(cleanQ));

      if (!matchesSearch) return false;

      if (statusFilter !== 'all') {
        if (statusFilter === 'delivered' && order.status !== 'delivered') return false;
        if (statusFilter === 'pending' && order.status !== 'pending') return false;
        if (statusFilter === 'in_progress' && !['accepted', 'preparing', 'out_for_delivery'].includes(order.status)) return false;
        if (statusFilter === 'rejected' && order.status !== 'rejected') return false;
      }

      if (dateFilter !== 'all') {
        const orderDate = new Date(order.createdAt || 0);
        const orderDateStr = getLocalDateString(orderDate);

        if (dateFilter === 'yesterday' && orderDateStr !== yesterdayStr) return false;
        if (dateFilter === 'week' && orderDate < sevenDaysAgo) return false;
      }

      return true;
    });
  }, [archivedOrders, searchQuery, statusFilter, dateFilter, yesterdayStr, sevenDaysAgo]);

  // Aggregate metrics
  const totalArchivedCount = archivedOrders.length;
  const deliveredCount = archivedOrders.filter((o) => o.status === 'delivered').length;
  const unhandledPastCount = archivedOrders.filter((o) => o.status !== 'delivered' && o.status !== 'rejected').length;
  const totalRevenue = archivedOrders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const formatDateTime = (dateVal: any) => {
    try {
      const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <PackageCheck className="w-3 h-3 text-emerald-600" /> Delivered
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200">
            <Bike className="w-3 h-3 text-sky-600" /> Out for Delivery
          </span>
        );
      case 'preparing':
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            <ChefHat className="w-3 h-3 text-amber-600" /> In Kitchen
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" /> Cancelled
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-violet-50 text-violet-800 border border-violet-200">
            <Clock className="w-3 h-3 text-violet-600" /> Past Day Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-sky-50/50 rounded-xl border border-sky-200/80 p-4 space-y-1 shadow-xs shadow-sky-500/5">
          <span className="text-[10px] font-bold text-sky-700 uppercase tracking-[0.14em] block">
            TOTAL PAST ORDERS
          </span>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-sky-950">
            {totalArchivedCount}
          </div>
        </div>

        <div className="bg-emerald-50/50 rounded-xl border border-emerald-200/80 p-4 space-y-1 shadow-xs shadow-emerald-500/5">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-[0.14em] block">
            TOTAL DELIVERED
          </span>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-emerald-800">
            {deliveredCount}
          </div>
        </div>

        <div className="bg-amber-50/50 rounded-xl border border-amber-200/80 p-4 space-y-1 shadow-xs shadow-amber-500/5">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-[0.14em] block">
            UNPROCESSED PAST
          </span>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-amber-800">
            {unhandledPastCount}
          </div>
        </div>

        <div className="bg-indigo-50/50 rounded-xl border border-indigo-200/80 p-4 space-y-1 shadow-xs shadow-indigo-500/5">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-[0.14em] block">
            HISTORICAL REVENUE
          </span>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-indigo-950">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-indigo-100 p-3.5 sm:p-4 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
          {/* Status Filters */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                  : 'bg-indigo-50/60 text-slate-600 hover:bg-indigo-100/80 font-medium'
              }`}
            >
              All ({totalArchivedCount})
            </button>

            <button
              onClick={() => setStatusFilter('delivered')}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                statusFilter === 'delivered'
                  ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                  : 'bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100 font-medium'
              }`}
            >
              Delivered ({deliveredCount})
            </button>

            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white font-bold shadow-2xs'
                  : 'bg-amber-50/60 text-amber-800 hover:bg-amber-100 font-medium'
              }`}
            >
              Pending ({unhandledPastCount})
            </button>

            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                statusFilter === 'rejected'
                  ? 'bg-rose-600 text-white font-bold shadow-2xs'
                  : 'bg-rose-50/60 text-rose-800 hover:bg-rose-100 font-medium'
              }`}
            >
              Cancelled
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400" />
            <input
              type="text"
              placeholder="Filter ID, name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-indigo-50/30 border border-indigo-200 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-900 transition-colors"
            />
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar text-xs">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700 shrink-0 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Date Range:
          </span>
          <div className="inline-flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                dateFilter === 'all'
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50'
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('yesterday')}
              className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                dateFilter === 'yesterday'
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50'
              }`}
            >
              YESTERDAY
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('week')}
              className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                dateFilter === 'week'
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50'
              }`}
            >
              7 DAYS
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-indigo-100 p-10 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">
            No Historical Orders Found
          </h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            const totalItemsCount = order.items.reduce((s, i) => s + i.quantity, 0);

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-indigo-100 hover:border-indigo-300 shadow-xs shadow-indigo-500/5 transition-all p-4 sm:p-5 space-y-3"
              >
                {/* Top Row: Customer Name, Order ID Tag, Amount, Delete & Expand Buttons */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 truncate">
                      {order.customerName}
                    </h3>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                      #{order.orderId || order.id}
                    </span>
                  </div>

                  {/* Right: Amount + Delete Button + Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-extrabold text-base sm:text-xl text-indigo-950 tracking-tight leading-none">
                      ₹{order.totalAmount}
                    </span>

                    <button
                      type="button"
                      onClick={() => setOrderToDelete(order)}
                      className="w-8 h-8 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Delete Permanently from History"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(order.id)}
                      className="w-8 h-8 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Second Row: Phone, Date, Status, Payment, Items Count */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <a
                    href={`tel:${order.phone}`}
                    className="inline-flex items-center gap-1 text-sky-800 hover:text-sky-950 font-mono font-semibold bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded-md border border-sky-200 transition-colors"
                  >
                    <Phone className="w-3 h-3 text-sky-500" />
                    <span>{order.phone}</span>
                  </a>

                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    <span>{formatDateTime(order.createdAt)}</span>
                  </span>

                  <div className="shrink-0">
                    {getStatusBadge(order.status)}
                  </div>

                  <span className="px-2 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                    {order.paymentMethod === 'upi' ? 'UPI' : 'CASH'}
                  </span>

                  <span className="text-[11px] text-slate-500 font-mono">
                    · {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Items Summary Box */}
                <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100 space-y-1.5 text-xs">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-indigo-800 bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-[11px] shrink-0">
                          {item.quantity}x
                        </span>
                        <span className="font-medium text-slate-900 truncate">{item.name}</span>
                        {item.selectedSize && (
                          <span className="text-[10px] text-indigo-600 font-semibold shrink-0 uppercase">({item.selectedSize})</span>
                        )}
                        {item.selectedExtras && item.selectedExtras.length > 0 && (
                          <span className="text-[9.5px] text-amber-900 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200 shrink-0">
                            +{item.selectedExtras.map(e => e.name).join(', ')}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-900 shrink-0 ml-2">₹{item.price * item.quantity}</span>
                    </div>
                  ))}

                  {order.address && (
                    <div className="pt-2 border-t border-indigo-100 text-[11px] text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{order.address}</span>
                    </div>
                  )}
                </div>

                {/* Collapsible item details */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-100 space-y-3 animate-fadeIn text-xs">
                    {order.notes && (
                      <p className="text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                        <strong>Note:</strong> {order.notes}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setReceiptOrder(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-2xs"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>View Printable Receipt</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt Modal */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-indigo-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600 block">
                  ORDER RECEIPT
                </span>
                <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-wider">
                  Gidhaur Bakery
                </h3>
              </div>
              <button
                onClick={() => setReceiptOrder(null)}
                className="w-8 h-8 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono font-bold text-indigo-950">#{receiptOrder.orderId || receiptOrder.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date &amp; Time:</span>
                <span className="text-slate-800 font-medium">{formatDateTime(receiptOrder.createdAt)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Customer:</span>
                <span className="text-slate-900 font-bold">{receiptOrder.customerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono text-slate-800">{receiptOrder.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Address:</span>
                <span className="text-slate-800 text-right max-w-[200px] truncate">{receiptOrder.address}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Payment:</span>
                <span className="font-bold uppercase text-slate-900">{receiptOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Status:</span>
                <span>{getStatusBadge(receiptOrder.status)}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-[0.14em] block">Items</span>
              <div className="bg-indigo-50/40 rounded-xl border border-indigo-200/80 p-3 space-y-1.5 text-xs">
                {receiptOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-mono font-bold">₹{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-indigo-200/80 flex justify-between font-extrabold text-sm text-indigo-950">
                  <span>Grand Total:</span>
                  <span className="font-mono">₹{receiptOrder.totalAmount}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] uppercase tracking-[0.12em] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" /> Print / Save Receipt
            </button>
          </div>
        </div>
      )}

      {/* Delete Single Order Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-rose-200 max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600 block">
                PERMANENT DELETION
              </span>
              <h3 className="font-bold text-base text-slate-900">
                Delete Order #{orderToDelete.orderId || orderToDelete.id}?
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteArchivedOrder(orderToDelete.orderId || orderToDelete.id);
                  setOrderToDelete(null);
                }}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold uppercase tracking-[0.1em] transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
