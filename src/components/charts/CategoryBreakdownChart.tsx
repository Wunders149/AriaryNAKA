import React, { useState } from 'react';
import { BUCKET_META } from '../../types/finance';
import { CategoryBreakdownItem } from '../../utils/budget';
import { formatAriary, formatAriaryCompact, formatPercent } from '../../utils/format';

interface CategoryBreakdownChartProps {
  items: CategoryBreakdownItem[];
  onSelectCategory?: (category: string) => void;
}

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  items,
  onSelectCategory,
}) => {
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  const total = items.reduce((acc, i) => acc + i.amount, 0);
  const topItems = items.slice(0, 8);
  const otherAmount = items.slice(8).reduce((acc, i) => acc + i.amount, 0);

  const chartSegments =
    otherAmount > 0
      ? [
          ...topItems,
          {
            category: 'Autres catégories',
            amount: otherAmount,
            count: items.slice(8).reduce((acc, i) => acc + i.count, 0),
            percentOfExpenses: total > 0 ? (otherAmount / total) * 100 : 0,
            bucket: 'wants' as const,
            color: '#94A3B8',
          },
        ]
      : topItems;

  const size = 220;
  const center = size / 2;
  const radius = 84;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = chartSegments.map((seg) => {
    const fraction = total > 0 ? seg.amount / total : 0;
    const len = fraction * circumference;
    const gap = chartSegments.length > 1 && len > 4 ? 2.5 : 0;
    const arc = {
      ...seg,
      dashArray: `${Math.max(0, len - gap)} ${circumference}`,
      dashOffset: -offset,
    };
    offset += len;
    return arc;
  });

  const activeItem = hoveredCat
    ? chartSegments.find((s) => s.category === hoveredCat)
    : null;

  if (items.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
        Aucune dépense enregistrée sur cette période pour afficher la répartition par catégorie.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
      {/* Custom SVG Donut */}
      <div className="lg:col-span-5 flex justify-center">
        <div className="relative w-[192px] h-[192px] sm:w-[220px] sm:h-[220px]">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full h-full -rotate-90 overflow-visible"
            role="img"
            aria-label="Graphique des dépenses par catégorie"
          >
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-slate-100 dark:text-slate-800"
            />
            {arcs.map((arc) => {
              const isHovered = hoveredCat === arc.category;
              const isDimmed = hoveredCat !== null && !isHovered;
              return (
                <circle
                  key={arc.category}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={isHovered ? strokeWidth + 5 : strokeWidth}
                  strokeOpacity={isDimmed ? 0.3 : 1}
                  strokeDasharray={arc.dashArray}
                  strokeDashoffset={arc.dashOffset}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredCat(arc.category)}
                  onMouseLeave={() => setHoveredCat(null)}
                  onClick={() => onSelectCategory?.(arc.category)}
                />
              );
            })}
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6 sm:px-8">
            {activeItem ? (
              <>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
                  {activeItem.category}
                </span>
                <span className="mt-0.5 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatAriaryCompact(activeItem.amount)}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatPercent(activeItem.percentOfExpenses, 1)}
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Total classé
                </span>
                <span className="mt-0.5 font-mono text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatAriaryCompact(total)}
                </span>
                <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {items.length} catégorie{items.length > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Ranked Category Bars */}
      <div className="lg:col-span-7 space-y-2 sm:space-y-3">
        {items.map((item) => {
          const isHovered = hoveredCat === item.category;
          return (
            <button
              key={item.category}
              type="button"
              onMouseEnter={() => setHoveredCat(item.category)}
              onMouseLeave={() => setHoveredCat(null)}
              onClick={() => onSelectCategory?.(item.category)}
              className={`w-full min-h-[48px] text-left rounded-lg px-2.5 py-2 transition-colors ${
                isHovered
                  ? 'bg-slate-100 dark:bg-slate-800/70'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {item.category}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 shrink-0">
                    · {BUCKET_META[item.bucket].shortLabel} · {item.count}
                  </span>
                </div>
                <div className="font-mono tabular-nums shrink-0 text-slate-900 dark:text-slate-100 ml-auto">
                  <span className="font-semibold">{formatAriary(item.amount)}</span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1.5">
                    ({formatPercent(item.percentOfExpenses, 1)})
                  </span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.min(100, item.percentOfExpenses)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
