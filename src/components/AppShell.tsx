import React, { useState } from 'react';
import {
  BarChart3,
  Building2,
  CalendarClock,
  Download,
  Globe,
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
  { id: 'public-portal', label: 'Public Internet Listing', mobileLabel: 'Public', icon: Globe },
  { id: 'settings', label: 'Apartment & Backup', mobileLabel: 'Settings', icon: Settings },
];

const VIEW_TITLES: Record<AppView, string> = {
  dashboard: 'Overview',
  register: 'Register Visitor',
  directory: 'Visitor Directory',
  followups: 'Follow-ups',
  reports: 'Reports & Analytics',
  settings: 'Apartment & Data Safety',
  'public-portal': 'Public Internet Listing',
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
    <div className="min-h-screen bg-[#F5F6F8] text-zinc-900 dark:bg-[#09090B] dark:text-zinc-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114]">
        <div className="flex h-16 items-center gap-3 px-5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shrink-0">
            <Building2 className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="block font-display text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-50 truncate">
              Apartment Visitor CRM
            </span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400 truncate">
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-950 font-semibold dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 font-medium hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'followups' && pendingFollowUpCount > 0 && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 text-[11px] font-mono-num font-semibold rounded-md ${
                      overdueFollowUpCount > 0
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'
                    }`}
                  >
                    {pendingFollowUpCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Install Offline App
            </button>
          )}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="w-full flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            {theme === 'dark' ? (
              <Moon className="h-4 w-4 text-zinc-300" aria-hidden="true" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500" aria-hidden="true" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar (Desktop & Mobile) */}
        <header className="sticky top-0 z-30 h-14 lg:h-16 bg-white dark:bg-[#111114] border-b border-zinc-200 dark:border-zinc-800 px-4 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shrink-0">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <h1 className="font-display text-base lg:text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50 truncate">
              {VIEW_TITLES[activeView]}
            </h1>
            <span className="hidden sm:inline text-xs text-zinc-400 dark:text-zinc-600">·</span>
            <span className="hidden sm:inline text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {apartmentLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={install}
                className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Install
              </button>
            )}
            {!isInstalled && isIOS && (
              <button
                type="button"
                onClick={() => setShowIOSGuide(true)}
                className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap"
              >
                Install
              </button>
            )}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {activeView !== 'register' && (
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 lg:px-4 lg:py-2 text-xs lg:text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="sm:hidden">Register</span>
                <span className="hidden sm:inline">Register Visitor</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-7 pb-24 lg:pb-10 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-[62px] pb-safe bg-white dark:bg-[#111114] border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-5 items-center"
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
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2.5px] rounded-b-full bg-blue-600 dark:bg-blue-400"
                />
              )}
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className={`mt-1 text-[10px] truncate max-w-full ${isActive ? 'font-semibold' : 'font-medium'}`}>
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
          className="fixed bottom-[72px] lg:bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
        >
          <WifiOff className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
          <span>Offline Mode · Saved locally on device</span>
        </div>
      )}

      {/* iOS Safari Install Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-6 shadow-2xl">
            <h2 className="font-display text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              Install on iPhone / iPad
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              1. Tap the <strong>Share</strong> icon in Safari.<br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
