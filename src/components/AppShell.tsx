import React, { useState } from 'react';
import {
  BarChart3,
  Building2,
  CalendarClock,
  Download,
  LayoutDashboard,
  Moon,
  Plus,
  Settings,
  Sun,
  UserPlus,
  Users,
  WifiOff,
} from 'lucide-react';
import { AppView } from '../types/crm';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface AppShellProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  pendingFollowUpCount: number;
  overdueFollowUpCount: number;
  apartmentLabel: string;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: AppView; label: string; mobileLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Home', icon: LayoutDashboard },
  { id: 'register', label: 'Register Visitor', mobileLabel: 'Register', icon: UserPlus },
  { id: 'directory', label: 'Visitor Directory', mobileLabel: 'Visitors', icon: Users },
  { id: 'followups', label: 'Follow-ups', mobileLabel: 'Follow-up', icon: CalendarClock },
  { id: 'reports', label: 'Reports & Analytics', mobileLabel: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Apartment & Backup', mobileLabel: 'Settings', icon: Settings },
];

const VIEW_TITLES: Record<AppView, string> = {
  dashboard: 'Overview',
  register: 'Register Visitor',
  directory: 'Visitor Directory',
  followups: 'Follow-ups',
  reports: 'Reports & Analytics',
  settings: 'Apartment & Data Safety',
};

export const AppShell: React.FC<AppShellProps> = ({
  activeView,
  onNavigate,
  theme,
  onToggleTheme,
  pendingFollowUpCount,
  overdueFollowUpCount,
  apartmentLabel,
  children,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const mobileTabs = NAV_ITEMS.filter((item) => item.id !== 'reports');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#101622]">
        <div className="flex h-16 items-center gap-3 px-5 border-b border-slate-200 dark:border-slate-800/90">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shrink-0">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="block font-display text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
              Apartment Visitor CRM
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
              {apartmentLabel}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'followups' && pendingFollowUpCount > 0 && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 text-[11px] font-mono-num rounded ${
                      overdueFollowUpCount > 0
                        ? 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {pendingFollowUpCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800/90 space-y-2">
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Install Offline App
            </button>
          )}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="w-full flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
          >
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            {theme === 'dark' ? (
              <Moon className="h-4 w-4 text-blue-400" aria-hidden="true" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500" aria-hidden="true" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar (Desktop & Mobile) */}
        <header className="sticky top-0 z-30 h-12 lg:h-16 bg-white/95 dark:bg-[#101622]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/90 px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex lg:hidden h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white shrink-0">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <h1 className="font-display text-base lg:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
              {VIEW_TITLES[activeView]}
            </h1>
            <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500">·</span>
            <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 truncate">
              {apartmentLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={install}
                className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Install
              </button>
            )}
            {!isInstalled && isIOS && (
              <button
                type="button"
                onClick={() => setShowIOSGuide(true)}
                className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap"
              >
                Install
              </button>
            )}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {activeView !== 'register' && (
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Register Visitor</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-7 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (5 tabs, compact 60px height) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-[60px] pb-safe bg-white/95 dark:bg-[#101622]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center"
      >
        {mobileTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center justify-center h-full min-h-[44px] px-1 transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="mt-0.5 text-[10px] font-medium truncate max-w-full">
                {item.mobileLabel}
              </span>
              {item.id === 'followups' && pendingFollowUpCount > 0 && (
                <span className="absolute top-1.5 right-3 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-mono-num flex items-center justify-center">
                  {pendingFollowUpCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Offline Status Pill */}
      {!isOnline && (
        <div
          role="status"
          className="fixed bottom-[72px] lg:bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
        >
          <WifiOff className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
          <span>Offline Mode · Saved locally on device</span>
        </div>
      )}

      {/* iOS Safari Install Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-6 shadow-xl">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Install on iPhone / iPad
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              1. Tap the <strong>Share</strong> icon in Safari.<br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
