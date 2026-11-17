import React, { useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  Plus,
  Target,
  Wallet,
} from 'lucide-react';
import {
  AppView,
  BUCKET_META,
  BudgetBucket,
  CustomCategory,
  PaymentReminder,
  SavingsGoal,
  Transaction,
} from '../../types/finance';
import {
  MonthlySummary,
  MonthlyTrendPoint,
  computeCategoryBreakdown,
  computeGoalPace,
} from '../../utils/budget';
import {
  formatAriary,
  formatDateFr,
  formatMonthLabel,
  formatPercent,
} from '../../utils/format';
import { evaluateReminder } from '../../utils/reminders';
import { AllocationBars } from '../charts/AllocationBars';
import { BudgetDonutChart } from '../charts/BudgetDonutChart';
import { CategoryBreakdownChart } from '../charts/CategoryBreakdownChart';
import { MonthlyTrendChart } from '../charts/MonthlyTrendChart';

interface DashboardViewProps {
  monthKey: string;
  onSelectMonth: (monthKey: string) => void;
  summary: MonthlySummary;
  trend: MonthlyTrendPoint[];
  monthTransactions: Transaction[];
  goals: SavingsGoal[];
  reminders: PaymentReminder[];
  customCategories: CustomCategory[];
  onAddTransaction: () => void;
  onMarkReminderPaid: (reminder: PaymentReminder) => void;
  onNavigate: (
    view: AppView,
    bucketFilter?: BudgetBucket,
    categoryFilter?: string
  ) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  monthKey,
  onSelectMonth,
  summary,
  trend,
  monthTransactions,
  goals,
  reminders,
  customCategories,
  onAddTransaction,
  onMarkReminderPaid,
  onNavigate,
}) => {
  const recentTx = [...monthTransactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const activeGoals = goals.slice(0, 3);
  const totalSavedInGoals = goals.reduce((acc, g) => acc + g.currentAmount, 0);

  const urgentReminders = useMemo(() => {
    return reminders
      .map(evaluateReminder)
      .filter((r) => r.shouldNotify)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [reminders]);

  const categoryBreakdown = useMemo(
    () =>
      computeCategoryBreakdown(
        monthTransactions,
        monthKey,
        customCategories,
        false
      ),
    [monthTransactions, monthKey, customCategories]
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Editorial Header & Slogan */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-1 sm:pb-2">
        <div>
          <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
            Synthèse mensuelle · {formatMonthLabel(monthKey)}
          </p>
          <h1 className="mt-1 font-display text-xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
            Chaque ariary compte. Chaque objectif se construit.
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Pilotez vos revenus et vos dépenses selon la règle{' '}
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {summary.buckets.needs.targetPercent}/{summary.buckets.wants.targetPercent}/
              {summary.buckets.savings.targetPercent}
            </span>{' '}
            avec synchronisation cloud sécurisée.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('budget')}
            className="flex-1 sm:flex-none min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            Analyser la règle
          </button>
          <button
            type="button"
            onClick={onAddTransaction}
            className="flex-1 sm:flex-none min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 whitespace-nowrap"
          >
            <Plus className="h-4 w-4 shrink-0" />
            Ajouter une opération
          </button>
        </div>
      </div>

      {/* Upcoming / Overdue Payment Reminders Strip */}
      {urgentReminders.length > 0 && (
        <section
          aria-label="Rappels de paiement à échéance proche"
          className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-amber-200/70 dark:border-amber-900/50">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
              <Bell className="h-4 w-4 shrink-0" />
              <span>
                {urgentReminders.length} rappel{urgentReminders.length > 1 ? 's' : ''} de paiement à anticiper
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reminders')}
              className="min-h-[36px] inline-flex items-center gap-1 text-xs font-medium text-amber-900 hover:underline dark:text-amber-300"
            >
              Gérer les rappels
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-amber-200/60 dark:divide-amber-900/40">
            {urgentReminders.slice(0, 3).map((item) => (
              <div
                key={item.reminder.id}
                className="py-3 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.reminder.title}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {' '}
                    · {item.statusLabel} ({formatDateFr(item.reminder.dueDate)})
                  </span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatAriary(item.reminder.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onMarkReminderPaid(item.reminder)}
                    className="min-h-[40px] sm:min-h-[30px] inline-flex items-center gap-1.5 rounded-lg sm:rounded-md bg-emerald-700 px-3 py-1.5 sm:px-2.5 sm:py-1 font-medium text-white hover:bg-emerald-800 dark:bg-emerald-600"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Marquer payé
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4-Column KPI Strip */}
      <section
        aria-label="Indicateurs clés du mois"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4"
      >
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Revenus du mois</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {formatAriary(summary.totalIncome)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Base de calcul de vos enveloppes
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Dépenses courantes</span>
            <ArrowDownRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          </div>
          <p className="mt-2 font-mono text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {formatAriary(summary.livingExpenses)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Besoins {formatAriary(summary.buckets.needs.actualAmount)} · Envies{' '}
            {formatAriary(summary.buckets.wants.actualAmount)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Épargne allouée</span>
            <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-xl sm:text-2xl font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {formatAriary(summary.savingsAllocated)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {formatPercent(summary.savingsRate, 1)} du revenu (cible{' '}
            {summary.buckets.savings.targetPercent} %)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Solde disponible</span>
            <Wallet className="h-4 w-4 text-teal-700 dark:text-teal-400" />
          </div>
          <p
            className={`mt-2 font-mono text-xl sm:text-2xl font-semibold tabular-nums ${
              summary.netBalance < 0
                ? 'text-red-700 dark:text-red-400'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {formatAriary(summary.netBalance, true)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Patrimoine objectifs : {formatAriary(totalSavedInGoals)}
          </p>
        </div>
      </section>

      {/* Primary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        <section className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Répartition 50 / 30 / 20
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comparaison entre vos flux réels et l’allocation cible
                </p>
              </div>
            </div>
            <BudgetDonutChart
              summary={summary}
              onSelectBucket={(b) => onNavigate('transactions', b)}
            />
          </div>
        </section>

        <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Évolution sur 6 mois
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Revenus mensuels, répartition des sorties et courbe d’épargne
                </p>
              </div>
            </div>
            <MonthlyTrendChart
              data={trend}
              activeMonthKey={monthKey}
              onSelectMonth={onSelectMonth}
            />
          </div>
        </section>
      </div>

      {/* Category Breakdown Chart */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 sm:mb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Dépenses courantes par catégorie
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Postes de besoins et d’envies en {formatMonthLabel(monthKey)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('categories')}
            className="min-h-[36px] inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
          >
            Gérer les catégories
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <CategoryBreakdownChart
          items={categoryBreakdown}
          onSelectCategory={(cat) => onNavigate('transactions', undefined, cat)}
        />
      </section>

      {/* Allocation Meters */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Maîtrise des enveloppes budgétaires
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Touchez une enveloppe pour filtrer les opérations correspondantes
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('budget')}
            className="min-h-[36px] inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
          >
            Ajuster les seuils
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <AllocationBars
          summary={summary}
          onFilterByBucket={(b) => onNavigate('transactions', b)}
        />
      </section>

      {/* Bottom Split: Recent Transactions + Active Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Opérations récentes du mois
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {monthTransactions.length} opération{monthTransactions.length > 1 ? 's' : ''} en{' '}
                {formatMonthLabel(monthKey)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('transactions')}
              className="min-h-[36px] inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 whitespace-nowrap"
            >
              Tout voir
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentTx.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Aucune opération enregistrée pour {formatMonthLabel(monthKey)}.
              </p>
              <button
                type="button"
                onClick={onAddTransaction}
                className="mt-4 min-h-[44px] inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Enregistrer un revenu ou une dépense
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {recentTx.map((tx) => {
                const isIncome = tx.kind === 'income';
                const bucketLabel = tx.bucket
                  ? BUCKET_META[tx.bucket].shortLabel
                  : 'Revenu';
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {tx.label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                        <span>{formatDateFr(tx.date)}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{tx.category}</span>
                        <span aria-hidden="true"> · </span>
                        <span
                          className={
                            isIncome
                              ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                              : BUCKET_META[tx.bucket ?? 'needs'].textClass
                          }
                        >
                          {bucketLabel}
                        </span>
                      </p>
                    </div>
                    <div
                      className={`shrink-0 font-mono text-xs sm:text-sm font-semibold tabular-nums ${
                        isIncome
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {isIncome
                        ? formatAriary(tx.amount, true)
                        : formatAriary(-tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Objectifs financiers
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Progression alimentée par vos 20 % d’épargne
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('goals')}
              className="min-h-[36px] inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 whitespace-nowrap"
            >
              Gérer
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {activeGoals.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Aucun objectif d’épargne défini pour le moment.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('goals')}
                className="mt-4 min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Créer un premier objectif
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {activeGoals.map((goal) => {
                const pace = computeGoalPace(goal);
                return (
                  <div key={goal.id} className="py-4 first:pt-4 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {goal.title}
                      </p>
                      <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
                        {formatPercent(pace.percent, 0)}
                      </span>
                    </div>

                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-200"
                        style={{ width: `${pace.percent}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      <span>{formatAriary(goal.currentAmount)}</span>
                      <span>Cible : {formatAriary(goal.targetAmount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
