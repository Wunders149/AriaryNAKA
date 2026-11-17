import {
  BudgetSplit,
  CustomCategory,
  FinanceStore,
  PaymentReminder,
  SavingsGoal,
  Transaction,
} from '../types/finance';

export const STORAGE_KEY = 'ariary_503020_store_v1';

export const DEFAULT_SPLIT: BudgetSplit = {
  needs: 50,
  wants: 30,
  savings: 20,
};

export function createEmptyStore(theme: 'light' | 'dark' = 'light'): FinanceStore {
  return {
    version: 1,
    transactions: [],
    goals: [],
    reminders: [],
    categories: [],
    split: { ...DEFAULT_SPLIT },
    theme,
    updatedAt: new Date().toISOString(),
  };
}

export function loadLocalStoreIfPresent(): FinanceStore | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return validateImportedStore(raw);
  } catch {
    return null;
  }
}

export function validateImportedStore(rawJson: string): FinanceStore | null {
  try {
    const parsed = JSON.parse(rawJson) as Partial<FinanceStore>;
    if (
      !parsed ||
      !Array.isArray(parsed.transactions) ||
      !Array.isArray(parsed.goals)
    ) {
      return null;
    }
    const validTransactions = parsed.transactions.filter(
      (t): t is Transaction =>
        typeof t?.id === 'string' &&
        typeof t?.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
        typeof t?.label === 'string' &&
        t.label.trim().length > 0 &&
        typeof t?.amount === 'number' &&
        Number.isFinite(t.amount) &&
        t.amount > 0 &&
        (t.kind === 'income' || t.kind === 'expense')
    );
    const validGoals = parsed.goals
      .filter(
        (g): g is SavingsGoal =>
          typeof g?.id === 'string' &&
          typeof g?.title === 'string' &&
          g.title.trim().length > 0 &&
          typeof g?.targetAmount === 'number' &&
          Number.isFinite(g.targetAmount) &&
          g.targetAmount > 0 &&
          typeof g?.currentAmount === 'number' &&
          Number.isFinite(g.currentAmount) &&
          g.currentAmount >= 0
      )
      .map((g) => ({
        ...g,
        regularAmount:
          typeof g.regularAmount === 'number' && Number.isFinite(g.regularAmount)
            ? Math.max(0, g.regularAmount)
            : 0,
        regularFrequency:
          g.regularFrequency === 'weekly' ? ('weekly' as const) : ('monthly' as const),
      }));

    const validReminders: PaymentReminder[] = Array.isArray(parsed.reminders)
      ? parsed.reminders.filter(
          (r): r is PaymentReminder =>
            typeof r?.id === 'string' &&
            typeof r?.title === 'string' &&
            r.title.trim().length > 0 &&
            typeof r?.amount === 'number' &&
            Number.isFinite(r.amount) &&
            r.amount > 0 &&
            typeof r?.dueDate === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(r.dueDate)
        )
      : [];

    const validCategories: CustomCategory[] = Array.isArray(parsed.categories)
      ? parsed.categories.filter(
          (c): c is CustomCategory =>
            typeof c?.id === 'string' &&
            typeof c?.name === 'string' &&
            c.name.trim().length > 0 &&
            typeof c?.color === 'string' &&
            /^#[0-9A-Fa-f]{6}$/.test(c.color)
        )
      : [];

    const split = parsed.split ?? { ...DEFAULT_SPLIT };
    const splitValid =
      typeof split.needs === 'number' &&
      typeof split.wants === 'number' &&
      typeof split.savings === 'number' &&
      split.needs >= 0 &&
      split.wants >= 0 &&
      split.savings >= 0 &&
      split.needs + split.wants + split.savings === 100;

    return {
      version: 1,
      transactions: validTransactions,
      goals: validGoals,
      reminders: validReminders,
      categories: validCategories,
      split: splitValid ? split : { ...DEFAULT_SPLIT },
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function exportTransactionsCsv(transactions: Transaction[]): string {
  const header = [
    'Date',
    'Libellé',
    'Type',
    'Enveloppe 50/30/20',
    'Catégorie',
    'Montant (Ar)',
    'Note',
  ];
  const bucketLabels: Record<string, string> = {
    needs: 'Besoins (50%)',
    wants: 'Envies (30%)',
    savings: 'Épargne (20%)',
  };
  const escapeCell = (val: string) => `"${val.replace(/"/g, '""')}"`;

  const rows = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((tx) => [
      tx.date,
      escapeCell(tx.label),
      tx.kind === 'income' ? 'Revenu' : 'Dépense',
      tx.kind === 'income' ? 'Revenu' : bucketLabels[tx.bucket ?? 'needs'] ?? '',
      escapeCell(tx.category),
      String(tx.amount),
      escapeCell(tx.note ?? ''),
    ]);

  return [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}
