import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  Bike,
  PackageCheck,
  Phone,
  MapPin,
  FileText,
  Volume2,
  VolumeX,
  LogOut,
  Search,
  Bell,
  Utensils,
  TrendingUp,
  Store,
  Shield,
  Calendar,
  Layers,
  ChevronDown,
  Settings as SettingsGearIcon,
  Users,
  Eye,
  Smartphone,
  UtensilsCrossed,
  MonitorPlay,
  ArrowLeft,
  X,
  Trash2,
  Play,
  Check,
  Loader2,
  Sliders,
  AlertTriangle,
  Archive,
  Activity,
  Boxes
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { subscribeToSharedOrders } from '../../services/orderListenerService';
import { useAuth } from '../../context/AuthContext';
import { Order, OrderStatus, Product, DeliveryAgent, KitchenStaff, RestaurantSettings } from '../../types';
import { OperationType, handleFirestoreError } from '../../firebase/errors';
import { ProductManagement } from './ProductManagement';
import { DeliveryAgentsManagement } from './DeliveryAgentsManagement';
import { KitchenStaffManagement } from './KitchenStaffManagement';
import { PreparingStaffManagement } from './PreparingStaffManagement';
import { PaymentSettings } from './PaymentSettings';
import { CloudStorageMeter } from './CloudStorageMeter';
import { DatabaseStatusIndicator } from './DatabaseStatusIndicator';
import { InventoryManagementView } from './InventoryManagementView';
import { deductStockForAcceptedOrder, isItemLowStock } from '../../services/inventoryService';
import { OrderHistoryView } from './OrderHistoryView';
import {
  performDailyOrderRollover,
  getArchivedOrders,
  deleteArchivedOrder,
  clearAllArchivedOrders,
  archiveSingleOrder,
  getTodayDateString,
  isOrderFromToday,
  removeCustomerOwnOrder,
  markOrderPermanentlyDeleted,
  clearAllTrackingHistory
} from '../../services/orderArchiveService';
import { KitchenDisplayPage } from '../kitchen/KitchenDisplayPage';
import { PreparingDisplayPage } from '../preparing/PreparingDisplayPage';
import { DeliveryAgentPortal } from '../delivery/DeliveryAgentPortal';
import { SoundSettingsModal } from './SoundSettingsModal';
import { useOrderSoundAlert } from '../../hooks/useOrderSoundAlert';
import {
  subscribeToDeliveryAgents,
  subscribeToKitchenStaff,
  subscribeToPreparingStaff,
  subscribeToRestaurantSettings,
  getLocalRestaurantSettings,
  getLocalPreparingStaff,
  getLocalDeliveryAgents,
  getLocalKitchenStaff,
  seedStaffIfEmpty
} from '../../services/staffService';
import { PreparingStaff } from '../../types';
import {
  getOrderCategoryClassification,
  getOrderFoodItems,
  getOrderNonFoodItems,
  isFoodItem,
  isNonFoodItem
} from '../../utils/orderCategoryHelper';
import { sendOrderStatusEmail } from '../../services/customerEmailService';
import {
  playOrderAlertChime,
  shouldNotifyNewOrder,
  markInitialOrdersAsSeen,
  sendNativeNotification
} from '../../utils/sound';
import {
  saveActiveAdminTab,
  getSavedActiveAdminTab,
  saveScrollPosition,
  restoreScrollPosition
} from '../../utils/scrollStateStorage';
import { triggerHaptic } from '../../utils/haptics';

