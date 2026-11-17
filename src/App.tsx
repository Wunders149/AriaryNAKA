import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowLeftRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  Cloud,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Moon,
  PieChart,
  Plus,
  Sun,
  Tag,
  Target,
  X,
} from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { GoalModal } from './components/GoalModal';
import { ReminderModal } from './components/ReminderModal';
import { TransactionModal } from './components/TransactionModal';
import { DashboardView } from './components/views/DashboardView';
import { TransactionFilter } from './components/views/TransactionsView';
import { auth, signOutGoogle } from './firebase/client';
import {
  clearUserSubcollections,
  createCustomCategory,
  deleteCustomCategoryDoc,
  deleteGoalDoc,
  deleteReminderDoc,
  deleteTransactionDoc,
  ensureUserProfile,
  markReminderPaidInFirestore,
  subscribeToCategories,
  subscribeToGoals,
  subscribeToReminders,
  subscribeToTransactions,
  subscribeToUserProfile,
  toggleReminderEnabled,
  updateGoalCurrentAmount,
  updateUserBrowserNotifications,
  updateUserSplit,
  updateUserTheme,
  upsertGoal,
  upsertReminder,
  upsertTransaction,
  writeStoreToFirestore,
} from './firebase/firestoreService';
import {
  AppView,
  BudgetBucket,
  CustomCategory,
  FinanceStore,
  PaymentReminder,
  SavingsGoal,
  Transaction,
  UserProfile,
} from './types/finance';
import { computeMonthlySummary, computeMonthlyTrend } from './utils/budget';
import {
  formatAriary,
  formatDateFr,
  formatMonthLabel,
  getMonthKey,
  getTodayISO,
  shiftMonthKey,
} from './utils/format';
import {
  computeNextDueDate,
  evaluateReminder,
  triggerBrowserReminderNotifications,
} from './utils/reminders';

const TransactionsView = lazy(() =>
  import('./components/views/TransactionsView').then((m) => ({
    default: m.TransactionsView,
  }))
);
const CategoriesView = lazy(() =>
  import('./components/views/CategoriesView').then((m) => ({
    default: m.CategoriesView,
  }))
);
const RemindersView = lazy(() =>
  import('./components/views/RemindersView').then((m) => ({
    default: m.RemindersView,
  }))
);
const BudgetRuleView = lazy(() =>
  import('./components/views/BudgetRuleView').then((m) => ({
    default: m.BudgetRuleView,
  }))
);
const GoalsView = lazy(() =>
  import('./components/views/GoalsView').then((m) => ({
    default: m.GoalsView,
  }))
);
const LocalDataView = lazy(() =>
  import('./components/views/LocalDataView').then((m) => ({
    default: m.LocalDataView,
  }))
);
const GmailView = lazy(() =>
  import('./components/views/GmailView').then((m) => ({
    default: m.GmailView,
  }))
);

