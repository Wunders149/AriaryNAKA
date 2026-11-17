import React, { useState } from 'react';
import { BUCKET_META, BudgetBucket } from '../../types/finance';
import { MonthlySummary } from '../../utils/budget';
import { formatAriary, formatAriaryCompact, formatPercent } from '../../utils/format';

interface BudgetDonutChartProps {
  summary: MonthlySummary;
  onSelectBucket?: (bucket: BudgetBucket) => void;
}

const BUCKET_ORDER: BudgetBucket[] = ['needs', 'wants', 'savings'];

export const BudgetDonutChart: React.FC<BudgetDonutChartProps> = ({
  summary,
  onSelectBucket,
}) => {
  const [hovered, setHovered] = useState<BudgetBucket | 'unallocated' | null>(null);

  const totalIncome = summary.totalIncome;
  const totalOut = summary.totalExpenses;
  const unallocated = Math.max(0, totalIncome - totalOut);
  const denominator = Math.max(totalIncome, totalOut, 1);

  const size = 232;
  const center = size / 2;
  const outerR = 92;
  const outerStroke = 22;
  const innerR = 67;
  const innerStroke = 7;

  const outerCircumference = 2 * Math.PI * outerR;
  const innerCircumference = 2 * Math.PI * innerR;

  // Compute outer actual segments
  let outerOffset = 0;
  const outerSegments: {
    key: BudgetBucket | 'unallocated';
    label: string;
    amount: number;
    pct: number;
    color: string;
    dashArray: string;
    dashOffset: number;
  }[] = [];

  for (const key of BUCKET_ORDER) {
    const amount = summary.buckets[key].actualAmount;
    const fraction = amount / denominator;
    const len = fraction * outerCircumference;
    const gap = amount > 0 ? 3 : 0;
    outerSegments.push({
      key,
      label: BUCKET_META[key].label,
      amount,
      pct: totalIncome > 0 ? (amount / totalIncome) * 100 : (amount / denominator) * 100,
      color: BUCKET_META[key].colorHex,
      dashArray: `${Math.max(0, len - gap)} ${outerCircumference}`,
      dashOffset: -outerOffset,
    });
    outerOffset += len;
  }

  if (unallocated > 0) {
    const fraction = unallocated / denominator;
    const len = fraction * outerCircumference;
    outerSegments.push({
      key: 'unallocated',
      label: 'Solde non affecté',
      amount: unallocated,
      pct: totalIncome > 0 ? (unallocated / totalIncome) * 100 : 0,
      color: '#CBD5E1',
      dashArray: `${Math.max(0, len - 3)} ${outerCircumference}`,
      dashOffset: -outerOffset,
    });
  }

  // Compute inner target ring (50 / 30 / 20)
  let innerOffset = 0;
  const innerSegments = BUCKET_ORDER.map((key) => {
    const targetPct = summary.buckets[key].targetPercent;
    const len = (targetPct / 100) * innerCircumference;
    const seg = {
      key,
      color: BUCKET_META[key].colorHex,
      dashArray: `${Math.max(0, len - 2)} ${innerCircumference}`,
      dashOffset: -innerOffset,
    };
    innerOffset += len;
    return seg;
  });

  const activeSegment = hovered
    ? outerSegments.find((s) => s.key === hovered)
    : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 overflow-visible"
          role="img"
          aria-label="Graphique en anneau de répartition budgétaire 50/30/20"
        >
          {/* Base tracks */}
          <circle
            cx={center}
            cy={center}
            r={outerR}
            fill="none"
            stroke="currentColor"
            strokeWidth={outerStroke}
            className="text-slate-100 dark:text-slate-800/80"
          />
          <circle
            cx={center}
            cy={center}
            r={innerR}
            fill="none"
            stroke="currentColor"
            strokeWidth={innerStroke}
            className="text-slate-100 dark:text-slate-800/60"
          />

          {/* Inner target ring (reference 50/30/20) */}
          {innerSegments.map((seg) => (
            <circle
              key={`inner-${seg.key}`}
              cx={center}
              cy={center}
              r={innerR}
              fill="none"
              stroke={seg.color}
              strokeOpacity={hovered && hovered !== seg.key ? 0.15 : 0.35}
              strokeWidth={innerStroke}
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap="butt"
              className="transition-opacity duration-150"
            />
          ))}

          {/* Outer actual ring */}
          {outerSegments.map((seg) => {
            if (seg.amount <= 0) return null;
            const isDimmed = hovered !== null && hovered !== seg.key;
            const isSelected = hovered === seg.key;
            return (
              <circle
                key={`outer-${seg.key}`}
                cx={center}
                cy={center}
                r={outerR}
                fill="none"
                stroke={seg.color}
                strokeWidth={isSelected ? outerStroke + 4 : outerStroke}
                strokeOpacity={isDimmed ? 0.3 : 1}
                strokeDasharray={seg.dashArray}
                strokeDashoffset={seg.dashOffset}
                strokeLinecap="butt"
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHovered(seg.key)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => {
                  if (seg.key !== 'unallocated' && onSelectBucket) {
                    onSelectBucket(seg.key);
                  }
                }}
              />
            );
          })}
        </svg>

        {/* Center Readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-8">
          {activeSegment ? (
            <>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                {activeSegment.label}
              </span>
              <span className="mt-0.5 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {formatAriaryCompact(activeSegment.amount)}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                {formatPercent(activeSegment.pct, 1)}
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Revenus du mois
              </span>
              <span className="mt-0.5 font-mono text-base font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {formatAriaryCompact(totalIncome)}
              </span>
              <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                {totalIncome > 0
                  ? `${formatPercent((totalOut / totalIncome) * 100, 0)} engagés`
                  : 'Aucun revenu'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend & Real vs Target table */}
      <div className="flex-1 w-full space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-800">
          <span>Enveloppe (Anneau ext. réel / int. cible)</span>
          <span className="font-mono">Réel vs Cible</span>
        </div>
        {BUCKET_ORDER.map((key) => {
          const b = summary.buckets[key];
          const meta = BUCKET_META[key];
          const isHovered = hovered === key;
          return (
            <button
              key={key}
              type="button"
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelectBucket?.(key)}
              className={`w-full flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                isHovered
                  ? 'bg-slate-100 dark:bg-slate-800/80'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: meta.colorHex }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {meta.shortLabel} ({b.targetPercent}%)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    Cible : {formatAriary(b.targetAmount)}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatAriary(b.actualAmount)}
                </div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatPercent(b.actualPercentOfIncome, 1)} du revenu
                </div>
              </div>
            </button>
          );
        })}

        {unallocated > 0 && (
          <div
            onMouseEnter={() => setHovered('unallocated')}
            onMouseLeave={() => setHovered(null)}
            className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400"
          >
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-slate-300 dark:bg-slate-600 shrink-0" />
              <span>Disponible non affecté</span>
            </div>
            <span className="font-mono font-medium tabular-nums">
              {formatAriary(unallocated)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
