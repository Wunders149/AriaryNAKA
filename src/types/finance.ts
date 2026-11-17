export type TransactionKind = 'income' | 'expense';

export type BudgetBucket = 'needs' | 'wants' | 'savings';

export type ReminderFrequency =
  | 'once'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type AppView =
  | 'dashboard'
  | 'transactions'
  | 'categories'
  | 'reminders'
  | 'budget'
  | 'goals'
  | 'gmail'
  | 'storage';

export interface BudgetSplit {
  needs: number;   // default 50
  wants: number;   // default 30
  savings: number; // default 20
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  splitNeeds: number;
  splitWants: number;
  splitSavings: number;
  theme: 'light' | 'dark';
  browserNotificationsEnabled: boolean;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  amount: number; // positive integer in Ariary (Ar)
  kind: TransactionKind;
  bucket?: BudgetBucket; // required when kind === 'expense'
  category: string;
  note?: string;
  goalId?: string; // optional link when bucket === 'savings'
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  regularAmount: number; // planned regular contribution in Ar
  regularFrequency: 'weekly' | 'monthly';
  deadline: string; // YYYY-MM-DD
  priority: 'high' | 'medium' | 'low';
  description?: string;
  createdAt: string;
}

export interface PaymentReminder {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  frequency: ReminderFrequency;
  bucket: BudgetBucket;
  category: string;
  notifyDaysBefore: number; // e.g., 0, 1, 3, 5, 7, 14
  enabled: boolean;
  lastPaidDate?: string;
  note?: string;
  createdAt: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  kind: TransactionKind;
  bucket?: BudgetBucket; // when kind === 'expense'
  color: string; // #RRGGBB
  createdAt: string;
}

export interface FinanceStore {
  version: number;
  transactions: Transaction[];
  goals: SavingsGoal[];
  reminders?: PaymentReminder[];
  categories?: CustomCategory[];
  split: BudgetSplit;
  theme: 'light' | 'dark';
  updatedAt: string;
}

export const INCOME_CATEGORIES: readonly string[] = [
  'Salaire',
  'Activité indépendante',
  'Commerce & Ventes',
  'Prime & Bonus',
  'Revenus locatifs',
  'Autre revenu',
];

export const BUCKET_CATEGORIES: Record<BudgetBucket, readonly string[]> = {
  needs: [
    'Loyer & Logement',
    'Alimentation & Marché',
    'JIRAMA (Eau & Électricité)',
    'Transport & Carburant',
    'Santé & Pharmacie',
    'Scolarité & Formation',
    'Télécom & Connexion',
  ],
  wants: [
    'Restaurants & Sorties',
    'Achats & Vêtements',
    'Loisirs & Culture',
    'Abonnements & Streaming',
    'Voyages & Week-ends',
    'Cadeaux & Famille',
  ],
  savings: [
    'Fonds d’urgence',
    'Versement objectif',
    'Épargne Mobile Money',
    'Investissement & Projet',
    'Remboursement anticipé',
  ],
};

export const PREDEFINED_CATEGORY_COLORS: Record<string, string> = {
  'Loyer & Logement': '#1D4ED8',
  'Alimentation & Marché': '#2563EB',
  'JIRAMA (Eau & Électricité)': '#0284C7',
  'Transport & Carburant': '#0EA5E9',
  'Santé & Pharmacie': '#0369A1',
  'Scolarité & Formation': '#4F46E5',
  'Télécom & Connexion': '#6366F1',
  'Restaurants & Sorties': '#D97706',
  'Achats & Vêtements': '#EA580C',
  'Loisirs & Culture': '#F59E0B',
  'Abonnements & Streaming': '#B45309',
  'Voyages & Week-ends': '#CA8A04',
  'Cadeaux & Famille': '#E11D48',
  'Fonds d’urgence': '#059669',
  'Versement objectif': '#0D9488',
  'Épargne Mobile Money': '#10B981',
  'Investissement & Projet': '#047857',
  'Remboursement anticipé': '#14B8A6',
};

export const CATEGORY_COLOR_SWATCHES: readonly string[] = [
  '#0F766E',
  '#2563EB',
  '#4F46E5',
  '#0284C7',
  '#059669',
  '#D97706',
  '#EA580C',
  '#E11D48',
  '#7C3AED',
  '#475569',
];

export const FREQUENCY_LABELS: Record<ReminderFrequency, string> = {
  once: 'Ponctuel',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
};

export const BUCKET_META: Record<
  BudgetBucket,
  {
    label: string;
    shortLabel: string;
    description: string;
    colorHex: string;
    darkColorHex: string;
    textClass: string;
    bgBarClass: string;
    dotClass: string;
  }
> = {
  needs: {
    label: 'Besoins essentiels',
    shortLabel: 'Besoins',
    description: 'Logement, alimentation, JIRAMA, transport, santé et charges indispensables.',
    colorHex: '#2563EB',
    darkColorHex: '#3B82F6',
    textClass: 'text-blue-700 dark:text-blue-400',
    bgBarClass: 'bg-blue-600 dark:bg-blue-500',
    dotClass: 'bg-blue-600 dark:bg-blue-500',
  },
  wants: {
    label: 'Envies & Loisirs',
    shortLabel: 'Envies',
    description: 'Sorties, restaurants, achats personnels, divertissements et confort.',
    colorHex: '#D97706',
    darkColorHex: '#F59E0B',
    textClass: 'text-amber-700 dark:text-amber-400',
    bgBarClass: 'bg-amber-600 dark:bg-amber-500',
    dotClass: 'bg-amber-600 dark:bg-amber-500',
  },
  savings: {
    label: 'Épargne & Objectifs',
    shortLabel: 'Épargne',
    description: 'Réserve de sécurité, projets futurs, investissements et remboursement de dettes.',
    colorHex: '#059669',
    darkColorHex: '#10B981',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    bgBarClass: 'bg-emerald-600 dark:bg-emerald-500',
    dotClass: 'bg-emerald-600 dark:bg-emerald-500',
  },
};