interface AdminDashboardProps {
  products: Product[];
  onBackToStore: () => void;
  onLogout?: () => void;
  onUpdateProducts?: (products: Product[]) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  onBackToStore,
  onLogout,
  onUpdateProducts
}) => {
  const { user, signOut } = useAuth();
  const [staffSubTab, setStaffSubTab] = useState<'kitchen' | 'preparing' | 'delivery'>(() => {
    const saved = getSavedActiveAdminTab<string>('orders');
    if (saved === 'preparing_staff') return 'preparing';
    if (saved === 'delivery_agents') return 'delivery';
    return 'kitchen';
  });

  const [activeTab, setActiveTabState] = useState<
    'orders' | 'products' | 'staff' | 'delivery_agents' | 'kitchen_staff' | 'preparing_staff' | 'settings' | 'stats' | 'usage'
  >(() => {
    const saved = getSavedActiveAdminTab<string>('orders');
    if (saved === 'kitchen_staff' || saved === 'preparing_staff' || saved === 'delivery_agents') return 'staff';
    if (saved === 'usage') return 'orders';
    return (saved as any) || 'orders';
  });

  const handleTabChange = (
    newTab: 'orders' | 'products' | 'staff' | 'delivery_agents' | 'kitchen_staff' | 'preparing_staff' | 'settings' | 'stats' | 'usage'
  ) => {
    let targetTab = newTab;
    if (newTab === 'kitchen_staff') {
      targetTab = 'staff';
      setStaffSubTab('kitchen');
    } else if (newTab === 'preparing_staff') {
      targetTab = 'staff';
      setStaffSubTab('preparing');
    } else if (newTab === 'delivery_agents') {
      targetTab = 'staff';
      setStaffSubTab('delivery');
    } else if (newTab === 'usage') {
      targetTab = 'orders';
    }

    if (targetTab === activeTab && newTab === targetTab) return;
    try {
      triggerHaptic('selection');
    } catch {}
    setActiveTabState(targetTab);
    saveActiveAdminTab(targetTab);
    if (window.scrollY > 200) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const setActiveTab = handleTabChange;

  // Restore scroll position on initial load of AdminDashboard
  useEffect(() => {
    restoreScrollPosition(`admin_${activeTab}`, 1);
  }, []);

  // Save scroll on page scroll
  useEffect(() => {
    const onScroll = () => {
      saveScrollPosition(`admin_${activeTab}`, window.scrollY);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [activeTab]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersSubTab, setOrdersSubTab] = useState<'today' | 'history'>('today');
  const [archivedOrders, setArchivedOrders] = useState<Order[]>(() => getArchivedOrders());

  // Live Inventory & Catalog Reactive State
  const [liveProducts, setLiveProducts] = useState<Product[]>(products);
  const [analyticsSubView, setAnalyticsSubView] = useState<'stock' | 'revenue'>('stock');

  useEffect(() => {
    setLiveProducts(products);
  }, [products]);

  useEffect(() => {
    const handleProductsUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setLiveProducts(e.detail);
      }
    };
    window.addEventListener('swadeep_products_updated', handleProductsUpdate);
    return () => window.removeEventListener('swadeep_products_updated', handleProductsUpdate);
  }, []);

  const lowStockCount = useMemo(() => {
    return liveProducts.filter((p) => isItemLowStock(p)).length;
  }, [liveProducts]);

  // Listen to background history updates
  useEffect(() => {
    const handleHistoryUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setArchivedOrders(e.detail);
      } else {
        setArchivedOrders(getArchivedOrders());
      }
    };
    window.addEventListener('gidhaur_order_history_updated', handleHistoryUpdate);
    return () => window.removeEventListener('gidhaur_order_history_updated', handleHistoryUpdate);
  }, []);

  // Daily Order Rollover Rule:
  // As soon as date changes, all orders from previous days (pending, accepted, delivered, unapproved)
  // are automatically cleared from today's live queue and moved into the Order History Archive.
  const [currentDateStr, setCurrentDateStr] = useState(() => getTodayDateString());

  // Check every 15 seconds and on tab wake if calendar date rolled over (midnight auto-reset)
  useEffect(() => {
    const checkRollover = () => {
      const today = getTodayDateString();
      if (today !== currentDateStr) {
        setCurrentDateStr(today);
      }
    };
    const timer = setInterval(checkRollover, 15000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkRollover();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentDateStr]);

  const { todayOrders, archivedOrders: currentArchived } = useMemo(() => {
    return performDailyOrderRollover(orders);
  }, [orders, currentDateStr]);

  useEffect(() => {
    if (currentArchived.length > 0) {
      setArchivedOrders((prev) => {
        if (
          prev.length === currentArchived.length &&
          (prev[0]?.id === currentArchived[0]?.id || prev[0]?.orderId === currentArchived[0]?.orderId)
        ) {
          return prev;
        }
        return currentArchived;
      });
    }
  }, [currentArchived]);

  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>([]);
  const [kitchenStaff, setKitchenStaff] = useState<KitchenStaff[]>([]);
  const [preparingStaff, setPreparingStaff] = useState<PreparingStaff[]>(() => getLocalPreparingStaff());
  const [settings, setSettings] = useState<RestaurantSettings>(getLocalRestaurantSettings());

  // Direct Live Screen Preview Mode for Admin
  const [previewAgent, setPreviewAgent] = useState<DeliveryAgent | null>(null);
  const [previewChef, setPreviewChef] = useState<KitchenStaff | null>(null);
  const [previewPreparingStaff, setPreviewPreparingStaff] = useState<PreparingStaff | null>(null);
  const [isScreenSwitcherOpen, setIsScreenSwitcherOpen] = useState(false);

  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Audio Alerts hook - Handles repeating chime for today's active pending orders
  const soundAlert = useOrderSoundAlert(todayOrders);

  const [notificationTestToast, setNotificationTestToast] = useState<{ message: string; type: 'success' | 'warn' } | null>(null);

  const handleTestNotificationClick = async () => {
    triggerHaptic('medium');
    let perm = soundAlert.permissionStatus;
    if (perm !== 'granted') {
      perm = await soundAlert.handleRequestPermission();
    }

    if (perm === 'granted') {
      try {
        await sendNativeNotification(
          '🔔 Test Order Alert - Gidhaur Bakery',
          'Phone notification & alert sound working! Naya order aane par aisa hi alert aayega.',
          {
            tag: 'admin-test-order-alert',
            vibrate: [500, 250, 500, 250, 500],
          }
        );
      } catch (err) {
        console.warn('Failed to send test notification:', err);
      }
      playOrderAlertChime();
      setNotificationTestToast({
        message: '✓ Test Notification sent! Check phone notification bar and sound.',
        type: 'success',
      });
    } else if (perm === 'denied') {
      setNotificationTestToast({
        message: '⚠️ Notification blocked. Please allow notifications in phone/browser site settings.',
        type: 'warn',
      });
    } else {
      setNotificationTestToast({
        message: 'ℹ️ Notification permission required to ring your phone on new orders.',
        type: 'warn',
      });
    }

    setTimeout(() => {
      setNotificationTestToast(null);
    }, 4500);
  };

  const [dispatchingOrder, setDispatchingOrder] = useState<Order | null>(null);
  const [adminCheckedItems, setAdminCheckedItems] = useState<Record<string, boolean>>({});
  const [adminSelectedRiderId, setAdminSelectedRiderId] = useState<string>('');

  const handleOpenAdminDispatch = (order: Order) => {
    setDispatchingOrder(order);
    const active = deliveryAgents.filter((a) => a.status === 'active');
    setAdminSelectedRiderId(active.length > 0 ? active[0].id : '');

    const initialChecked: Record<string, boolean> = {};
    const items = order.items || [];

    const hasAnyStationProgress =
      order.kitchenReady ||
      order.preparingReady ||
      (Array.isArray(order.kitchenTickedItems) && order.kitchenTickedItems.length > 0) ||
      (Array.isArray(order.preparingTickedItems) && order.preparingTickedItems.length > 0);

    items.forEach((item, idx) => {
      const isKitchen = isFoodItem(item);
      const isPrep = isNonFoodItem(item);
      const itemName = String(item.name || (item as any).product?.name || '').toLowerCase().trim();

      if (hasAnyStationProgress) {
        if (isKitchen) {
          if (order.kitchenReady) {
            initialChecked[`${order.id}-${idx}`] = true;
          } else if (Array.isArray(order.kitchenTickedItems)) {
            initialChecked[`${order.id}-${idx}`] = order.kitchenTickedItems.some(
              (k) => String(k).toLowerCase().trim() === itemName
            );
          } else {
            initialChecked[`${order.id}-${idx}`] = false;
          }
        } else if (isPrep) {
          if (order.preparingReady) {
            initialChecked[`${order.id}-${idx}`] = true;
          } else if (Array.isArray(order.preparingTickedItems)) {
            initialChecked[`${order.id}-${idx}`] = order.preparingTickedItems.some(
              (p) => String(p).toLowerCase().trim() === itemName
            );
          } else {
            initialChecked[`${order.id}-${idx}`] = false;
          }
        } else {
          initialChecked[`${order.id}-${idx}`] = true;
        }
      } else {
        initialChecked[`${order.id}-${idx}`] = true;
      }
    });

    setAdminCheckedItems((prev) => ({ ...prev, ...initialChecked }));
  };

  const toggleAdminItemCheck = (orderId: string, itemIdx: number) => {
    setAdminCheckedItems((prev) => ({
      ...prev,
      [`${orderId}-${itemIdx}`]: !prev[`${orderId}-${itemIdx}`]
    }));
  };

  const handleAdminTickAllItems = (orderId: string, count: number) => {
    setAdminCheckedItems((prev) => {
      const next = { ...prev };
      for (let i = 0; i < count; i++) {
        next[`${orderId}-${i}`] = true;
      }
      return next;
    });
  };

  const handleAdminUntickAllItems = (orderId: string, count: number) => {
    setAdminCheckedItems((prev) => {
      const next = { ...prev };
      for (let i = 0; i < count; i++) {
        next[`${orderId}-${i}`] = false;
      }
      return next;
    });
  };

  // Deletion and confirmation modals state
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [isClearingAllModalOpen, setIsClearingAllModalOpen] = useState(false);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const handleDeleteArchivedOrder = async (orderId: string) => {
    const match =
      orders.find((o) => (o.orderId || o.id) === orderId || o.id === orderId) ||
      archivedOrders.find((o) => (o.orderId || o.id) === orderId || o.id === orderId);
    const docId = match?.id || orderId;
    const displayOrderId = match?.orderId || orderId;

    deleteArchivedOrder(orderId, docId);
    if (displayOrderId !== orderId) {
      deleteArchivedOrder(displayOrderId, docId);
    }
    setArchivedOrders((prev) =>
      prev.filter((o) => o.orderId !== orderId && o.id !== orderId && o.id !== docId)
    );
    setOrders((prev) =>
      prev.filter((o) => o.orderId !== orderId && o.id !== orderId && o.id !== docId)
    );

    try {
      window.dispatchEvent(
        new CustomEvent('swadeep_order_removed', { detail: { orderId: displayOrderId, id: docId } })
      );
    } catch {}

    try {
      fetch(`/api/orders/${docId}`, { method: 'DELETE' }).catch(() => {});
      if (displayOrderId && displayOrderId !== docId) {
        fetch(`/api/orders/${displayOrderId}`, { method: 'DELETE' }).catch(() => {});
      }
    } catch {}

    try {
      await deleteDoc(doc(db, 'orders', docId));
      if (displayOrderId && displayOrderId !== docId) {
        await deleteDoc(doc(db, 'orders', displayOrderId)).catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore order deletion note:', e);
    }
  };

  const handleClearAllHistory = async () => {
    const toDelete = [...archivedOrders];
    clearAllArchivedOrders();
    setArchivedOrders([]);
    setOrders((prev) => prev.filter((o) => isOrderFromToday(o)));

    try {
      fetch('/api/orders/clear-archive', { method: 'POST' }).catch(() => {});
    } catch {}

    try {
      const batch = writeBatch(db);
      toDelete.forEach((ord) => {
        const docId = ord.id || ord.orderId;
        if (docId) batch.delete(doc(db, 'orders', docId));
      });
      await batch.commit();
    } catch (e) {
      toDelete.forEach((ord) => {
        const docId = ord.id || ord.orderId;
        if (docId) deleteDoc(doc(db, 'orders', docId)).catch(() => {});
      });
    }
  };

  const handleArchiveSingleOrder = async (order: Order) => {
    archiveSingleOrder(order);
    const orderKey = order.orderId || order.id;
    setOrders((prev) => prev.filter((o) => (o.orderId || o.id) !== orderKey));
    setArchivedOrders((prev) => {
      const filtered = prev.filter((o) => (o.orderId || o.id) !== orderKey);
      return [{ ...order, archivedAt: new Date().toISOString(), isManualArchive: true }, ...filtered];
    });

    // 1. Delete from active Firestore orders collection so customer view updates in real-time
    try {
      const docId = order.id || order.orderId;
      await deleteDoc(doc(db, 'orders', docId));
      if (order.orderId && order.orderId !== order.id) {
        await deleteDoc(doc(db, 'orders', order.orderId)).catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore order archive note:', e);
    }

    // 2. Delete from server backend
    try {
      const docId = order.id || order.orderId;
      fetch(`/api/orders/${docId}`, { method: 'DELETE' }).catch(() => {});
      if (order.orderId && order.orderId !== order.id) {
        fetch(`/api/orders/${order.orderId}`, { method: 'DELETE' }).catch(() => {});
      }
    } catch {}

    // 3. Purge from customer recent orders in local storage
    try {
      removeCustomerOwnOrder(order.orderId || order.id, [order.id, order.orderId]);
      window.dispatchEvent(new CustomEvent('swadeep_order_removed', { detail: { orderId: order.orderId, id: order.id } }));
    } catch {}
  };

  // Initial subscriptions
  useEffect(() => {
    const unsubAgents = subscribeToDeliveryAgents((agents) => {
      setDeliveryAgents(agents);
    });

    const unsubKitchen = subscribeToKitchenStaff((staff) => {
      setKitchenStaff(staff);
    });

    const unsubPrep = subscribeToPreparingStaff((staff) => {
      setPreparingStaff(staff);
    });

    const unsubSettings = subscribeToRestaurantSettings((data) => {
      setSettings(data);
    });

    const handleStaffUpdated = () => {
      setDeliveryAgents(getLocalDeliveryAgents());
      setKitchenStaff(getLocalKitchenStaff());
      setPreparingStaff(getLocalPreparingStaff());
    };
    window.addEventListener('swadeep_staff_updated', handleStaffUpdated);

    return () => {
      unsubAgents();
      unsubKitchen();
      unsubPrep();
      unsubSettings();
      window.removeEventListener('swadeep_staff_updated', handleStaffUpdated);
    };
  }, []);

  // Shared Singleton Real-time listener for Orders (deduplicated, bounded, zero leak)
  useEffect(() => {
    const unsubscribe = subscribeToSharedOrders((fetchedOrders) => {
      setIsLoadingOrders(false);
      setOrders(fetchedOrders);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (
    orderId: string,
    nextStatus: OrderStatus,
    extraUpdates: Record<string, any> = {}
  ) => {
    // 1. Immediate optimistic UI state update for instant 0ms feedback
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId || o.orderId === orderId ? { ...o, status: nextStatus, ...extraUpdates } : o
      )
    );

    // Sync to backend API immediately
    try {
      fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, ...extraUpdates }),
      }).catch(() => {});
    } catch {}

    try {
      const orderDoc = doc(db, 'orders', orderId);
      const timestampField = 
        nextStatus === 'accepted' ? { acceptedAt: serverTimestamp() } :
        nextStatus === 'preparing' ? { kitchenSentAt: serverTimestamp() } :
        nextStatus === 'out_for_delivery' ? { dispatchedAt: serverTimestamp() } :
        nextStatus === 'delivered' ? { deliveredAt: serverTimestamp() } : {};

      await updateDoc(orderDoc, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        [`statusTimestamps.${nextStatus}`]: serverTimestamp(),
        ...timestampField,
        ...extraUpdates
      });

      // Auto Stock Deduction when order is accepted
      if (nextStatus === 'accepted') {
        const targetOrder = orders.find((o) => o.id === orderId || o.orderId === orderId);
        if (targetOrder) {
          deductStockForAcceptedOrder(targetOrder);
        }
      }

      // Send branded order status update email to customer based on admin notification toggles
      const targetOrder = orders.find((o) => o.id === orderId || o.orderId === orderId);
      if (targetOrder?.customerEmail) {
        const toggles = settings?.emailEventToggles || {};
        let shouldSend = false;

        if (nextStatus === 'accepted' && toggles.notifyOrderConfirmed !== false) shouldSend = true;
        else if (nextStatus === 'preparing' && toggles.notifyKitchenSent === true) shouldSend = true;
        else if (nextStatus === 'out_for_delivery' && toggles.notifyOutForDelivery !== false) shouldSend = true;
        else if (nextStatus === 'delivered' && toggles.notifyDelivered !== false) shouldSend = true;
        else if (nextStatus === 'rejected' && toggles.notifyCancellationAccepted !== false) shouldSend = true;

        if (shouldSend) {
          sendOrderStatusEmail(
            { ...targetOrder, status: nextStatus, ...extraUpdates },
            nextStatus,
            settings
          ).catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn('Failed to update order status in Firestore (updated locally):', err?.message || err);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId || o.orderId === orderId ? { ...o, status: nextStatus, ...extraUpdates } : o
        )
      );
      try {
        const recent = JSON.parse(localStorage.getItem('swadeep_recent_orders') || '[]');
        const updatedRecent = recent.map((o: any) =>
          o.orderId === orderId ? { ...o, status: nextStatus, ...extraUpdates } : o
        );
        localStorage.setItem('swadeep_recent_orders', JSON.stringify(updatedRecent));
      } catch {}
    }
  };

  const handleAcceptCancellation = async (orderId: string) => {
    try {
      const orderDoc = doc(db, 'orders', orderId);
      await updateDoc(orderDoc, {
        status: 'rejected',
        cancellationStatus: 'accepted',
        cancellationResolvedAt: serverTimestamp(),
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        'statusTimestamps.rejected': serverTimestamp(),
      });

      const targetOrder = orders.find((o) => o.id === orderId || o.orderId === orderId);
      if (targetOrder?.customerEmail && settings?.emailEventToggles?.notifyCancellationAccepted !== false) {
        sendOrderStatusEmail({ ...targetOrder, status: 'rejected' }, 'rejected', settings).catch(() => {});
      }
    } catch (err: any) {
      console.warn('Failed to accept cancellation in Firestore:', err);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId || o.orderId === orderId
            ? { ...o, status: 'rejected', cancellationStatus: 'accepted' }
            : o
        )
      );
    }
  };

  const handleDeclineCancellation = async (orderId: string) => {
    try {
      const orderDoc = doc(db, 'orders', orderId);
      await updateDoc(orderDoc, {
        cancellationStatus: 'rejected',
        cancellationResolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const targetOrder = orders.find((o) => o.id === orderId || o.orderId === orderId);
      if (targetOrder?.customerEmail && settings?.emailEventToggles?.notifyCancellationDeclined !== false) {
        sendOrderStatusEmail({ ...targetOrder, status: 'cancellation_declined' as any }, 'cancellation_declined' as any, settings).catch(() => {});
      }
    } catch (err: any) {
      console.warn('Failed to decline cancellation in Firestore:', err);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId || o.orderId === orderId
            ? { ...o, cancellationStatus: 'rejected' }
            : o
        )
      );
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    const docId = order.id || order.orderId;
    const ordId = order.orderId || order.id;

    // 1. Immediately mark permanently deleted and remove from local/archive/customer state
    markOrderPermanentlyDeleted(docId, [ordId]);
    deleteArchivedOrder(docId, ordId);
    removeCustomerOwnOrder(docId, [ordId]);
    setOrders((prev) => prev.filter((o) => o.id !== order.id && o.orderId !== order.orderId));
    setArchivedOrders((prev) => prev.filter((o) => o.id !== order.id && o.orderId !== order.orderId));

    try {
      window.dispatchEvent(
        new CustomEvent('swadeep_order_removed', { detail: { orderId: ordId, id: docId } })
      );
    } catch {}

    try {
      setIsDeletingLoading(true);
      // 2. Delete from server backend (which also broadcasts orders_deleted via SSE)
      try {
        fetch(`/api/orders/${docId}`, { method: 'DELETE' }).catch(() => {});
        if (ordId && ordId !== docId) {
          fetch(`/api/orders/${ordId}`, { method: 'DELETE' }).catch(() => {});
        }
      } catch {}

      // 3. Delete from Firestore so customer's single-doc onSnapshot immediately fires !snap.exists()
      await deleteDoc(doc(db, 'orders', docId));
      if (ordId && ordId !== docId) {
        await deleteDoc(doc(db, 'orders', ordId)).catch(() => {});
      }
      setDeletingOrder(null);
    } catch (err: any) {
      console.warn('Failed to delete order in Firestore (removed locally):', err?.message || err);
      setDeletingOrder(null);
    } finally {
      setIsDeletingLoading(false);
    }
  };

  const handleClearAllOrders = async () => {
    const allToClear = [...orders, ...archivedOrders];
    allToClear.forEach((o) => {
      markOrderPermanentlyDeleted(o.id || o.orderId, [o.orderId, o.id]);
    });
    clearAllArchivedOrders();
    clearAllTrackingHistory();
    setOrders([]);
    setArchivedOrders([]);

    try {
      setIsDeletingLoading(true);
      try {
        fetch('/api/orders/clear-all', { method: 'POST' }).catch(() => {});
      } catch {}

      const batch = writeBatch(db);
      orders.forEach((o) => {
        const docId = o.id || o.orderId;
        if (docId) batch.delete(doc(db, 'orders', docId));
      });
      await batch.commit();
      setIsClearingAllModalOpen(false);
    } catch (err: any) {
      console.warn('Failed to clear orders in Firestore (clearing locally):', err?.message || err);
      setIsClearingAllModalOpen(false);
    } finally {
      setIsDeletingLoading(false);
    }
  };

  // Stats Calculations for Today's Active Live Queue
  const pendingOrders = todayOrders.filter((o) => o.status === 'pending');
  const inKitchenOrders = todayOrders.filter((o) => o.status === 'preparing' || o.status === 'accepted');
  const outOrders = todayOrders.filter((o) => o.status === 'out_for_delivery');
  const inProgressOrders = todayOrders.filter((o) =>
    ['accepted', 'preparing', 'out_for_delivery'].includes(o.status)
  );
  const deliveredOrders = todayOrders.filter((o) => o.status === 'delivered');
  const rejectedOrders = todayOrders.filter((o) => o.status === 'rejected');
  const cancellationRequestedOrders = todayOrders.filter(
    (o) => o.cancellationStatus === 'requested' && o.status !== 'rejected'
  );

  const totalRevenue = todayOrders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const filteredOrders = todayOrders.filter((o) => {
    const matchesSearch =
      o.orderId?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.phone?.includes(orderSearchQuery);

    if (selectedStatusFilter === 'all') return matchesSearch;
    if (selectedStatusFilter === 'cancellation_requests')
      return matchesSearch && o.cancellationStatus === 'requested' && o.status !== 'rejected';
    if (selectedStatusFilter === 'pending') return matchesSearch && o.status === 'pending';
    if (selectedStatusFilter === 'kitchen')
      return matchesSearch && (o.status === 'accepted' || o.status === 'preparing');
    if (selectedStatusFilter === 'out_for_delivery')
      return matchesSearch && o.status === 'out_for_delivery';
    if (selectedStatusFilter === 'delivered') return matchesSearch && o.status === 'delivered';
    if (selectedStatusFilter === 'rejected') return matchesSearch && o.status === 'rejected';

    return matchesSearch;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] bg-amber-50 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Pending Approval</span>
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] bg-sky-50 text-sky-900 border border-sky-200">
            <CheckCircle2 className="w-3 h-3 text-sky-600" />
            <span>Accepted</span>
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] bg-violet-50 text-violet-900 border border-violet-200">
            <ChefHat className="w-3 h-3 text-violet-600" />
            <span>In Kitchen</span>
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] bg-indigo-50 text-indigo-900 border border-indigo-200">
            <Bike className="w-3 h-3 text-indigo-600" />
            <span>Out for Delivery</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] bg-emerald-50 text-emerald-900 border border-emerald-200">
            <PackageCheck className="w-3 h-3 text-emerald-600" />
            <span>Delivered</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] bg-rose-50 text-rose-900 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Cancelled</span>
          </span>
        );
    }
  };

  const adminDisplayName = user?.email ? user.email.split('@')[0] : 'Admin Staff';

  const handleLogoutAction = () => {
    if (onLogout) {
      onLogout();
    } else {
      signOut();
    }
  };

  // 1. Direct Agent Screen View Mode for Admin
  if (previewAgent) {
    return (
      <div className="min-h-screen bg-slate-50/70 text-slate-900">
        {/* Fixed Top Admin Live Simulator Banner */}
        <div className="sticky top-0 z-50 bg-sky-950 text-white px-3 sm:px-6 py-2.5 border-b border-sky-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
              <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                <span className="text-sky-300 hidden xs:inline uppercase tracking-wider text-[10px]">LIVE RIDER:</span>
                <span className="text-white bg-sky-900 px-2 py-0.5 rounded-md font-extrabold text-[11px] truncate border border-sky-700">
                  {previewAgent.name}
                </span>
                <span className="text-sky-300 font-mono text-[10px] hidden sm:inline">
                  ({previewAgent.vehicleType || 'Bike'})
                </span>
              </div>
            </div>

            <button
              onClick={() => setPreviewAgent(null)}
              className="sm:hidden px-2.5 py-1 rounded-lg bg-white hover:bg-sky-50 text-sky-950 text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="flex items-center gap-1.5 bg-sky-900 px-2.5 py-1 rounded-lg border border-sky-700 text-[11px]">
              <span className="text-[10px] text-sky-300 font-bold uppercase tracking-wider">Switch:</span>
              <select
                value={previewAgent.id}
                onChange={(e) => {
                  const ag = deliveryAgents.find((a) => a.id === e.target.value);
                  if (ag) setPreviewAgent(ag);
                }}
                className="bg-transparent text-white text-[11px] font-bold focus:outline-none cursor-pointer pr-1"
              >
                {deliveryAgents.map((ag) => (
                  <option key={ag.id} value={ag.id} className="bg-sky-950 text-white">
                    {ag.name} ({ag.vehicleType || 'Bike'})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setPreviewAgent(null)}
              className="hidden sm:flex px-3 py-1 rounded-lg bg-white hover:bg-sky-50 text-sky-950 text-[11px] font-bold uppercase tracking-wider transition-all items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Console</span>
            </button>
          </div>
        </div>

        <DeliveryAgentPortal
          currentAgent={previewAgent}
          onLogout={() => setPreviewAgent(null)}
          onBackToStore={() => {
            setPreviewAgent(null);
            onBackToStore();
          }}
        />
      </div>
    );
  }

  // 2. Direct Kitchen Screen View Mode for Admin
  if (previewChef) {
    return (
      <div className="min-h-screen bg-slate-50/70 text-slate-900">
        {/* Fixed Top Admin Live Kitchen Simulator Banner */}
        <div className="sticky top-0 z-50 bg-amber-950 text-white px-3 sm:px-6 py-2.5 border-b border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
              <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                <span className="text-amber-300 hidden xs:inline uppercase tracking-wider text-[10px]">LIVE KITCHEN:</span>
                <span className="text-white bg-amber-900 px-2 py-0.5 rounded-md font-extrabold text-[11px] truncate border border-amber-700">
                  {previewChef.name}
                </span>
                <span className="text-amber-300 text-[10px] hidden sm:inline">
                  ({previewChef.role})
                </span>
              </div>
            </div>

            <button
              onClick={() => setPreviewChef(null)}
              className="sm:hidden px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-950 text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="flex items-center gap-1.5 bg-amber-900 px-2.5 py-1 rounded-lg border border-amber-700 text-[11px]">
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">Switch:</span>
              <select
                value={previewChef.id}
                onChange={(e) => {
                  const st = kitchenStaff.find((s) => s.id === e.target.value);
                  if (st) setPreviewChef(st);
                }}
                className="bg-transparent text-white text-[11px] font-bold focus:outline-none cursor-pointer pr-1"
              >
                {kitchenStaff.map((st) => (
                  <option key={st.id} value={st.id} className="bg-amber-950 text-white">
                    {st.name} ({st.role})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setPreviewChef(null)}
              className="hidden sm:flex px-3 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-950 text-[11px] font-bold uppercase tracking-wider transition-all items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Console</span>
            </button>
          </div>
        </div>

        <KitchenDisplayPage
          currentChef={previewChef}
          onLogout={() => setPreviewChef(null)}
          onBackToStore={() => {
            setPreviewChef(null);
            onBackToStore();
          }}
        />
      </div>
    );
  }

  // 3. Direct Preparing & Packing Screen View Mode for Admin
  if (previewPreparingStaff) {
    return (
      <div className="min-h-screen bg-slate-50/70 text-slate-900">
        {/* Fixed Top Admin Live Preparing Simulator Banner */}
        <div className="sticky top-0 z-50 bg-violet-950 text-white px-3 sm:px-6 py-2.5 border-b border-violet-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0 animate-pulse" />
              <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                <span className="text-violet-300 hidden xs:inline uppercase tracking-wider text-[10px]">LIVE PREPARING:</span>
                <span className="text-white bg-violet-900 px-2 py-0.5 rounded-md font-extrabold text-[11px] truncate border border-violet-700">
                  {previewPreparingStaff.name}
                </span>
                <span className="text-violet-300 text-[10px] hidden sm:inline">
                  ({previewPreparingStaff.role})
                </span>
              </div>
            </div>

            <button
              onClick={() => setPreviewPreparingStaff(null)}
              className="text-xs text-violet-300 hover:text-white px-2 py-1 rounded-lg hover:bg-violet-900 transition-colors"
            >
              Exit Live Mode
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="flex items-center gap-1.5 bg-violet-900 px-2.5 py-1 rounded-lg border border-violet-700 text-[11px]">
              <span className="text-[10px] text-violet-300 font-bold uppercase tracking-wider">Switch:</span>
              <select
                value={previewPreparingStaff.id}
                onChange={(e) => {
                  const st = preparingStaff.find((s) => s.id === e.target.value);
                  if (st) setPreviewPreparingStaff(st);
                }}
                className="bg-transparent text-white text-[11px] font-bold focus:outline-none cursor-pointer pr-1"
              >
                {preparingStaff.map((st) => (
                  <option key={st.id} value={st.id} className="bg-violet-950 text-white">
                    {st.name} ({st.role})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setPreviewPreparingStaff(null)}
              className="hidden sm:flex px-3 py-1 rounded-lg bg-white hover:bg-violet-50 text-violet-950 text-[11px] font-bold uppercase tracking-wider transition-all items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Console</span>
            </button>
          </div>
        </div>

        <PreparingDisplayPage
          onBackToAdmin={() => setPreviewPreparingStaff(null)}
          onOpenStore={() => {
            setPreviewPreparingStaff(null);
            onBackToStore();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 pb-20 pt-[max(env(safe-area-inset-top,0px),0px)]">
      {/* Multi-Color Light Pastel Curator Console Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-indigo-100 shadow-sm shadow-indigo-500/5 mb-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Left: Framed Brand Mark + CURATOR CONSOLE Kicker */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="rounded-lg border-2 border-indigo-600 bg-indigo-50/60 px-2.5 py-0.5 font-extrabold tracking-[0.14em] text-[11px] sm:text-xs text-indigo-950 uppercase leading-tight select-none">
              GIDHAUR
            </span>
            <span className="hidden md:inline-block text-[10px] font-bold tracking-[0.22em] text-indigo-400 uppercase select-none">
              CURATOR CONSOLE
            </span>
          </div>

          {/* Center: Multi-Color Pastel Pill Navigation Tabs */}
          <nav className="flex-1 min-w-0 overflow-x-auto no-scrollbar flex items-center justify-start md:justify-center gap-2 sm:gap-3 h-full">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-xs sm:text-[13px] tracking-wide whitespace-nowrap border transition-all cursor-pointer shrink-0 ${
                activeTab === 'products'
                  ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-xs shadow-amber-500/10'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-amber-900 hover:bg-amber-50/40 font-medium'
              }`}
              id="admin-tab-products"
            >
              <span>Catalog</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-xs sm:text-[13px] tracking-wide whitespace-nowrap border transition-all cursor-pointer shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold shadow-xs shadow-indigo-500/10'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-indigo-900 hover:bg-indigo-50/40 font-medium'
              }`}
              id="admin-tab-orders"
            >
              <span>Orders</span>
              {pendingOrders.length > 0 && (
                <span className="bg-indigo-600 text-white rounded-md text-[10px] font-mono font-bold px-1.5 py-0.2 min-w-4 text-center leading-tight shadow-xs">
                  {pendingOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-xs sm:text-[13px] tracking-wide whitespace-nowrap border transition-all cursor-pointer shrink-0 ${
                activeTab === 'staff'
                  ? 'bg-violet-50 border-violet-300 text-violet-950 font-bold shadow-xs shadow-violet-500/10'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-violet-900 hover:bg-violet-50/40 font-medium'
              }`}
              id="admin-tab-staff"
            >
              <span>Staff</span>
              {(kitchenStaff.length + preparingStaff.length + deliveryAgents.length) > 0 && (
                <span className="text-[10px] font-mono text-violet-600 font-semibold">
                  ({kitchenStaff.length + preparingStaff.length + deliveryAgents.length})
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-xs sm:text-[13px] tracking-wide whitespace-nowrap border transition-all cursor-pointer shrink-0 ${
                activeTab === 'stats'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-xs shadow-emerald-500/10'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-emerald-900 hover:bg-emerald-50/40 font-medium'
              }`}
              id="admin-tab-stats"
            >
              <span>Stock</span>
              {lowStockCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-xs sm:text-[13px] tracking-wide whitespace-nowrap border transition-all cursor-pointer shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold shadow-xs shadow-sky-500/10'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-sky-900 hover:bg-sky-50/40 font-medium'
              }`}
              id="admin-tab-settings"
            >
              <span>Settings</span>
            </button>
          </nav>

          {/* Right: Minimal Utility Menu (Tools) + STOREFRONT + Sign Out */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Consolidated Tools & Utilities Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsScreenSwitcherOpen(!isScreenSwitcherOpen)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-[0.12em] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  isScreenSwitcherOpen
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-900'
                }`}
                title="Console Tools, Alerts, Screens & Sync Status"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tools</span>
                {soundAlert.permissionStatus !== 'granted' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                )}
                <ChevronDown className={`w-3 h-3 transition-transform ${isScreenSwitcherOpen ? 'rotate-180' : ''}`} />
              </button>

              {isScreenSwitcherOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-indigo-200/80 shadow-xl shadow-indigo-500/10 p-3.5 z-50 space-y-3.5 animate-in fade-in duration-150">
                  {/* Section 1: Sound & Phone Notification Controls */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">
                        Alerts &amp; Audio
                      </span>
                      <DatabaseStatusIndicator />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={handleTestNotificationClick}
                        className={`col-span-2 px-3 py-2 rounded-lg border text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          soundAlert.permissionStatus === 'granted'
                            ? 'border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-900'
                            : 'border-amber-500 bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                        id="admin-test-notification-header-btn"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>
                          {soundAlert.permissionStatus === 'granted' ? 'Test Phone Alert' : 'Allow & Test Alert'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={soundAlert.toggleSoundEnabled}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50 bg-white text-[11px] font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {soundAlert.settings.soundEnabled ? (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-900">Sound: ON</span>
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-400">Muted</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsScreenSwitcherOpen(false);
                          soundAlert.setIsAlertModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-violet-200 hover:bg-violet-50 bg-white text-[11px] font-semibold text-violet-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        id="admin-sound-settings-btn"
                      >
                        <Sliders className="w-3.5 h-3.5 text-violet-600" />
                        <span>Ringtone</span>
                      </button>
                    </div>
                  </div>

                  {/* Section 2: Live Staff Screens Switcher */}
                  <div className="pt-2.5 border-t border-sky-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700 block">
                      Delivery Riders ({deliveryAgents.length})
                    </span>
                    <div className="space-y-0.5 max-h-28 overflow-y-auto">
                      {deliveryAgents.map((ag) => (
                        <button
                          key={ag.id}
                          onClick={() => {
                            setPreviewAgent(ag);
                            setIsScreenSwitcherOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-sky-50 text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Bike className="w-3.5 h-3.5 text-sky-600" />
                            <span>{ag.name}</span>
                          </div>
                          <span className="text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded font-mono uppercase">
                            {ag.vehicleType || 'Bike'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-amber-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 block">
                      Kitchen Chefs ({kitchenStaff.length})
                    </span>
                    <div className="space-y-0.5 max-h-28 overflow-y-auto">
                      {kitchenStaff.map((st) => (
                        <button
                          key={st.id}
                          onClick={() => {
                            setPreviewChef(st);
                            setIsScreenSwitcherOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <ChefHat className="w-3.5 h-3.5 text-amber-600" />
                            <span>{st.name}</span>
                          </div>
                          <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-mono truncate max-w-[90px]">
                            {st.role}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-violet-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700 block">
                      Preparing &amp; Packing ({preparingStaff.length})
                    </span>
                    <div className="space-y-0.5 max-h-28 overflow-y-auto">
                      {preparingStaff.map((st) => (
                        <button
                          key={st.id}
                          onClick={() => {
                            setPreviewPreparingStaff(st);
                            setIsScreenSwitcherOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-violet-50 text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <PackageCheck className="w-3.5 h-3.5 text-violet-600" />
                            <span>{st.name}</span>
                          </div>
                          <span className="text-[10px] text-violet-800 bg-violet-50 px-1.5 py-0.5 rounded font-mono truncate max-w-[90px]">
                            {st.role}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STOREFRONT Button */}
            <button
              onClick={onBackToStore}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 text-[11px] font-bold uppercase tracking-[0.12em] border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              id="admin-to-store-btn"
              title="Return to Customer Storefront"
            >
              <Store className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Storefront</span>
            </button>

            {/* Sign Out Button */}
            <button
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              title="Sign Out"
              id="admin-logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 space-y-5">
        {/* Test Notification Feedback Toast */}
        {notificationTestToast && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all animate-in fade-in duration-200 ${
              notificationTestToast.type === 'success'
                ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                : 'bg-amber-50 text-amber-950 border-amber-300'
            }`}
          >
            <span>{notificationTestToast.message}</span>
            <button
              onClick={() => setNotificationTestToast(null)}
              className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Active Repeating Alarm Notification Banner */}
        {soundAlert.isAlarmRinging && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-300 shadow-sm shadow-amber-500/10 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 animate-bounce shadow-sm">
                <Bell className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-950 tracking-wide flex items-center gap-2 uppercase">
                  <span>Incoming Order Alert</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 font-bold animate-pulse">
                    {Math.floor(soundAlert.alarmSecondsLeft / 60)}:{(soundAlert.alarmSecondsLeft % 60).toString().padStart(2, '0')}
                  </span>
                </h4>
                <p className="text-[11px] text-amber-800">
                  Continuous reminder active until pending order is accepted or rejected.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => {
                  setSelectedStatusFilter('pending');
                  setActiveTab('orders');
                }}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                Review &amp; Accept ({pendingOrders.length})
              </button>
              <button
                onClick={soundAlert.silenceAlarm}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-white hover:bg-amber-100/50 text-amber-900 font-bold text-[11px] uppercase tracking-wider transition-all border border-amber-300 cursor-pointer"
              >
                Mute Alarm
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Live Orders Management & Order History Archive (Persisted in DOM for instant 0ms tab switching) */}
        <div className={activeTab === 'orders' ? 'space-y-5' : 'hidden'}>
          {/* Section Title + Sub-Tab Pill Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl border border-indigo-200/80 shadow-sm shadow-indigo-500/5 p-3.5 sm:px-5">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setOrdersSubTab('today')}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm uppercase tracking-[0.12em] border transition-all flex items-center gap-2 cursor-pointer ${
                  ordersSubTab === 'today'
                    ? 'bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-sm shadow-indigo-500/20'
                    : 'bg-indigo-50/50 border-indigo-100 text-indigo-900 hover:bg-indigo-100/70 font-semibold'
                }`}
              >
                <span>Today&apos;s Orders</span>
                <span className={`font-mono text-xs px-1.5 py-0.2 rounded ${
                  ordersSubTab === 'today'
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-indigo-800 border border-indigo-200'
                }`}>
                  {todayOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOrdersSubTab('history')}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm uppercase tracking-[0.12em] border transition-all flex items-center gap-2 cursor-pointer ${
                  ordersSubTab === 'history'
                    ? 'bg-violet-600 border-violet-600 text-white font-extrabold shadow-sm shadow-violet-500/20'
                    : 'bg-violet-50/50 border-violet-100 text-violet-900 hover:bg-violet-100/70 font-semibold'
                }`}
              >
                <span>Archive</span>
                <span className={`font-mono text-xs px-1.5 py-0.2 rounded ${
                  ordersSubTab === 'history'
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-violet-800 border border-violet-200'
                }`}>
                  {archivedOrders.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestNotificationClick}
                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Test App Notification on Phone"
                id="admin-test-notification-toolbar-btn"
              >
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span>Test Alert</span>
              </button>

              {orders.length > 0 && (
                <button
                  onClick={() => setIsClearingAllModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-50/70 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title="Delete all test orders"
                  id="admin-clear-orders-btn"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Clear Orders</span>
                </button>
              )}
            </div>
          </div>

          {ordersSubTab === 'history' ? (
            <OrderHistoryView
              archivedOrders={archivedOrders}
              onDeleteArchivedOrder={handleDeleteArchivedOrder}
              onClearAllHistory={handleClearAllHistory}
            />
          ) : (
            <>
              {/* Multi-Color Pastel Status Filter Bar & Soft Rounded Search */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white rounded-xl border border-indigo-100 p-3 shadow-xs">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setSelectedStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border transition-all cursor-pointer shrink-0 ${
                      selectedStatusFilter === 'all'
                        ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-indigo-50/40 border-indigo-100 text-indigo-900 hover:bg-indigo-100/60 font-medium'
                    }`}
                  >
                    All ({todayOrders.length})
                  </button>

                  <button
                    onClick={() => setSelectedStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      selectedStatusFilter === 'pending'
                        ? 'bg-amber-500 border-amber-500 text-white font-bold shadow-xs'
                        : 'bg-amber-50/60 border-amber-200 text-amber-900 hover:bg-amber-100/70 font-medium'
                    }`}
                  >
                    <span>Pending</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      selectedStatusFilter === 'pending'
                        ? 'bg-white/25 text-white'
                        : 'bg-amber-200/70 text-amber-950'
                    }`}>
                      {pendingOrders.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedStatusFilter('kitchen')}
                    className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      selectedStatusFilter === 'kitchen'
                        ? 'bg-violet-600 border-violet-600 text-white font-bold shadow-xs'
                        : 'bg-violet-50/50 border-violet-200 text-violet-900 hover:bg-violet-100/70 font-medium'
                    }`}
                  >
                    <span>In Kitchen ({inKitchenOrders.length})</span>
                  </button>

                  <button
                    onClick={() => setSelectedStatusFilter('out_for_delivery')}
                    className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      selectedStatusFilter === 'out_for_delivery'
                        ? 'bg-sky-600 border-sky-600 text-white font-bold shadow-xs'
                        : 'bg-sky-50/60 border-sky-200 text-sky-900 hover:bg-sky-100/70 font-medium'
                    }`}
                  >
                    <span>Out for Delivery ({outOrders.length})</span>
                  </button>

                  <button
                    onClick={() => setSelectedStatusFilter('delivered')}
                    className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border transition-all cursor-pointer shrink-0 ${
                      selectedStatusFilter === 'delivered'
                        ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                        : 'bg-emerald-50/60 border-emerald-200 text-emerald-900 hover:bg-emerald-100/70 font-medium'
                    }`}
                  >
                    Delivered ({deliveredOrders.length})
                  </button>

                  <button
                    onClick={() => setSelectedStatusFilter('rejected')}
                    className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border transition-all cursor-pointer shrink-0 ${
                      selectedStatusFilter === 'rejected'
                        ? 'bg-rose-600 border-rose-600 text-white font-bold shadow-xs'
                        : 'bg-rose-50/60 border-rose-200 text-rose-900 hover:bg-rose-100/70 font-medium'
                    }`}
                  >
                    Cancelled ({rejectedOrders.length})
                  </button>

                  {cancellationRequestedOrders.length > 0 && (
                    <button
                      onClick={() => setSelectedStatusFilter('cancellation_requests')}
                      className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        selectedStatusFilter === 'cancellation_requests'
                          ? 'bg-rose-600 border-rose-600 text-white font-bold shadow-xs'
                          : 'bg-rose-100 border-rose-300 text-rose-800 hover:bg-rose-200 font-bold animate-pulse'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Cancel Requests ({cancellationRequestedOrders.length})</span>
                    </button>
                  )}
                </div>

                {/* Soft Rounded Search Input */}
                <div className="relative w-full md:w-64 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400" />
                  <input
                    type="text"
                    placeholder="Filter ID, customer, phone..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-indigo-50/20 focus:bg-white border border-indigo-200 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 text-slate-900 transition-colors"
                  />
                </div>
              </div>

              {/* Orders Feed / Ledger */}
              {isLoadingOrders ? (
                <div className="bg-white rounded-xl border border-indigo-100 p-12 text-center text-indigo-400 shadow-xs">
                  <p className="text-xs font-medium uppercase tracking-widest">Loading live orders stream...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white rounded-xl border border-indigo-100 p-12 text-center space-y-2 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 border border-indigo-200 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm uppercase tracking-wider text-indigo-950">
                    No Orders Found
                  </h3>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`bg-white rounded-xl p-4 sm:p-5 border transition-all ${
                        order.status === 'pending'
                          ? 'border-amber-300 shadow-sm shadow-amber-500/10 ring-1 ring-amber-200/50'
                          : order.status === 'delivered'
                            ? 'border-emerald-200/80 shadow-sm shadow-emerald-500/5'
                            : order.status === 'rejected'
                              ? 'border-rose-200/80 shadow-sm shadow-rose-500/5'
                              : 'border-indigo-200/80 hover:border-indigo-300 shadow-sm shadow-indigo-500/5'
                      }`}
                      id={`admin-order-card-${order.orderId}`}
                    >
                      {/* Header Row: Customer Name, Order ID Tag, Phone & Timestamp, Status & Amount */}
                      <div className="flex items-start justify-between gap-3 border-b border-indigo-100/80 pb-3.5">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-base sm:text-lg text-slate-900 truncate">
                              {order.customerName}
                            </h3>
                            <span className="font-mono font-bold text-[11px] text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 shrink-0">
                              #{order.orderId}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <a
                              href={`tel:${order.phone}`}
                              className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-mono font-semibold bg-emerald-50/70 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{order.phone}</span>
                            </a>
                            {order.createdAt && (
                              <span className="text-[11px] text-slate-400 font-mono">
                                · {new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="font-mono font-extrabold text-lg sm:text-xl text-emerald-800 bg-emerald-50/60 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            ₹{order.totalAmount}
                          </span>
                          {order.cancellationStatus === 'requested' && order.status !== 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Cancel Requested</span>
                            </span>
                          ) : (
                            getStatusBadge(order.status)
                          )}
                        </div>
                      </div>

                      {/* Middle Details Grid */}
                      <div className="py-3.5 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 text-xs">
                        {/* Items & Bill Summary Section */}
                        <div className="md:col-span-6 space-y-1.5 flex flex-col h-full">
                          <span className="font-bold text-indigo-700 uppercase tracking-[0.14em] text-[10px] block">
                            ITEMS ORDERED ({order.items?.reduce((s, i) => s + i.quantity, 0) || 0})
                          </span>
                          <div className="bg-indigo-50/30 rounded-xl p-3.5 border border-indigo-100 flex flex-col h-full">
                            <div className="space-y-2 mb-3">
                              {order.items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start text-slate-700 pb-2 border-b border-indigo-100/80 last:border-b-0 last:pb-0">
                                  <div className="flex items-start gap-2.5">
                                    <span className="font-mono font-bold text-indigo-900 bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-[11px]">
                                      {item.quantity}x
                                    </span>
                                    <div className="mt-0.5">
                                      <span className="font-semibold text-slate-900 text-xs">{item.name}</span>
                                      {item.selectedSize && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 border border-violet-200 ml-1.5 tracking-wider uppercase">
                                          {item.selectedSize}
                                        </span>
                                      )}
                                      {item.selectedExtras && item.selectedExtras.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                          {item.selectedExtras.map((extra) => (
                                            <span
                                              key={extra.id}
                                              className="text-[9px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 leading-none"
                                            >
                                              +{extra.name} (+₹{extra.price})
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className="font-mono font-bold text-slate-900 shrink-0 ml-2 mt-0.5">
                                    ₹{item.price * item.quantity}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Bill Summary */}
                            <div className="mt-auto pt-3 border-t border-indigo-100 space-y-1">
                              {(() => {
                                const subtotal = order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
                                const deliveryFee = order.totalAmount - subtotal;
                                return (
                                  <>
                                    <div className="flex justify-between text-[11px] text-slate-500">
                                      <span>Item Total</span>
                                      <span className="font-mono font-semibold text-slate-800">₹{subtotal}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-slate-500">
                                      <span>Delivery Fee</span>
                                      <span className="font-mono font-semibold text-slate-800">
                                        {deliveryFee === 0 ? <span className="text-emerald-700 font-bold">Free</span> : `₹${deliveryFee}`}
                                      </span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Delivery Address & Rider Info Section */}
                        <div className="md:col-span-6 space-y-1.5 flex flex-col h-full">
                          <span className="font-bold text-sky-700 uppercase tracking-[0.14em] text-[10px] block">
                            DELIVERY ADDRESS &amp; LOGISTICS
                          </span>
                          <div className="bg-sky-50/30 rounded-xl p-3.5 border border-sky-100 flex flex-col h-full">
                            <p className="text-slate-800 flex items-start gap-2 text-xs font-medium leading-relaxed">
                              <MapPin className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                              <span>{order.address}</span>
                            </p>

                            {order.notes && (
                              <div className="mt-3">
                                <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider block mb-1">Customer Notes</span>
                                <p className="text-amber-950 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200 text-[11px]">
                                  &ldquo;{order.notes}&rdquo;
                                </p>
                              </div>
                            )}

                            <div className="mt-auto pt-3">
                              {order.assignedAgentName ? (
                                <div className="pt-3 border-t border-sky-100 flex flex-col gap-1.5">
                                  <span className="text-[9px] font-bold text-sky-700 uppercase tracking-wider block">Assigned Rider</span>
                                  <div className="flex items-center justify-between bg-white rounded-lg border border-sky-200 p-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                                        <Bike className="w-3.5 h-3.5 text-sky-700" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 text-xs leading-none">{order.assignedAgentName}</span>
                                        {order.assignedAgentVehicleNumber && (
                                          <span className="font-mono text-[9px] text-sky-700 mt-0.5">{order.assignedAgentVehicleNumber}</span>
                                        )}
                                      </div>
                                    </div>
                                    {order.assignedAgentPhone && (
                                      <a href={`tel:${order.assignedAgentPhone}`} className="text-sky-800 hover:text-sky-950 font-mono text-[10px] font-bold bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200 uppercase">
                                        Call
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="pt-3 border-t border-sky-100">
                                  <div className="bg-white/80 rounded-lg border border-sky-200 border-dashed p-2.5 flex items-center justify-center gap-1.5 text-sky-600 text-[11px] uppercase tracking-wider">
                                    <Bike className="w-3.5 h-3.5" />
                                    <span>No rider assigned yet</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Customer Cancellation Request Alert Box */}
                      {order.cancellationStatus === 'requested' && order.status !== 'rejected' && (
                        <div className="mb-3 w-full rounded-xl bg-rose-50 border border-rose-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 animate-pulse" />
                            <span className="text-xs font-extrabold uppercase tracking-wider text-rose-950 truncate">
                              Customer Requested Order Cancellation
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleDeclineCancellation(order.id)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 bg-white border border-slate-300 transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAcceptCancellation(order.id)}
                              className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                              id={`accept-cancellation-btn-${order.orderId}`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancel Order</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons Row */}
                      <div className="pt-3 border-t border-indigo-100/80 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          <span className="text-[11px] uppercase tracking-wider text-slate-400">
                            Payment: <strong className="text-indigo-950">{order.paymentMethod?.toUpperCase() || 'COD / UPI'}</strong>
                          </span>
                          {order.paymentStatus === 'paid' ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[10px] uppercase tracking-wider">
                              ✓ PAID
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200 text-[10px] uppercase tracking-wider">
                              Pending Collection
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(order.id, 'rejected')}
                                className="px-3.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] uppercase tracking-[0.1em] border border-rose-200 transition-colors cursor-pointer"
                                id={`reject-btn-${order.orderId}`}
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(order.id, 'accepted')}
                                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] shadow-sm shadow-emerald-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                                id={`accept-btn-${order.orderId}`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Accept Order</span>
                              </button>
                            </>
                          )}

                          {order.status === 'accepted' && (() => {
                            const orderCat = getOrderCategoryClassification(order);
                            const isNonFood = orderCat === 'non_food_only';
                            const isFood = orderCat === 'food_only';

                            if (isNonFood) {
                              return (
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(order.id, 'preparing', {
                                      preparingStatus: 'preparing',
                                      preparingSentAt: serverTimestamp()
                                    })
                                  }
                                  className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] shadow-sm shadow-violet-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                                  id={`start-preparing-btn-${order.orderId}`}
                                >
                                  <PackageCheck className="w-3.5 h-3.5" />
                                  <span>Send to Preparing</span>
                                </button>
                              );
                            }

                            if (isFood) {
                              return (
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(order.id, 'preparing', {
                                      kitchenStatus: 'preparing',
                                      kitchenSentAt: serverTimestamp()
                                    })
                                  }
                                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] shadow-sm shadow-amber-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                                  id={`start-preparing-btn-${order.orderId}`}
                                >
                                  <ChefHat className="w-3.5 h-3.5" />
                                  <span>Send to Kitchen</span>
                                </button>
                              );
                            }

                            return (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(order.id, 'preparing', {
                                    kitchenStatus: 'preparing',
                                    preparingStatus: 'preparing',
                                    kitchenSentAt: serverTimestamp(),
                                    preparingSentAt: serverTimestamp()
                                  })
                                }
                                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] shadow-sm shadow-indigo-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                                id={`start-preparing-btn-${order.orderId}`}
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                <span>Send to Kitchen &amp; Prep</span>
                              </button>
                            );
                          })()}

                          {order.status === 'preparing' && (
                            <button
                              onClick={() => handleOpenAdminDispatch(order)}
                              className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] shadow-sm shadow-sky-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Bike className="w-3.5 h-3.5" />
                              <span>Send to Delivery Agent</span>
                            </button>
                          )}

                          {order.status === 'out_for_delivery' && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(order.id, 'delivered', {
                                  paymentStatus: 'paid',
                                  deliveredAt: serverTimestamp()
                                })
                              }
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] shadow-sm shadow-emerald-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>Mark Delivered</span>
                            </button>
                          )}

                          {order.status === 'delivered' && (
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed
                            </span>
                          )}

                          {order.status === 'rejected' && (
                            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Cancelled
                            </span>
                          )}

                          {/* Move to History Archive Button */}
                          <button
                            onClick={() => handleArchiveSingleOrder(order)}
                            className="p-1.5 rounded-lg text-violet-500 hover:text-violet-800 hover:bg-violet-50 border border-transparent hover:border-violet-200 transition-colors cursor-pointer"
                            title={`Move Order #${order.orderId} to History Archive`}
                          >
                            <Archive className="w-4 h-4" />
                          </button>

                          {/* Individual Delete Order Button */}
                          <button
                            onClick={() => setDeletingOrder(order)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title={`Delete Order #${order.orderId}`}
                            id={`delete-order-btn-${order.orderId}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Tab 2: Menu & Product Management (Persisted in DOM for instant 0ms tab switching) */}
        <div className={activeTab === 'products' ? 'block' : 'hidden'}>
          <ProductManagement
            products={liveProducts}
            onUpdateProducts={(updated) => {
              setLiveProducts(updated);
              if (onUpdateProducts) onUpdateProducts(updated);
            }}
          />
        </div>

        {/* Tab 3: Unified Staff Operations Hub (Kitchen, Preparing, Delivery) - Persisted in DOM for instant 0ms switching */}
        <div className={activeTab === 'staff' ? 'space-y-5' : 'hidden'}>
          {/* Multi-Color Pastel Sub-Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-violet-200/80 shadow-sm shadow-violet-500/5 p-3.5 sm:px-5">
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setStaffSubTab('kitchen');
                  try { triggerHaptic('selection'); } catch {}
                }}
                className={`px-3.5 py-2 rounded-lg text-xs uppercase tracking-[0.12em] border flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  staffSubTab === 'kitchen'
                    ? 'bg-amber-500 border-amber-500 text-white font-extrabold shadow-sm shadow-amber-500/20'
                    : 'bg-amber-50/60 border-amber-200 text-amber-900 hover:bg-amber-100/80 font-semibold'
                }`}
                id="staff-subtab-kitchen"
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Kitchen ({kitchenStaff.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStaffSubTab('preparing');
                  try { triggerHaptic('selection'); } catch {}
                }}
                className={`px-3.5 py-2 rounded-lg text-xs uppercase tracking-[0.12em] border flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  staffSubTab === 'preparing'
                    ? 'bg-violet-600 border-violet-600 text-white font-extrabold shadow-sm shadow-violet-500/20'
                    : 'bg-violet-50/60 border-violet-200 text-violet-900 hover:bg-violet-100/80 font-semibold'
                }`}
                id="staff-subtab-preparing"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Preparing ({preparingStaff.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStaffSubTab('delivery');
                  try { triggerHaptic('selection'); } catch {}
                }}
                className={`px-3.5 py-2 rounded-lg text-xs uppercase tracking-[0.12em] border flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  staffSubTab === 'delivery'
                    ? 'bg-sky-600 border-sky-600 text-white font-extrabold shadow-sm shadow-sky-500/20'
                    : 'bg-sky-50/60 border-sky-200 text-sky-900 hover:bg-sky-100/80 font-semibold'
                }`}
                id="staff-subtab-delivery"
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Delivery ({deliveryAgents.length})</span>
              </button>
            </div>

            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700 bg-violet-50 px-2.5 py-1 rounded-md border border-violet-200">
              Staff Operations Hub
            </span>
          </div>

          {/* Sub-view Content: Kitchen / Preparing / Delivery */}
          <div className={staffSubTab === 'kitchen' ? 'block' : 'hidden'}>
            <KitchenStaffManagement
              staffList={kitchenStaff}
              onDirectViewChef={(chef) => setPreviewChef(chef)}
            />
          </div>

          <div className={staffSubTab === 'preparing' ? 'block' : 'hidden'}>
            <PreparingStaffManagement
              staffList={preparingStaff}
              onDirectViewPrep={(st) => setPreviewPreparingStaff(st)}
            />
          </div>

          <div className={staffSubTab === 'delivery' ? 'block' : 'hidden'}>
            <DeliveryAgentsManagement
              agents={deliveryAgents}
              onDirectViewAgent={(agent) => setPreviewAgent(agent)}
            />
          </div>
        </div>

        {/* Tab 4: Payment & Restaurant Settings - Persisted in DOM for instant 0ms switching */}
        <div className={activeTab === 'settings' ? 'space-y-6' : 'hidden'}>
          <CloudStorageMeter products={products} />
          <PaymentSettings settings={settings} onUpdate={(newSettings) => setSettings(newSettings)} />
        </div>

        {/* Tab 5: Analytics & Summary - Persisted in DOM for instant 0ms switching */}
        <div className={activeTab === 'stats' ? 'space-y-5' : 'hidden'}>
          {/* Multi-Color Sub-view Switcher: Smart Stock & Inventory | Revenue & Order Metrics */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-emerald-200/80 shadow-sm shadow-emerald-500/5 p-3.5 sm:px-5">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setAnalyticsSubView('stock')}
                className={`px-3.5 py-2 rounded-lg text-xs uppercase tracking-[0.12em] border transition-all flex items-center gap-2 cursor-pointer ${
                  analyticsSubView === 'stock'
                    ? 'bg-emerald-600 border-emerald-600 text-white font-extrabold shadow-sm shadow-emerald-500/20'
                    : 'bg-emerald-50/60 border-emerald-200 text-emerald-900 hover:bg-emerald-100/80 font-semibold'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Smart Stock &amp; Inventory</span>
                {lowStockCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    analyticsSubView === 'stock'
                      ? 'bg-amber-400 text-amber-950'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {lowStockCount} Low
                  </span>
                )}
              </button>

              <button
                onClick={() => setAnalyticsSubView('revenue')}
                className={`px-3.5 py-2 rounded-lg text-xs uppercase tracking-[0.12em] border transition-all flex items-center gap-2 cursor-pointer ${
                  analyticsSubView === 'revenue'
                    ? 'bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-sm shadow-indigo-500/20'
                    : 'bg-indigo-50/60 border-indigo-200 text-indigo-900 hover:bg-indigo-100/80 font-semibold'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Revenue &amp; Order Metrics</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-emerald-900 bg-emerald-50/70 px-3 py-1 rounded-lg border border-emerald-200">
              <span>{adminDisplayName}</span>
              <span className="mx-1.5">·</span>
              <span>UPI: {settings.upiId || 'gidhaurbakery@upi'}</span>
            </div>
          </div>

          {/* Sub-view 1: Smart Stock & Inventory */}
          {analyticsSubView === 'stock' && (
            <InventoryManagementView
              products={liveProducts}
              onRefreshCatalog={() => {
                try {
                  window.dispatchEvent(new CustomEvent('swadeep_products_updated', { detail: liveProducts }));
                } catch {}
              }}
            />
          )}

          {/* Sub-view 2: Business & Order Performance Analytics */}
          {analyticsSubView === 'revenue' && (
            <div className="space-y-4 animate-fade-in">
              {/* 5 Multi-Color Pastel Stat Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-indigo-50/70 rounded-xl border border-indigo-200 shadow-sm shadow-indigo-500/5 p-4 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-[0.14em] block">
                    TOTAL ORDERS
                  </span>
                  <div className="font-mono font-extrabold text-2xl sm:text-3xl text-indigo-950">
                    {orders.length}
                  </div>
                  <span className="text-[10px] text-indigo-600 block">
                    Live collection
                  </span>
                </div>

                <div className="bg-amber-50/70 rounded-xl border border-amber-200 shadow-sm shadow-amber-500/5 p-4 space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-[0.14em] block">
                    PENDING ACTION
                  </span>
                  <div className="font-mono font-extrabold text-2xl sm:text-3xl text-amber-950">
                    {pendingOrders.length}
                  </div>
                  <span className="text-[10px] text-amber-700 block">
                    Needs approval
                  </span>
                </div>

                <div className="bg-sky-50/70 rounded-xl border border-sky-200 shadow-sm shadow-sky-500/5 p-4 space-y-1">
                  <span className="text-[10px] font-bold text-sky-800 uppercase tracking-[0.14em] block">
                    IN KITCHEN / OUT
                  </span>
                  <div className="font-mono font-extrabold text-2xl sm:text-3xl text-sky-900">
                    {inProgressOrders.length}
                  </div>
                  <span className="text-[10px] text-sky-700 block">
                    Active prep &amp; dispatch
                  </span>
                </div>

                <div className="bg-violet-50/70 rounded-xl border border-violet-200 shadow-sm shadow-violet-500/5 p-4 space-y-1">
                  <span className="text-[10px] font-bold text-violet-800 uppercase tracking-[0.14em] block">
                    DELIVERED
                  </span>
                  <div className="font-mono font-extrabold text-2xl sm:text-3xl text-violet-900">
                    {deliveredOrders.length}
                  </div>
                  <span className="text-[10px] text-violet-700 block">
                    Completed orders
                  </span>
                </div>

                <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 shadow-sm shadow-emerald-500/5 p-4 space-y-1 col-span-2 md:col-span-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-[0.14em] block">
                    TOTAL REVENUE
                  </span>
                  <div className="font-mono font-extrabold text-2xl sm:text-3xl text-emerald-900">
                    ₹{totalRevenue}
                  </div>
                  <span className="text-[10px] text-emerald-700 block">
                    Collected on delivery
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 sm:p-6 border border-indigo-200/80 shadow-sm shadow-indigo-500/5 space-y-5">
                <h3 className="font-extrabold text-sm uppercase tracking-[0.14em] text-indigo-950">
                  Performance Metrics &amp; Operations
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Completion Rate</span>
                    <p className="font-mono font-extrabold text-2xl text-emerald-950">
                      {orders.length > 0
                        ? `${Math.round((deliveredOrders.length / orders.length) * 100)}%`
                        : '100%'}
                    </p>
                    <span className="text-[11px] text-emerald-700">{deliveredOrders.length} delivered</span>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-200 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-indigo-700 font-bold">Average Order Value</span>
                    <p className="font-mono font-extrabold text-2xl text-indigo-950">
                      ₹{orders.length > 0 ? Math.round(totalRevenue / (deliveredOrders.length || 1)) : 0}
                    </p>
                    <span className="text-[11px] text-indigo-700">Per delivered order</span>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-amber-800 font-bold">Active Menu Items</span>
                    <p className="font-mono font-extrabold text-2xl text-amber-950">
                      {liveProducts.filter((p) => p.available).length} / {liveProducts.length}
                    </p>
                    <span className="text-[11px] text-amber-700">Available in store</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-indigo-100">
                  <div className="p-4 rounded-xl bg-sky-50/40 border border-sky-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-sky-700 font-bold">Registered Delivery Riders</span>
                      <p className="font-mono font-extrabold text-xl text-sky-950">{deliveryAgents.length}</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('staff');
                        setStaffSubTab('delivery');
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-sky-900 bg-white hover:bg-sky-100 border border-sky-200 cursor-pointer transition-colors"
                    >
                      Manage
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-amber-800 font-bold">Registered Kitchen Chefs</span>
                      <p className="font-mono font-extrabold text-xl text-amber-950">{kitchenStaff.length}</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('staff');
                        setStaffSubTab('kitchen');
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-white hover:bg-amber-100 border border-amber-200 cursor-pointer transition-colors"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Select Rider & Item Verification Dispatch Modal */}
      {dispatchingOrder && (() => {
        const orderItems = dispatchingOrder.items || [];
        const totalItems = orderItems.length;
        const checkedCount = orderItems.filter((_, idx) => adminCheckedItems[`${dispatchingOrder.id}-${idx}`]).length;
        const allDone = totalItems > 0 && checkedCount === totalItems;
        const untickedCount = totalItems - checkedCount;

        let liveAdminSubtotal = 0;
        orderItems.forEach((item, idx) => {
          const isTicked = checkedCount > 0 ? !!adminCheckedItems[`${dispatchingOrder.id}-${idx}`] : true;
          if (isTicked) {
            const price = (item as any).selectedVariant?.price ?? (item as any).product?.price ?? item.price ?? 0;
            liveAdminSubtotal += price * (item.quantity || 1);
          }
        });
        const deliveryFee = Number(dispatchingOrder.deliveryFee) || 0;
        const liveAdminTotal = liveAdminSubtotal + deliveryFee;

        const executeAdminDispatch = (agent?: DeliveryAgent) => {
          const tickedItems = orderItems.filter((_, idx) => adminCheckedItems[`${dispatchingOrder.id}-${idx}`]);
          const untickedItems = orderItems.filter((_, idx) => !adminCheckedItems[`${dispatchingOrder.id}-${idx}`]);

          const dispatchedList = tickedItems.length > 0 ? tickedItems : orderItems;
          const excludedList = tickedItems.length > 0 ? untickedItems : [];

          const dispatchedItemNames = dispatchedList.map((i) => i.name || (i as any).product?.name || 'Item');
          const untickedItemNames = excludedList.map((i) => i.name || (i as any).product?.name || 'Item');
          const dispatchedIndices = orderItems
            .map((_, idx) => idx)
            .filter((idx) => (tickedItems.length > 0 ? !!adminCheckedItems[`${dispatchingOrder.id}-${idx}`] : true));

          // Calculate subtotal of ONLY dispatched items (unticked items excluded from bill!)
          let dispatchedSubtotal = 0;
          dispatchedList.forEach((item: any) => {
            const price = item.selectedVariant?.price ?? (item as any).product?.price ?? item.price ?? 0;
            const qty = item.quantity || 1;
            dispatchedSubtotal += price * qty;
          });

          const deliveryFee = Number(dispatchingOrder.deliveryFee) || 0;
          const dispatchedTotalAmount = dispatchedSubtotal + deliveryFee;

          const payload: any = {
            kitchenStatus: 'ready',
            preparingStatus: 'dispatched',
            kitchenReady: true,
            preparingReady: true,
            subtotal: dispatchedSubtotal,
            totalAmount: dispatchedTotalAmount,
            originalTotalAmount: dispatchingOrder.originalTotalAmount || dispatchingOrder.totalAmount,
            originalSubtotal: dispatchingOrder.originalSubtotal || dispatchingOrder.subtotal,
            dispatchedItems: dispatchedItemNames,
            untickedItems: untickedItemNames,
            dispatchedItemIndices: dispatchedIndices,
            dispatchedAt: serverTimestamp(),
          };

          if (agent) {
            payload.assignedAgentId = agent.id;
            payload.assignedAgentName = agent.name;
            payload.assignedAgentPhone = agent.phone || '';
            payload.assignedAgentVehicle = agent.vehicleType || 'Bike';
            payload.assignedAgentVehicleNumber = agent.vehicleNumber || '';
          } else {
            payload.assignedAgentId = 'unassigned';
            payload.assignedAgentName = 'Available Delivery Partner';
          }

          handleUpdateStatus(dispatchingOrder.id, 'out_for_delivery', payload);
          setDispatchingOrder(null);
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-xl border border-sky-200 shadow-2xl shadow-sky-500/10 max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col justify-between">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-sky-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-800">
                    <Bike className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider text-sky-950">
                      Send to Delivery Agent
                    </h3>
                    <span className="text-xs text-sky-700 font-mono">
                      Order #{dispatchingOrder.orderId} • {dispatchingOrder.customerName}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setDispatchingOrder(null)}
                  className="w-8 h-8 rounded-lg border border-sky-200 bg-sky-50/50 hover:bg-sky-100 text-sky-700 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="space-y-3.5 overflow-y-auto pr-1 flex-1">
                {/* Confirmation Status Alert Banner */}
                {allDone ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-950">
                      All Items Verified &amp; Packed ({checkedCount}/{totalItems})
                    </h4>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-950">
                        {checkedCount === 0 ? 'No Items Ticked Yet' : `Partial Packing (${checkedCount}/${totalItems} Packed)`}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdminTickAllItems(dispatchingOrder.id, totalItems)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shrink-0"
                    >
                      ✓ Tick All Items
                    </button>
                  </div>
                )}

                {/* Live Bill Amount Box */}
                <div className="p-3 rounded-xl bg-indigo-50/40 border border-indigo-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 block">Bill Amount to Collect</span>
                    <span className="font-extrabold text-indigo-950 text-base font-mono">₹{liveAdminTotal}</span>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-800 font-mono">
                    {checkedCount}/{totalItems} items in parcel
                  </span>
                </div>

                {/* Items Checklist Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Parcel Item Verification ({checkedCount}/{totalItems})
                    </span>
                    <div className="flex items-center gap-1.5">
                      {checkedCount < totalItems && totalItems > 0 && (
                        <button
                          type="button"
                          onClick={() => handleAdminTickAllItems(dispatchingOrder.id, totalItems)}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-200 transition-colors cursor-pointer uppercase tracking-wider"
                        >
                          ✓ Tick All
                        </button>
                      )}
                      {checkedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleAdminUntickAllItems(dispatchingOrder.id, totalItems)}
                          className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-0.5 rounded-md border border-slate-200 transition-colors cursor-pointer uppercase tracking-wider"
                        >
                          Untick All
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {orderItems.map((item, idx) => {
                      const isTicked = adminCheckedItems[`${dispatchingOrder.id}-${idx}`];
                      const isKitchen = isFoodItem(item);
                      const prepTime = Number(item.prepTimeMinutes || (item as any).product?.prepTimeMinutes || 0);

                      return (
                        <div
                          key={idx}
                          onClick={() => toggleAdminItemCheck(dispatchingOrder.id, idx)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                            isTicked
                              ? 'bg-emerald-50/70 border-emerald-300 text-slate-900 font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                isTicked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                              }`}
                            >
                              {isTicked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="min-w-0">
                              <span className="truncate block max-w-[200px] sm:max-w-[240px]">
                                {item.quantity}x {item.name || (item as any).product?.name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {isKitchen ? (
                                  <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase">
                                    Kitchen {prepTime > 0 ? `(${prepTime}m)` : ''}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-violet-800 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200 uppercase">
                                    Prep Section
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border uppercase tracking-wider shrink-0 ${
                              isTicked ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {isTicked ? '✓ In Parcel' : 'Excluded'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rider Assignment List */}
                <div className="space-y-2 pt-2 border-t border-sky-100">
                  <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                    Choose Delivery Rider ({deliveryAgents.length} available)
                  </span>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {deliveryAgents.map((agent) => {
                      const isSelected = adminSelectedRiderId === agent.id;
                      return (
                        <div
                          key={agent.id}
                          onClick={() => setAdminSelectedRiderId(agent.id)}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-between text-left cursor-pointer ${
                            isSelected
                              ? 'border-sky-500 bg-sky-50/70'
                              : 'border-sky-100 hover:border-sky-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="adminDeliveryAgent"
                              checked={isSelected}
                              onChange={() => setAdminSelectedRiderId(agent.id)}
                              className="w-3.5 h-3.5 accent-sky-600"
                            />
                            <div>
                              <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                                {agent.name}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span>{agent.vehicleType || 'Bike'}</span>
                                {agent.vehicleNumber && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono font-bold text-sky-800 bg-sky-50 px-1.5 rounded border border-sky-200">
                                      {agent.vehicleNumber}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              executeAdminDispatch(agent);
                            }}
                            className="text-[10px] font-bold uppercase tracking-wider text-white bg-sky-600 hover:bg-sky-700 px-3 py-1.5 rounded-lg shadow-sm shadow-sky-500/20 transition-colors cursor-pointer"
                          >
                            Assign &amp; Send
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-sky-100 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => executeAdminDispatch(undefined)}
                  className="text-xs text-sky-700 hover:text-sky-950 font-semibold underline cursor-pointer"
                >
                  Dispatch without specific rider
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDispatchingOrder(null)}
                    className="px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const matchedAgent = deliveryAgents.find((a) => a.id === adminSelectedRiderId);
                      executeAdminDispatch(matchedAgent);
                    }}
                    className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] uppercase tracking-wider shadow-sm shadow-sky-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Single Order Confirmation Modal */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl border border-rose-200 shadow-2xl shadow-rose-500/10 max-w-sm w-full p-6 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600 block">
                PERMANENT DELETION
              </span>
              <h3 className="font-bold text-base text-slate-900">
                Delete Order #{deletingOrder.orderId}?
              </h3>
              <p className="text-xs text-slate-600 font-mono">
                {deletingOrder.customerName} (₹{deletingOrder.totalAmount})
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingLoading}
                onClick={() => setDeletingOrder(null)}
                className="flex-1 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-[0.1em] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingLoading}
                onClick={() => handleDeleteOrder(deletingOrder)}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] shadow-sm shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                id="confirm-delete-order-btn"
              >
                {isDeletingLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Test Orders Modal */}
      {isClearingAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl border border-rose-200 shadow-2xl shadow-rose-500/10 max-w-sm w-full p-6 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600 block">
                BULK DELETION
              </span>
              <h3 className="font-bold text-base text-slate-900">
                Clear All ({orders.length}) Orders?
              </h3>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingLoading}
                onClick={() => setIsClearingAllModalOpen(false)}
                className="flex-1 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-[0.1em] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingLoading}
                onClick={handleClearAllOrders}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] shadow-sm shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                id="confirm-clear-all-orders-btn"
              >
                {isDeletingLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Clear All ({orders.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Sound Alert & Custom Audio Settings Modal */}
      <SoundSettingsModal
        isOpen={soundAlert.isAlertModalOpen}
        onClose={() => soundAlert.setIsAlertModalOpen(false)}
        settings={soundAlert.settings}
        onToggleSound={soundAlert.toggleSoundEnabled}
        onSelectPreset={soundAlert.selectPreset}
        onUploadCustomFile={soundAlert.uploadCustomFile}
        onRemoveCustomFile={soundAlert.removeCustomFile}
        onUpdateVolume={soundAlert.updateVolume}
        onStartTest={soundAlert.startTestAlert}
        onStopTest={soundAlert.stopTestAlert}
        isTesting={soundAlert.isSoundTesting}
        testSecondsLeft={soundAlert.testSecondsLeft}
        permissionStatus={soundAlert.permissionStatus}
        onRequestPermission={soundAlert.handleRequestPermission}
      />

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setIsLogoutConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-rose-200 max-w-sm w-full p-6 shadow-2xl shadow-rose-500/10 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600 block">
                SESSION SECURITY
              </span>
              <h3 id="logout-dialog-title" className="text-base font-bold text-slate-900">
                Confirm Sign Out?
              </h3>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-[0.1em] transition-colors cursor-pointer"
                id="cancel-logout-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  handleLogoutAction();
                }}
                className="flex-1 py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] shadow-sm shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                id="confirm-logout-btn"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
