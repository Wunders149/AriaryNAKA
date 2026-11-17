import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  BUCKET_CATEGORIES,
  BUCKET_META,
  BudgetBucket,
  CATEGORY_COLOR_SWATCHES,
  CustomCategory,
  INCOME_CATEGORIES,
  SavingsGoal,
  Transaction,
  TransactionKind,
} from '../types/finance';
import { formatAriary, getTodayISO } from '../utils/format';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Transaction, 'id' | 'createdAt'>, existingId?: string) => void;
  onCreateCategory?: (data: Omit<CustomCategory, 'id' | 'createdAt'>) => void;
  editingTransaction?: Transaction | null;
  goals: SavingsGoal[];
  customCategories: CustomCategory[];
  defaultMonthKey: string;
}

const BUCKETS: BudgetBucket[] = ['needs', 'wants', 'savings'];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onCreateCategory,
  editingTransaction,
  goals,
  customCategories,
  defaultMonthKey,
}) => {
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [bucket, setBucket] = useState<BudgetBucket>('needs');
  const [category, setCategory] = useState<string>(BUCKET_CATEGORIES.needs[0]);
  const [label, setLabel] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [note, setNote] = useState('');
  const [goalId, setGoalId] = useState<string>('');
  const [error, setError] = useState('');

  // Inline custom category creation
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const availableCategories = useMemo(() => {
    if (kind === 'income') {
      const custom = customCategories
        .filter((c) => c.kind === 'income')
        .map((c) => c.name);
      return Array.from(new Set([...INCOME_CATEGORIES, ...custom]));
    }
    const custom = customCategories
      .filter((c) => c.kind === 'expense' && (c.bucket ?? 'needs') === bucket)
      .map((c) => c.name);
    return Array.from(new Set([...BUCKET_CATEGORIES[bucket], ...custom]));
  }, [kind, bucket, customCategories]);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setCreatingCat(false);
    setNewCatName('');
    if (editingTransaction) {
      setKind(editingTransaction.kind);
      const b = editingTransaction.bucket ?? 'needs';
      setBucket(b);
      setCategory(editingTransaction.category);
      setLabel(editingTransaction.label);
      setAmountStr(String(editingTransaction.amount));
      setDate(editingTransaction.date);
      setNote(editingTransaction.note ?? '');
      setGoalId(editingTransaction.goalId ?? '');
    } else {
      setKind('expense');
      setBucket('needs');
      setCategory(BUCKET_CATEGORIES.needs[0]);
      setLabel('');
      setAmountStr('');
      const today = getTodayISO();
      setDate(today.startsWith(defaultMonthKey) ? today : `${defaultMonthKey}-05`);
      setNote('');
      setGoalId('');
    }
  }, [isOpen, editingTransaction, defaultMonthKey]);

  if (!isOpen) return null;

  const handleKindChange = (newKind: TransactionKind) => {
    setKind(newKind);
    setCreatingCat(false);
    if (newKind === 'income') {
      setCategory(INCOME_CATEGORIES[0]);
      setGoalId('');
    } else {
      setCategory(BUCKET_CATEGORIES[bucket][0]);
    }
  };

  const handleBucketChange = (newBucket: BudgetBucket) => {
    setBucket(newBucket);
    setCreatingCat(false);
    const custom = customCategories
      .filter((c) => c.kind === 'expense' && (c.bucket ?? 'needs') === newBucket)
      .map((c) => c.name);
    setCategory([...BUCKET_CATEGORIES[newBucket], ...custom][0]);
    if (newBucket !== 'savings') {
      setGoalId('');
    }
  };

  const handleQuickCreateCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (onCreateCategory) {
      onCreateCategory({
        name: trimmed,
        kind,
        bucket: kind === 'expense' ? bucket : undefined,
        color: CATEGORY_COLOR_SWATCHES[customCategories.length % CATEGORY_COLOR_SWATCHES.length],
      });
    }
    setCategory(trimmed);
    setNewCatName('');
    setCreatingCat(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amountStr.replace(/\s+/g, '').replace(',', '.'));
    if (!label.trim()) {
      setError('Veuillez saisir un libellé pour cette opération.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Veuillez entrer un montant positif en Ariary.');
      return;
    }
    if (!date) {
      setError('Veuillez sélectionner une date.');
      return;
    }

    const finalCategory = availableCategories.includes(category)
      ? category
      : category.trim() || availableCategories[0];

    onSave(
      {
        label: label.trim(),
        amount: Math.round(numericAmount),
        date,
        kind,
        bucket: kind === 'expense' ? bucket : undefined,
        category: finalCategory,
        note: note.trim() || undefined,
        goalId: kind === 'expense' && bucket === 'savings' && goalId ? goalId : undefined,
      },
      editingTransaction?.id
    );
    onClose();
  };

  const parsedPreview = Number(amountStr.replace(/\s+/g, ''));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2
            id="tx-modal-title"
            className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            {editingTransaction ? 'Modifier l’opération' : 'Nouvelle opération'}
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
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleKindChange('expense')}
              className={`rounded-md py-2 text-sm font-medium transition-colors ${
                kind === 'expense'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Dépense / Épargne
            </button>
            <button
              type="button"
              onClick={() => handleKindChange('income')}
              className={`rounded-md py-2 text-sm font-medium transition-colors ${
                kind === 'income'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Revenu
            </button>
          </div>

          {kind === 'expense' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Enveloppe budgétaire (50 / 30 / 20)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {BUCKETS.map((b) => {
                  const meta = BUCKET_META[b];
                  const active = bucket === b;
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => handleBucketChange(b)}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                        active
                          ? 'border-teal-700 bg-teal-50/70 text-slate-900 dark:border-teal-500 dark:bg-teal-950/40 dark:text-slate-100'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span
                          className="h-2 w-2 rounded-sm shrink-0"
                          style={{ backgroundColor: meta.colorHex }}
                        />
                        <span className="truncate">{meta.shortLabel}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {b === 'needs' ? '50 %' : b === 'wants' ? '30 %' : '20 %'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="tx-label"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Libellé
            </label>
            <input
              id="tx-label"
              type="text"
              maxLength={120}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                kind === 'income'
                  ? 'Ex. Salaire mensuel, Vente, Prime...'
                  : 'Ex. Courses Analakely, Facture JIRAMA...'
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="tx-amount"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Montant (Ariary)
              </label>
              <div className="relative">
                <input
                  id="tx-amount"
                  type="number"
                  min={1}
                  step={100}
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="50000"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 tabular-nums"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500">
                  Ar
                </span>
              </div>
              {Number.isFinite(parsedPreview) && parsedPreview > 0 && (
                <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatAriary(parsedPreview)}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="tx-date"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="tx-category"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Catégorie
              </label>
              {onCreateCategory && (
                <button
                  type="button"
                  onClick={() => setCreatingCat((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
                >
                  <Plus className="h-3 w-3" />
                  {creatingCat ? 'Annuler' : 'Catégorie personnalisée'}
                </button>
              )}
            </div>

            {creatingCat ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={50}
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nom de la nouvelle catégorie"
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleQuickCreateCategory}
                  className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800 dark:bg-teal-600"
                >
                  Créer
                </button>
              </div>
            ) : (
              <select
                id="tx-category"
                value={
                  availableCategories.includes(category)
                    ? category
                    : availableCategories[0]
                }
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          {kind === 'expense' && bucket === 'savings' && goals.length > 0 && (
            <div>
              <label
                htmlFor="tx-goal"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Associer à un objectif d’épargne (optionnel)
              </label>
              <select
                id="tx-goal"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">Aucun objectif lié</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} ({formatAriary(g.currentAmount)} / {formatAriary(g.targetAmount)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="tx-note"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Note (optionnelle)
            </label>
            <input
              id="tx-note"
              type="text"
              maxLength={240}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Précision, moyen de paiement (MVola, espèces, virement)..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-red-700 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500 whitespace-nowrap"
            >
              {editingTransaction ? 'Enregistrer' : 'Ajouter l’opération'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
