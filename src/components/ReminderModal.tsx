import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  BUCKET_CATEGORIES,
  BUCKET_META,
  BudgetBucket,
  CustomCategory,
  FREQUENCY_LABELS,
  PaymentReminder,
  ReminderFrequency,
} from '../types/finance';
import { formatAriary, getTodayISO } from '../utils/format';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: Omit<PaymentReminder, 'id' | 'createdAt'>,
    existingId?: string
  ) => void;
  editingReminder?: PaymentReminder | null;
  customCategories: CustomCategory[];
}

const BUCKETS: BudgetBucket[] = ['needs', 'wants', 'savings'];
const FREQUENCIES: ReminderFrequency[] = [
  'monthly',
  'weekly',
  'quarterly',
  'yearly',
  'once',
];
const LEAD_OPTIONS = [0, 1, 3, 5, 7, 14, 30];

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingReminder,
  customCategories,
}) => {
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dueDate, setDueDate] = useState(getTodayISO());
  const [frequency, setFrequency] = useState<ReminderFrequency>('monthly');
  const [bucket, setBucket] = useState<BudgetBucket>('needs');
  const [category, setCategory] = useState<string>(BUCKET_CATEGORIES.needs[0]);
  const [notifyDaysBefore, setNotifyDaysBefore] = useState<number>(3);
  const [enabled, setEnabled] = useState(true);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const availableCategories = useMemo(() => {
    const base = [...BUCKET_CATEGORIES[bucket]];
    const custom = customCategories
      .filter((c) => c.kind === 'expense' && c.bucket === bucket)
      .map((c) => c.name);
    return Array.from(new Set([...base, ...custom]));
  }, [bucket, customCategories]);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingReminder) {
      setTitle(editingReminder.title);
      setAmountStr(String(editingReminder.amount));
      setDueDate(editingReminder.dueDate);
      setFrequency(editingReminder.frequency);
      setBucket(editingReminder.bucket);
      setCategory(editingReminder.category);
      setNotifyDaysBefore(editingReminder.notifyDaysBefore);
      setEnabled(editingReminder.enabled);
      setNote(editingReminder.note ?? '');
    } else {
      setTitle('');
      setAmountStr('');
      const d = new Date();
      d.setDate(d.getDate() + 5);
      setDueDate(d.toISOString().slice(0, 10));
      setFrequency('monthly');
      setBucket('needs');
      setCategory(BUCKET_CATEGORIES.needs[0]);
      setNotifyDaysBefore(3);
      setEnabled(true);
      setNote('');
    }
  }, [isOpen, editingReminder]);

  if (!isOpen) return null;

  const handleBucketChange = (newBucket: BudgetBucket) => {
    setBucket(newBucket);
    const custom = customCategories
      .filter((c) => c.kind === 'expense' && c.bucket === newBucket)
      .map((c) => c.name);
    const merged = [...BUCKET_CATEGORIES[newBucket], ...custom];
    setCategory(merged[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Math.round(Number(amountStr.replace(/\s+/g, '')));
    if (!title.trim()) {
      setError('Veuillez indiquer le nom de la facture ou du paiement.');
      return;
    }
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('Veuillez saisir un montant positif en Ariary.');
      return;
    }
    if (!dueDate) {
      setError('Veuillez choisir une date d’échéance.');
      return;
    }

    onSave(
      {
        title: title.trim(),
        amount: numeric,
        dueDate,
        frequency,
        bucket,
        category: availableCategories.includes(category)
          ? category
          : availableCategories[0],
        notifyDaysBefore,
        enabled,
        lastPaidDate: editingReminder?.lastPaidDate,
        note: note.trim() || undefined,
      },
      editingReminder?.id
    );
    onClose();
  };

  const previewAmount = Number(amountStr.replace(/\s+/g, ''));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rem-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2
            id="rem-modal-title"
            className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            {editingReminder ? 'Modifier le rappel de paiement' : 'Nouveau rappel de paiement'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="rem-title"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Libellé de la facture ou échéance
            </label>
            <input
              id="rem-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Facture JIRAMA, Loyer, Assurance..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="rem-amount"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Montant estimé (Ar)
              </label>
              <input
                id="rem-amount"
                type="number"
                min={100}
                step={500}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="120000"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 tabular-nums"
              />
              {Number.isFinite(previewAmount) && previewAmount > 0 && (
                <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatAriary(previewAmount)}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="rem-date"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Prochaine date d’échéance
              </label>
              <input
                id="rem-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="rem-freq"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Fréquence
              </label>
              <select
                id="rem-freq"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ReminderFrequency)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="rem-lead"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Notification avant échéance
              </label>
              <select
                id="rem-lead"
                value={notifyDaysBefore}
                onChange={(e) => setNotifyDaysBefore(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {LEAD_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {days === 0
                      ? 'Le jour même'
                      : `${days} jour${days > 1 ? 's' : ''} avant`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Enveloppe 50/30/20
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BUCKETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleBucketChange(b)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium text-left transition-colors ${
                    bucket === b
                      ? 'border-teal-700 bg-teal-50/70 text-slate-900 dark:border-teal-500 dark:bg-teal-950/40 dark:text-slate-100'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                  }`}
                >
                  {BUCKET_META[b].shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="rem-cat"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Catégorie associée
            </label>
            <select
              id="rem-cat"
              value={
                availableCategories.includes(category)
                  ? category
                  : availableCategories[0]
              }
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="rem-note"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Note (optionnelle)
            </label>
            <input
              id="rem-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex. Référence compteur ou compte de paiement"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
            />
            Activer les alertes pour ce rappel
          </label>

          {error && (
            <p className="text-xs font-medium text-red-700 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {editingReminder ? 'Enregistrer' : 'Créer le rappel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
