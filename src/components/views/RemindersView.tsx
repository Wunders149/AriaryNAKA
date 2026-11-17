import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellOff,
  CalendarClock,
  Check,
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  BUCKET_META,
  FREQUENCY_LABELS,
  PaymentReminder,
} from '../../types/finance';
import { formatAriary, formatDateFr } from '../../utils/format';
import { evaluateReminder } from '../../utils/reminders';

interface RemindersViewProps {
  reminders: PaymentReminder[];
  browserNotificationsEnabled: boolean;
  onToggleBrowserNotifications: (enabled: boolean) => void;
  onAddReminder: () => void;
  onEditReminder: (reminder: PaymentReminder) => void;
  onDeleteReminder: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onMarkPaid: (reminder: PaymentReminder) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  reminders,
  browserNotificationsEnabled,
  onToggleBrowserNotifications,
  onAddReminder,
  onEditReminder,
  onDeleteReminder,
  onToggleEnabled,
  onMarkPaid,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notifFeedback, setNotifFeedback] = useState('');

  const evaluated = useMemo(() => {
    return [...reminders]
      .map(evaluateReminder)
      .sort((a, b) => {
        if (a.reminder.enabled !== b.reminder.enabled) {
          return a.reminder.enabled ? -1 : 1;
        }
        return a.daysUntilDue - b.daysUntilDue;
      });
  }, [reminders]);

  const activeAlerts = evaluated.filter((e) => e.shouldNotify);
  const activeReminders = evaluated.filter((e) => e.reminder.enabled);
  const monthlyCommitment = activeReminders.reduce((acc, e) => {
    const r = e.reminder;
    if (r.frequency === 'weekly') return acc + r.amount * 4;
    if (r.frequency === 'monthly') return acc + r.amount;
    if (r.frequency === 'quarterly') return acc + Math.round(r.amount / 3);
    if (r.frequency === 'yearly') return acc + Math.round(r.amount / 12);
    return acc;
  }, 0);

  const handleEnableBrowserNotifs = async () => {
    setNotifFeedback('');
    if (browserNotificationsEnabled) {
      onToggleBrowserNotifications(false);
      return;
    }
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifFeedback(
        'Votre navigateur ne prend pas en charge les notifications système. Les alertes restent actives dans l’application.'
      );
      return;
    }
    if (Notification.permission === 'granted') {
      onToggleBrowserNotifications(true);
      return;
    }
    if (Notification.permission === 'denied') {
      setNotifFeedback(
        'Les notifications ont été bloquées dans votre navigateur. Autorisez-les dans les paramètres du site.'
      );
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      onToggleBrowserNotifications(true);
    } else {
      setNotifFeedback('Permission refusée. Les rappels restent visibles dans l’application.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            Rappels de paiement et factures
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Planifiez vos factures récurrentes (JIRAMA, loyer, abonnements) et recevez des alertes avant chaque échéance.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddReminder}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nouveau rappel
        </button>
      </div>

      {/* Summary Strip */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Échéances à traiter bientôt
            </span>
            <p
              className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
                activeAlerts.length > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {activeAlerts.length}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Charge récurrente mensuelle estimée
            </span>
            <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatAriary(monthlyCommitment)}
            </p>
          </div>
          <div className="flex flex-col justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Notifications navigateur
            </span>
            <div className="mt-1">
              <button
                type="button"
                onClick={handleEnableBrowserNotifs}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  browserNotificationsEnabled
                    ? 'border-teal-700 bg-teal-50 text-teal-800 dark:border-teal-500 dark:bg-teal-950/50 dark:text-teal-300'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {browserNotificationsEnabled ? (
                  <>
                    <Bell className="h-3.5 w-3.5" />
                    Activées sur cet appareil
                  </>
                ) : (
                  <>
                    <BellOff className="h-3.5 w-3.5" />
                    Activer les notifications
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {notifFeedback && (
          <p className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-amber-700 dark:text-amber-400">
            {notifFeedback}
          </p>
        )}
      </section>

      {/* Reminders List */}
      {evaluated.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <CalendarClock className="h-8 w-8 mx-auto text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-900 dark:text-slate-100">
            Aucun rappel de paiement programmé.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Ajoutez vos factures JIRAMA, loyers ou abonnements pour être alerté avant la date limite et les enregistrer en un clic.
          </p>
          <button
            type="button"
            onClick={onAddReminder}
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Créer un premier rappel
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
          {evaluated.map((item) => {
            const { reminder: r, status, statusLabel } = item;
            const meta = BUCKET_META[r.bucket];
            const isConfirming = confirmDeleteId === r.id;

            return (
              <div
                key={r.id}
                className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  !r.enabled ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        status === 'overdue'
                          ? 'text-red-700 dark:text-red-400'
                          : status === 'due-today' || status === 'due-soon'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {status === 'overdue' ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : status === 'due-today' || status === 'due-soon' ? (
                        <Bell className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {statusLabel}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Échéance {formatDateFr(r.dueDate)}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {FREQUENCY_LABELS[r.frequency]}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Alerte J-{r.notifyDaysBefore}
                    </span>
                  </div>

                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                    {r.title}
                  </h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className={meta.textClass}>{meta.shortLabel}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{r.category}</span>
                    {r.lastPaidDate && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span>Dernier paiement : {formatDateFr(r.lastPaidDate)}</span>
                      </>
                    )}
                    {r.note && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span>{r.note}</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <span className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100 tabular-nums mr-2">
                    {formatAriary(r.amount)}
                  </span>

                  {isConfirming ? (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteReminder(r.id);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
                      >
                        Supprimer
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onMarkPaid(r)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 whitespace-nowrap"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Marquer comme payé
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleEnabled(r.id, !r.enabled)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        {r.enabled ? 'Mettre en pause' : 'Réactiver'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditReminder(r)}
                        aria-label={`Modifier ${r.title}`}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(r.id)}
                        aria-label={`Supprimer ${r.title}`}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
