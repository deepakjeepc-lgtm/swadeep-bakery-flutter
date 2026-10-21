import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HardDrive,
  RefreshCw,
  CheckCircle2,
  Image as ImageIcon,
  Cloud,
  Check
} from 'lucide-react';
import { Product } from '../../types';
import {
  getStorageUsage,
  getInitialStorageUsage,
  StorageUsageStats
} from '../../services/storageUsageService';
import { triggerHaptic } from '../../utils/haptics';

interface CloudStorageMeterProps {
  products: Product[];
}

export const CloudStorageMeter = React.memo<CloudStorageMeterProps>(({ products }) => {
  const [stats, setStats] = useState<StorageUsageStats>(() => getInitialStorageUsage(products));
  const [isScanning, setIsScanning] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setStats((prev) => {
      const updated = getInitialStorageUsage(products);
      return {
        ...updated,
        cloudPhotosCount: Math.max(prev.cloudPhotosCount, updated.cloudPhotosCount),
        usedBytes: Math.max(prev.usedBytes, updated.usedBytes),
        usedFormatted: prev.usedBytes > updated.usedBytes ? prev.usedFormatted : updated.usedFormatted,
      };
    });
  }, [products]);

  const refreshStorage = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    setJustRefreshed(false);
    triggerHaptic('light');

    try {
      const result = await getStorageUsage(products);
      if (isMountedRef.current) {
        setStats(result);
        setJustRefreshed(true);
        triggerHaptic('success');
        setTimeout(() => {
          if (isMountedRef.current) setJustRefreshed(false);
        }, 2500);
      }
    } catch (e) {
      console.warn('Storage refresh error caught:', e);
    } finally {
      if (isMountedRef.current) {
        setIsScanning(false);
      }
    }
  }, [products, isScanning]);

  const barColor =
    stats.status === 'critical'
      ? 'bg-rose-600'
      : stats.status === 'warning'
      ? 'bg-amber-500'
      : 'bg-gradient-to-r from-sky-500 to-indigo-600';

  const trackFillWidth = Math.max(stats.percentUsed, 1.5);

  return (
    <div className="bg-white rounded-xl border border-sky-200/80 p-4 sm:p-5 space-y-4 shadow-sm shadow-sky-500/5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-extrabold text-sm uppercase tracking-[0.14em] text-slate-900">
              STORAGE USAGE METER
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 uppercase">
              <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
              {stats.percentUsed < 1 ? '< 1% USED' : `${stats.percentUsed}% USED`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={refreshStorage}
            disabled={isScanning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-[0.1em] transition-colors cursor-pointer disabled:opacity-70 ${
              justRefreshed
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-sky-50/70 hover:bg-sky-100 border-sky-200 text-sky-800'
            }`}
          >
            {justRefreshed ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                <span>UPDATED</span>
              </>
            ) : (
              <>
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-sky-700' : 'text-sky-600'}`} />
                <span>{isScanning ? 'SCANNING...' : 'REFRESH'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-sky-50/50 rounded-xl border border-sky-200/80 p-3 flex items-center justify-between sm:flex-col sm:items-start sm:justify-center gap-1">
          <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-sky-700">
            STORAGE USED
          </span>
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-sm font-extrabold text-sky-950">{stats.usedFormatted}</span>
            <span className="text-[11px] text-sky-700/80">/ 5.0 GB</span>
          </div>
        </div>

        <div className="bg-emerald-50/50 rounded-xl border border-emerald-200/80 p-3 flex items-center justify-between sm:flex-col sm:items-start sm:justify-center gap-1">
          <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-emerald-700 flex items-center gap-1">
            <Cloud className="w-3 h-3 text-emerald-600" />
            <span>REMAINING FREE</span>
          </span>
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-sm font-extrabold text-emerald-950">{stats.remainingFormatted}</span>
            <span className="text-[11px] text-emerald-700/80">({stats.remainingPercent}%)</span>
          </div>
        </div>

        <div className="bg-violet-50/50 rounded-xl border border-violet-200/80 p-3 flex items-center justify-between sm:flex-col sm:items-start sm:justify-center gap-1">
          <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-violet-700 flex items-center gap-1">
            <ImageIcon className="w-3 h-3 text-violet-600" />
            <span>CLOUD PHOTOS</span>
          </span>
          <div className="flex items-baseline gap-1.5 text-xs font-mono text-violet-800">
            <span className="font-extrabold text-violet-950 text-sm">{stats.cloudPhotosCount}</span>
            <span className="text-[11px] text-violet-700/80">· {stats.totalMenuPhotos} total</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="w-full h-2.5 rounded-full bg-sky-50 overflow-hidden border border-sky-200/70">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
            style={{ width: `${trackFillWidth}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono text-slate-500 uppercase">
          <span>0% (0 MB)</span>
          <span className="text-sky-700 font-bold hidden sm:inline-block">
            {stats.remainingFormatted} AVAILABLE
          </span>
          <span>100% (5.0 GB)</span>
        </div>
      </div>
    </div>
  );
});

CloudStorageMeter.displayName = 'CloudStorageMeter';
