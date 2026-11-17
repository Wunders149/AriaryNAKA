import React, { useState } from 'react';
import { MonthlyTrendPoint } from '../../utils/budget';
import { formatAriary, formatAriaryCompact } from '../../utils/format';

interface MonthlyTrendChartProps {
  data: MonthlyTrendPoint[];
  activeMonthKey: string;
  onSelectMonth?: (monthKey: string) => void;
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  data,
  activeMonthKey,
  onSelectMonth,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const width = 560;
  const height = 240;
  const padLeft = 50;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(
    100_000,
    ...data.map((d) => Math.max(d.income, d.needs + d.wants + d.savings))
  );
  // Round up nicely
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const niceMax = Math.ceil((maxVal * 1.12) / (magnitude / 2)) * (magnitude / 2);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    ratio: t,
    value: niceMax * t,
    y: padTop + plotH * (1 - t),
  }));

  const groupWidth = plotW / Math.max(1, data.length);
  const barWidth = Math.min(22, groupWidth * 0.26);
  const barGap = 4;

  const toY = (v: number) => padTop + plotH - (Math.max(0, v) / niceMax) * plotH;

  // Savings trend line points
  const savingsLinePoints = data
    .map((d, i) => {
      const cx = padLeft + groupWidth * i + groupWidth / 2;
      const cy = toY(d.savings);
      return `${cx},${cy}`;
    })
    .join(' ');

  const activeMonthIdx = data.findIndex((d) => d.monthKey === activeMonthKey);
  const effectiveIdx =
    hoveredIdx ?? selectedIdx ?? (activeMonthIdx >= 0 ? activeMonthIdx : null);
  const activePoint = effectiveIdx !== null ? data[effectiveIdx] : null;

  return (
    <div className="space-y-3">
      {/* Legend + Inspection Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-800 dark:bg-slate-200" />
            Revenus
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
            Besoins
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-600" />
            Envies
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 bg-emerald-600 inline-block" />
            Épargne
          </span>
        </div>

        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Touchez un mois pour afficher son détail
        </span>
      </div>

      {/* Responsive SVG Canvas (no horizontal overflow on mobile) */}
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="Évolution mensuelle des revenus, dépenses et épargne sur 6 mois"
        >
          {/* Horizontal grid lines */}
          {yTicks.map((tick) => (
            <g key={tick.ratio}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={tick.y}
                y2={tick.y}
                stroke="currentColor"
                strokeDasharray={tick.ratio === 0 ? undefined : '3 3'}
                className={
                  tick.ratio === 0
                    ? 'text-slate-300 dark:text-slate-700'
                    : 'text-slate-200 dark:text-slate-800'
                }
              />
              <text
                x={padLeft - 6}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-500 dark:fill-slate-400 text-[11px] font-mono"
              >
                {tick.value === 0 ? '0' : formatAriaryCompact(tick.value).replace(' Ar', '')}
              </text>
            </g>
          ))}

          {/* Grouped bars per month */}
          {data.map((d, idx) => {
            const cx = padLeft + groupWidth * idx + groupWidth / 2;
            const isHovered = effectiveIdx === idx;
            const isActiveMonth = d.monthKey === activeMonthKey;

            const incomeH = Math.max(0, padTop + plotH - toY(d.income));
            const needsH = Math.max(0, padTop + plotH - toY(d.needs));
            const wantsH = Math.max(0, padTop + plotH - toY(d.wants));
            const savingsH = Math.max(0, padTop + plotH - toY(d.savings));

            const incomeX = cx - barWidth - barGap / 2;
            const expenseX = cx + barGap / 2;

            // Stacked expense bar (bottom: needs, middle: wants, top: savings)
            const needsY = padTop + plotH - needsH;
            const wantsY = needsY - wantsH;
            const savingsY = wantsY - savingsH;

            return (
              <g
                key={d.monthKey}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => {
                  setSelectedIdx(idx);
                  onSelectMonth?.(d.monthKey);
                }}
              >
                {/* Hover / tap highlight column */}
                <rect
                  x={padLeft + groupWidth * idx + 3}
                  y={padTop}
                  width={groupWidth - 6}
                  height={plotH}
                  rx={6}
                  className={
                    isHovered
                      ? 'fill-slate-100/90 dark:fill-slate-800/60'
                      : isActiveMonth
                      ? 'fill-slate-100/50 dark:fill-slate-800/30'
                      : 'fill-transparent'
                  }
                />

                {/* Income Bar */}
                <rect
                  x={incomeX}
                  y={toY(d.income)}
                  width={barWidth}
                  height={incomeH}
                  rx={3}
                  className="fill-slate-800 dark:fill-slate-200 transition-opacity duration-150"
                  opacity={hoveredIdx !== null && hoveredIdx !== idx ? 0.45 : 1}
                />

                {/* Stacked 50/30/20 Bar */}
                <rect
                  x={expenseX}
                  y={needsY}
                  width={barWidth}
                  height={needsH}
                  rx={needsH > 2 && wantsH === 0 && savingsH === 0 ? 3 : 0}
                  fill="#2563EB"
                  opacity={hoveredIdx !== null && hoveredIdx !== idx ? 0.45 : 1}
                />
                <rect
                  x={expenseX}
                  y={wantsY}
                  width={barWidth}
                  height={wantsH}
                  fill="#D97706"
                  opacity={hoveredIdx !== null && hoveredIdx !== idx ? 0.45 : 1}
                />
                <rect
                  x={expenseX}
                  y={savingsY}
                  width={barWidth}
                  height={savingsH}
                  rx={savingsH > 2 ? 2 : 0}
                  fill="#059669"
                  opacity={hoveredIdx !== null && hoveredIdx !== idx ? 0.45 : 1}
                />

                {/* Month label */}
                <text
                  x={cx}
                  y={height - 8}
                  textAnchor="middle"
                  className={`text-[12px] font-medium ${
                    isActiveMonth || isHovered
                      ? 'fill-teal-700 dark:fill-teal-400 font-semibold'
                      : 'fill-slate-500 dark:fill-slate-400'
                  }`}
                >
                  {d.label}
                </text>
              </g>
            );
          })}

          {/* Savings Trend Polyline */}
          {data.length > 1 && (
            <polyline
              fill="none"
              stroke="#059669"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={savingsLinePoints}
              className="pointer-events-none"
            />
          )}

          {/* Savings Trend Nodes */}
          {data.map((d, idx) => {
            const cx = padLeft + groupWidth * idx + groupWidth / 2;
            const cy = toY(d.savings);
            const isHovered = effectiveIdx === idx;
            return (
              <circle
                key={`dot-${d.monthKey}`}
                cx={cx}
                cy={cy}
                r={isHovered ? 5 : 3.5}
                className="fill-white dark:fill-slate-900 stroke-emerald-600 pointer-events-none transition-all duration-150"
                strokeWidth={2}
              />
            );
          })}
        </svg>
      </div>

      {/* Selected or hovered detail strip */}
      {activePoint && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Revenus ({activePoint.label})</span>
            <p className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatAriary(activePoint.income)}
            </p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Besoins</span>
            <p className="font-mono font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
              {formatAriary(activePoint.needs)}
            </p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Envies</span>
            <p className="font-mono font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
              {formatAriary(activePoint.wants)}
            </p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Épargne allouée</span>
            <p className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {formatAriary(activePoint.savings)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
