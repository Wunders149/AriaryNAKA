import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { BUCKET_META, BudgetBucket, BudgetSplit } from '../../types/finance';
import { MonthlySummary } from '../../utils/budget';
import { formatAriary, formatMonthLabel, formatPercent } from '../../utils/format';

interface BudgetRuleViewProps {
  monthKey: string;
  summary: MonthlySummary;
  split: BudgetSplit;
  onUpdateSplit: (newSplit: BudgetSplit) => void;
  onFilterTransactions: (bucket: BudgetBucket) => void;
}

const BUCKETS: BudgetBucket[] = ['needs', 'wants', 'savings'];

export const BudgetRuleView: React.FC<BudgetRuleViewProps> = ({
  monthKey,
  summary,
  split,
  onUpdateSplit,
  onFilterTransactions,
}) => {
  const [draft, setDraft] = useState<BudgetSplit>(split);
  const [editingSplit, setEditingSplit] = useState(false);

  React.useEffect(() => {
    setDraft(split);
  }, [split]);

  const draftSum = draft.needs + draft.wants + draft.savings;
  const isDraftValid =
    draftSum === 100 &&
    draft.needs >= 0 &&
    draft.wants >= 0 &&
    draft.savings >= 0;

  const handleSaveSplit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDraftValid) return;
    onUpdateSplit(draft);
    setEditingSplit(false);
  };

  const handleResetStandard = () => {
    const standard = { needs: 50, wants: 30, savings: 20 };
    setDraft(standard);
    onUpdateSplit(standard);
    setEditingSplit(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            Règle budgétaire {split.needs}/{split.wants}/{split.savings}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Analyse détaillée par enveloppe pour {formatMonthLabel(monthKey)} sur une base de{' '}
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatAriary(summary.totalIncome)}
            </span>{' '}
            de revenus.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setEditingSplit((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {editingSplit ? 'Fermer le réglage' : 'Personnaliser les ratios'}
        </button>
      </div>

      {/* Optional Split Customizer */}
      {editingSplit && (
        <form
          onSubmit={handleSaveSplit}
          className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Ajuster la répartition en pourcentage
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                La règle classique est 50 % Besoins, 30 % Envies et 20 % Épargne. Le total doit être égal à 100 %.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetStandard}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Rétablir 50 / 30 / 20
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {BUCKETS.map((b) => (
              <div key={b}>
                <label
                  htmlFor={`split-${b}`}
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {BUCKET_META[b].label} (%)
                </label>
                <input
                  id={`split-${b}`}
                  type="number"
                  min={0}
                  max={100}
                  value={draft[b]}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [b]: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 tabular-nums"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span
              className={`font-mono text-xs font-medium tabular-nums ${
                isDraftValid
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              Total actuel : {draftSum} % {isDraftValid ? '(valide)' : '(doit atteindre 100 %)'}
            </span>
            <button
              type="submit"
              disabled={!isDraftValid}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              Appliquer la répartition
            </button>
          </div>
        </form>
      )}

      {/* 3 Bucket Deep-Dive Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {BUCKETS.map((key) => {
          const b = summary.buckets[key];
          const meta = BUCKET_META[key];
          const pctUsed = b.targetAmount > 0 ? (b.actualAmount / b.targetAmount) * 100 : 0;
          const isOver = key !== 'savings' && b.actualAmount > b.targetAmount && b.targetAmount > 0;
          const isSavingsMet = key === 'savings' && b.actualAmount >= b.targetAmount && b.targetAmount > 0;

          return (
            <section
              key={key}
              className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: meta.colorHex }}
                      />
                      <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Cible {b.targetPercent} %
                      </span>
                    </div>
                    <h2 className="mt-1 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {meta.label}
                    </h2>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${
                      isOver
                        ? 'text-red-700 dark:text-red-400'
                        : isSavingsMet
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isOver ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : isSavingsMet ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : null}
                    {b.statusText}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {meta.description}
                </p>

                {/* Key Metrics */}
                <div className="mt-5 grid grid-cols-2 gap-4 py-4 border-y border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Montant réel
                    </span>
                    <p className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatAriary(b.actualAmount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Plafond autorisé
                    </span>
                    <p className="mt-1 font-mono text-lg font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatAriary(b.targetAmount)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400 mb-1.5 tabular-nums">
                    <span>Part du revenu : {formatPercent(b.actualPercentOfIncome, 1)}</span>
                    <span>{formatPercent(pctUsed, 0)} de la cible</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        isOver ? 'bg-red-600 dark:bg-red-500' : meta.bgBarClass
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, pctUsed))}%` }}
                    />
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="mt-5 space-y-2.5">
                  <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Détail par catégorie
                  </h3>
                  {b.topCategories.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 py-2">
                      Aucune dépense classée dans cette enveloppe ce mois-ci.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {b.topCategories.map((cat) => (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-700 dark:text-slate-300 truncate pr-2">
                              {cat.category}
                            </span>
                            <span className="font-mono text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
                              {formatAriary(cat.amount)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, cat.percentOfBucket)}%`,
                                backgroundColor: meta.colorHex,
                                opacity: 0.75,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  {key === 'savings'
                    ? b.remainingAmount <= 0 && b.targetAmount > 0
                      ? 'Objectif mensuel atteint'
                      : `Reste : ${formatAriary(Math.max(0, b.remainingAmount))}`
                    : b.remainingAmount >= 0
                    ? `Marge : ${formatAriary(b.remainingAmount)}`
                    : `Excédent : ${formatAriary(Math.abs(b.remainingAmount))}`}
                </span>
                <button
                  type="button"
                  onClick={() => onFilterTransactions(key)}
                  className="font-medium text-teal-700 hover:underline dark:text-teal-400"
                >
                  Voir les opérations
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
