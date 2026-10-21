import { Order } from '../types';

export const ARCHIVE_STORAGE_KEYS = {
  ACTIVE_ORDERS: 'gidhaur_active_orders',
  ARCHIVED_ORDERS: 'gidhaur_orders_history',
  CUSTOMER_OWN_ORDERS: 'gidhaur_customer_device_orders',
  ADMIN_LIVE_CACHE: 'gidhaur_admin_live_orders_cache',
  DELETED_ORDER_IDS: 'gidhaur_deleted_order_ids',
  RECENT_ORDERS: 'gidhaur_recent_orders',
  LEGACY_RECENT_ORDERS: 'swadeep_recent_orders',
  LAST_CHECKED_DATE: 'gidhaur_last_order_rollover_date'
};

/**
 * Returns a consistent local calendar date string (YYYY-MM-DD).
 */
export function getLocalDateString(dateInput?: any): string {
  try {
    let d: Date;
    if (!dateInput) {
      d = new Date();
    } else if (dateInput instanceof Date) {
      d = dateInput;
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      d = new Date(dateInput);
    } else if (dateInput && typeof dateInput.toDate === 'function') {
      // Firestore Timestamp
      d = dateInput.toDate();
    } else if (dateInput && dateInput.seconds) {
      d = new Date(dateInput.seconds * 1000);
    } else {
      d = new Date();
    }

    if (isNaN(d.getTime())) {
      d = new Date();
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}-${String(fallback.getDate()).padStart(2, '0')}`;
  }
}

/**
 * Returns today's local date string (YYYY-MM-DD).
 */
export function getTodayDateString(): string {
  return getLocalDateString(new Date());
}

/**
 * Checks whether an order was created today.
 */
export function isOrderFromToday(order: Order | any, todayStr: string = getTodayDateString()): boolean {
  if (!order || !order.createdAt) return false;
  const orderDateStr = getLocalDateString(order.createdAt);
  return orderDateStr === todayStr;
}

/**
 * Reads permanently deleted order IDs (tombstones) so deleted orders never resurrect.
 */
export function getDeletedOrderIds(): Set<string> {
  try {
    const raw = localStorage.getItem(ARCHIVE_STORAGE_KEYS.DELETED_ORDER_IDS);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.map((id) => String(id).toLowerCase()));
    }
    return new Set();
  } catch {
    return new Set();
  }
}

/**
 * Marks one or more order IDs as permanently deleted.
 */
export function markOrderPermanentlyDeleted(orderId: string, extraIds: string[] = []): void {
  try {
    const existing = getDeletedOrderIds();
    [orderId, ...extraIds].forEach((id) => {
      if (id) existing.add(String(id).toLowerCase());
    });
    const arr = Array.from(existing).slice(-300);
    localStorage.setItem(ARCHIVE_STORAGE_KEYS.DELETED_ORDER_IDS, JSON.stringify(arr));
  } catch {}
}

/**
 * Returns ONLY orders placed on this specific customer device today, excluding deleted or previous-day orders.
 */
export function getCustomerOwnOrders(): any[] {
  try {
    const todayStr = getTodayDateString();
    const deletedSet = getDeletedOrderIds();
    const rawOwn = localStorage.getItem(ARCHIVE_STORAGE_KEYS.CUSTOMER_OWN_ORDERS);

    let list: any[] = [];
    if (rawOwn) {
      const parsed = JSON.parse(rawOwn);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    } else {
      // One-time safe migration: only migrate from gidhaur_recent_orders if it matches customer's saved phone
      const savedProfileStr =
        localStorage.getItem('gidhaur_customer_profile') ||
        localStorage.getItem('swadeep_customer_profile');
      let customerPhone = '';
      if (savedProfileStr) {
        try {
          const prof = JSON.parse(savedProfileStr);
          customerPhone = String(prof?.phone || '').replace(/\D/g, '');
        } catch {}
      }

      if (customerPhone && customerPhone.length >= 10) {
        const legacyStr = localStorage.getItem(ARCHIVE_STORAGE_KEYS.RECENT_ORDERS);
        if (legacyStr) {
          try {
            const legacyParsed = JSON.parse(legacyStr);
            if (Array.isArray(legacyParsed)) {
              list = legacyParsed.filter((o) => {
                const oPhone = String(o?.phone || '').replace(/\D/g, '');
                return oPhone === customerPhone && o?.placedOnThisDevice !== false;
              });
            }
          } catch {}
        }
      }
      // Clean up legacy shared keys so admin cache never leaks into customer view
      localStorage.removeItem(ARCHIVE_STORAGE_KEYS.LEGACY_RECENT_ORDERS);
      localStorage.removeItem(ARCHIVE_STORAGE_KEYS.RECENT_ORDERS);
    }

    // Strict filter: must have valid items, must be from TODAY, and must not be deleted/archived
    const validTodayOrders = list.filter((o) => {
      if (!o || (!o.orderId && !o.id)) return false;
      if (!Array.isArray(o.items) || o.items.length === 0) return false;
      if (o.isArchived || o.archived || o.status === 'archived' || o.isDeleted) return false;
      const idLower = String(o.id || '').toLowerCase();
      const ordIdLower = String(o.orderId || '').toLowerCase();
      if ((idLower && deletedSet.has(idLower)) || (ordIdLower && deletedSet.has(ordIdLower))) {
        return false;
      }
      return isOrderFromToday(o, todayStr);
    });

    if (validTodayOrders.length !== list.length || !rawOwn) {
      localStorage.setItem(ARCHIVE_STORAGE_KEYS.CUSTOMER_OWN_ORDERS, JSON.stringify(validTodayOrders));
    }

    return validTodayOrders;
  } catch {
    return [];
  }
}

/**
 * Saves an order explicitly placed by the customer on this device.
 */
export function saveCustomerOwnOrder(order: any): void {
  try {
    const existing = getCustomerOwnOrders();
    const orderId = order.orderId || order.id;
    const enriched = {
      ...order,
      placedOnThisDevice: true,
      createdAt: order.createdAt || new Date().toISOString()
    };
    const updated = [
      enriched,
      ...existing.filter((o) => (o.orderId || o.id) !== orderId && o.id !== order.id)
    ].slice(0, 15);
    localStorage.setItem(ARCHIVE_STORAGE_KEYS.CUSTOMER_OWN_ORDERS, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error saving customer own order:', err);
  }
}

/**
 * Purges a specific order from customer device storage (e.g. when deleted by Admin).
 */
export function removeCustomerOwnOrder(orderId: string, extraIds: string[] = []): void {
  try {
    const keysToRemove = new Set(
      [orderId, ...extraIds].filter(Boolean).map((k) => String(k).toLowerCase())
    );
    const cleanKey = (storageKey: string) => {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      try {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const filtered = list.filter((o: any) => {
            const id1 = String(o?.id || '').toLowerCase();
            const id2 = String(o?.orderId || '').toLowerCase();
            return !keysToRemove.has(id1) && !keysToRemove.has(id2);
          });
          localStorage.setItem(storageKey, JSON.stringify(filtered));
        }
      } catch {}
    };

    cleanKey(ARCHIVE_STORAGE_KEYS.CUSTOMER_OWN_ORDERS);
    cleanKey(ARCHIVE_STORAGE_KEYS.RECENT_ORDERS);
    cleanKey(ARCHIVE_STORAGE_KEYS.LEGACY_RECENT_ORDERS);
  } catch (err) {
    console.warn('Error removing customer own order:', err);
  }
}

/**
 * Clears all customer device tracking history and recent orders.
 */
export function clearAllTrackingHistory(): void {
  try {
    localStorage.removeItem(ARCHIVE_STORAGE_KEYS.CUSTOMER_OWN_ORDERS);
    localStorage.removeItem(ARCHIVE_STORAGE_KEYS.RECENT_ORDERS);
    localStorage.removeItem(ARCHIVE_STORAGE_KEYS.LEGACY_RECENT_ORDERS);
    localStorage.removeItem(ARCHIVE_STORAGE_KEYS.ACTIVE_ORDERS);
    localStorage.removeItem('swadeep_recent_orders');
    localStorage.removeItem('gidhaur_recent_orders');
    localStorage.removeItem('gidhaur_active_orders');
    localStorage.removeItem('swadeep_customer_profile');
    localStorage.removeItem('gidhaur_customer_profile');
    localStorage.removeItem('swadeep_order_tracking_id');
    localStorage.removeItem('gidhaur_order_tracking_id');
    try {
      sessionStorage.clear();
    } catch {}
    window.dispatchEvent(new CustomEvent('gidhaur_tracking_history_cleared'));
  } catch (err) {
    console.warn('Error clearing tracking history:', err);
  }
}

/**
 * Reads all archived orders from persistent storage (excluding permanently deleted IDs).
 */
export function getArchivedOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ARCHIVE_STORAGE_KEYS.ARCHIVED_ORDERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const deletedSet = getDeletedOrderIds();
    return parsed.filter((o) => {
      const id1 = String(o?.id || '').toLowerCase();
      const id2 = String(o?.orderId || '').toLowerCase();
      return !deletedSet.has(id1) && !deletedSet.has(id2);
    });
  } catch {
    return [];
  }
}

/**
 * Saves archived orders to persistent storage.
 */
export function saveArchivedOrders(orders: Order[]): void {
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEYS.ARCHIVED_ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('gidhaur_order_history_updated', { detail: orders }));
  } catch (err) {
    console.warn('Error saving archived orders:', err);
  }
}

/**
 * Daily Rollover Rule:
 * Separates orders into:
 * 1) todayOrders: only orders created on the current calendar day.
 * 2) archivedOrders: all orders from yesterday or older (pending, unapproved, delivered, or any status).
 * They are automatically moved to History so the active board resets every day!
 */
export function performDailyOrderRollover(
  incomingOrders: Order[]
): {
  todayOrders: Order[];
  archivedOrders: Order[];
  newlyArchivedCount: number;
} {
  const todayStr = getTodayDateString();
  const deletedSet = getDeletedOrderIds();
  const existingArchive = getArchivedOrders();
  const archiveMap = new Map<string, Order>();

  // Load existing archived orders into map
  existingArchive.forEach((o) => {
    const key = o.orderId || o.id;
    if (key && !deletedSet.has(String(key).toLowerCase())) {
      archiveMap.set(key, o);
    }
  });

  const todayOrders: Order[] = [];
  let newlyArchivedCount = 0;

  incomingOrders.forEach((order) => {
    const key = order.orderId || order.id;
    const idLower = String(order.id || '').toLowerCase();
    const ordIdLower = String(order.orderId || '').toLowerCase();
    if ((idLower && deletedSet.has(idLower)) || (ordIdLower && deletedSet.has(ordIdLower))) {
      return;
    }

    const isToday = isOrderFromToday(order, todayStr);

    if (isToday) {
      todayOrders.push(order);
    } else {
      // Order is from a past date. Regardless of status (pending, accepted, delivered, etc.),
      // move it to History as mandated by the daily reset rule.
      if (!archiveMap.has(key)) {
        newlyArchivedCount++;
      }
      archiveMap.set(key, {
        ...order,
        archivedAt: (order as any).archivedAt || new Date().toISOString(),
        isPreviousDayArchive: true
      });
    }
  });

  const allArchived = Array.from(archiveMap.values()).sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const hasChanged = newlyArchivedCount > 0 || existingArchive.length !== allArchived.length;

  if (hasChanged) {
    saveArchivedOrders(allArchived);
  }

  // Also purge any previous-day customer orders automatically on rollover check
  getCustomerOwnOrders();

  // Update last rollover check date
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEYS.LAST_CHECKED_DATE, todayStr);
  } catch {}

  return {
    todayOrders,
    archivedOrders: hasChanged ? allArchived : existingArchive,
    newlyArchivedCount
  };
}

/**
 * Manually archives an order into history.
 */
export function archiveSingleOrder(order: Order): void {
  const existing = getArchivedOrders();
  const key = order.orderId || order.id;
  const filtered = existing.filter((o) => (o.orderId || o.id) !== key);
  const updated = [
    { ...order, archivedAt: new Date().toISOString(), isManualArchive: true },
    ...filtered
  ];
  saveArchivedOrders(updated);
}

/**
 * Permanently deletes a single order from history and records a deletion tombstone.
 */
export function deleteArchivedOrder(orderId: string, extraId?: string): void {
  markOrderPermanentlyDeleted(orderId, extraId ? [extraId] : []);
  removeCustomerOwnOrder(orderId, extraId ? [extraId] : []);
  const existing = getArchivedOrders();
  const updated = existing.filter(
    (o) => o.id !== orderId && o.orderId !== orderId && (!extraId || (o.id !== extraId && o.orderId !== extraId))
  );
  saveArchivedOrders(updated);
}

/**
 * Permanently clears the entire order history archive.
 */
export function clearAllArchivedOrders(): void {
  try {
    const existing = getArchivedOrders();
    existing.forEach((o) => {
      markOrderPermanentlyDeleted(o.orderId || o.id, [o.id, o.orderId]);
    });
    localStorage.removeItem(ARCHIVE_STORAGE_KEYS.ARCHIVED_ORDERS);
    window.dispatchEvent(new CustomEvent('gidhaur_order_history_updated', { detail: [] }));
  } catch (err) {
    console.warn('Error clearing archived orders:', err);
  }
}
