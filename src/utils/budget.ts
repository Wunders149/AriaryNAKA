import {
  BUCKET_META,
  BudgetBucket,
  BudgetSplit,
  CustomCategory,
  PREDEFINED_CATEGORY_COLORS,
  SavingsGoal,
  Transaction,
} from '../types/finance';
import { formatMonthShort, shiftMonthKey } from './format';

export interface BucketSummary {
  bucket: BudgetBucket;
  label: string;
  shortLabel: string;
  targetPercent: number;
  targetAmount: number;
  actualAmount: number;
  actualPercentOfIncome: number;
  remainingAmount: number;
  usageRatio: number; // actual / target (0..N)
  status: 'ok' | 'warning' | 'over' | 'empty';
  statusText: string;
  topCategories: { category: string; amount: number; percentOfBucket: number }[];
}

export interface MonthlySummary {
  monthKey: string;
  totalIncome: number;
  totalExpenses: number; // all expenses including savings contributions
  livingExpenses: number; // needs + wants
  savingsAllocated: number; // bucket === 'savings'
  netBalance: number; // totalIncome - totalExpenses
  savingsRate: number;
  buckets: Record<BudgetBucket, BucketSummary>;
  transactionCount: number;
}

export interface MonthlyTrendPoint {
  monthKey: string;
  label: string;
  income: number;
  needs: number;
  wants: number;
  savings: number;
  netBalance: number;
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  count: number;
  percentOfExpenses: number;
  bucket: BudgetBucket;
  color: string;
}

