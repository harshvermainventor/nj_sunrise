import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/AppShell';
import { DashboardView } from './components/DashboardView';
import { DirectoryView } from './components/DirectoryView';
import { FollowUpsView } from './components/FollowUpsView';
import { RegisterVisitorView } from './components/RegisterVisitorView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { VisitorProfileModal } from './components/VisitorProfileModal';
import {
  ApartmentInfo,
  AppView,
  CrmBackupPayload,
  DEFAULT_APARTMENT_ID,
  FollowUpMethod,
  RegistrationFormInput,
  VisitorProfile,
} from './types/crm';
import {
  categorizeFollowUps,
  createId,
  createVisitorFromRegistration,
  mergeNewVisitIntoVisitor,
  normalizePhone,
} from './utils/crmLogic';
import {
  DeviceSyncStatus,
  getDeviceSyncStatus,
  syncDataToDeviceFile,
  tryAutoRestoreFromNativeDocuments,
} from './utils/deviceFileSync';
import { checkAndTriggerDueFollowUpNotifications } from './utils/notifications';
import {
  applyAndSaveTheme,
  getSavedTheme,
  loadCrmStateAsync,
  loadCrmStateSync,
  saveCrmState,
} from './utils/storage';

export default function App() {
  const initialSync = useMemo(() => loadCrmStateSync(), []);
  const [apartment, setApartment] = useState<ApartmentInfo>(initialSync.apartment);
  const [visitors, setVisitors] = useState<VisitorProfile[]>(initialSync.visitors);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getSavedTheme());
  const [hydrated, setHydrated] = useState(false);
  const [deviceSyncStatus, setDeviceSyncStatus] = useState<DeviceSyncStatus>({
    isNativeAndroid: false,
    supportsBrowserFileHandle: false,
    targetLabel: null,
    lastSyncedAt: null,
    needsPermissionPrompt: false,
    lastError: null,
  });

  // Only sync to external phone/folder file after an actual user change so fresh installs never overwrite older backups
  const hasUserModifiedRef = useRef(false);

  const refreshDeviceSyncStatus = useCallback(async (overrideError?: string | null, overrideNeedsPerm?: boolean) => {
    const status = await getDeviceSyncStatus();
    setDeviceSyncStatus({
      ...status,
      needsPermissionPrompt: overrideNeedsPerm ?? status.needsPermissionPrompt,
      lastError: overrideError ?? null,
    });
  }, []);

  // Hydrate from IndexedDB on mount (offline local storage) & auto-restore from Phone Documents inside APK if empty
  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await loadCrmStateAsync();
      if (!active) return;

      if (loaded.visitors.length === 0) {
        const nativeBackup = await tryAutoRestoreFromNativeDocuments();
        if (!active) return;
        if (nativeBackup && (nativeBackup.visitors.length > 0 || nativeBackup.apartment)) {
          setApartment(nativeBackup.apartment);
          setVisitors(nativeBackup.visitors);
          await saveCrmState({
            apartment: nativeBackup.apartment,
            visitors: nativeBackup.visitors,
          });
          setHydrated(true);
          void refreshDeviceSyncStatus();
          return;
        }
      }

      setApartment(loaded.apartment);
      setVisitors(loaded.visitors);
      setHydrated(true);
      void refreshDeviceSyncStatus();
    })();
    return () => {
      active = false;
    };
  }, [refreshDeviceSyncStatus]);

  // Persist changes locally + auto-update linked external phone/folder file whenever apartment or visitors change
  useEffect(() => {
    if (!hydrated) return;
    void saveCrmState({ apartment, visitors });
    if (hasUserModifiedRef.current) {
      void syncDataToDeviceFile(apartment, visitors).then((res) => {
        void refreshDeviceSyncStatus(res.error ?? null, res.needsPermissionPrompt);
      });
    }
  }, [apartment, visitors, hydrated, refreshDeviceSyncStatus]);

  // Keep HTML theme synced
  useEffect(() => {
    applyAndSaveTheme(theme);
  }, [theme]);

  // Periodically check due local notifications without any external servers
  useEffect(() => {
    if (visitors.length === 0) return;

    const runCheck = async () => {
      const triggeredIds = await checkAndTriggerDueFollowUpNotifications(visitors);
      if (triggeredIds.length > 0) {
        const nowIso = new Date().toISOString();
        setVisitors((prev) =>
          prev.map((v) => ({
            ...v,
            followUps: v.followUps.map((f) =>
              triggeredIds.includes(f.id) ? { ...f, notifiedAt: nowIso } : f
            ),
          }))
        );
      }
    };

    void runCheck();
    const timer = window.setInterval(() => {
      void runCheck();
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [visitors]);

  const selectedVisitor = useMemo(
    () => visitors.find((v) => v.id === selectedVisitorId) ?? null,
    [visitors, selectedVisitorId]
  );

  const followUpCounts = useMemo(() => {
    const cats = categorizeFollowUps(visitors);
    return {
      pending: cats.today.length + cats.upcoming.length + cats.overdue.length,
      overdue: cats.overdue.length,
    };
  }, [visitors]);

  const handleRegisterNew = (input: RegistrationFormInput) => {
    hasUserModifiedRef.current = true;
    const newVisitor = createVisitorFromRegistration(input, apartment.id || DEFAULT_APARTMENT_ID);
    setVisitors((prev) => [newVisitor, ...prev]);
  };

  const handleMergeExisting = (existingVisitorId: string, input: RegistrationFormInput) => {
    hasUserModifiedRef.current = true;
    setVisitors((prev) =>
      prev.map((v) => (v.id === existingVisitorId ? mergeNewVisitIntoVisitor(v, input) : v))
    );
  };

  const handleUpdateVisitorProfile = (
    visitorId: string,
    updates: Partial<VisitorProfile>
  ) => {
    hasUserModifiedRef.current = true;
    const nowIso = new Date().toISOString();
    setVisitors((prev) =>
      prev.map((v) => {
        if (v.id !== visitorId) return v;
        const nextPhone = updates.contactNumber ?? v.contactNumber;
        return {
          ...v,
          ...updates,
          normalizedPhone: normalizePhone(nextPhone),
          updatedAt: nowIso,
        };
      })
    );
  };

  const handleAddComment = (visitorId: string, text: string) => {
    hasUserModifiedRef.current = true;
    const nowIso = new Date().toISOString();
    setVisitors((prev) =>
      prev.map((v) =>
        v.id === visitorId
          ? {
              ...v,
              comments: [
                { id: createId('cmt'), text, type: 'Note', createdAt: nowIso },
                ...v.comments,
              ],
              updatedAt: nowIso,
            }
          : v
      )
    );
  };

  const handleAddFollowUp = (
    visitorId: string,
    scheduledDate: string,
    preferredTime: string,
    method: FollowUpMethod,
    notes: string
  ) => {
    hasUserModifiedRef.current = true;
    const nowIso = new Date().toISOString();
    setVisitors((prev) =>
      prev.map((v) =>
        v.id === visitorId
          ? {
              ...v,
              followUps: [
                {
                  id: createId('fup'),
                  visitorId,
                  apartmentId: v.apartmentId,
                  required: true,
                  scheduledDate,
                  preferredTime,
                  method,
                  notes,
                  status: 'Pending',
                  createdAt: nowIso,
                  updatedAt: nowIso,
                },
                ...v.followUps,
              ],
              updatedAt: nowIso,
            }
          : v
      )
    );
  };

  const handleCompleteFollowUp = (
    visitorId: string,
    followUpId: string,
    comment?: string
  ) => {
    hasUserModifiedRef.current = true;
    const nowIso = new Date().toISOString();
    setVisitors((prev) =>
      prev.map((v) => {
        if (v.id !== visitorId) return v;
        return {
          ...v,
          followUps: v.followUps.map((f) =>
            f.id === followUpId
              ? { ...f, status: 'Completed', completedAt: nowIso, updatedAt: nowIso }
              : f
          ),
          comments: comment
            ? [{ id: createId('cmt'), text: comment, type: 'Follow-up', createdAt: nowIso }, ...v.comments]
            : v.comments,
          updatedAt: nowIso,
        };
      })
    );
  };

  const handleReopenFollowUp = (visitorId: string, followUpId: string) => {
    hasUserModifiedRef.current = true;
    const nowIso = new Date().toISOString();
    setVisitors((prev) =>
      prev.map((v) =>
        v.id === visitorId
          ? {
              ...v,
              followUps: v.followUps.map((f) =>
                f.id === followUpId
                  ? { ...f, status: 'Pending', completedAt: undefined, updatedAt: nowIso }
                  : f
              ),
              updatedAt: nowIso,
            }
          : v
      )
    );
  };

  const handleRescheduleFollowUp = (
    visitorId: string,
    followUpId: string,
    scheduledDate: string,
    preferredTime: string,
    method: FollowUpMethod,
    notes: string
  ) => {
    hasUserModifiedRef.current = true;
    const nowIso = new Date().toISOString();
    setVisitors((prev) =>
      prev.map((v) =>
        v.id === visitorId
          ? {
              ...v,
              followUps: v.followUps.map((f) =>
                f.id === followUpId
                  ? {
                      ...f,
                      scheduledDate,
                      preferredTime,
                      method,
                      notes,
                      notifiedAt: undefined,
                      updatedAt: nowIso,
                    }
                  : f
              ),
              updatedAt: nowIso,
            }
          : v
      )
    );
  };

  const handleDeleteVisitor = (visitorId: string) => {
    hasUserModifiedRef.current = true;
    setVisitors((prev) => prev.filter((v) => v.id !== visitorId));
    if (selectedVisitorId === visitorId) {
      setSelectedVisitorId(null);
    }
  };

  const handleRestoreBackup = (payload: CrmBackupPayload, mode: 'replace' | 'merge') => {
    hasUserModifiedRef.current = true;
    if (mode === 'replace') {
      setApartment(payload.apartment);
      setVisitors(payload.visitors);
    } else {
      setVisitors((prev) => {
        const existingIds = new Set(prev.map((v) => v.id));
        const additions = payload.visitors.filter((v) => !existingIds.has(v.id));
        return [...additions, ...prev];
      });
    }
  };

  return (
    <AppShell
      activeView={activeView}
      onNavigate={setActiveView}
      theme={theme}
      onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      pendingFollowUpCount={followUpCounts.pending}
      overdueFollowUpCount={followUpCounts.overdue}
      apartmentLabel={`${apartment.apartmentNumber} · ${apartment.availabilityStatus}`}
    >
      {activeView === 'dashboard' && (
        <DashboardView
          apartment={apartment}
          visitors={visitors}
          onNavigate={setActiveView}
          onSelectVisitor={(v) => setSelectedVisitorId(v.id)}
        />
      )}

      {activeView === 'register' && (
        <RegisterVisitorView
          visitors={visitors}
          currency={apartment.currency}
          onRegisterNew={handleRegisterNew}
          onMergeExisting={handleMergeExisting}
          onOpenVisitorProfile={(v) => setSelectedVisitorId(v.id)}
        />
      )}

      {activeView === 'directory' && (
        <DirectoryView
          visitors={visitors}
          currency={apartment.currency}
          onSelectVisitor={(v) => setSelectedVisitorId(v.id)}
          onDeleteVisitor={handleDeleteVisitor}
          onNavigateRegister={() => setActiveView('register')}
        />
      )}

      {activeView === 'followups' && (
        <FollowUpsView
          visitors={visitors}
          onSelectVisitor={(v) => setSelectedVisitorId(v.id)}
          onCompleteFollowUp={handleCompleteFollowUp}
          onReopenFollowUp={handleReopenFollowUp}
          onRescheduleFollowUp={handleRescheduleFollowUp}
          onAddComment={handleAddComment}
        />
      )}

      {activeView === 'reports' && (
        <ReportsView apartment={apartment} visitors={visitors} />
      )}

      {activeView === 'settings' && (
        <SettingsView
          apartment={apartment}
          visitors={visitors}
          deviceSyncStatus={deviceSyncStatus}
          onRefreshSyncStatus={() => void refreshDeviceSyncStatus()}
          onSaveApartment={(updated) => {
            hasUserModifiedRef.current = true;
            setApartment(updated);
          }}
          onRestoreBackup={handleRestoreBackup}
          onClearAllVisitors={() => {
            hasUserModifiedRef.current = true;
            setVisitors([]);
          }}
        />
      )}

      {selectedVisitor && (
        <VisitorProfileModal
          visitor={selectedVisitor}
          currency={apartment.currency}
          onClose={() => setSelectedVisitorId(null)}
          onUpdateProfile={handleUpdateVisitorProfile}
          onAddVisit={handleMergeExisting}
          onAddComment={handleAddComment}
          onAddFollowUp={handleAddFollowUp}
          onDeleteVisitor={handleDeleteVisitor}
        />
      )}
    </AppShell>
  );
}
