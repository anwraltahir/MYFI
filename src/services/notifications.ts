import { Commitment, Occurrence } from '../types';
import { getEffectiveCommitment } from '../utils/commitmentOverrides';

export class NotificationService {
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }

  public sendNotification(title: string, options?: NotificationOptions): boolean {
    if (!this.isSupported() || Notification.permission !== 'granted') return false;
    try {
      new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        dir: 'rtl',
        lang: 'ar',
        ...options,
      });
      return true;
    } catch (e) {
      console.warn('Failed to dispatch notification', e);
      return false;
    }
  }

  /**
   * Check upcoming commitments and send notification for due items
   */
  public checkAndNotifyDueCommitments(
    commitments: Commitment[],
    occurrences: Occurrence[],
    yearMonth: string,
    reminderDays: number
  ): void {
    if (!this.isSupported() || Notification.permission !== 'granted') return;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const currentYm = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    if (yearMonth !== currentYm) return;

    for (const comm of commitments) {
      if (!comm.isActive) continue;
      const occ = occurrences.find((o) => o.commitmentId === comm.id && o.yearMonth === yearMonth);
      if (occ?.removed) continue; // deleted for this month only
      if (occ && occ.status === 'paid') continue; // already paid

      const effective = getEffectiveCommitment(comm, occ);
      const diffDays = effective.dueDay - currentDay;

      // Due today
      if (diffDays === 0) {
        this.sendNotification(`تذكير بموعد سداد اليوم: ${effective.title}`, {
          body: `يستحق سداد ${effective.amount.toLocaleString()} ${effective.currency} اليوم. اضغط للسداد الآن.`,
          tag: `due-today-${comm.id}-${yearMonth}`,
        });
      }
      // Due in reminder days (e.g. 1, 3, or 7)
      else if (diffDays > 0 && diffDays <= reminderDays) {
        const dayLabel = diffDays === 1 ? 'غداً' : `خلال ${diffDays} أيام`;
        this.sendNotification(`تذكير بموعد استحقاق: ${effective.title}`, {
          body: `موعد سداد ${effective.title} (${effective.amount.toLocaleString()} ${effective.currency}) ${dayLabel}.`,
          tag: `due-soon-${comm.id}-${yearMonth}`,
        });
      }
    }
  }
}

export const notificationService = new NotificationService();
