import React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { BUCKET_META, BudgetBucket } from '../../types/finance';
import { MonthlySummary } from '../../utils/budget';
import { formatAriary, formatPercent } from '../../utils/format';

interface AllocationBarsProps {
  summary: MonthlySummary;
  onFilterByBucket?: (bucket: BudgetBucket) => void;
}

const BUCKETS: BudgetBucket[] = ['needs', 'wants', 'savings'];

export const AllocationBars: React.FC<AllocationBarsProps> = ({
  summary,
  onFilterByBucket,
}) => {
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      {BUCKETS.map((key) => {
        const b = summary.buckets[key];
        const meta = BUCKET_META[key];
        const widthPct = Math.min(100, Math.max(0, b.usageRatio * 100));
        const isOver = key !== 'savings' && b.actualAmount > b.targetAmount && b.targetAmount > 0;
        const isSavingsMet = key === 'savings' && b.actualAmount >= b.targetAmount && b.targetAmount > 0;

        return (
          <div key={key} className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onFilterByBucket?.(key)}
                  className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 hover:underline text-left"
                >
                  {b.targetPercent} % · {meta.label}
                </button>
                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                  /
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                    isOver
                      ? 'text-red-700 dark:text-red-400'
                      : isSavingsMet
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : b.status === 'warning'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isOver ? (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  ) : isSavingsMet ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Info className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {b.statusText}
                </span>
              </div>

              <div className="font-mono text-sm tabular-nums text-slate-900 dark:text-slate-100">
                <span className="font-semibold">{formatAriary(b.actualAmount)}</span>
                <span className="text-slate-400 dark:text-slate-500">
                  {' '}
                  / {formatAriary(b.targetAmount)}
                </span>
              </div>
            </div>

            {/* Progress Track */}
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  isOver ? 'bg-red-600 dark:bg-red-500' : meta.bgBarClass
                }`}
                style={{ width: `${widthPct}%` }}
              />
            </div>

            {/* Sub-row: Variance + Top categories */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex flex-wrap items-center gap-2">
                {b.topCategories.length > 0 ? (
                  b.topCategories.slice(0, 3).map((cat, idx) => (
                    <React.Fragment key={cat.category}>
                      {idx > 0 && <span aria-hidden="true">·</span>}
                      <span>
                        {cat.category}{' '}
                        <span className="font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                          {formatAriary(cat.amount)}
                        </span>
                      </span>
                    </React.Fragment>
                  ))
                ) : (
                  <span>Aucune opération enregistrée ce mois-ci</span>
                )}
              </div>

              <div className="font-mono tabular-nums">
                {key === 'savings' ? (
                  b.remainingAmount <= 0 && b.targetAmount > 0 ? (
                    <span className="text-emerald-700 dark:text-emerald-400">
                      +{formatAriary(Math.abs(b.remainingAmount))} au-dessus de la cible
                    </span>
                  ) : (
                    <span>Reste à épargner : {formatAriary(Math.max(0, b.remainingAmount))}</span>
                  )
                ) : b.remainingAmount >= 0 ? (
                  <span>
                    Disponible : {formatAriary(b.remainingAmount)} ({formatPercent(b.usageRatio * 100, 0)} utilisé)
                  </span>
                ) : (
                  <span className="text-red-700 dark:text-red-400">
                    Dépassement de {formatAriary(Math.abs(b.remainingAmount))}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