const NAV_ITEMS: {
  id: AppView;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'transactions', label: 'Opérations', icon: ArrowLeftRight },
  { id: 'categories', label: 'Catégories', icon: Tag },
  { id: 'reminders', label: 'Rappels', icon: Bell },
  { id: 'budget', label: 'Règle 50/30/20', icon: PieChart },
  { id: 'goals', label: 'Objectifs', icon: Target },
  { id: 'gmail', label: 'Gmail', icon: Mail },
  { id: 'storage', label: 'Sauvegarde', icon: Cloud },
];

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [actionError, setActionError] = useState<string>('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [monthKey, setMonthKey] = useState<string>(() => getMonthKey());
  const [txFilter, setTxFilter] = useState<TransactionFilter>('all');
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txDraft, setTxDraft] = useState<Partial<Omit<Transaction, 'id' | 'createdAt'>> | null>(null);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [remModalOpen, setRemModalOpen] = useState(false);
  const [editingRem, setEditingRem] = useState<PaymentReminder | null>(null);
  const [remDraft, setRemDraft] = useState<Partial<Omit<PaymentReminder, 'id' | 'createdAt'>> | null>(null);

  const runSafeAsync = async (fn: () => Promise<unknown>, fallbackMessage: string) => {
    setActionError('');
    try {
      await fn();
    } catch (err) {
      let detail = fallbackMessage;
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message) as { error?: string };
          if (parsed?.error?.includes('Quota exceeded')) {
            detail =
              'Quota journalier Firestore dépassé. Veuillez réessayer demain ou mettre à niveau votre forfait.';
          } else if (parsed?.error?.includes('permission')) {
            detail =
              'Accès refusé par les règles de sécurité. Vérifiez votre connexion Google.';
          }
        } catch {
          // Keep default French message
        }
      }
      setActionError(detail);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setProfile(null);
        setTransactions([]);
        setGoals([]);
        setReminders([]);
        setCustomCategories([]);
        setActionError('');
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    let unsubs: (() => void)[] = [];

    const onSubError = () => {
      if (active) {
        setActionError(
          'Connexion Firestore interrompue ou permissions insuffisantes. Rechargez la page si le problème persiste.'
        );
        setDataLoading(false);
      }
    };

    setDataLoading(true);
    ensureUserProfile(user)
      .then(() => {
        if (!active) return;
        unsubs = [
          subscribeToUserProfile(
            user.uid,
            (p) => {
              setProfile(p);
              setDataLoading(false);
            },
            onSubError
          ),
          subscribeToTransactions(user.uid, setTransactions, onSubError),
          subscribeToGoals(user.uid, setGoals, onSubError),
          subscribeToReminders(user.uid, setReminders, onSubError),
          subscribeToCategories(user.uid, setCustomCategories, onSubError),
        ];
      })
      .catch(() => {
        if (active) {
          setActionError('Impossible d’initialiser votre profil utilisateur sur Firestore.');
          setDataLoading(false);
        }
      });

    return () => {
      active = false;
      for (const u of unsubs) u();
    };
  }, [user]);

  const theme: 'light' | 'dark' = profile?.theme ?? 'light';
  const split = useMemo(
    () => ({
      needs: profile?.splitNeeds ?? 50,
      wants: profile?.splitWants ?? 30,
      savings: profile?.splitSavings ?? 20,
    }),
    [profile]
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const evaluatedAlerts = useMemo(
    () =>
      reminders
        .map(evaluateReminder)
        .filter((e) => e.shouldNotify)
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue),
    [reminders]
  );

  useEffect(() => {
    if (!profile) return;
    triggerBrowserReminderNotifications(
      evaluatedAlerts,
      profile.browserNotificationsEnabled
    );
  }, [evaluatedAlerts, profile]);

  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(monthKey)),
    [transactions, monthKey]
  );

  const summary = useMemo(
    () => computeMonthlySummary(transactions, monthKey, split),
    [transactions, monthKey, split]
  );

  const trend = useMemo(
    () => computeMonthlyTrend(transactions, monthKey, 6, split),
    [transactions, monthKey, split]
  );

  const handleToggleTheme = () => {
    if (!user) return;
    void runSafeAsync(
      () => updateUserTheme(user.uid, theme === 'dark' ? 'light' : 'dark'),
      'Impossible de modifier le thème.'
    );
  };

  const handleSaveTransaction = (
    data: Omit<Transaction, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (!user) return;
    void runSafeAsync(async () => {
      if (existingId) {
        const oldTx = transactions.find((t) => t.id === existingId);
        if (oldTx?.goalId && oldTx.bucket === 'savings') {
          const g = goals.find((item) => item.id === oldTx.goalId);
          if (g) {
            await updateGoalCurrentAmount(
              user.uid,
              g.id,
              Math.max(0, g.currentAmount - oldTx.amount)
            );
          }
        }
        if (data.goalId && data.bucket === 'savings') {
          const g = goals.find((item) => item.id === data.goalId);
          if (g) {
            const base =
              oldTx?.goalId === data.goalId && oldTx.bucket === 'savings'
                ? Math.max(0, g.currentAmount - oldTx.amount)
                : g.currentAmount;
            await updateGoalCurrentAmount(user.uid, g.id, base + data.amount);
          }
        }
      } else if (data.goalId && data.bucket === 'savings') {
        const g = goals.find((item) => item.id === data.goalId);
        if (g) {
          await updateGoalCurrentAmount(user.uid, g.id, g.currentAmount + data.amount);
        }
      }

      await upsertTransaction(user.uid, data, existingId);

      const txMonth = data.date.slice(0, 7);
      if (txMonth && txMonth !== monthKey) {
        setMonthKey(txMonth);
      }
    }, 'Impossible d’enregistrer l’opération.');
  };

  const handleDeleteTransaction = (id: string) => {
    if (!user) return;
    void runSafeAsync(async () => {
      const target = transactions.find((t) => t.id === id);
      if (target?.goalId && target.bucket === 'savings') {
        const g = goals.find((item) => item.id === target.goalId);
        if (g) {
          await updateGoalCurrentAmount(
            user.uid,
            g.id,
            Math.max(0, g.currentAmount - target.amount)
          );
        }
      }
      await deleteTransactionDoc(user.uid, id);
    }, 'Impossible de supprimer l’opération.');
  };

  const handleSaveGoal = (
    data: Omit<SavingsGoal, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (!user) return;
    void runSafeAsync(
      () => upsertGoal(user.uid, data, existingId),
      'Impossible d’enregistrer l’objectif d’épargne.'
    );
  };

  const handleDeleteGoal = (id: string) => {
    if (!user) return;
    void runSafeAsync(
      () => deleteGoalDoc(user.uid, id),
      'Impossible de supprimer l’objectif d’épargne.'
    );
  };

  const handleDepositToGoal = (goalId: string, amount: number) => {
    if (!user) return;
    const goal = goals.find((g) => g.id === goalId);
    if (!goal || amount <= 0) return;

    void runSafeAsync(async () => {
      const today = getTodayISO();
      const txDate = today.startsWith(monthKey) ? today : `${monthKey}-15`;

      await upsertTransaction(user.uid, {
        date: txDate,
        label: `Versement : ${goal.title}`,
        amount,
        kind: 'expense',
        bucket: 'savings',
        category: 'Versement objectif',
        goalId,
      });
      await updateGoalCurrentAmount(user.uid, goalId, goal.currentAmount + amount);
    }, 'Impossible d’enregistrer le versement sur cet objectif.');
  };

  const handleSaveReminder = (
    data: Omit<PaymentReminder, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (!user) return;
    void runSafeAsync(
      () => upsertReminder(user.uid, data, existingId),
      'Impossible d’enregistrer le rappel de paiement.'
    );
  };

  const handleMarkReminderPaid = (reminder: PaymentReminder) => {
    if (!user) return;
    void runSafeAsync(async () => {
      const today = getTodayISO();
      await upsertTransaction(user.uid, {
        date: today,
        label: reminder.title,
        amount: reminder.amount,
        kind: 'expense',
        bucket: reminder.bucket,
        category: reminder.category,
        note: reminder.note ? `${reminder.note} (Rappel payé)` : 'Paiement depuis rappel',
      });

      const isOnce = reminder.frequency === 'once';
      const nextDue = isOnce
        ? reminder.dueDate
        : computeNextDueDate(reminder.dueDate, reminder.frequency);

      await markReminderPaidInFirestore(
        user.uid,
        reminder.id,
        nextDue,
        today,
        !isOnce
      );
    }, 'Impossible de valider le paiement du rappel.');
  };

  const handleNavigate = (
    view: AppView,
    bucketFilter?: BudgetBucket,
    categoryFilter?: string
  ) => {
    if (view === 'transactions') {
      setTxFilter(bucketFilter ?? 'all');
      setTxCategoryFilter(categoryFilter ?? '');
    }
    setActiveView(view);
    setMobileMenuOpen(false);
    setNotifPopoverOpen(false);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Chargement de votre espace Ariary 50/30/20...
        </p>
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  const currentNavLabel =
    NAV_ITEMS.find((n) => n.id === activeView)?.label ?? 'Tableau de bord';

  const currentStoreSnapshot: FinanceStore = {
    version: 1,
    transactions,
    goals,
    reminders,
    categories: customCategories,
    split,
    theme,
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Mobile Drawer Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 pb-[env(safe-area-inset-bottom)] lg:pb-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="overflow-y-auto">
          <div className="flex h-14 lg:h-16 items-center justify-between px-5 sm:px-6 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleNavigate('dashboard')}
              className="min-h-[44px] flex items-center font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap"
            >
              Ariary <span className="text-teal-700 dark:text-teal-400 ml-1">50/30/20</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fermer le menu"
              className="h-11 w-11 -mr-2 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav aria-label="Navigation principale" className="p-3 sm:p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full min-h-[44px] flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'reminders' && evaluatedAlerts.length > 0 && (
                    <span className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {evaluatedAlerts.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
          <div className="px-2">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              {profile?.displayName ?? user.displayName ?? 'Mon compte'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {user.email}
            </p>
          </div>

          <p className="px-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            « Chaque ariary compte. Chaque objectif se construit. »
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleTheme}
              className="flex-1 min-h-[44px] lg:min-h-[36px] flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span>{theme === 'dark' ? 'Clair' : 'Sombre'}</span>
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => void signOutGoogle()}
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className="min-h-[44px] min-w-[44px] lg:min-h-[36px] lg:min-w-[36px] flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:sticky lg:top-0 z-30 h-14 lg:h-16 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="hidden sm:inline text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {currentNavLabel}
            </span>
            <span
              className="hidden sm:inline text-slate-300 dark:text-slate-700"
              aria-hidden="true"
            >
              /
            </span>

            <div className="flex items-center gap-0.5 sm:gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setMonthKey((m) => shiftMonthKey(m, -1))}
                aria-label="Mois précédent"
                className="h-10 w-9 sm:h-8 sm:w-8 flex items-center justify-center rounded-md text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-1.5 sm:px-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap min-w-[94px] sm:min-w-[118px] text-center">
                {formatMonthLabel(monthKey)}
              </span>
              <button
                type="button"
                onClick={() => setMonthKey((m) => shiftMonthKey(m, 1))}
                aria-label="Mois suivant"
                className="h-10 w-9 sm:h-8 sm:w-8 flex items-center justify-center rounded-md text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 relative">
            <button
              type="button"
              onClick={() => setNotifPopoverOpen((v) => !v)}
              aria-label="Notifications de rappels de paiement"
              aria-expanded={notifPopoverOpen}
              className="relative h-11 w-11 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Bell className="h-4 w-4" />
              {evaluatedAlerts.length > 0 && (
                <span className="absolute top-1 right-1 sm:-top-1 sm:-right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 font-mono text-[10px] font-bold text-white">
                  {evaluatedAlerts.length}
                </span>
              )}
            </button>

            {notifPopoverOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setNotifPopoverOpen(false)}
                  aria-hidden="true"
                />
                <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-display text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Alertes d’échéances
                    </span>
                    <button
                      type="button"
                      onClick={() => handleNavigate('reminders')}
                      className="min-h-[36px] px-1 inline-flex items-center text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
                    >
                      Tout voir
                    </button>
                  </div>

                  {evaluatedAlerts.length === 0 ? (
                    <p className="py-4 text-xs text-slate-500 dark:text-slate-400 text-center">
                      Aucune facture imminente selon vos seuils de rappel.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-64 overflow-y-auto">
                      {evaluatedAlerts.map((item) => (
                        <div key={item.reminder.id} className="py-2.5 text-xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {item.reminder.title}
                            </span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 shrink-0 tabular-nums">
                              {formatAriary(item.reminder.amount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                            <span>
                              {item.statusLabel} · {formatDateFr(item.reminder.dueDate)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleMarkReminderPaid(item.reminder)}
                              className="min-h-[32px] px-2 font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                            >
                              Payer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setTxModalOpen(true);
              }}
              aria-label="Nouvelle opération"
              className="h-11 sm:h-9 inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 sm:px-3.5 text-xs sm:text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Nouvelle opération</span>
              <span className="hidden min-[375px]:inline sm:hidden">Ajouter</span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1280px] mx-auto px-3.5 py-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 space-y-4 sm:space-y-6">
          {actionError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionError('')}
                aria-label="Fermer l’alerte"
                className="h-9 w-9 shrink-0 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {dataLoading && !profile ? (
            <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              Synchronisation de vos données Firestore...
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Chargement de la vue...
                </div>
              }
            >
              {activeView === 'dashboard' && (
                <DashboardView
                  monthKey={monthKey}
                  onSelectMonth={setMonthKey}
                  summary={summary}
                  trend={trend}
                  monthTransactions={monthTransactions}
                  goals={goals}
                  reminders={reminders}
                  customCategories={customCategories}
                  onAddTransaction={() => {
                    setEditingTx(null);
                    setTxModalOpen(true);
                  }}
                  onMarkReminderPaid={handleMarkReminderPaid}
                  onNavigate={handleNavigate}
                />
              )}

              {activeView === 'transactions' && (
                <TransactionsView
                  monthKey={monthKey}
                  transactions={transactions}
                  initialFilter={txFilter}
                  initialCategoryFilter={txCategoryFilter}
                  onAddTransaction={() => {
                    setEditingTx(null);
                    setTxModalOpen(true);
                  }}
                  onEditTransaction={(tx) => {
                    setEditingTx(tx);
                    setTxModalOpen(true);
                  }}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              )}

              {activeView === 'categories' && (
                <CategoriesView
                  monthKey={monthKey}
                  transactions={transactions}
                  customCategories={customCategories}
                  onCreateCategory={(data) => {
                    void runSafeAsync(
                      () => createCustomCategory(user.uid, data),
                      'Impossible de créer la catégorie.'
                    );
                  }}
                  onDeleteCategory={(id) => {
                    void runSafeAsync(
                      () => deleteCustomCategoryDoc(user.uid, id),
                      'Impossible de supprimer la catégorie.'
                    );
                  }}
                  onFilterByCategory={(cat) =>
                    handleNavigate('transactions', undefined, cat)
                  }
                />
              )}

              {activeView === 'reminders' && (
                <RemindersView
                  reminders={reminders}
                  browserNotificationsEnabled={
                    profile?.browserNotificationsEnabled ?? false
                  }
                  onToggleBrowserNotifications={(enabled) => {
                    void runSafeAsync(
                      () => updateUserBrowserNotifications(user.uid, enabled),
                      'Impossible de mettre à jour les préférences de notification.'
                    );
                  }}
                  onAddReminder={() => {
                    setEditingRem(null);
                    setRemModalOpen(true);
                  }}
                  onEditReminder={(rem) => {
                    setEditingRem(rem);
                    setRemModalOpen(true);
                  }}
                  onDeleteReminder={(id) => {
                    void runSafeAsync(
                      () => deleteReminderDoc(user.uid, id),
                      'Impossible de supprimer le rappel.'
                    );
                  }}
                  onToggleEnabled={(id, enabled) => {
                    void runSafeAsync(
                      () => toggleReminderEnabled(user.uid, id, enabled),
                      'Impossible de modifier le statut du rappel.'
                    );
                  }}
                  onMarkPaid={handleMarkReminderPaid}
                />
              )}

              {activeView === 'budget' && (
                <BudgetRuleView
                  monthKey={monthKey}
                  summary={summary}
                  split={split}
                  onUpdateSplit={(newSplit) => {
                    void runSafeAsync(
                      () => updateUserSplit(user.uid, newSplit),
                      'Impossible d’enregistrer la répartition 50/30/20.'
                    );
                  }}
                  onFilterTransactions={(bucket) =>
                    handleNavigate('transactions', bucket)
                  }
                />
              )}

              {activeView === 'goals' && (
                <GoalsView
                  goals={goals}
                  monthlySavingsCapacity={summary.buckets.savings.targetAmount}
                  onAddGoal={() => {
                    setEditingGoal(null);
                    setGoalModalOpen(true);
                  }}
                  onEditGoal={(goal) => {
                    setEditingGoal(goal);
                    setGoalModalOpen(true);
                  }}
                  onDeleteGoal={handleDeleteGoal}
                  onDepositToGoal={handleDepositToGoal}
                />
              )}

              {activeView === 'gmail' && (
                <GmailView
                  userEmail={user.email ?? ''}
                  monthKey={monthKey}
                  summary={summary}
                  evaluatedAlerts={evaluatedAlerts}
                  onImportTransaction={(draft) => {
                    setEditingTx(null);
                    setTxDraft(draft);
                    setTxModalOpen(true);
                  }}
                  onCreateReminder={(draft) => {
                    setEditingRem(null);
                    setRemDraft(draft);
                    setRemModalOpen(true);
                  }}
                />
              )}

              {activeView === 'storage' && profile && (
                <LocalDataView
                  profile={profile}
                  store={currentStoreSnapshot}
                  onImportStore={async (imported) => {
                    await clearUserSubcollections(user.uid);
                    await writeStoreToFirestore(user.uid, imported);
                  }}
                  onClearAll={async () => {
                    await clearUserSubcollections(user.uid);
                  }}
                />
              )}
            </Suspense>
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Navigation mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-14 max-w-lg mx-auto">
          {(
            [
              { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
              { id: 'transactions', label: 'Opérations', icon: ArrowLeftRight },
              { id: 'reminders', label: 'Rappels', icon: Bell },
              { id: 'goals', label: 'Objectifs', icon: Target },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleNavigate(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'text-teal-700 dark:text-teal-400 font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-0.5 w-6 rounded-full bg-teal-700 dark:bg-teal-400"
                  />
                )}
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {tab.id === 'reminders' && evaluatedAlerts.length > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-600 px-1 font-mono text-[9px] font-bold text-white">
                      {evaluatedAlerts.length}
                    </span>
                  )}
                </span>
                <span className="truncate max-w-full">{tab.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Ouvrir le menu complet"
            className={`relative flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors ${
              activeView === 'categories' ||
              activeView === 'budget' ||
              activeView === 'gmail' ||
              activeView === 'storage'
                ? 'text-teal-700 dark:text-teal-400 font-semibold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            {(activeView === 'categories' ||
              activeView === 'budget' ||
              activeView === 'gmail' ||
              activeView === 'storage') && (
              <span
                aria-hidden="true"
                className="absolute top-0 h-0.5 w-6 rounded-full bg-teal-700 dark:bg-teal-400"
              />
            )}
            <Menu className="h-5 w-5" />
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTx(null);
          setTxDraft(null);
        }}
        onSave={handleSaveTransaction}
        onCreateCategory={(data) => {
          void runSafeAsync(
            () => createCustomCategory(user.uid, data),
            'Impossible de créer la catégorie personnalisée.'
          );
        }}
        editingTransaction={editingTx}
        initialDraft={txDraft}
        goals={goals}
        customCategories={customCategories}
        defaultMonthKey={monthKey}
      />

      <GoalModal
        isOpen={goalModalOpen}
        onClose={() => {
          setGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onSaveGoal={handleSaveGoal}
        editingGoal={editingGoal}
      />

      <ReminderModal
        isOpen={remModalOpen}
        onClose={() => {
          setRemModalOpen(false);
          setEditingRem(null);
          setRemDraft(null);
        }}
        onSave={handleSaveReminder}
        editingReminder={editingRem}
        initialDraft={remDraft}
        customCategories={customCategories}
      />
    </div>
  );
}
