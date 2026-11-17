import React, { useMemo, useState } from 'react';
import { Plus, Tag, Trash2 } from 'lucide-react';
import {
  BUCKET_CATEGORIES,
  BUCKET_META,
  BudgetBucket,
  CATEGORY_COLOR_SWATCHES,
  CustomCategory,
  INCOME_CATEGORIES,
  Transaction,
  TransactionKind,
} from '../../types/finance';
import { computeCategoryBreakdown } from '../../utils/budget';
import { formatAriary, formatMonthLabel } from '../../utils/format';
import { CategoryBreakdownChart } from '../charts/CategoryBreakdownChart';

interface CategoriesViewProps {
  monthKey: string;
  transactions: Transaction[];
  customCategories: CustomCategory[];
  onCreateCategory: (data: Omit<CustomCategory, 'id' | 'createdAt'>) => void;
  onDeleteCategory: (id: string) => void;
  onFilterByCategory: (category: string) => void;
}

const BUCKETS: BudgetBucket[] = ['needs', 'wants', 'savings'];

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  monthKey,
  transactions,
  customCategories,
  onCreateCategory,
  onDeleteCategory,
  onFilterByCategory,
}) => {
  const [includeSavings, setIncludeSavings] = useState(true);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [bucket, setBucket] = useState<BudgetBucket>('needs');
  const [color, setColor] = useState<string>(CATEGORY_COLOR_SWATCHES[0]);
  const [error, setError] = useState('');

  const breakdown = useMemo(
    () => computeCategoryBreakdown(transactions, monthKey, customCategories, includeSavings),
    [transactions, monthKey, customCategories, includeSavings]
  );

  const totalCategorized = breakdown.reduce((acc, b) => acc + b.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Veuillez saisir un nom de catégorie.');
      return;
    }
    const allExisting = [
      ...INCOME_CATEGORIES,
      ...BUCKET_CATEGORIES.needs,
      ...BUCKET_CATEGORIES.wants,
      ...BUCKET_CATEGORIES.savings,
      ...customCategories.map((c) => c.name),
    ];
    if (allExisting.some((x) => x.toLowerCase() === trimmed.toLowerCase())) {
      setError('Cette catégorie existe déjà.');
      return;
    }
    setError('');
    onCreateCategory({
      name: trimmed,
      kind,
      bucket: kind === 'expense' ? bucket : undefined,
      color,
    });
    setName('');
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Catégories et répartition des dépenses
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Visualisez vos dépenses par catégorie pour {formatMonthLabel(monthKey)} et créez vos propres catégories personnalisées.
          </p>
        </div>

        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setIncludeSavings(true)}
            className={`min-h-[42px] sm:min-h-[32px] rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors text-center ${
              includeSavings
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            Avec épargne (20%)
          </button>
          <button
            type="button"
            onClick={() => setIncludeSavings(false)}
            className={`min-h-[42px] sm:min-h-[32px] rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors text-center ${
              !includeSavings
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            Courantes (50/30)
          </button>
        </div>
      </div>

      {/* Category Spending Chart */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 mb-5 sm:mb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Dépenses par catégorie · {formatMonthLabel(monthKey)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Touchez une catégorie pour afficher les transactions correspondantes
            </p>
          </div>
          <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            Total : {formatAriary(totalCategorized)}
          </span>
        </div>

        <CategoryBreakdownChart
          items={breakdown}
          onSelectCategory={onFilterByCategory}
        />
      </section>

      {/* Custom Category Creator + Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Create Custom Category Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Tag className="h-4 w-4 text-teal-700 dark:text-teal-400" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Créer une catégorie personnalisée
            </h2>
          </div>

          <div>
            <label
              htmlFor="cat-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Nom de la catégorie
            </label>
            <input
              id="cat-name"
              type="text"
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Énergie solaire, Cotisation..."
              className="w-full min-h-[44px] sm:min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Type d’opération
            </label>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setKind('expense')}
                className={`min-h-[40px] sm:min-h-[34px] rounded-md py-1.5 text-xs font-medium transition-colors ${
                  kind === 'expense'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Dépense
              </button>
              <button
                type="button"
                onClick={() => setKind('income')}
                className={`min-h-[40px] sm:min-h-[34px] rounded-md py-1.5 text-xs font-medium transition-colors ${
                  kind === 'income'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Revenu
              </button>
            </div>
          </div>

          {kind === 'expense' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Enveloppe 50/30/20 associée
              </label>
              <div className="grid grid-cols-3 gap-2">
                {BUCKETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBucket(b)}
                    className={`min-h-[44px] sm:min-h-[38px] rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      bucket === b
                        ? 'border-teal-700 bg-teal-50 text-slate-900 dark:border-teal-500 dark:bg-teal-950/50 dark:text-slate-100'
                        : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {BUCKET_META[b].shortLabel}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Couleur sur les graphiques
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {CATEGORY_COLOR_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  aria-label={`Choisir la couleur ${hex}`}
                  className={`h-10 w-10 sm:h-8 sm:w-8 rounded-lg sm:rounded-md transition-transform ${
                    color === hex
                      ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-slate-100 dark:ring-offset-slate-900 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-700 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <Plus className="h-4 w-4" />
            Ajouter la catégorie
          </button>
        </form>

        {/* Custom & Predefined Categories Directory */}
        <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Vos catégories personnalisées ({customCategories.length})
            </h2>
            {customCategories.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Aucune catégorie personnalisée ajoutée pour le moment. Utilisez le formulaire ci-contre pour en créer une.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
                {customCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-3 w-3 rounded-sm shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {cat.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                        · {cat.kind === 'income' ? 'Revenu' : BUCKET_META[cat.bucket ?? 'needs'].shortLabel}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteCategory(cat.id)}
                      aria-label={`Supprimer ${cat.name}`}
                      className="h-11 w-11 sm:h-8 sm:w-8 shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Catégories prédéfinies incluses
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {BUCKETS.map((b) => (
                <div key={b}>
                  <p className={`font-semibold mb-1.5 ${BUCKET_META[b].textClass}`}>
                    {BUCKET_META[b].shortLabel}
                  </p>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                    {BUCKET_CATEGORIES[b].map((c) => (
                      <li key={c} className="truncate">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
