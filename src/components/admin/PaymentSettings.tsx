import React, { useState, useRef, useEffect } from 'react';
import {
  Globe,
  CreditCard,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  Upload,
  Trash2,
  Search,
  Smartphone,
  Laptop,
  Sliders,
  Check,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  Mail,
  Eye,
  EyeOff,
  Copy,
  Send,
  AlertTriangle,
  Download,
  Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { RestaurantSettings, WebsiteBrandingSettings, CustomerEmailRecord } from '../../types';
import { saveRestaurantSettings } from '../../services/staffService';
import { uploadOptimizedImages, deleteStorageImage } from '../../services/storageService';
import { applyWebsiteBrandingToDocument } from '../../utils/branding';
import { AVAILABLE_FONTS } from '../../utils/fontList';
import { AdminAccountsManagement } from './AdminAccountsManagement';
import {
  subscribeToCustomerEmails,
  deleteCustomerEmail,
  clearAllCustomerEmails
} from '../../services/customerEmailService';
import {
  isQuotaExhausted,
  isQuotaTestMode,
  setQuotaTestMode,
  resetQuotaStatus
} from '../../services/quotaService';
import { triggerHaptic } from '../../utils/haptics';

interface PaymentSettingsProps {
  settings: RestaurantSettings;
  onUpdate: (settings: RestaurantSettings) => void;
}

type SettingsSection = 'website' | 'payments' | 'delivery' | 'emails' | 'security';

export const PaymentSettings = React.memo<PaymentSettingsProps>(({ settings, onUpdate }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('website');

  const [fssaiLicenseNumber, setFssaiLicenseNumber] = useState(
    settings.fssaiLicenseNumber || '20426191000010'
  );

  const [isEmailMandatory, setIsEmailMandatory] = useState<boolean>(
    settings.isEmailMandatory === true
  );
  const [enableEmailNotifications, setEnableEmailNotifications] = useState<boolean>(
    settings.enableEmailNotifications !== false
  );
  const [senderEmail, setSenderEmail] = useState(settings.senderEmail || '');
  const [senderEmailPassword, setSenderEmailPassword] = useState(
    settings.senderEmailPassword || ''
  );
  const [senderName, setSenderName] = useState(
    settings.senderName || settings.restaurantName || 'Gidhaur Bakery'
  );
  const [showPassword, setShowPassword] = useState(false);

  const [emailEventToggles, setEmailEventToggles] = useState({
    notifyOrderPlaced: settings.emailEventToggles?.notifyOrderPlaced === true,
    notifyOrderConfirmed: settings.emailEventToggles?.notifyOrderConfirmed !== false,
    notifyKitchenSent: settings.emailEventToggles?.notifyKitchenSent === true,
    notifyOutForDelivery: settings.emailEventToggles?.notifyOutForDelivery !== false,
    notifyDelivered: settings.emailEventToggles?.notifyDelivered !== false,
    notifyCancellationAccepted: settings.emailEventToggles?.notifyCancellationAccepted !== false,
    notifyCancellationDeclined: settings.emailEventToggles?.notifyCancellationDeclined !== false,
  });

  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [customerEmailsList, setCustomerEmailsList] = useState<CustomerEmailRecord[]>([]);
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [copiedAllEmails, setCopiedAllEmails] = useState(false);
  const [deletingEmailRecord, setDeletingEmailRecord] = useState<CustomerEmailRecord | null>(null);
  const [isClearingAllEmailsConfirm, setIsClearingAllEmailsConfirm] = useState(false);

  const [quotaTestActive, setQuotaTestActive] = useState<boolean>(isQuotaTestMode());
  const [quotaExhaustedActive, setQuotaExhaustedActive] = useState<boolean>(isQuotaExhausted());
  const [quotaResetToast, setQuotaResetToast] = useState<string | null>(null);

  useEffect(() => {
    const handleQuotaChange = () => {
      setQuotaTestActive(isQuotaTestMode());
      setQuotaExhaustedActive(isQuotaExhausted());
    };
    window.addEventListener('swadeep_quota_status_changed', handleQuotaChange);
    return () => window.removeEventListener('swadeep_quota_status_changed', handleQuotaChange);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToCustomerEmails((records) => {
      setCustomerEmailsList(records);
    });
    return () => unsubscribe();
  }, []);

  const [branding, setBranding] = useState<WebsiteBrandingSettings>({
    websiteTitle: settings.websiteTitle || 'Gidhaur Bakery',
    websiteTagline: settings.websiteTagline || 'Freshly Baked Every Morning with Premium Love',
    websiteDescription: settings.websiteDescription || 'Gidhaur Bakery - Order delicious cakes, bakery delicacies, snacks, and beverages directly with quick checkout and live order tracking.',
    faviconUrl: settings.faviconUrl || '',
    searchLogoUrl: settings.searchLogoUrl || settings.faviconUrl || '',
    headerLogoUrl: settings.headerLogoUrl || '',
    headerLogoFit: settings.headerLogoFit || 'contain',
    headerLogoHeight: settings.headerLogoHeight || 38,
    pwaIconUrl: settings.pwaIconUrl || '',
  });

  const [enableOnlinePayment, setEnableOnlinePayment] = useState<boolean>(
    settings.enableOnlinePayment !== false
  );
  const [upiId, setUpiId] = useState(settings.upiId || 'gidhaurbakery@upi');
  const [upiPayeeName, setUpiPayeeName] = useState(settings.upiPayeeName || 'Gidhaur Bakery');

  const [restaurantName] = useState(settings.restaurantName || 'Gidhaur Bakery');
  const [homeScreenMessage] = useState(settings.homeScreenMessage || 'I want to Eat...');
  const [homeHeadlineFont] = useState(settings.homeHeadlineFont || 'Plus Jakarta Sans');
  const [homeHeadlineColor] = useState(settings.homeHeadlineColor || '#0f172a');
  const [homeHeadlineSize] = useState<number>(settings.homeHeadlineSize || 28);
  const [globalTracking] = useState<number>(settings.globalTracking ?? 0.018);
  const [categoryActiveColor] = useState(settings.categoryActiveColor || '#0f172a');
  const [categoryInactiveColor] = useState(settings.categoryInactiveColor || '#64748b');
  const [contactPhone] = useState(settings.contactPhone || '+91 98765 43210');
  const [address] = useState(settings.address || 'Main Road, Gidhaur');
  const [openingHours] = useState(settings.openingHours || '08:00 AM - 10:30 PM (Everyday)');
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(settings.isStoreOpen !== false);
  const [defaultPrepTimeMinutes] = useState<number>(settings.defaultPrepTimeMinutes || 15);
  const [minOrderAmount] = useState<number>(settings.minOrderAmount || 99);

  const [freeDeliveryRadiusKm, setFreeDeliveryRadiusKm] = useState<number>(settings.freeDeliveryRadiusKm || 5);
  const [tier1MaxKm] = useState<number>(settings.tier1MaxKm || 6);
  const [tier1Fee, setTier1Fee] = useState<number>(settings.tier1Fee || 20);
  const [tier2MaxKm] = useState<number>(settings.tier2MaxKm || 8);
  const [tier2Fee, setTier2Fee] = useState<number>(settings.tier2Fee || 20);
  const [beyondTier2PerKmFee] = useState<number>(settings.beyondTier2PerKmFee || 0);

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'navbar' | 'browser' | 'google' | 'phone'>('navbar');
  const [previewAmount, setPreviewAmount] = useState('249');

  const headerLogoInputRef = useRef<HTMLInputElement>(null);
  const websiteLogoInputRef = useRef<HTMLInputElement>(null);
  const appIconInputRef = useRef<HTMLInputElement>(null);

  const handleUploadHeaderLogo = async (file: File) => {
    try {
      setIsUploadingLogo('headerLogo');
      setError(null);

      const [res] = await uploadOptimizedImages([file], {
        maxWidth: 1000,
        maxHeight: 400,
        quality: 0.95,
        folder: 'branding',
      });

      if (res?.url) {
        const oldUrl = branding.headerLogoUrl;
        if (oldUrl && (oldUrl.includes('firebasestorage.googleapis.com') || oldUrl.includes('/branding/'))) {
          deleteStorageImage(oldUrl).catch((err) =>
            console.warn('Previous header logo storage cleanup note:', err?.message || err)
          );
        }

        setBranding((prev) => ({
          ...prev,
          headerLogoUrl: res.url,
        }));
        setSuccessMessage('Navbar brand logo uploaded.');
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: any) {
      setError(`Failed to upload navbar logo: ${err?.message || err}`);
    } finally {
      setIsUploadingLogo(null);
    }
  };

  const handleRemoveHeaderLogo = async () => {
    const currentUrl = branding.headerLogoUrl;
    if (!currentUrl) return;

    try {
      if (currentUrl.includes('firebasestorage.googleapis.com') || currentUrl.includes('/branding/')) {
        await deleteStorageImage(currentUrl);
      }
      setBranding((prev) => ({
        ...prev,
        headerLogoUrl: '',
      }));
      setSuccessMessage('Navbar logo removed.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setError(`Failed to remove navbar logo: ${err?.message || err}`);
    }
  };

  const handleUploadWebsiteLogo = async (file: File) => {
    try {
      setIsUploadingLogo('websiteLogo');
      setError(null);

      const [res] = await uploadOptimizedImages([file], {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.92,
        folder: 'branding',
        cropMode: 'cover',
      });

      if (res?.url) {
        const oldUrls = [branding.faviconUrl, branding.searchLogoUrl].filter(Boolean);
        for (const oldUrl of oldUrls) {
          if (oldUrl && (oldUrl.includes('firebasestorage.googleapis.com') || oldUrl.includes('/branding/'))) {
            deleteStorageImage(oldUrl).catch((err) =>
              console.warn('Previous website logo storage cleanup note:', err?.message || err)
            );
          }
        }

        try {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = reader.result as string;
            await fetch('/api/update-pwa-icons', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64: base64, imageUrl: res.url }),
            }).catch(() => {});
          };
          reader.readAsDataURL(file);
        } catch (_) {}

        setBranding((prev) => ({
          ...prev,
          faviconUrl: res.url,
          searchLogoUrl: res.url,
        }));
        setSuccessMessage('Website & Google Search logo updated.');
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: any) {
      setError(`Failed to upload website logo: ${err?.message || err}`);
    } finally {
      setIsUploadingLogo(null);
    }
  };

  const handleRemoveWebsiteLogo = async () => {
    const currentUrl = branding.faviconUrl || branding.searchLogoUrl;
    if (!currentUrl) return;

    try {
      if (currentUrl.includes('firebasestorage.googleapis.com') || currentUrl.includes('/branding/')) {
        await deleteStorageImage(currentUrl);
      }
      setBranding((prev) => ({
        ...prev,
        faviconUrl: '',
        searchLogoUrl: '',
      }));
      setSuccessMessage('Website logo removed.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setError(`Failed to remove website logo: ${err?.message || err}`);
    }
  };

  const handleUploadAppIcon = async (file: File) => {
    try {
      setIsUploadingLogo('appIcon');
      setError(null);

      const [res] = await uploadOptimizedImages([file], {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.92,
        folder: 'branding',
        cropMode: 'cover',
      });

      if (res?.url) {
        const oldUrl = branding.pwaIconUrl;
        if (oldUrl && (oldUrl.includes('firebasestorage.googleapis.com') || oldUrl.includes('/branding/'))) {
          deleteStorageImage(oldUrl).catch((err) =>
            console.warn('Previous app icon storage cleanup note:', err?.message || err)
          );
        }

        try {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = reader.result as string;
            await fetch('/api/update-pwa-icons', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64: base64, imageUrl: res.url }),
            }).catch(() => {});
          };
          reader.readAsDataURL(file);
        } catch (_) {}

        setBranding((prev) => ({ ...prev, pwaIconUrl: res.url }));
        setSuccessMessage('Mobile App launcher icon updated.');
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: any) {
      setError(`Failed to upload app icon: ${err?.message || err}`);
    } finally {
      setIsUploadingLogo(null);
    }
  };

  const handleRemoveAppIcon = async () => {
    const currentUrl = branding.pwaIconUrl;
    if (!currentUrl) return;

    try {
      if (currentUrl.includes('firebasestorage.googleapis.com') || currentUrl.includes('/branding/')) {
        await deleteStorageImage(currentUrl);
      }
      setBranding((prev) => ({ ...prev, pwaIconUrl: '' }));
      setSuccessMessage('Mobile App Icon removed.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setError(`Failed to remove app icon: ${err?.message || err}`);
    }
  };

  const handleSendTestEmail = async () => {
    const targetEmail = testEmailRecipient.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setTestEmailFeedback({ type: 'error', text: 'Please enter a valid recipient email address.' });
      return;
    }
    if (!senderEmail.trim() || !senderEmailPassword.trim()) {
      setTestEmailFeedback({
        type: 'error',
        text: 'Please enter your Sender Gmail address and Google App Password above first.'
      });
      return;
    }

    setIsSendingTestEmail(true);
    setTestEmailFeedback(null);
    try {
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: targetEmail,
          settings: {
            ...settings,
            senderEmail: senderEmail.trim(),
            senderEmailPassword: senderEmailPassword.trim(),
            senderName: senderName.trim() || restaurantName.trim() || 'Gidhaur Bakery',
            fssaiLicenseNumber: fssaiLicenseNumber.trim() || '20426191000010',
            restaurantName: restaurantName.trim() || 'Gidhaur Bakery',
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailFeedback({
          type: 'success',
          text: `Test email sent to ${targetEmail}.`
        });
      } else {
        setTestEmailFeedback({
          type: 'error',
          text: data.message || 'Failed to send test email.'
        });
      }
    } catch (err: any) {
      setTestEmailFeedback({
        type: 'error',
        text: err?.message || 'Network error while contacting email server.'
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleCopyAllEmails = () => {
    if (customerEmailsList.length === 0) return;
    const allEmails = Array.from(new Set(customerEmailsList.map((c) => c.email.trim()))).join(', ');
    navigator.clipboard.writeText(allEmails);
    setCopiedAllEmails(true);
    setTimeout(() => setCopiedAllEmails(false), 3000);
  };

  const handleExportCsv = () => {
    if (customerEmailsList.length === 0) return;
    const headers = 'Name,Email,Phone,Total Orders,Last Order Date\n';
    const rows = customerEmailsList
      .map(
        (c) =>
          `"${(c.name || '').replace(/"/g, '""')}","${c.email}","${c.phone || ''}","${c.totalOrders || 1}","${c.lastOrderDate || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `customer_emails_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteCustomerEmail = async (record: CustomerEmailRecord) => {
    try {
      await deleteCustomerEmail(record.id || record.email);
      setCustomerEmailsList((prev) => prev.filter((c) => c.id !== record.id && c.email !== record.email));
      setDeletingEmailRecord(null);
    } catch (err) {
      console.warn('Error deleting customer email:', err);
    }
  };

  const handleClearAllEmails = async () => {
    try {
      await clearAllCustomerEmails();
      setCustomerEmailsList([]);
      setIsClearingAllEmailsConfirm(false);
    } catch (err) {
      console.warn('Error clearing all customer emails:', err);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!upiId.trim() || !upiPayeeName.trim()) {
      setError('UPI ID (VPA) and Business Payee Name are required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const cleanTitle = (branding.websiteTitle && branding.websiteTitle.trim()) || 'Gidhaur Bakery';
      const updated: RestaurantSettings = {
        ...settings,
        ...branding,
        websiteTitle: cleanTitle,
        faviconUrl: branding.faviconUrl || '',
        searchLogoUrl: branding.faviconUrl || '',
        headerLogoUrl: branding.headerLogoUrl || '',
        headerLogoFit: branding.headerLogoFit || 'contain',
        headerLogoHeight: Number(branding.headerLogoHeight) || 38,
        pwaIconUrl: branding.pwaIconUrl || '',
        enableOnlinePayment,
        upiId: upiId.trim(),
        upiPayeeName: upiPayeeName.trim() || 'Gidhaur Bakery',
        restaurantName: restaurantName.trim() || 'Gidhaur Bakery',
        homeScreenMessage: homeScreenMessage.trim() || 'I want to Eat...',
        homeHeadlineFont,
        homeHeadlineColor: homeHeadlineColor.trim() || '#0f172a',
        homeHeadlineSize: Number(homeHeadlineSize) || 28,
        globalTracking: Number(globalTracking) ?? 0.015,
        categoryActiveColor: categoryActiveColor.trim() || '#0f172a',
        categoryInactiveColor: categoryInactiveColor.trim() || '#64748b',
        contactPhone: contactPhone.trim(),
        address: address.trim(),
        openingHours: openingHours.trim(),
        isStoreOpen,
        defaultPrepTimeMinutes: Number(defaultPrepTimeMinutes) || 15,
        minOrderAmount: Number(minOrderAmount) || 99,
        freeDeliveryRadiusKm: Number(freeDeliveryRadiusKm) || 5,
        tier1MaxKm: Number(tier1MaxKm) || 6,
        tier1Fee: Number(tier1Fee) || 20,
        tier2MaxKm: Number(tier2MaxKm) || 8,
        tier2Fee: Number(tier2Fee) || 20,
        beyondTier2PerKmFee: Number(beyondTier2PerKmFee) || 0,
        fssaiLicenseNumber: fssaiLicenseNumber.trim() || '20426191000010',
        isEmailMandatory,
        enableEmailNotifications,
        senderEmail: senderEmail.trim(),
        senderEmailPassword: senderEmailPassword.trim(),
        senderName: senderName.trim() || restaurantName.trim() || 'Gidhaur Bakery',
        emailEventToggles,
      };

      await saveRestaurantSettings(updated);
      try {
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        }).catch(() => {});
      } catch {}
      applyWebsiteBrandingToDocument(updated);
      onUpdate(updated);
      setSuccessMessage('All store settings saved.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeUpiId = upiId.trim() || 'gidhaurbakery@upi';
  const activePayeeName = upiPayeeName.trim() || 'Gidhaur Bakery';
  const sampleUpiUri = `upi://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent(
    activePayeeName
  )}&am=${previewAmount}&tn=Order_Payment&cu=INR`;

  const SECTIONS = [
    {
      id: 'website' as SettingsSection,
      name: 'Website & Logos',
      icon: Globe,
    },
    {
      id: 'payments' as SettingsSection,
      name: 'Payments & UPI',
      icon: CreditCard,
    },
    {
      id: 'delivery' as SettingsSection,
      name: 'Delivery & Coverage',
      icon: Truck,
    },
    {
      id: 'emails' as SettingsSection,
      name: 'Email Notifications',
      icon: Mail,
    },
    {
      id: 'security' as SettingsSection,
      name: 'Staff & Security',
      icon: ShieldCheck,
    },
  ];

  const getSubTabStyle = (id: SettingsSection, isActive: boolean) => {
    switch (id) {
      case 'website':
        return isActive
          ? 'bg-sky-600 text-white border-sky-700 shadow-xs font-extrabold'
          : 'bg-sky-50/60 text-sky-900 border-sky-200/80 hover:bg-sky-100/70 font-semibold';
      case 'payments':
        return isActive
          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs font-extrabold'
          : 'bg-emerald-50/60 text-emerald-900 border-emerald-200/80 hover:bg-emerald-100/70 font-semibold';
      case 'delivery':
        return isActive
          ? 'bg-amber-600 text-white border-amber-700 shadow-xs font-extrabold'
          : 'bg-amber-50/60 text-amber-900 border-amber-200/80 hover:bg-amber-100/70 font-semibold';
      case 'emails':
        return isActive
          ? 'bg-violet-600 text-white border-violet-700 shadow-xs font-extrabold'
          : 'bg-violet-50/60 text-violet-900 border-violet-200/80 hover:bg-violet-100/70 font-semibold';
      case 'security':
        return isActive
          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs font-extrabold'
          : 'bg-indigo-50/60 text-indigo-900 border-indigo-200/80 hover:bg-indigo-100/70 font-semibold';
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header Bar */}
      <div className="rounded-xl bg-gradient-to-r from-sky-50/90 via-white to-indigo-50/60 border border-sky-200/80 p-4 sm:p-5 shadow-sm shadow-sky-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sliders className="w-4 h-4" />
          </div>
          <h2 className="font-extrabold text-sm sm:text-base uppercase tracking-[0.18em] text-sky-950">
            STORE &amp; SYSTEM SETTINGS
          </h2>
        </div>

        <button
          onClick={() => handleSave()}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-[11px] uppercase tracking-[0.12em] border border-indigo-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-sm shadow-indigo-500/15"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'SAVING...' : 'SAVE ALL CHANGES'}</span>
        </button>
      </div>

      {/* Multi-Color Sub-Navigation Bar */}
      <div className="rounded-xl bg-white border border-slate-200/80 p-2.5 shadow-xs overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          {SECTIONS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs uppercase tracking-[0.12em] border transition-colors flex items-center gap-2 cursor-pointer select-none whitespace-nowrap shrink-0 ${getSubTabStyle(
                  tab.id,
                  isActive
                )}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast Feedback */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-2 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-2 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-600 hover:text-rose-900 cursor-pointer p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: WEBSITE INFORMATION, LOGOS & STORE STATUS (SKY & EMERALD THEME) */}
      {/* ========================================================================= */}
      {activeSection === 'website' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Live Store Order Acceptance Status Card */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-50/70 via-white to-sky-50/50 border border-emerald-200/80 p-4 sm:p-5 shadow-sm shadow-emerald-500/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-[0.14em] text-emerald-950">
                STORE ORDER ACCEPTANCE STATUS
              </h4>
              <span
                className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  isStoreOpen
                    ? 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {isStoreOpen ? '● ACCEPTING ORDERS' : '○ STORE PAUSED'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsStoreOpen((prev) => !prev)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.12em] border transition-colors cursor-pointer shrink-0 ${
                isStoreOpen
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
              aria-label="Toggle live store order acceptance"
            >
              {isStoreOpen ? 'OPEN' : 'PAUSED'}
            </button>
          </div>

          {/* 01. Floating Navbar Brand Logo (Wordmark) */}
          <div className="rounded-xl bg-white border border-sky-200/80 shadow-sm shadow-sky-500/5 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sky-100">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-950 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                01. FLOATING NAVBAR BRAND LOGO (HEADER WORDMARK)
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/70">
                WORDMARK
              </span>
            </div>

            {/* Live Interactive Dock Simulation */}
            <div className="p-4 rounded-xl bg-sky-50/40 border border-sky-200/70 space-y-2.5">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-[0.14em] block">
                LIVE PREVIEW:
              </span>

              <div className="rounded-lg bg-white border border-sky-200 px-4 py-2.5 flex items-center justify-between gap-3 max-w-2xl mx-auto overflow-hidden shadow-xs">
                <div className="flex items-center min-w-0 shrink-0">
                  {branding.headerLogoUrl ? (
                    <div
                      className="flex items-center justify-start overflow-hidden transition-all"
                      style={{ height: `${branding.headerLogoHeight || 38}px` }}
                    >
                      <img
                        src={branding.headerLogoUrl}
                        alt="Navbar Wordmark Logo"
                        className={`h-full w-auto max-w-[220px] transition-all ${
                          branding.headerLogoFit === 'cover' ? 'object-cover' : 'object-contain'
                        }`}
                        style={{ height: `${branding.headerLogoHeight || 38}px` }}
                      />
                    </div>
                  ) : (
                    <span className="font-heading font-extrabold text-base sm:text-lg text-slate-950 tracking-tight leading-none select-none">
                      Gidhaur <span className="text-amber-600">Bakery</span>
                    </span>
                  )}
                </div>

                <div className="hidden sm:flex items-center flex-1 max-w-[200px] rounded-md bg-slate-50 border border-slate-200 px-3 py-1 text-slate-400 text-xs gap-1.5 select-none">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">Search...</span>
                </div>

                <div className="flex items-center gap-1.5 select-none shrink-0">
                  <span className="px-2.5 py-1 rounded bg-sky-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    Menu
                  </span>
                </div>
              </div>
            </div>

            {/* Adjustments: Fit vs Fill Mode & Zoom Size Slider */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-sky-50/30 border border-sky-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-sky-900 uppercase tracking-[0.14em] block">
                    DISPLAY MODE
                  </label>
                  <span className="text-[10px] font-mono font-bold text-sky-700">
                    {branding.headerLogoFit === 'cover' ? 'FILL' : 'FIT'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBranding((prev) => ({ ...prev, headerLogoFit: 'contain' }))}
                    className={`py-1.5 px-3 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                      branding.headerLogoFit !== 'cover'
                        ? 'bg-sky-600 text-white border-sky-700'
                        : 'bg-white text-sky-900 border-sky-200 hover:bg-sky-50'
                    }`}
                  >
                    FIT (CONTAIN)
                  </button>

                  <button
                    type="button"
                    onClick={() => setBranding((prev) => ({ ...prev, headerLogoFit: 'cover' }))}
                    className={`py-1.5 px-3 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                      branding.headerLogoFit === 'cover'
                        ? 'bg-sky-600 text-white border-sky-700'
                        : 'bg-white text-sky-900 border-sky-200 hover:bg-sky-50'
                    }`}
                  >
                    FILL (COVER)
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-sky-50/30 border border-sky-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-sky-900 uppercase tracking-[0.14em] block">
                    LOGO HEIGHT
                  </label>
                  <span className="text-[10px] font-mono font-bold text-sky-700">
                    {branding.headerLogoHeight || 38}PX
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setBranding((prev) => ({
                        ...prev,
                        headerLogoHeight: Math.max(22, (prev.headerLogoHeight || 38) - 2),
                      }))
                    }
                    className="w-7 h-7 rounded-md bg-white border border-sky-200 hover:border-sky-500 flex items-center justify-center text-sky-700 cursor-pointer shrink-0"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="range"
                    min="22"
                    max="54"
                    step="2"
                    value={branding.headerLogoHeight || 38}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, headerLogoHeight: Number(e.target.value) }))
                    }
                    className="flex-1 accent-sky-600 cursor-pointer h-1.5 bg-sky-200 rounded-full"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setBranding((prev) => ({
                        ...prev,
                        headerLogoHeight: Math.min(54, (prev.headerLogoHeight || 38) + 2),
                      }))
                    }
                    className="w-7 h-7 rounded-md bg-white border border-sky-200 hover:border-sky-500 flex items-center justify-center text-sky-700 cursor-pointer shrink-0"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center gap-2">
              <input
                type="file"
                ref={headerLogoInputRef}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadHeaderLogo(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => headerLogoInputRef.current?.click()}
                disabled={isUploadingLogo === 'headerLogo'}
                className="flex-1 py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold text-[11px] uppercase tracking-[0.12em] flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {isUploadingLogo === 'headerLogo'
                    ? 'UPLOADING...'
                    : branding.headerLogoUrl
                    ? 'REPLACE NAVBAR LOGO'
                    : 'UPLOAD NAVBAR LOGO'}
                </span>
              </button>
              {branding.headerLogoUrl && (
                <button
                  type="button"
                  onClick={() => handleRemoveHeaderLogo()}
                  className="p-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                  title="Remove Logo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 02 & 03: Website Favicon + Mobile PWA Icon Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 02. Website & Google Search Logo */}
            <div className="rounded-xl bg-white border border-indigo-200/80 shadow-sm shadow-indigo-500/5 p-4 sm:p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-indigo-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    02. WEBSITE &amp; GOOGLE SEARCH LOGO
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/70">
                    1:1 SQUARE
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-indigo-50/40 border border-indigo-200/70 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-white border border-indigo-200 flex items-center justify-center overflow-hidden shrink-0">
                    {branding.faviconUrl ? (
                      <img
                        src={branding.faviconUrl}
                        alt="Website Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Globe className="w-5 h-5 text-indigo-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-indigo-600/80 block uppercase tracking-wider">
                      STATUS
                    </span>
                    <span className="text-xs font-bold text-indigo-950 block truncate">
                      {branding.faviconUrl ? 'CUSTOM FAVICON ACTIVE' : 'DEFAULT ICON'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="file"
                  ref={websiteLogoInputRef}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadWebsiteLogo(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => websiteLogoInputRef.current?.click()}
                  disabled={isUploadingLogo === 'websiteLogo'}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-[11px] uppercase tracking-[0.12em] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {isUploadingLogo === 'websiteLogo' ? 'UPLOADING...' : 'UPLOAD WEBSITE LOGO'}
                  </span>
                </button>
                {branding.faviconUrl && (
                  <button
                    type="button"
                    onClick={() => handleRemoveWebsiteLogo()}
                    className="p-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                    title="Remove Logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 03. Mobile App Icon (PWA) */}
            <div className="rounded-xl bg-white border border-violet-200/80 shadow-sm shadow-violet-500/5 p-4 sm:p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-violet-100">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-violet-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    03. PWA &amp; MOBILE APP ICONS
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    6 HD ICONS
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-violet-50/40 border border-violet-200/70 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-white border border-violet-200 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={branding.pwaIconUrl || '/icon-192.png?v=3'}
                      alt="PWA Icon"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-violet-600/80 block uppercase tracking-wider">
                      LAUNCHER ICON
                    </span>
                    <span className="text-xs font-bold text-violet-950 block truncate">
                      512×512 · 192×192 · iOS · MASKABLE
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="file"
                  ref={appIconInputRef}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadAppIcon(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => appIconInputRef.current?.click()}
                  disabled={isUploadingLogo === 'appIcon'}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white font-bold text-[11px] uppercase tracking-[0.12em] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {isUploadingLogo === 'appIcon'
                      ? 'COMPILING...'
                      : 'UPLOAD & SYNC 6 ICONS'}
                  </span>
                </button>

                {branding.pwaIconUrl && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAppIcon()}
                    className="p-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer shrink-0"
                    title="Reset to Default"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 04. Live Visual Simulation & SEO Description */}
          <div className="rounded-xl bg-white border border-sky-200/80 shadow-sm shadow-sky-500/5 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sky-100">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-950 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                04. VISUAL SIMULATION &amp; SEO SNIPPET
              </span>

              <div className="inline-flex rounded-lg border border-sky-200 bg-sky-50/50 p-0.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setPreviewTab('navbar')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    previewTab === 'navbar'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-sky-800 hover:text-sky-950'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>NAVBAR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('browser')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    previewTab === 'browser'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-sky-800 hover:text-sky-950'
                  }`}
                >
                  <Laptop className="w-3 h-3" />
                  <span>TAB</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('google')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    previewTab === 'google'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-sky-800 hover:text-sky-950'
                  }`}
                >
                  <Search className="w-3 h-3" />
                  <span>GOOGLE</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('phone')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    previewTab === 'phone'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-sky-800 hover:text-sky-950'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>APP TILE</span>
                </button>
              </div>
            </div>

            {previewTab === 'navbar' && (
              <div className="p-4 rounded-xl bg-sky-50/30 border border-sky-200/70 flex items-center justify-center">
                <div className="w-full max-w-2xl rounded-lg bg-white border border-sky-200 px-4 py-2.5 flex items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center shrink-0">
                    {branding.headerLogoUrl ? (
                      <div
                        className="flex items-center justify-start overflow-hidden"
                        style={{ height: `${branding.headerLogoHeight || 38}px` }}
                      >
                        <img
                          src={branding.headerLogoUrl}
                          alt="Navbar Logo Preview"
                          className={`h-full w-auto max-w-[240px] ${
                            branding.headerLogoFit === 'cover' ? 'object-cover' : 'object-contain'
                          }`}
                          style={{ height: `${branding.headerLogoHeight || 38}px` }}
                        />
                      </div>
                    ) : (
                      <span className="font-heading font-extrabold text-lg text-slate-950">
                        Gidhaur <span className="text-amber-600">Bakery</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 select-none shrink-0">
                    <span className="px-3 py-1 rounded bg-sky-600 text-white text-[10px] font-bold uppercase">
                      Menu
                    </span>
                    <span className="px-3 py-1 rounded bg-sky-50 text-sky-900 border border-sky-200 text-[10px] font-bold uppercase">
                      Cart (0)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'browser' && (
              <div className="bg-slate-200/80 rounded-xl p-2 font-sans select-none border border-slate-300">
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-t-lg bg-white text-slate-900 text-xs font-medium shrink-0 border-t-2 border-sky-600 min-w-[200px]">
                    {branding.faviconUrl ? (
                      <div className="w-4 h-4 rounded overflow-hidden shrink-0">
                        <img src={branding.faviconUrl} alt="Favicon" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        G
                      </div>
                    )}
                    <span className="truncate font-bold text-slate-900">Gidhaur Bakery</span>
                    <X className="w-3 h-3 text-slate-400 shrink-0 ml-auto" />
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'google' && (
              <div className="bg-sky-50/30 rounded-xl p-4 border border-sky-200/70 max-w-xl font-sans">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-6 h-6 rounded-full bg-white border border-sky-200 flex items-center justify-center overflow-hidden shrink-0">
                    {branding.faviconUrl ? (
                      <img src={branding.faviconUrl} alt="Search Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-sky-900">G</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 block leading-tight truncate">
                      Gidhaur Bakery
                    </span>
                  </div>
                </div>
                <h5 className="text-indigo-700 font-bold text-sm leading-snug">
                  Gidhaur Bakery
                </h5>
                <div className="text-xs text-slate-600 mt-1 line-clamp-2">
                  {branding.websiteDescription || 'Gidhaur Bakery - Order delicious cakes, bakery delicacies, snacks, and beverages directly.'}
                </div>
              </div>
            )}

            {previewTab === 'phone' && (
              <div className="p-5 rounded-xl bg-sky-50/30 border border-sky-200/70 flex items-center justify-center text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-sky-200 shadow-sm">
                    {branding.pwaIconUrl || branding.faviconUrl ? (
                      <img
                        src={branding.pwaIconUrl || branding.faviconUrl}
                        alt="PWA Tile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-sky-600 text-white flex items-center justify-center font-bold text-lg">
                        GB
                      </div>
                    )}
                  </div>
                  <span className="text-slate-900 text-xs font-bold truncate max-w-[100px]">
                    Gidhaur Bakery
                  </span>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-sky-100">
              <label className="block text-[10px] font-bold text-sky-900/70 uppercase tracking-[0.14em] mb-1.5">
                WEBSITE SEO DESCRIPTION (GOOGLE SEARCH SNIPPET)
              </label>
              <textarea
                rows={2}
                value={branding.websiteDescription || ''}
                onChange={(e) => setBranding((prev) => ({ ...prev, websiteDescription: e.target.value }))}
                placeholder="Gidhaur Bakery - Order delicious cakes, bakery delicacies, snacks, and beverages..."
                className="w-full px-3.5 py-2 rounded-lg bg-sky-50/20 border border-sky-200 focus:bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>
          </div>

          {/* 05. Official FSSAI License Number Configuration Card */}
          <div className="p-4 sm:p-5 rounded-xl bg-white border border-amber-200/80 shadow-sm shadow-amber-500/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-100">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-950 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                05. OFFICIAL FSSAI FOOD SAFETY LICENSE
              </span>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-50/70 border border-amber-200 select-none shrink-0">
                <span className="font-black text-xs tracking-tight text-amber-800 lowercase">
                  fssai
                </span>
                <div className="h-3 w-px bg-amber-200" />
                <span className="font-mono font-bold text-xs text-amber-950">
                  {fssaiLicenseNumber || '20426191000010'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-amber-900/70 uppercase tracking-[0.14em] mb-1.5">
                14-DIGIT FSSAI LICENSE NUMBER *
              </label>
              <input
                type="text"
                value={fssaiLicenseNumber}
                onChange={(e) => setFssaiLicenseNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 14))}
                placeholder="20426191000010"
                maxLength={14}
                className="w-full max-w-md px-3.5 py-2 rounded-lg bg-amber-50/20 border border-amber-200 focus:bg-white text-xs font-mono font-extrabold text-slate-900 tracking-wider focus:outline-none focus:border-amber-500"
                id="fssai-license-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: PAYMENTS & UPI */}
      {/* ========================================================================= */}
      {activeSection === 'payments' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="bg-white rounded-xl border border-emerald-200/80 shadow-sm shadow-emerald-500/5 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-950">
                PAYMENT COLLECTION &amp; UPI QR SETUP
              </span>
            </div>

            <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
              enableOnlinePayment
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${
                enableOnlinePayment ? 'text-emerald-950' : 'text-slate-700'
              }`}>
                ENABLE ONLINE UPI PAYMENT AT CHECKOUT
              </span>

              <button
                type="button"
                onClick={() => setEnableOnlinePayment((prev) => !prev)}
                className={`px-3.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                  enableOnlinePayment
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
                    : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {enableOnlinePayment ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-[0.14em] mb-1.5">
                  MERCHANT UPI ID (VPA) *
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. gidhaurbakery@upi"
                  className="w-full px-3.5 py-2 rounded-lg bg-emerald-50/20 border border-emerald-200 focus:bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-[0.14em] mb-1.5">
                  BUSINESS / PAYEE DISPLAY NAME *
                </label>
                <input
                  type="text"
                  value={upiPayeeName}
                  onChange={(e) => setUpiPayeeName(e.target.value)}
                  placeholder="Gidhaur Bakery"
                  className="w-full px-3.5 py-2 rounded-lg bg-emerald-50/20 border border-emerald-200 focus:bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 flex flex-col sm:flex-row items-center gap-5">
              <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-sm shrink-0">
                <QRCodeSVG
                  value={sampleUpiUri}
                  size={112}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="space-y-2 text-center sm:text-left min-w-0">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-[0.14em] block">
                  LIVE QR CODE VERIFICATION TEST
                </span>
                <h5 className="font-mono font-extrabold text-sm text-emerald-950">
                  {activePayeeName} ({activeUpiId})
                </h5>

                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">TEST AMOUNT: ₹</span>
                  <input
                    type="number"
                    value={previewAmount}
                    onChange={(e) => setPreviewAmount(e.target.value)}
                    className="w-24 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: DELIVERY & COVERAGE */}
      {/* ========================================================================= */}
      {activeSection === 'delivery' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="bg-white rounded-xl border border-amber-200/80 shadow-sm shadow-amber-500/5 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-950">
                DELIVERY RANGE &amp; DISTANCE TIER CHARGES
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800 block">
                  01. FREE DELIVERY RADIUS
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={freeDeliveryRadiusKm}
                    onChange={(e) => setFreeDeliveryRadiusKm(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-emerald-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs font-mono font-bold text-emerald-700">KM</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800 block">
                  02. TIER 1 ({freeDeliveryRadiusKm} TO {tier1MaxKm} KM)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-700">₹</span>
                  <input
                    type="number"
                    value={tier1Fee}
                    onChange={(e) => setTier1Fee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-amber-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-800 block">
                  03. TIER 2 ({tier1MaxKm} TO {tier2MaxKm} KM)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-700">₹</span>
                  <input
                    type="number"
                    value={tier2Fee}
                    onChange={(e) => setTier2Fee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-indigo-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: EMAIL NOTIFICATIONS & CUSTOMER DIRECTORY                       */}
      {/* ========================================================================= */}
      {activeSection === 'emails' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Card 1: Sender Gmail & Checkout Rules */}
          <div className="bg-white rounded-xl border border-violet-200/80 shadow-sm shadow-violet-500/5 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-violet-100">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-violet-950">
                01. GMAIL SENDER CONFIGURATION &amp; CHECKOUT POLICY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                enableEmailNotifications
                  ? 'bg-violet-50/50 border-violet-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  enableEmailNotifications ? 'text-violet-950' : 'text-slate-700'
                }`}>
                  REAL-TIME ORDER EMAILS
                </span>
                <button
                  type="button"
                  onClick={() => setEnableEmailNotifications((prev) => !prev)}
                  className={`px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                    enableEmailNotifications
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/20'
                      : 'bg-white text-slate-600 border-slate-300'
                  }`}
                  id="toggle-email-notifications-btn"
                >
                  {enableEmailNotifications ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                isEmailMandatory
                  ? 'bg-indigo-50/50 border-indigo-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  isEmailMandatory ? 'text-indigo-950' : 'text-slate-700'
                }`}>
                  MANDATORY EMAIL AT CHECKOUT
                </span>
                <button
                  type="button"
                  onClick={() => setIsEmailMandatory((prev) => !prev)}
                  className={`px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                    isEmailMandatory
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                      : 'bg-white text-slate-600 border-slate-300'
                  }`}
                  id="toggle-mandatory-email-btn"
                >
                  {isEmailMandatory ? 'REQUIRED' : 'OPTIONAL'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-violet-800 uppercase tracking-[0.14em] mb-1.5">
                  SENDER GMAIL ADDRESS *
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="yourbakery@gmail.com"
                  className="w-full px-3.5 py-2 rounded-lg bg-violet-50/20 border border-violet-200 focus:bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-violet-500"
                  id="sender-gmail-input"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-violet-800 uppercase tracking-[0.14em] mb-1.5">
                  GOOGLE APP PASSWORD (16 CHARS) *
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={senderEmailPassword}
                    onChange={(e) => setSenderEmailPassword(e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full pl-3.5 pr-9 py-2 rounded-lg bg-violet-50/20 border border-violet-200 focus:bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-violet-500"
                    id="sender-app-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 text-violet-400 hover:text-violet-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-violet-800 uppercase tracking-[0.14em] mb-1.5">
                  SENDER DISPLAY NAME
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Gidhaur Bakery"
                  className="w-full px-3.5 py-2 rounded-lg bg-violet-50/20 border border-violet-200 focus:bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-violet-500"
                  id="sender-display-name-input"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-violet-50/40 border border-violet-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-950">
                INSTANT LIVE TEST EMAIL
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="Enter recipient email"
                  className="w-56 px-3 py-1.5 rounded-lg bg-white border border-violet-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-violet-500"
                  id="test-email-recipient-input"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTestEmail}
                  className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] shadow-sm shadow-violet-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                  id="send-test-email-btn"
                >
                  {isSendingTestEmail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isSendingTestEmail ? 'SENDING...' : 'SEND TEST'}</span>
                </button>
              </div>
            </div>

            {testEmailFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                  testEmailFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testEmailFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testEmailFeedback.text}</span>
              </div>
            )}
          </div>

          {/* Card 2: Notification Events Control */}
          <div className="bg-white rounded-xl border border-indigo-200/80 shadow-sm shadow-indigo-500/5 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-indigo-950">
                02. NOTIFICATION EVENTS CONTROL (7 MILESTONES)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { key: 'notifyOrderPlaced', label: '01. ORDER PLACED (RECEIPT)' },
                { key: 'notifyOrderConfirmed', label: '02. ORDER CONFIRMED BY STORE' },
                { key: 'notifyKitchenSent', label: '03. ORDER IN PREPARATION' },
                { key: 'notifyOutForDelivery', label: '04. OUT FOR DELIVERY' },
                { key: 'notifyDelivered', label: '05. ORDER DELIVERED' },
                { key: 'notifyCancellationAccepted', label: '06. CANCELLATION ACCEPTED' },
                { key: 'notifyCancellationDeclined', label: '07. CANCELLATION DECLINED' },
              ].map((item) => {
                const isOn = (emailEventToggles as any)[item.key];
                return (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      isOn
                        ? 'bg-indigo-50/40 border-indigo-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className={`text-[11px] font-bold uppercase tracking-wider pr-2 ${
                      isOn ? 'text-indigo-950' : 'text-slate-600'
                    }`}>
                      {item.label}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEmailEventToggles((prev) => ({
                          ...prev,
                          [item.key]: !(prev as any)[item.key],
                        }))
                      }
                      className={`px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors shrink-0 ${
                        isOn
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-500 border-slate-300'
                      }`}
                    >
                      {isOn ? 'ON' : 'OFF'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Customer Email Audience Directory */}
          <div className="bg-white rounded-xl border border-sky-200/80 shadow-sm shadow-sky-500/5 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sky-100">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-950">
                  03. CUSTOMER EMAIL DIRECTORY
                </span>
                <span className="text-[10px] font-mono font-bold bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-md border border-sky-200">
                  {customerEmailsList.length} CONTACTS
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyAllEmails}
                  disabled={customerEmailsList.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-[10px] uppercase tracking-wider border border-sky-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  id="copy-all-customer-emails-btn"
                >
                  {copiedAllEmails ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedAllEmails ? 'COPIED' : 'COPY ALL (BCC)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={customerEmailsList.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  id="export-customer-emails-csv-btn"
                >
                  <Download className="w-3 h-3" />
                  <span>EXPORT CSV</span>
                </button>

                {customerEmailsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsClearingAllEmailsConfirm(true)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] uppercase tracking-wider border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    id="clear-all-customer-emails-btn"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>CLEAR ALL</span>
                  </button>
                )}
              </div>
            </div>

            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-sky-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={emailSearchQuery}
                onChange={(e) => setEmailSearchQuery(e.target.value)}
                placeholder="Filter by customer name, email, or phone..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-sky-50/20 border border-sky-200 focus:bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500"
                id="search-customer-emails-input"
              />
            </div>

            {customerEmailsList.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl bg-sky-50/30 border border-sky-100 space-y-2">
                <div className="w-9 h-9 rounded-lg bg-white border border-sky-200 flex items-center justify-center text-sky-400 mx-auto">
                  <Mail className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-sky-900">
                  NO CUSTOMER EMAILS YET
                </h4>
              </div>
            ) : (
              <div className="divide-y divide-sky-100 rounded-xl border border-sky-200/80 overflow-hidden">
                {customerEmailsList
                  .filter((record) => {
                    const q = emailSearchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      record.email.toLowerCase().includes(q) ||
                      (record.name && record.name.toLowerCase().includes(q)) ||
                      (record.phone && record.phone.includes(q))
                    );
                  })
                  .map((record) => (
                    <div
                      key={record.id || record.email}
                      className="p-3 bg-white hover:bg-sky-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-900 border border-sky-200 font-mono font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                          {(record.name || record.email)[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {record.name || 'Customer'}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {record.totalOrders || 1} ORDERS
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 flex-wrap">
                            <a
                              href={`mailto:${record.email}`}
                              className="text-sky-800 hover:underline font-semibold"
                            >
                              {record.email}
                            </a>
                            {record.phone && (
                              <>
                                <span>·</span>
                                <span>{record.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <a
                          href={`mailto:${record.email}?subject=${encodeURIComponent(`Special Offer from ${restaurantName || 'Gidhaur Bakery'}`)}`}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-[10px] font-bold uppercase tracking-wider border border-sky-200 transition-colors"
                        >
                          EMAIL
                        </a>
                        <button
                          type="button"
                          onClick={() => setDeletingEmailRecord(record)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          title="Delete customer from directory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: STAFF & SECURITY */}
      {/* ========================================================================= */}
      {activeSection === 'security' && (
        <div className="space-y-5 animate-fadeIn">
          <AdminAccountsManagement />

          {/* Database & Daily Quota Safeguards Card */}
          <div className="bg-white rounded-xl border border-indigo-200/80 shadow-sm shadow-indigo-500/5 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-indigo-950">
                DAILY LIMIT &amp; WHATSAPP CHECKOUT FALLBACK
              </span>

              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${
                  quotaExhaustedActive
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
              >
                {quotaExhaustedActive ? 'LIMIT FULL (WHATSAPP ACTIVE)' : 'NORMAL BOOKING ACTIVE'}
              </span>
            </div>

            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors ${
              quotaTestActive
                ? 'bg-amber-50/50 border-amber-200'
                : 'bg-indigo-50/30 border-indigo-100'
            }`}>
              <span className="font-bold text-xs uppercase tracking-wider text-slate-900">
                SIMULATE DAILY LIMIT FULL (TEST WHATSAPP FALLBACK)
              </span>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  const nextVal = !quotaTestActive;
                  setQuotaTestMode(nextVal);
                  setQuotaTestActive(nextVal);
                  setQuotaExhaustedActive(isQuotaExhausted());
                }}
                className={`px-3.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                  quotaTestActive
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-500/20'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
                role="switch"
                aria-checked={quotaTestActive}
              >
                {quotaTestActive ? 'SIMULATION ON' : 'SIMULATION OFF'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <span className="text-xs font-mono text-slate-600">
                FALLBACK WHATSAPP:{' '}
                <strong className="text-indigo-950">
                  {contactPhone || '+91 98765 43210'}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  resetQuotaStatus();
                  setQuotaTestActive(false);
                  setQuotaExhaustedActive(false);
                  setQuotaResetToast('✓ Daily quota status reset to normal.');
                  setTimeout(() => setQuotaResetToast(null), 3000);
                }}
                className="px-4 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors cursor-pointer"
              >
                RESET QUOTA STATUS
              </button>
            </div>

            {quotaResetToast && (
              <div className="text-xs font-mono font-bold text-emerald-700">{quotaResetToast}</div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Delete Single Customer Email Confirmation */}
      {deletingEmailRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-rose-200 shadow-2xl shadow-rose-500/10 max-w-sm w-full p-5 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600 block">
                CONFIRM REMOVAL
              </span>
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900">
                REMOVE {deletingEmailRecord.email}?
              </h3>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEmailRecord(null)}
                className="flex-1 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-[0.1em] transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCustomerEmail(deletingEmailRecord)}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] shadow-sm shadow-rose-500/20 transition-colors cursor-pointer"
                id="confirm-delete-customer-email-btn"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Clear All Customer Emails Confirmation */}
      {isClearingAllEmailsConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-rose-200 shadow-2xl shadow-rose-500/10 max-w-sm w-full p-5 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600 block">
                CONFIRM CLEAR ALL
              </span>
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900">
                CLEAR ALL {customerEmailsList.length} CUSTOMER EMAILS?
              </h3>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearingAllEmailsConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-[0.1em] transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleClearAllEmails}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] uppercase tracking-[0.1em] shadow-sm shadow-rose-500/20 transition-colors cursor-pointer"
                id="confirm-clear-all-customer-emails-btn"
              >
                CLEAR ALL ({customerEmailsList.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

PaymentSettings.displayName = 'PaymentSettings';
