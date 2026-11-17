import {
  BudgetSplit,
  CustomCategory,
  FinanceStore,
  PaymentReminder,
  SavingsGoal,
  Transaction,
} from '../types/finance';
import { getMonthKey, getTodayISO, shiftMonthKey } from './format';

export const STORAGE_KEY = 'ariary_503020_store_v1';

export const DEFAULT_SPLIT: BudgetSplit = {
  needs: 50,
  wants: 30,
  savings: 20,
};

function dateInMonth(monthKey: string, day: number): string {
  const d = String(day).padStart(2, '0');
  return `${monthKey}-${d}`;
}

function addDaysISO(baseIso: string, deltaDays: number): string {
  const d = new Date(baseIso + 'T00:00:00');
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function createSeedData(): FinanceStore {
  const currentMonth = getMonthKey();
  const today = getTodayISO();
  const prev1 = shiftMonthKey(currentMonth, -1);
  const prev2 = shiftMonthKey(currentMonth, -2);
  const prev3 = shiftMonthKey(currentMonth, -3);
  const prev4 = shiftMonthKey(currentMonth, -4);
  const prev5 = shiftMonthKey(currentMonth, -5);

  const nowIso = new Date().toISOString();

  const futureDate = (monthsAhead: number): string => {
    const mk = shiftMonthKey(currentMonth, monthsAhead);
    return `${mk}-28`;
  };

  const goals: SavingsGoal[] = [
    {
      id: 'goal_urgence',
      title: 'Fonds d’urgence (6 mois)',
      targetAmount: 6_000_000,
      currentAmount: 3_650_000,
      regularAmount: 300_000,
      regularFrequency: 'monthly',
      deadline: futureDate(8),
      priority: 'high',
      description: 'Matelas de sécurité en cas d’imprévu familial ou professionnel.',
      createdAt: nowIso,
    },
    {
      id: 'goal_equipement',
      title: 'Station de travail & Solaire',
      targetAmount: 3_200_000,
      currentAmount: 1_900_000,
      regularAmount: 260_000,
      regularFrequency: 'monthly',
      deadline: futureDate(5),
      priority: 'medium',
      description: 'Kit onduleur solaire et renouvellement ordinateur portable.',
      createdAt: nowIso,
    },
    {
      id: 'goal_terrain',
      title: 'Apport projet terrain',
      targetAmount: 15_000_000,
      currentAmount: 4_500_000,
      regularAmount: 450_000,
      regularFrequency: 'monthly',
      deadline: futureDate(24),
      priority: 'high',
      description: 'Épargne long terme dédiée à l’acquisition foncière.',
      createdAt: nowIso,
    },
  ];

  const reminders: PaymentReminder[] = [
    {
      id: 'rem_jirama',
      title: 'Facture JIRAMA (Eau & Électricité)',
      amount: 120_000,
      dueDate: addDaysISO(today, 2),
      frequency: 'monthly',
      bucket: 'needs',
      category: 'JIRAMA (Eau & Électricité)',
      notifyDaysBefore: 5,
      enabled: true,
      note: 'Paiement via MVola ou agence',
      createdAt: nowIso,
    },
    {
      id: 'rem_fibre',
      title: 'Abonnement Fibre & Mobile',
      amount: 95_000,
      dueDate: addDaysISO(today, 6),
      frequency: 'monthly',
      bucket: 'needs',
      category: 'Télécom & Connexion',
      notifyDaysBefore: 7,
      enabled: true,
      createdAt: nowIso,
    },
    {
      id: 'rem_loyer',
      title: 'Loyer appartement',
      amount: 550_000,
      dueDate: addDaysISO(today, 14),
      frequency: 'monthly',
      bucket: 'needs',
      category: 'Loyer & Logement',
      notifyDaysBefore: 5,
      enabled: true,
      note: 'Virement propriétaire le 1er du mois',
      createdAt: nowIso,
    },
  ];

  const categories: CustomCategory[] = [
    {
      id: 'cat_solaire',
      name: 'Énergie & Solaire',
      kind: 'expense',
      bucket: 'needs',
      color: '#0284C7',
      createdAt: nowIso,
    },
    {
      id: 'cat_famille',
      name: 'Solidarité familiale',
      kind: 'expense',
      bucket: 'wants',
      color: '#7C3AED',
      createdAt: nowIso,
    },
  ];

  const transactions: Transaction[] = [
    {
      id: 'tx_c1',
      date: dateInMonth(currentMonth, 2),
      label: 'Salaire mensuel net',
      amount: 1_850_000,
      kind: 'income',
      category: 'Salaire',
      note: 'Virement employeur',
      createdAt: nowIso,
    },
    {
      id: 'tx_c2',
      date: dateInMonth(currentMonth, 8),
      label: 'Prestation conseil freelance',
      amount: 450_000,
      kind: 'income',
      category: 'Activité indépendante',
      note: 'Facture client Antananarivo',
      createdAt: nowIso,
    },
    {
      id: 'tx_c3',
      date: dateInMonth(currentMonth, 3),
      label: 'Loyer appartement',
      amount: 550_000,
      kind: 'expense',
      bucket: 'needs',
      category: 'Loyer & Logement',
      createdAt: nowIso,
    },
    {
      id: 'tx_c4',
      date: dateInMonth(currentMonth, 5),
      label: 'Courses marché & supermarché',
      amount: 340_000,
      kind: 'expense',
      bucket: 'needs',
      category: 'Alimentation & Marché',
      createdAt: nowIso,
    },
    {
      id: 'tx_c5',
      date: dateInMonth(currentMonth, 7),
      label: 'Facture JIRAMA (Eau & Électricité)',
      amount: 115_000,
      kind: 'expense',
      bucket: 'needs',
      category: 'JIRAMA (Eau & Électricité)',
      createdAt: nowIso,
    },
    {
      id: 'tx_c6',
      date: dateInMonth(currentMonth, 10),
      label: 'Carburant & déplacements',
      amount: 120_000,
      kind: 'expense',
      bucket: 'needs',
      category: 'Transport & Carburant',
      createdAt: nowIso,
    },
    {
      id: 'tx_c7',
      date: dateInMonth(currentMonth, 11),
      label: 'Forfait Fibre & Mobile',
      amount: 95_000,
      kind: 'expense',
      bucket: 'needs',
      category: 'Télécom & Connexion',
      createdAt: nowIso,
    },
    {
      id: 'tx_c8',
      date: dateInMonth(currentMonth, 9),
      label: 'Dîner en famille',
      amount: 145_000,
      kind: 'expense',
      bucket: 'wants',
      category: 'Restaurants & Sorties',
      createdAt: nowIso,
    },
    {
      id: 'tx_c9',
      date: dateInMonth(currentMonth, 12),
      label: 'Tenue & chaussures',
      amount: 180_000,
      kind: 'expense',
      bucket: 'wants',
      category: 'Achats & Vêtements',
      createdAt: nowIso,
    },
    {
      id: 'tx_c10',
      date: dateInMonth(currentMonth, 14),
      label: 'Sortie week-end Mantasoa',
      amount: 210_000,
      kind: 'expense',
      bucket: 'wants',
      category: 'Voyages & Week-ends',
      createdAt: nowIso,
    },
    {
      id: 'tx_c11',
      date: dateInMonth(currentMonth, 4),
      label: 'Dotation Fonds d’urgence',
      amount: 280_000,
      kind: 'expense',
      bucket: 'savings',
      category: 'Fonds d’urgence',
      goalId: 'goal_urgence',
      createdAt: nowIso,
    },
    {
      id: 'tx_c12',
      date: dateInMonth(currentMonth, 13),
      label: 'Versement Kit Solaire',
      amount: 180_000,
      kind: 'expense',
      bucket: 'savings',
      category: 'Versement objectif',
      goalId: 'goal_equipement',
      createdAt: nowIso,
    },
    {
      id: 'tx_p1_1',
      date: dateInMonth(prev1, 2),
      label: 'Salaire mensuel net',
      amount: 1_850_000,
      kind: 'income',
      category: 'Salaire',
      createdAt: nowIso,
    },
    {
      id: 'tx_p1_2',
      date: dateInMonth(prev1, 16),
      label: 'Vente matériel photo',
      amount: 280_000,
      kind: 'income',
      category: 'Commerce & Ventes',
      createdAt: nowIso,
    },
    {
      id: 'tx_p1_3',
      date: dateInMonth(prev1, 3),
      label: 'Loyer & charges',
      amount: 550_000,
      kind: 'expense',
      bucket: 'needs',
      category: 'Loyer & Logement',
      createdAt: nowIso,
    },
    {
      id: 'tx_p1_4',
      date: dateInMonth(prev1, 6),
      label: 'Alimentation mensuelle',
      amount: 360_000,
      kind: 'expense',
      bucket: 'needs',
      category: 'Alimentation & Marché',
      createdAt: nowIso,
    },
    {
      id: 'tx_p1_5',
      date: dateInMonth(prev1, 11),
      label: 'JIRAMA & Télécom',
      amount: 195_000,
      kind: 'expense',
      bucket: 'needs',
      category: 'JIRAMA (Eau & Électricité)',
      createdAt: nowIso,
    },
    {
      id: 'tx_p1_6',
      date: dateInMonth(prev1, 14),
      label: 'Restaurants & cafés',
      amount: 260_000,
      kind: 'expense',
      bucket: 'wants',
      category: 'Restaurants & Sorties',
      createdAt: nowIso,
    },
    {
      id: 'tx_p1_7',
      date: dateInMonth(prev1, 19),
      label: 'Cadeau anniversaire',
      amount: 190_000,
      kind: 'expense',
      bucket: 'wants',
      category: 'Cadeaux & Famille',
      createdAt: nowIso,
    },
    {
      id: 'tx_p1_8',
      date: dateInMonth(prev1, 5),
      label: 'Épargne mensuelle projet terrain',
      amount: 450_000,
      kind: 'expense',
      bucket: 'savings',
      category: 'Investissement & Projet',
      goalId: 'goal_terrain',
      createdAt: nowIso,
    },
    {
      id: 'tx_p2_1',
      date: dateInMonth(prev2, 2),
      label: 'Salaire mensuel net',
      amount: 1_850_000,
      kind: 'income',
      category: 'Salaire',
      createdAt: nowIso,
    },
    {
      id: 'tx_p2_2',
      date: dateInMonth(prev2, 4),
      label: 'Loyer, courses & JIRAMA',
      amount: 960_000,
      kind: 'expense',
      bucket: 'needs',
      category: 'Loyer & Logement',
      createdAt: nowIso,
    },
    {
      id: 'tx_p2_3',
      date: dateInMonth(prev2, 15),
      label: 'Loisirs & sorties',
      amount: 480_000,
      kind: 'expense',
      bucket: 'wants',
      category: 'Loisirs & Culture',
      createdAt: nowIso,
    },
    {
      id: 'tx_p2_4',
      date: dateInMonth(prev2, 18),
      label: 'Épargne de précaution',
      amount: 390_000,
      kind: 'expense',
      bucket: 'savings',
      category: 'Fonds d’urgence',
      goalId: 'goal_urgence',
      createdAt: nowIso,
    },
    {
      id: 'tx_p3_1',
      date: dateInMonth(prev3, 2),
      label: 'Salaire & mission freelance',
      amount: 2_150_000,
      kind: 'income',
      category: 'Salaire',
      createdAt: nowIso,
    },
    {
      id: 'tx_p3_2',
      date: dateInMonth(prev3, 5),
      label: 'Charges essentielles du mois',
      amount: 1_040_000,
      kind: 'expense',
      bucket: 'needs',
      category: 'Alimentation & Marché',
      createdAt: nowIso,
    },
    {
      id: 'tx_p3_3',
      date: dateInMonth(prev3, 12),
      label: 'Achats personnels',
      amount: 590_000,
      kind: 'expense',
      bucket: 'wants',
      category: 'Achats & Vêtements',
      createdAt: nowIso,
    },
    {
      id: 'tx_p3_4',
      date: dateInMonth(prev3, 20),
      label: 'Versement Kit Solaire',
      amount: 460_000,
      kind: 'expense',
      bucket: 'savings',
      category: 'Versement objectif',
      goalId: 'goal_equipement',
      createdAt: nowIso,
    },
    {
      id: 'tx_p4_1',
      date: dateInMonth(prev4, 2),
      label: 'Salaire mensuel net',
      amount: 1_750_000,
      kind: 'income',
      category: 'Salaire',
      createdAt: nowIso,
    },
    {
      id: 'tx_p4_2',
      date: dateInMonth(prev4, 6),
      label: 'Dépenses essentielles',
      amount: 910_000,
      kind: 'expense',
      bucket: 'needs',
      category: 'Loyer & Logement',
      createdAt: nowIso,
    },
    {
      id: 'tx_p4_3',
      date: dateInMonth(prev4, 15),
      label: 'Sorties & abonnements',
      amount: 510_000,
      kind: 'expense',
      bucket: 'wants',
      category: 'Restaurants & Sorties',
      createdAt: nowIso,
    },
    {
      id: 'tx_p4_4',
      date: dateInMonth(prev4, 21),
      label: 'Épargne mensuelle',
      amount: 330_000,
      kind: 'expense',
      bucket: 'savings',
      category: 'Épargne Mobile Money',
      createdAt: nowIso,
    },
    {
      id: 'tx_p5_1',
      date: dateInMonth(prev5, 2),
      label: 'Salaire mensuel net',
      amount: 1_750_000,
      kind: 'income',
      category: 'Salaire',
      createdAt: nowIso,
    },
    {
      id: 'tx_p5_2',
      date: dateInMonth(prev5, 4),
      label: 'Loyer & alimentation',
      amount: 880_000,
      kind: 'expense',
      bucket: 'needs',
      category: 'Loyer & Logement',
      createdAt: nowIso,
    },
    {
      id: 'tx_p5_3',
      date: dateInMonth(prev5, 13),
      label: 'Loisirs & imprévus plaisir',
      amount: 540_000,
      kind: 'expense',
      bucket: 'wants',
      category: 'Loisirs & Culture',
      createdAt: nowIso,
    },
    {
      id: 'tx_p5_4',
      date: dateInMonth(prev5, 22),
      label: 'Épargne de précaution',
      amount: 310_000,
      kind: 'expense',
      bucket: 'savings',
      category: 'Fonds d’urgence',
      createdAt: nowIso,
    },
  ];

  return {
    version: 1,
    transactions,
    goals,
    reminders,
    categories,
    split: { ...DEFAULT_SPLIT },
    theme: 'light',
    updatedAt: nowIso,
  };
}

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
        typeof t?.label === 'string' &&
        typeof t?.amount === 'number' &&
        t.amount > 0 &&
        (t.kind === 'income' || t.kind === 'expense')
    );
    const validGoals = parsed.goals
      .filter(
        (g): g is SavingsGoal =>
          typeof g?.id === 'string' &&
          typeof g?.title === 'string' &&
          typeof g?.targetAmount === 'number' &&
          g.targetAmount > 0 &&
          typeof g?.currentAmount === 'number'
      )
      .map((g) => ({
        ...g,
        regularAmount: typeof g.regularAmount === 'number' ? g.regularAmount : 0,
        regularFrequency: g.regularFrequency === 'weekly' ? ('weekly' as const) : ('monthly' as const),
      }));

    const validReminders: PaymentReminder[] = Array.isArray(parsed.reminders)
      ? parsed.reminders.filter(
          (r): r is PaymentReminder =>
            typeof r?.id === 'string' &&
            typeof r?.title === 'string' &&
            typeof r?.amount === 'number' &&
            r.amount > 0 &&
            typeof r?.dueDate === 'string'
        )
      : [];

    const validCategories: CustomCategory[] = Array.isArray(parsed.categories)
      ? parsed.categories.filter(
          (c): c is CustomCategory =>
            typeof c?.id === 'string' &&
            typeof c?.name === 'string' &&
            typeof c?.color === 'string'
        )
      : [];

    const split = parsed.split ?? { ...DEFAULT_SPLIT };
    const splitValid =
      typeof split.needs === 'number' &&
      typeof split.wants === 'number' &&
      typeof split.savings === 'number' &&
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
  const header = ['Date', 'Libellé', 'Type', 'Enveloppe 50/30/20', 'Catégorie', 'Montant (Ar)', 'Note'];
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
