import React, { useMemo, useState } from 'react';
import {
  Bell,
  BellRing,
  CalendarClock,
  CheckCircle2,
  MessageCircle,
  MessageSquarePlus,
  Phone,
  RotateCcw,
} from 'lucide-react';
import { FollowUpEntry, FollowUpMethod, VisitorProfile } from '../types/crm';
import { categorizeFollowUps, formatPhoneForWhatsApp } from '../utils/crmLogic';
import {
  NotificationPermissionState,
  requestDeviceNotificationPermission,
  showLocalDeviceNotification,
} from '../utils/notifications';
import { CalendarDatePicker } from './CalendarDatePicker';
import { PetStatusBadge, VisitStatusBadge } from './StatusBadges';
import { TimePicker } from './TimePicker';

interface FollowUpsViewProps {
  visitors: VisitorProfile[];
  onSelectVisitor: (visitor: VisitorProfile) => void;
  onCompleteFollowUp: (visitorId: string, followUpId: string, comment?: string) => void;
  onReopenFollowUp: (visitorId: string, followUpId: string) => void;
  onRescheduleFollowUp: (
    visitorId: string,
    followUpId: string,
    scheduledDate: string,
    preferredTime: string,
    method: FollowUpMethod,
    notes: string
  ) => void;
  onAddComment: (visitorId: string, text: string) => void;
}

type FollowUpTab = 'today' | 'upcoming' | 'overdue' | 'completed';

