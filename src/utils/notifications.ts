import { VisitorProfile } from '../types/crm';
import { categorizeFollowUps, getTodayIsoDate } from './crmLogic';

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestDeviceNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showLocalDeviceNotification(
  title: string,
  body: string,
  tag?: string
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    // Prefer Service Worker notification on Android/PWA for native system tray support
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: tag || `avcrm-${Date.now()}`,
        });
        return true;
      }
    }
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag: tag || `avcrm-${Date.now()}`,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks pending follow-ups due today or overdue that have not yet triggered a notification today,
 * fires a real device notification when granted, and returns IDs of newly notified follow-ups.
 */
export async function checkAndTriggerDueFollowUpNotifications(
  visitors: VisitorProfile[],
  now = new Date()
): Promise<string[]> {
  if (getNotificationPermission() !== 'granted') return [];

  const today = getTodayIsoDate(now);
  const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const { today: todayItems, overdue: overdueItems } = categorizeFollowUps(visitors, today);

  const triggeredIds: string[] = [];

  for (const { followUp, visitor } of [...overdueItems, ...todayItems]) {
    if (followUp.notifiedAt && followUp.notifiedAt.slice(0, 10) === today) {
      continue;
    }
    const isOverdue = followUp.scheduledDate < today;
    const isDueNow = followUp.scheduledDate === today && (!followUp.preferredTime || followUp.preferredTime <= currentHHmm);
    if (!isOverdue && !isDueNow) {
      continue;
    }

    const prefix = isOverdue ? 'Overdue Follow-up' : 'Follow-up Due';
    const sent = await showLocalDeviceNotification(
      `${prefix}: ${visitor.fullName}`,
      `${followUp.method} at ${followUp.preferredTime || 'today'} · ${followUp.notes || visitor.contactNumber}`,
      `followup-${followUp.id}-${today}`
    );
    if (sent) {
      triggeredIds.push(followUp.id);
    }
  }

  return triggeredIds;
}
