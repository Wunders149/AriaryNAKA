import { PaymentReminder, ReminderFrequency } from '../types/finance';
import { formatAriary, getTodayISO } from './format';

export type ReminderAlertStatus = 'overdue' | 'due-today' | 'due-soon' | 'upcoming' | 'disabled';

export interface EvaluatedReminder {
  reminder: PaymentReminder;
  daysUntilDue: number;
  status: ReminderAlertStatus;
  shouldNotify: boolean;
  statusLabel: string;
}

export function diffDaysFromToday(isoDate: string): number {
  const todayStr = getTodayISO();
  const todayMs = new Date(todayStr + 'T00:00:00').getTime();
  const targetMs = new Date(isoDate + 'T00:00:00').getTime();
  return Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24));
}

export function evaluateReminder(reminder: PaymentReminder): EvaluatedReminder {
  if (!reminder.enabled) {
    return {
      reminder,
      daysUntilDue: diffDaysFromToday(reminder.dueDate),
      status: 'disabled',
      shouldNotify: false,
      statusLabel: 'Désactivé',
    };
  }

  const days = diffDaysFromToday(reminder.dueDate);
  if (days < 0) {
    return {
      reminder,
      daysUntilDue: days,
      status: 'overdue',
      shouldNotify: true,
      statusLabel: `En retard de ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`,
    };
  }
  if (days === 0) {
    return {
      reminder,
      daysUntilDue: 0,
      status: 'due-today',
      shouldNotify: true,
      statusLabel: 'Échéance aujourd’hui',
    };
  }
  if (days <= reminder.notifyDaysBefore) {
    return {
      reminder,
      daysUntilDue: days,
      status: 'due-soon',
      shouldNotify: true,
      statusLabel: `Dans ${days} jour${days > 1 ? 's' : ''}`,
    };
  }
  return {
    reminder,
    daysUntilDue: days,
    status: 'upcoming',
    shouldNotify: false,
    statusLabel: `Dans ${days} jour${days > 1 ? 's' : ''}`,
  };
}

export function computeNextDueDate(
  currentDueDate: string,
  frequency: ReminderFrequency
): string {
  const date = new Date(currentDueDate + 'T00:00:00');
  if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (frequency === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else if (frequency === 'quarterly') {
    date.setMonth(date.getMonth() + 3);
  } else if (frequency === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function triggerBrowserReminderNotifications(
  alerts: EvaluatedReminder[],
  enabledByUser: boolean
): void {
  if (!enabledByUser || typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }
  if (Notification.permission !== 'granted') return;

  const today = getTodayISO();
  const storageKey = `ariary_notified_${today}`;
  let alreadyNotified: string[] = [];
  try {
    alreadyNotified = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
  } catch {
    alreadyNotified = [];
  }

  const toSend = alerts.filter(
    (a) => a.shouldNotify && !alreadyNotified.includes(a.reminder.id)
  );
  if (toSend.length === 0) return;

  for (const item of toSend) {
    try {
      new Notification(`Rappel de paiement : ${item.reminder.title}`, {
        body: `${formatAriary(item.reminder.amount)} · ${item.statusLabel}`,
      });
      alreadyNotified.push(item.reminder.id);
    } catch {
      // Ignore notification errors in restricted iframes
    }
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(alreadyNotified));
  } catch {
    // Ignore storage errors
  }
}