export const FollowUpsView: React.FC<FollowUpsViewProps> = ({
  visitors,
  onSelectVisitor,
  onCompleteFollowUp,
  onReopenFollowUp,
  onRescheduleFollowUp,
  onAddComment,
}) => {
  const [activeTab, setActiveTab] = useState<FollowUpTab>('today');
  const [rescheduleTarget, setRescheduleTarget] = useState<{
    visitorId: string;
    followUp: FollowUpEntry;
  } | null>(null);
  const [commentTarget, setCommentTarget] = useState<{
    visitorId: string;
    visitorName: string;
  } | null>(null);
  const [commentText, setCommentText] = useState('');

  const [rsDate, setRsDate] = useState('');
  const [rsTime, setRsTime] = useState('');
  const [rsMethod, setRsMethod] = useState<FollowUpMethod>('Phone call');
  const [rsNotes, setRsNotes] = useState('');

  const [notifPerm, setNotifPerm] = useState<NotificationPermissionState>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);

  const categorized = useMemo(() => categorizeFollowUps(visitors), [visitors]);

  const currentItems = categorized[activeTab];

  const handleEnableNotifications = async () => {
    const result = await requestDeviceNotificationPermission();
    setNotifPerm(result);
    if (result === 'granted') {
      await showLocalDeviceNotification(
        'Follow-up Reminders Enabled',
        'Apartment Visitor CRM will alert you offline when follow-ups are due.',
        'avcrm-enabled'
      );
      setNotifFeedback('Device notifications enabled. Test alert sent.');
    } else if (result === 'denied') {
      setNotifFeedback('Notifications are blocked in browser/device settings.');
    } else {
      setNotifFeedback('Notifications are not supported in this browser environment.');
    }
  };

  const handleSendTestAlert = async () => {
    const ok = await showLocalDeviceNotification(
      'Apartment Visitor CRM Reminder',
      `You have ${categorized.today.length} follow-up(s) today and ${categorized.overdue.length} overdue.`,
      `avcrm-test-${Date.now()}`
    );
    setNotifFeedback(
      ok
        ? 'Local notification triggered on this device.'
        : 'Could not trigger device notification (check permission).'
    );
  };

  const openReschedule = (visitorId: string, followUp: FollowUpEntry) => {
    setRescheduleTarget({ visitorId, followUp });
    setRsDate(followUp.scheduledDate);
    setRsTime(followUp.preferredTime);
    setRsMethod(followUp.method);
    setRsNotes(followUp.notes);
  };

  const saveReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget || !rsDate) return;
    onRescheduleFollowUp(
      rescheduleTarget.visitorId,
      rescheduleTarget.followUp.id,
      rsDate,
      rsTime,
      rsMethod,
      rsNotes
    );
    setRescheduleTarget(null);
  };

  const tabs: { id: FollowUpTab; label: string; count: number; alert?: boolean }[] = [
    { id: 'today', label: 'Today', count: categorized.today.length },
    { id: 'upcoming', label: 'Upcoming', count: categorized.upcoming.length },
    {
      id: 'overdue',
      label: 'Overdue',
      count: categorized.overdue.length,
      alert: categorized.overdue.length > 0,
    },
    { id: 'completed', label: 'Completed', count: categorized.completed.length },
  ];

  return (
    <div className="space-y-5">
      {/* Device Notification Card (100% Free Local Notifications) */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
            <Bell className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Device Follow-up Reminders
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {notifPerm === 'granted'
                ? 'Active on this device without any cloud or paid push service.'
                : notifPerm === 'denied'
                ? 'Blocked by browser/OS settings. Enable notifications in site settings.'
                : notifPerm === 'unsupported'
                ? 'Browser notification API unavailable here; in-app overdue alerts remain active.'
                : 'Enable free local device notifications for upcoming and overdue follow-ups.'}
            </p>
            {notifFeedback && (
              <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                {notifFeedback}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap"
            >
              <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
              Enable Reminders
            </button>
          )}
          {notifPerm === 'granted' && (
            <button
              type="button"
              onClick={handleSendTestAlert}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Send Test Reminder
            </button>
          )}
        </div>
      </section>

      {/* Segmented Follow-up Tabs */}
      <div
        role="tablist"
        aria-label="Follow-up categories"
        className="grid grid-cols-4 gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-1.5"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-medium transition-colors whitespace-nowrap min-h-[40px] ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`font-mono-num px-1.5 py-0.5 rounded text-[11px] ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : tab.alert
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Follow-up List */}
      {currentItems.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-10 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h3 className="mt-3 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            No {activeTab} follow-ups
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {activeTab === 'overdue'
              ? 'You are completely caught up on past follow-ups.'
              : 'Follow-ups scheduled during visitor registration or from a profile appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentItems.map(({ followUp, visitor }) => {
            const waPhone = formatPhoneForWhatsApp(visitor.contactNumber);
            return (
              <article
                key={followUp.id}
                data-testid="followup-card"
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectVisitor(visitor)}
                      className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-left"
                    >
                      {visitor.fullName}
                    </button>
                    <span className="font-mono-num text-xs text-slate-500 dark:text-slate-400">
                      {visitor.contactNumber}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-mono-num font-medium">
                      {followUp.scheduledDate} at {followUp.preferredTime || 'Anytime'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Method: {followUp.method}</span>
                  </div>

                  {followUp.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">{followUp.notes}</p>
                  )}

                  {/* Separate Visit & Pet Status Indicators */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <VisitStatusBadge
                      visitedStatus={visitor.latestVisitOutcome}
                      visitorStatus={visitor.visitorStatus}
                      compact
                    />
                    <PetStatusBadge petStatus={visitor.petStatus} compact />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href={`tel:${visitor.contactNumber}`}
                    aria-label={`Call ${visitor.fullName}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    Call
                  </a>
                  {waPhone && (
                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setCommentTarget({ visitorId: visitor.id, visitorName: visitor.fullName })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                    Comment
                  </button>
                  {followUp.status === 'Pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openReschedule(visitor.id, followUp)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        onClick={() => onCompleteFollowUp(visitor.id, followUp.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Mark Completed
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onReopenFollowUp(visitor.id, followUp.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Reopen
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <form
            onSubmit={saveReschedule}
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-6 shadow-xl space-y-4"
          >
            <h3
              id="reschedule-title"
              className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Reschedule Follow-up
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  New Date
                </label>
                <CalendarDatePicker
                  value={rsDate}
                  onChange={setRsDate}
                  compact
                  ariaLabel="New follow-up date"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Preferred Time
                </label>
                <TimePicker
                  value={rsTime}
                  onChange={setRsTime}
                  compact
                  ariaLabel="Preferred follow-up time"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Method
                </label>
                <select
                  value={rsMethod}
                  onChange={(e) => setRsMethod(e.target.value as FollowUpMethod)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F17] px-3 py-2 text-sm"
                >
                  <option value="Phone call">Phone call</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="Email">Email</option>
                  <option value="In-person">In-person</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={rsNotes}
                  onChange={(e) => setRsNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F17] px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Save Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Comment Modal */}
      {commentTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="comment-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!commentText.trim()) return;
              onAddComment(commentTarget.visitorId, commentText.trim());
              setCommentText('');
              setCommentTarget(null);
            }}
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-6 shadow-xl space-y-4"
          >
            <h3
              id="comment-modal-title"
              className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Add Comment for {commentTarget.visitorName}
            </h3>
            <textarea
              rows={3}
              required
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write your follow-up outcome or note..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F17] px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCommentText('');
                  setCommentTarget(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Save Comment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
