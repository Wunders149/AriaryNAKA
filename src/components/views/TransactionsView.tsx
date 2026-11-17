import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { BUCKET_META, BudgetBucket, Transaction } from '../../types/finance';
import { formatAriary, formatDateFr, formatMonthLabel } from '../../utils/format';

export type TransactionFilter = 'all' | 'income' | BudgetBucket;

interface TransactionsViewProps {
  monthKey: string;
  transactions: Transaction[];
  initialFilter?: TransactionFilter;
  initialCategoryFilter?: string;
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  monthKey,
  transactions,
  initialFilter = 'all',
  initialCategoryFilter = '',
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [filter, setFilter] = useState<TransactionFilter>(initialFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategoryFilter);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc'>('date-desc');
  const [scopeAllMonths, setScopeAllMonths] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  React.useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  React.useEffect(() => {
    setCategoryFilter(initialCategoryFilter);
  }, [initialCategoryFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((tx) => {
        if (!scopeAllMonths && !tx.date.startsWith(monthKey)) return false;
        if (filter === 'income' && tx.kind !== 'income') return false;
        if (
          (filter === 'needs' || filter === 'wants' || filter === 'savings') &&
          (tx.kind !== 'expense' || tx.bucket !== filter)
        ) {
          return false;
        }
        if (categoryFilter && tx.category.toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
        if (q) {
          const hay = `${tx.label} ${tx.category} ${tx.note ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        return b.date.localeCompare(a.date);
      });
  }, [transactions, monthKey, scopeAllMonths, filter, categoryFilter, search, sortBy]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filtered) {
      if (tx.kind === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const filterTabs: { id: TransactionFilter; label: string }[] = [
    { id: 'all', label: 'Toutes' },
    { id: 'income', label: 'Revenus' },
    { id: 'needs', label: 'Besoins (50%)' },
    { id: 'wants', label: 'Envies (30%)' },
    { id: 'savings', label: 'Épargne (20%)' },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Journal des opérations
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {scopeAllMonths
              ? 'Historique complet toutes périodes confondues'
              : `Opérations enregistrées pour ${formatMonthLabel(monthKey)}`}
          </p>
        </div>

        <button
          type="button"
          onClick={onAddTransaction}
          className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nouvelle opération
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3.5 sm:space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[38px] sm:min-h-[32px] rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher libellé, catégorie..."
                className="w-full min-h-[44px] sm:min-h-[36px] rounded-lg border border-slate-300 bg-white py-2 sm:py-1.5 pl-9 pr-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex items-center gap-2.5">
              <select
                aria-label="Trier les opérations"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="min-h-[44px] sm:min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 py-2 sm:py-1.5 text-base sm:text-sm text-slate-700 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="date-desc">Plus récentes</option>
                <option value="date-asc">Plus anciennes</option>
                <option value="amount-desc">Montant décroissant</option>
              </select>

              <button
                type="button"
                onClick={() => setScopeAllMonths((v) => !v)}
                className={`min-h-[44px] sm:min-h-[36px] rounded-lg border px-3 py-2 sm:py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  scopeAllMonths
                    ? 'border-teal-700 bg-teal-50 text-teal-800 dark:border-teal-500 dark:bg-teal-950/50 dark:text-teal-300'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {scopeAllMonths ? 'Tous les mois' : 'Mois affiché'}
              </button>
            </div>
          </div>
        </div>

        {/* Active category filter indicator */}
        {categoryFilter && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-600 dark:text-slate-300">
              Catégorie filtrée : <strong>{categoryFilter}</strong>
            </span>
            <button
              type="button"
              onClick={() => setCategoryFilter('')}
              className="min-h-[36px] inline-flex items-center gap-1 font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              <X className="h-3.5 w-3.5" />
              Retirer le filtre
            </button>
          </div>
        )}

        {/* Summary strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <span>
            {filtered.length} opération{filtered.length > 1 ? 's' : ''} affichée
            {filtered.length > 1 ? 's' : ''}
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono tabular-nums">
            <span>
              Revenus :{' '}
              <strong className="text-emerald-700 dark:text-emerald-400">
                {formatAriary(totals.income)}
              </strong>
            </span>
            <span>
              Sorties :{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {formatAriary(totals.expense)}
              </strong>
            </span>
            <span>
              Flux net :{' '}
              <strong
                className={
                  totals.net < 0
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-slate-900 dark:text-slate-100'
                }
              >
                {formatAriary(totals.net, true)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Data Display: Mobile Card List + Desktop Table */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 px-4 sm:px-6 text-center">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Aucune opération ne correspond à ces critères.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Ajoutez un revenu ou une dépense, ou élargissez la période de recherche.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {(filter !== 'all' || search || categoryFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilter('all');
                    setCategoryFilter('');
                    setSearch('');
                  }}
                  className="min-h-[44px] rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Réinitialiser les filtres
                </button>
              )}
              <button
                type="button"
                onClick={onAddTransaction}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Enregistrer une opération
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((tx) => {
                const isIncome = tx.kind === 'income';
                const meta = tx.bucket ? BUCKET_META[tx.bucket] : null;
                const isConfirming = confirmDeleteId === tx.id;

                return (
                  <div key={tx.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-slate-900 dark:text-slate-100 break-words">
                          {tx.label}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span className="font-mono tabular-nums">{formatDateFr(tx.date)}</span>
                          <span aria-hidden="true">·</span>
                          <button
                            type="button"
                            onClick={() => setCategoryFilter(tx.category)}
                            className="underline-offset-2 hover:underline text-slate-700 dark:text-slate-300"
                          >
                            {tx.category}
                          </button>
                          <span aria-hidden="true">·</span>
                          {isIncome ? (
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">
                              Revenu
                            </span>
                          ) : meta ? (
                            <span className={`font-medium ${meta.textClass}`}>
                              {meta.shortLabel}
                            </span>
                          ) : null}
                        </p>
                        {tx.note && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 break-words">
                            {tx.note}
                          </p>
                        )}
                      </div>

                      <div
                        className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${
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

                    <div className="flex items-center justify-end gap-2 pt-1">
                      {isConfirming ? (
                        <div className="flex items-center gap-2 w-full justify-end">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="min-h-[44px] rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteTransaction(tx.id);
                              setConfirmDeleteId(null);
                            }}
                            className="min-h-[44px] rounded-lg bg-red-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-red-700"
                          >
                            Confirmer
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            aria-label={`Modifier ${tx.label}`}
                            className="h-11 px-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(tx.id)}
                            aria-label={`Supprimer ${tx.label}`}
                            className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-700 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Libellé</th>
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4">Enveloppe 50/30/20</th>
                    <th className="py-3 px-4 text-right">Montant</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  {filtered.map((tx) => {
                    const isIncome = tx.kind === 'income';
                    const meta = tx.bucket ? BUCKET_META[tx.bucket] : null;
                    const isConfirming = confirmDeleteId === tx.id;

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                          {formatDateFr(tx.date)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {tx.label}
                          </div>
                          {tx.note && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {tx.note}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setCategoryFilter(tx.category)}
                            className="hover:underline"
                          >
                            {tx.category}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-xs whitespace-nowrap">
                          {isIncome ? (
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">
                              Revenu
                            </span>
                          ) : meta ? (
                            <span className={`font-medium ${meta.textClass}`}>
                              {meta.shortLabel}
                            </span>
                          ) : null}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-semibold whitespace-nowrap tabular-nums ${
                            isIncome
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {isIncome
                            ? formatAriary(tx.amount, true)
                            : formatAriary(-tx.amount)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {isConfirming ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteTransaction(tx.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="text-xs font-medium text-red-700 hover:underline dark:text-red-400"
                              >
                                Confirmer
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-xs text-slate-500 hover:underline dark:text-slate-400"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEditTransaction(tx)}
                                aria-label={`Modifier ${tx.label}`}
                                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(tx.id)}
                                aria-label={`Supprimer ${tx.label}`}
                                className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
