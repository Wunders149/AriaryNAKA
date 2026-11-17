import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react';
import { SavingsGoal } from '../../types/finance';
import { computeGoalPace } from '../../utils/budget';
import { formatAriary, formatDateFr, formatPercent } from '../../utils/format';

interface GoalsViewProps {
  goals: SavingsGoal[];
  monthlySavingsCapacity: number;
  onAddGoal: () => void;
  onEditGoal: (goal: SavingsGoal) => void;
  onDeleteGoal: (id: string) => void;
  onDepositToGoal: (goalId: string, amount: number) => void;
}

const PRIORITY_LABELS: Record<SavingsGoal['priority'], string> = {
  high: 'Prioritaire',
  medium: 'Modérée',
  low: 'Long terme',
};

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  monthlySavingsCapacity,
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
  onDepositToGoal,
}) => {
  const [depositingGoalId, setDepositingGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
  const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0);
  const overallPercent = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;

  const handleDepositSubmit = (e: React.FormEvent, goalId: string) => {
    e.preventDefault();
    const numeric = Math.round(Number(depositAmount.replace(/\s+/g, '')));
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    onDepositToGoal(goalId, numeric);
    setDepositAmount('');
    setDepositingGoalId(null);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Objectifs d’épargne
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Définissez vos objectifs, planifiez votre versement régulier et suivez votre progression vers chaque échéance.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddGoal}
          className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nouvel objectif
        </button>
      </div>

      {/* Summary Bar */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Capital cumulé sur vos objectifs
            </span>
            <p className="mt-1 font-mono text-xl sm:text-2xl font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {formatAriary(totalSaved)}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Total visé ({goals.length} objectif{goals.length > 1 ? 's' : ''})
            </span>
            <p className="mt-1 font-mono text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatAriary(totalTarget)}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Capacité mensuelle (enveloppe 20 %)
            </span>
            <p className="mt-1 font-mono text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatAriary(monthlySavingsCapacity)}
            </p>
          </div>
        </div>

        {totalTarget > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
              <span>Avancement global de vos projets</span>
              <span className="font-mono font-semibold tabular-nums">
                {formatPercent(overallPercent, 1)}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-200"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 sm:p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Aucun objectif financier configuré.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Définissez un fonds d’urgence, un achat d’équipement ou un projet immobilier pour suivre votre progression en Ariary.
          </p>
          <button
            type="button"
            onClick={onAddGoal}
            className="mt-5 min-h-[44px] inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Créer mon premier objectif
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {goals.map((goal) => {
            const pace = computeGoalPace(goal);
            const isDepositing = depositingGoalId === goal.id;
            const isConfirmingDelete = confirmDeleteId === goal.id;

            return (
              <article
                key={goal.id}
                className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <span>{PRIORITY_LABELS[goal.priority]}</span>
                        <span aria-hidden="true"> · </span>
                        <span>Échéance {formatDateFr(goal.deadline)}</span>
                      </p>
                      <h2 className="mt-1 font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 break-words">
                        {goal.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 -mr-1.5 -mt-1">
                      <button
                        type="button"
                        onClick={() => onEditGoal(goal)}
                        aria-label={`Modifier ${goal.title}`}
                        className="h-11 w-11 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      >
                        <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(goal.id)}
                        aria-label={`Supprimer ${goal.title}`}
                        className="h-11 w-11 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </button>
                    </div>
                  </div>

                  {goal.description && (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                      {goal.description}
                    </p>
                  )}

                  {/* Progress numbers */}
                  <div className="mt-4 sm:mt-5 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatAriary(goal.currentAmount)}
                    </span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      sur {formatAriary(goal.targetAmount)} ({formatPercent(pace.percent, 0)})
                    </span>
                  </div>

                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-200"
                      style={{ width: `${pace.percent}%` }}
                    />
                  </div>

                  {/* Regular contribution & pace comparison */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                    {pace.isCompleted ? (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Objectif atteint
                      </span>
                    ) : (
                      <span className="font-mono tabular-nums">
                        Reste : {formatAriary(pace.remaining)}
                      </span>
                    )}

                    {!pace.isCompleted && (
                      <span className="font-mono tabular-nums">
                        Requis : {formatAriary(pace.monthlyRequired)} / mois
                      </span>
                    )}
                  </div>

                  {!pace.isCompleted && goal.regularAmount > 0 && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Planifié : {formatAriary(goal.regularAmount)} /{' '}
                        {goal.regularFrequency === 'weekly' ? 'sem.' : 'mois'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          pace.isOnTrack
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {pace.isOnTrack ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5" />
                        )}
                        {pace.isOnTrack ? 'Rythme suffisant' : 'Rythme à augmenter'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions footer */}
                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
                  {isConfirmingDelete ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="text-red-700 dark:text-red-400 font-medium">
                        Supprimer cet objectif ?
                      </span>
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[44px] sm:min-h-[32px] rounded-lg sm:rounded-md border border-slate-300 px-3.5 py-2 sm:px-3 sm:py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteGoal(goal.id);
                            setConfirmDeleteId(null);
                          }}
                          className="min-h-[44px] sm:min-h-[32px] rounded-lg sm:rounded-md bg-red-600 px-3.5 py-2 sm:px-3 sm:py-1.5 font-medium text-white hover:bg-red-700"
                        >
                          Confirmer
                        </button>
                      </div>
                    </div>
                  ) : isDepositing ? (
                    <form
                      onSubmit={(e) => handleDepositSubmit(e, goal.id)}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input
                        type="number"
                        inputMode="numeric"
                        min={100}
                        step={1000}
                        autoFocus
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="Montant en Ar"
                        className="flex-1 min-w-[130px] min-h-[44px] sm:min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 py-2 sm:py-1.5 font-mono text-base sm:text-sm text-slate-900 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 tabular-nums"
                      />
                      <button
                        type="submit"
                        className="min-h-[44px] sm:min-h-[36px] rounded-lg bg-emerald-700 px-3.5 py-2 sm:py-1.5 text-xs font-medium text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 whitespace-nowrap"
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDepositingGoalId(null);
                          setDepositAmount('');
                        }}
                        className="min-h-[44px] sm:min-h-[36px] rounded-lg border border-slate-300 px-3.5 py-2 sm:py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Annuler
                      </button>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Enregistré en épargne (20 %)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDepositingGoalId(goal.id);
                          const suggested =
                            goal.regularAmount > 0
                              ? goal.regularAmount
                              : pace.monthlyRequired > 0
                              ? Math.min(pace.remaining, pace.monthlyRequired)
                              : 50000;
                          setDepositAmount(String(suggested));
                        }}
                        className="w-full sm:w-auto min-h-[44px] sm:min-h-[34px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 sm:py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter un versement
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
