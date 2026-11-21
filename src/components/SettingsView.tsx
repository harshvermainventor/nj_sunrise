import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderSync,
  HardDrive,
  Link2Off,
  RefreshCw,
  Share2,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ApartmentAvailability,
  ApartmentInfo,
  CrmBackupPayload,
  VisitorProfile,
} from '../types/crm';
import {
  createBackupPayload,
  exportVisitorsToCsv,
  getTodayIsoDate,
  parseAndValidateBackup,
} from '../utils/crmLogic';
import {
  DeviceSyncStatus,
  linkBrowserAutoSyncFile,
  reconnectBrowserAutoSyncFile,
  syncDataToDeviceFile,
  unlinkBrowserAutoSyncFile,
} from '../utils/deviceFileSync';
import { getLastBackupAt, recordBackupExported } from '../utils/storage';
import { triggerFileDownload } from './ReportsView';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SettingsViewProps {
  apartment: ApartmentInfo;
  visitors: VisitorProfile[];
  deviceSyncStatus: DeviceSyncStatus;
  onRefreshSyncStatus: () => void;
  onSaveApartment: (updated: ApartmentInfo) => void;
  onRestoreBackup: (payload: CrmBackupPayload, mode: 'replace' | 'merge') => void;
  onClearAllVisitors: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  apartment,
  visitors,
  deviceSyncStatus,
  onRefreshSyncStatus,
  onSaveApartment,
  onRestoreBackup,
  onClearAllVisitors,
}) => {
  const [aptForm, setAptForm] = useState<ApartmentInfo>(apartment);
  const [aptSaved, setAptSaved] = useState(false);

  const [backupStatus, setBackupStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [pendingBackup, setPendingBackup] = useState<CrmBackupPayload | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => getLastBackupAt());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { isInstallable, isInstalled, install } = usePWAInstall();

  const handleSaveApartment = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApartment({
      ...aptForm,
      updatedAt: new Date().toISOString(),
    });
    setAptSaved(true);
    setTimeout(() => setAptSaved(false), 3000);
  };

  const handleDownloadJsonBackup = () => {
    const payload = createBackupPayload(apartment, visitors);
    triggerFileDownload(
      JSON.stringify(payload, null, 2),
      `apartment-visitor-crm-backup-${getTodayIsoDate()}.json`,
      'application/json'
    );
    setLastBackupAt(recordBackupExported());
    setBackupStatus({
      type: 'success',
      message: `Complete JSON backup exported (${visitors.length} visitor records).`,
    });
  };

  const handleShareOrSaveSafeCopy = async () => {
    const payload = createBackupPayload(apartment, visitors);
    const jsonText = JSON.stringify(payload, null, 2);
    const filename = `apartment-visitor-crm-backup-${getTodayIsoDate()}.json`;

    // 1. Mobile / Android native Share sheet (save directly to Google Drive, Email, or Files)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const file = new File([jsonText], filename, { type: 'application/json' });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Apartment Visitor CRM Backup',
            text: `Backup of ${visitors.length} visitor record(s) for ${apartment.apartmentNumber}.`,
            files: [file],
          });
          setLastBackupAt(recordBackupExported());
          setBackupStatus({
            type: 'success',
            message: 'Backup shared successfully (Google Drive / Email / Files).',
          });
          return;
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    // 2. Desktop File System Access API (pick a specific safe folder such as Google Drive / Documents)
    const win = window as unknown as {
      showSaveFilePicker?: (opts: unknown) => Promise<{
        createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>;
      }>;
    };
    if (typeof win.showSaveFilePicker === 'function') {
      try {
        const handle = await win.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'JSON Backup File',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonText);
        await writable.close();
        setLastBackupAt(recordBackupExported());
        setBackupStatus({
          type: 'success',
          message: `Safe backup saved to your chosen folder (${visitors.length} visitor records).`,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    // 3. Fallback standard download
    handleDownloadJsonBackup();
  };

  const handleLinkBrowserFile = async () => {
    const res = await linkBrowserAutoSyncFile(apartment, visitors);
    onRefreshSyncStatus();
    if (res.ok && res.fileName) {
      setLastBackupAt(recordBackupExported());
      setBackupStatus({
        type: 'success',
        message: `Auto-sync linked to "${res.fileName}". Every change will automatically update this file on your device.`,
      });
    } else if (res.error) {
      setBackupStatus({ type: 'error', message: res.error });
    }
  };

  const handleReconnectBrowserFile = async () => {
    const res = await reconnectBrowserAutoSyncFile(apartment, visitors);
    onRefreshSyncStatus();
    if (res.ok && res.fileName) {
      setLastBackupAt(recordBackupExported());
      setBackupStatus({
        type: 'success',
        message: `Auto-sync resumed for "${res.fileName}".`,
      });
    } else if (res.error) {
      setBackupStatus({ type: 'error', message: res.error });
    }
  };

  const handleSyncNow = async () => {
    const res = await syncDataToDeviceFile(apartment, visitors);
    onRefreshSyncStatus();
    if (res.synced) {
      setLastBackupAt(recordBackupExported());
      setBackupStatus({
        type: 'success',
        message: `Phone local file updated (${res.targetLabel ?? 'Documents folder'}).`,
      });
    } else if (res.error) {
      setBackupStatus({ type: 'error', message: res.error });
    }
  };

  const handleUnlinkBrowserFile = async () => {
    await unlinkBrowserAutoSyncFile();
    onRefreshSyncStatus();
    setBackupStatus({
      type: 'success',
      message: 'Auto-sync file unlinked. Your saved file remains untouched on your device.',
    });
  };

  const handleDownloadCsv = () => {
    const csv = exportVisitorsToCsv(visitors);
    triggerFileDownload(
      csv,
      `apartment-visitors-${getTodayIsoDate()}.csv`,
      'text/csv;charset=utf-8;'
    );
    setBackupStatus({
      type: 'success',
      message: `CSV spreadsheet exported (${visitors.length} visitor rows).`,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const validated = parseAndValidateBackup(text);
      setPendingBackup(validated);
      setBackupStatus(null);
    } catch (err) {
      setBackupStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to parse backup file.',
      });
    } finally {
      e.target.value = '';
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F17] px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none';
  const labelClass = 'block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Single Apartment Details Editor */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Apartment Information
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Version 1 manages your primary apartment with single-property focus.
              </p>
            </div>
          </div>
          {aptSaved && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSaveApartment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="apt-number" className={labelClass}>
                Apartment number
              </label>
              <input
                id="apt-number"
                type="text"
                required
                value={aptForm.apartmentNumber}
                onChange={(e) => setAptForm({ ...aptForm, apartmentNumber: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="apt-floor" className={labelClass}>
                Floor
              </label>
              <input
                id="apt-floor"
                type="text"
                value={aptForm.floor}
                onChange={(e) => setAptForm({ ...aptForm, floor: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="apt-bedrooms" className={labelClass}>
                Number of bedrooms
              </label>
              <input
                id="apt-bedrooms"
                type="number"
                min={0}
                max={20}
                value={aptForm.bedrooms}
                onChange={(e) => setAptForm({ ...aptForm, bedrooms: Number(e.target.value) || 0 })}
                className={`${inputClass} font-mono-num`}
              />
            </div>

            <div>
              <label htmlFor="apt-size" className={labelClass}>
                Property size (optional)
              </label>
              <input
                id="apt-size"
                type="text"
                value={aptForm.sizeSqFt || ''}
                onChange={(e) => setAptForm({ ...aptForm, sizeSqFt: e.target.value })}
                placeholder="e.g. 1,150 sq ft"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="apt-currency" className={labelClass}>
                Currency
              </label>
              <input
                id="apt-currency"
                type="text"
                readOnly
                value="INR (₹)"
                className={`${inputClass} bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 cursor-default`}
              />
            </div>

            <div>
              <label htmlFor="apt-availability" className={labelClass}>
                Availability status
              </label>
              <select
                id="apt-availability"
                value={aptForm.availabilityStatus}
                onChange={(e) =>
                  setAptForm({
                    ...aptForm,
                    availabilityStatus: e.target.value as ApartmentAvailability,
                  })
                }
                className={inputClass}
              >
                <option value="Available">Available</option>
                <option value="Under Negotiation">Under Negotiation</option>
                <option value="Rented">Rented</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label htmlFor="apt-rent" className={labelClass}>
                Expected monthly rent ({aptForm.currency})
              </label>
              <input
                id="apt-rent"
                type="number"
                min={0}
                value={aptForm.expectedMonthlyRent}
                onChange={(e) =>
                  setAptForm({ ...aptForm, expectedMonthlyRent: Number(e.target.value) || 0 })
                }
                className={`${inputClass} font-mono-num`}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="apt-notes" className={labelClass}>
                Additional notes
              </label>
              <textarea
                id="apt-notes"
                rows={2}
                value={aptForm.notes}
                onChange={(e) => setAptForm({ ...aptForm, notes: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Save Apartment Info
            </button>
          </div>
        </form>
      </section>

      {/* Backup & Data Safety */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <HardDrive className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Backup & Data Safety (100% Local & Offline)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All visitor records, apartment settings, and form drafts are automatically saved
              locally in your browser cache (IndexedDB + localStorage + CacheStorage) or inside the
              Android APK&apos;s private app storage. Export a JSON backup anytime to transfer data
              between your browser and the Android APK.
            </p>
          </div>
        </div>

        {backupStatus && (
          <div
            role="status"
            className={`rounded-lg border px-4 py-3 text-xs flex items-center gap-2 ${
              backupStatus.type === 'success'
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
                : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200'
            }`}
          >
            {backupStatus.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{backupStatus.message}</span>
          </div>
        )}

        {/* Auto-Synced Local Phone / Folder File (Survives App Deletion) */}
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <FolderSync className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {deviceSyncStatus.isNativeAndroid
                    ? 'Phone Documents Auto-Sync Active (Survives APK Deletion)'
                    : deviceSyncStatus.targetLabel
                    ? `Auto-Sync Linked: ${deviceSyncStatus.targetLabel}`
                    : 'Auto-Save Local File on Phone / PC (Survives App Deletion)'}
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {deviceSyncStatus.isNativeAndroid ? (
                    <>
                      Every change in the app automatically updates{' '}
                      <code className="font-mono-num px-1 py-0.5 rounded bg-white/80 dark:bg-slate-900">
                        {deviceSyncStatus.targetLabel}
                      </code>{' '}
                      in your phone&apos;s storage. Even if you delete the APK, this file remains in{' '}
                      <strong>Files → Documents → ApartmentVisitorCRM</strong> so you can restore it anytime.
                    </>
                  ) : deviceSyncStatus.targetLabel ? (
                    <>
                      Changes made in the app automatically update{' '}
                      <code className="font-mono-num px-1 py-0.5 rounded bg-white/80 dark:bg-slate-900">
                        {deviceSyncStatus.targetLabel}
                      </code>{' '}
                      on your device. Deleting the app or clearing browser cache will not delete this file.
                    </>
                  ) : (
                    <>
                      Inside the Android APK, data auto-updates directly into{' '}
                      <code className="font-mono-num px-1 py-0.5 rounded bg-white/80 dark:bg-slate-900">
                        Documents/ApartmentVisitorCRM/
                      </code>
                      . In this browser, link a local <code className="font-mono-num">.json</code> file below so any change auto-updates your saved file too.
                    </>
                  )}
                </p>
                {deviceSyncStatus.lastSyncedAt && (
                  <p className="text-[11px] font-mono-num text-emerald-700 dark:text-emerald-400">
                    Last auto-sync: {new Date(deviceSyncStatus.lastSyncedAt).toLocaleString()}
                  </p>
                )}
                {deviceSyncStatus.lastError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400">
                    Sync warning: {deviceSyncStatus.lastError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {deviceSyncStatus.isNativeAndroid ? (
                <button
                  type="button"
                  onClick={() => void handleSyncNow()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Sync Phone File Now
                </button>
              ) : deviceSyncStatus.targetLabel ? (
                <>
                  {deviceSyncStatus.needsPermissionPrompt ? (
                    <button
                      type="button"
                      onClick={() => void handleReconnectBrowserFile()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Reconnect File Access
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleSyncNow()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Sync Now
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleUnlinkBrowserFile()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Link2Off className="h-3.5 w-3.5" aria-hidden="true" />
                    Unlink
                  </button>
                </>
              ) : (
                deviceSyncStatus.supportsBrowserFileHandle && (
                  <button
                    type="button"
                    onClick={() => void handleLinkBrowserFile()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <FolderSync className="h-3.5 w-3.5" aria-hidden="true" />
                    Link Auto-Sync File
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => void handleShareOrSaveSafeCopy()}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Save to Drive / Folder
          </button>

          <button
            type="button"
            onClick={handleDownloadJsonBackup}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download JSON Backup
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Restore from Backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={visitors.length === 0}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Export CSV Spreadsheet
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
            <div>
              Currently storing <strong className="font-mono-num text-slate-900 dark:text-slate-100">{visitors.length}</strong> visitor profile(s) locally.
            </div>
            <div>
              {lastBackupAt ? (
                <span>
                  Last external backup:{' '}
                  <strong className="font-mono-num text-emerald-700 dark:text-emerald-400">
                    {new Date(lastBackupAt).toLocaleString()}
                  </strong>
                </span>
              ) : (
                <span className="text-amber-700 dark:text-amber-400">
                  Tip: Use &ldquo;Save to Drive / Folder&rdquo; periodically so you keep a safe copy outside browser cache.
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmClearAll(true)}
            disabled={visitors.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Clear All Visitor Records
          </button>
        </div>
      </section>

      {/* Android App & APK Guide */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            <Smartphone className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Android Installation & APK Build Source
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Install directly on your Android phone as an offline standalone app, or build a signed APK using the included Capacitor Android project.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {isInstallable && !isInstalled && (
            <div className="p-3.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3">
              <span className="font-medium text-blue-900 dark:text-blue-200">
                Your browser supports instant offline installation with app icon and splash screen.
              </span>
              <button
                type="button"
                onClick={install}
                className="px-3.5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shrink-0"
              >
                Install App Now
              </button>
            </div>
          )}

          <div>
            <strong className="text-slate-900 dark:text-slate-100">Option A — Free Direct Android Install (Works Immediately):</strong>{' '}
            Open the app URL in Chrome on your Android phone (signed into the same Google account), tap the menu (⋮), and select{' '}
            <strong>Install app</strong> / <strong>Add to Home screen</strong>. It installs onto your home screen with its own app icon, splash screen, offline storage, phone dialler links, and WhatsApp shortcuts.
          </div>

          <div>
            <strong className="text-slate-900 dark:text-slate-100">Option B — Free Cloud APK via GitHub Actions (No Android Studio Needed):</strong>{' '}
            Download the project ZIP from AI Studio and upload it to a free GitHub repository (<code className="font-mono-num">main</code> branch).
            The included workflow{' '}
            <code className="font-mono-num px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">.github/workflows/build-android-apk.yml</code>{' '}
            automatically builds and gives you <code className="font-mono-num">app-debug.apk</code> under the repository&apos;s <strong>Actions</strong> tab for free.
          </div>

          <div>
            <strong className="text-slate-900 dark:text-slate-100">Option C — Free Local APK Build (Android Studio + JDK 21):</strong>{' '}
            Using <code className="font-mono-num px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">capacitor.config.ts</code> and{' '}
            <code className="font-mono-num px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">ANDROID_BUILD_GUIDE.md</code>:
            <pre className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-100 font-mono-num text-[11px] overflow-x-auto">
{`npm install
npm run build
npm install --no-save @capacitor/core @capacitor/cli @capacitor/android
npx cap add android && npx cap sync android
cd android && ./gradlew assembleDebug`}
            </pre>
            The generated APK will be output at{' '}
            <code className="font-mono-num">android/app/build/outputs/apk/debug/app-debug.apk</code>.
          </div>
        </div>
      </section>

      {/* Restore Confirmation Modal */}
      {pendingBackup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-6 shadow-xl space-y-4">
            <h3
              id="restore-modal-title"
              className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Restore Backup
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Backup contains{' '}
              <strong className="font-mono-num">{pendingBackup.visitors.length}</strong> visitor
              profile(s) for <strong>{pendingBackup.apartment.apartmentNumber}</strong> (exported{' '}
              <span className="font-mono-num">
                {pendingBackup.exportedAt.slice(0, 10)}
              </span>
              ).
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onRestoreBackup(pendingBackup, 'replace');
                  setAptForm(pendingBackup.apartment);
                  setBackupStatus({
                    type: 'success',
                    message: `Restored ${pendingBackup.visitors.length} visitor records (replaced current data).`,
                  });
                  setPendingBackup(null);
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Replace Current Data with Backup
              </button>
              <button
                type="button"
                onClick={() => {
                  onRestoreBackup(pendingBackup, 'merge');
                  setBackupStatus({
                    type: 'success',
                    message: `Merged backup records with your existing visitors.`,
                  });
                  setPendingBackup(null);
                }}
                className="w-full py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Merge New Records into Existing Data
              </button>
              <button
                type="button"
                onClick={() => setPendingBackup(null)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {confirmClearAll && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-6 shadow-xl space-y-4">
            <h3
              id="clear-modal-title"
              className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Clear All Visitor Records?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This will permanently delete all {visitors.length} visitor profiles and histories from
              this device. Export a JSON backup first if you want to keep a copy.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllVisitors();
                  setConfirmClearAll(false);
                  setBackupStatus({
                    type: 'success',
                    message: 'All visitor records have been cleared.',
                  });
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