export function computeMonthlySummary(
  transactions: Transaction[],
  monthKey: string,
  split: BudgetSplit
): MonthlySummary {
  const monthTx = transactions.filter((t) => t.date.startsWith(monthKey));

  let totalIncome = 0;
  const bucketTotals: Record<BudgetBucket, number> = {
    needs: 0,
    wants: 0,
    savings: 0,
  };
  const categoryMap: Record<BudgetBucket, Record<string, number>> = {
    needs: {},
    wants: {},
    savings: {},
  };

  for (const tx of monthTx) {
    if (tx.kind === 'income') {
      totalIncome += tx.amount;
    } else {
      const bucket: BudgetBucket = tx.bucket ?? 'needs';
      bucketTotals[bucket] += tx.amount;
      categoryMap[bucket][tx.category] =
        (categoryMap[bucket][tx.category] ?? 0) + tx.amount;
    }
  }

  const totalExpenses =
    bucketTotals.needs + bucketTotals.wants + bucketTotals.savings;
  const livingExpenses = bucketTotals.needs + bucketTotals.wants;
  const savingsAllocated = bucketTotals.savings;
  const netBalance = totalIncome - totalExpenses;

  const buildBucket = (bucket: BudgetBucket): BucketSummary => {
    const targetPercent = split[bucket];
    const targetAmount = Math.round((totalIncome * targetPercent) / 100);
    const actualAmount = bucketTotals[bucket];
    const actualPercentOfIncome =
      totalIncome > 0 ? (actualAmount / totalIncome) * 100 : 0;
    const remainingAmount = targetAmount - actualAmount;
    const usageRatio = targetAmount > 0 ? actualAmount / targetAmount : actualAmount > 0 ? 1.5 : 0;

    let status: BucketSummary['status'] = 'ok';
    let statusText = 'Dans la cible';

    if (totalIncome === 0 && actualAmount === 0) {
      status = 'empty';
      statusText = 'Aucun flux';
    } else if (bucket === 'savings') {
      if (targetAmount > 0 && actualAmount >= targetAmount) {
        status = 'ok';
        statusText = 'Objectif atteint';
      } else if (actualAmount >= targetAmount * 0.7) {
        status = 'warning';
        statusText = 'En progression';
      } else {
        status = 'over';
        statusText = 'À compléter';
      }
    } else {
      if (actualAmount > targetAmount) {
        status = 'over';
        statusText = 'Dépassement';
      } else if (targetAmount > 0 && usageRatio >= 0.88) {
        status = 'warning';
        statusText = 'Proche du plafond';
      } else {
        status = 'ok';
        statusText = 'Maîtrisé';
      }
    }

    const topCategories = Object.entries(categoryMap[bucket])
      .map(([category, amount]) => ({
        category,
        amount,
        percentOfBucket: actualAmount > 0 ? (amount / actualAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      bucket,
      label: BUCKET_META[bucket].label,
      shortLabel: BUCKET_META[bucket].shortLabel,
      targetPercent,
      targetAmount,
      actualAmount,
      actualPercentOfIncome,
      remainingAmount,
      usageRatio,
      status,
      statusText,
      topCategories,
    };
  };

  return {
    monthKey,
    totalIncome,
    totalExpenses,
    livingExpenses,
    savingsAllocated,
    netBalance,
    savingsRate: totalIncome > 0 ? (savingsAllocated / totalIncome) * 100 : 0,
    buckets: {
      needs: buildBucket('needs'),
      wants: buildBucket('wants'),
      savings: buildBucket('savings'),
    },
    transactionCount: monthTx.length,
  };
}

export function computeMonthlyTrend(
  transactions: Transaction[],
  endMonthKey: string,
  monthsCount = 6,
  split: BudgetSplit
): MonthlyTrendPoint[] {
  const points: MonthlyTrendPoint[] = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const mk = shiftMonthKey(endMonthKey, -i);
    const summary = computeMonthlySummary(transactions, mk, split);
    points.push({
      monthKey: mk,
      label: formatMonthShort(mk),
      income: summary.totalIncome,
      needs: summary.buckets.needs.actualAmount,
      wants: summary.buckets.wants.actualAmount,
      savings: summary.buckets.savings.actualAmount,
      netBalance: summary.netBalance,
    });
  }
  return points;
}

export function computeCategoryBreakdown(
  transactions: Transaction[],
  monthKey: string,
  customCategories: CustomCategory[],
  includeSavings = true
): CategoryBreakdownItem[] {
  const monthExpenses = transactions.filter(
    (t) =>
      t.date.startsWith(monthKey) &&
      t.kind === 'expense' &&
      (includeSavings || t.bucket !== 'savings')
  );

  const customColorMap = new Map<string, string>();
  for (const c of customCategories) {
    if (c.kind === 'expense') {
      customColorMap.set(c.name.toLowerCase(), c.color);
    }
  }

  const agg = new Map<
    string,
    { amount: number; count: number; bucket: BudgetBucket }
  >();
  let total = 0;

  for (const tx of monthExpenses) {
    total += tx.amount;
    const prev = agg.get(tx.category);
    const bucket = tx.bucket ?? 'needs';
    if (prev) {
      prev.amount += tx.amount;
      prev.count += 1;
    } else {
      agg.set(tx.category, { amount: tx.amount, count: 1, bucket });
    }
  }

  return Array.from(agg.entries())
    .map(([category, info]) => {
      const color =
        customColorMap.get(category.toLowerCase()) ??
        PREDEFINED_CATEGORY_COLORS[category] ??
        BUCKET_META[info.bucket].colorHex;
      return {
        category,
        amount: info.amount,
        count: info.count,
        percentOfExpenses: total > 0 ? (info.amount / total) * 100 : 0,
        bucket: info.bucket,
        color,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export function computeGoalPace(goal: SavingsGoal): {
  remaining: number;
  percent: number;
  monthsLeft: number;
  monthlyRequired: number;
  plannedMonthlyAmount: number;
  isOnTrack: boolean;
  isCompleted: boolean;
} {
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const percent =
    goal.targetAmount > 0
      ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
      : 0;
  const isCompleted = goal.currentAmount >= goal.targetAmount && goal.targetAmount > 0;

  const now = new Date();
  const target = new Date(goal.deadline + 'T00:00:00');
  const diffMonths =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());
  const monthsLeft = Math.max(1, diffMonths);
  const monthlyRequired = isCompleted ? 0 : Math.ceil(remaining / monthsLeft);

  const regular = goal.regularAmount ?? 0;
  const plannedMonthlyAmount =
    goal.regularFrequency === 'weekly' ? Math.round(regular * 4.33) : regular;
  const isOnTrack = isCompleted || plannedMonthlyAmount >= monthlyRequired;

  return {
    remaining,
    percent,
    monthsLeft,
    monthlyRequired,
    plannedMonthlyAmount,
    isOnTrack,
    isCompleted,
  };
}
