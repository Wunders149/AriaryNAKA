import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { SavingsGoal } from '../types/finance';
import { formatAriary, getTodayISO } from '../utils/format';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveGoal: (
    data: Omit<SavingsGoal, 'id' | 'createdAt'>,
    existingId?: string
  ) => void;
  editingGoal?: SavingsGoal | null;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  onSaveGoal,
  editingGoal,
}) => {
  const [title, setTitle] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [currentStr, setCurrentStr] = useState('');
  const [regularStr, setRegularStr] = useState('');
  const [regularFrequency, setRegularFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<SavingsGoal['priority']>('high');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingGoal) {
      setTitle(editingGoal.title);
      setTargetStr(String(editingGoal.targetAmount));
      setCurrentStr(String(editingGoal.currentAmount));
      setRegularStr(String(editingGoal.regularAmount ?? 0));
      setRegularFrequency(editingGoal.regularFrequency ?? 'monthly');
      setDeadline(editingGoal.deadline);
      setPriority(editingGoal.priority);
      setDescription(editingGoal.description ?? '');
    } else {
      setTitle('');
      setTargetStr('');
      setCurrentStr('0');
      setRegularStr('200000');
      setRegularFrequency('monthly');
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      setDeadline(d.toISOString().slice(0, 10));
      setPriority('high');
      setDescription('');
    }
  }, [isOpen, editingGoal]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmount = Math.round(Number(targetStr.replace(/\s+/g, '')));
    const currentAmount = Math.max(0, Math.round(Number(currentStr.replace(/\s+/g, '') || 0)));
    const regularAmount = Math.max(0, Math.round(Number(regularStr.replace(/\s+/g, '') || 0)));

    if (!title.trim()) {
      setError('Veuillez donner un nom à votre objectif.');
      return;
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setError('Veuillez indiquer un montant cible positif en Ariary.');
      return;
    }
    if (!deadline) {
      setError('Veuillez choisir une date cible.');
      return;
    }

    onSaveGoal(
      {
        title: title.trim(),
        targetAmount,
        currentAmount,
        regularAmount,
        regularFrequency,
        deadline,
        priority,
        description: description.trim() || undefined,
      },
      editingGoal?.id
    );
    onClose();
  };

  const previewTarget = Number(targetStr.replace(/\s+/g, ''));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 p-0 sm:p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xl max-h-[92dvh] flex flex-col overflow-hidden animate-sheet-up">
        <div className="sm:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" aria-hidden="true" />
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2
            id="goal-modal-title"
            className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            {editingGoal ? 'Modifier l’objectif d’épargne' : 'Nouvel objectif d’épargne'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="h-11 w-11 sm:h-9 sm:w-9 -mr-2 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 space-y-4">
          <div>
            <label
              htmlFor="goal-title"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Nom de l’objectif
            </label>
            <input
              id="goal-title"
              type="text"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Fonds d’urgence, Achat moto, Projet scolaire..."
              className="w-full min-h-[44px] sm:min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="goal-target"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Montant cible (Ar)
              </label>
              <input
                id="goal-target"
                type="number"
                inputMode="numeric"
                min={1000}
                step={1000}
                value={targetStr}
                onChange={(e) => setTargetStr(e.target.value)}
                placeholder="3000000"
                className="w-full min-h-[44px] sm:min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 tabular-nums"
              />
              {Number.isFinite(previewTarget) && previewTarget > 0 && (
                <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatAriary(previewTarget)}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="goal-current"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Déjà épargné (Ar)
              </label>
              <input
                id="goal-current"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={currentStr}
                onChange={(e) => setCurrentStr(e.target.value)}
                placeholder="0"
                className="w-full min-h-[44px] sm:min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="goal-regular"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Épargne régulière prévue (Ar)
              </label>
              <input
                id="goal-regular"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={regularStr}
                onChange={(e) => setRegularStr(e.target.value)}
                placeholder="200000"
                className="w-full min-h-[44px] sm:min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-base sm:text-sm text-slate-900 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="goal-regular-freq"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Rythme de versement
              </label>
              <select
                id="goal-regular-freq"
                value={regularFrequency}
                onChange={(e) =>
                  setRegularFrequency(e.target.value as 'weekly' | 'monthly')
                }
                className="w-full min-h-[44px] sm:min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="monthly">Par mois</option>
                <option value="weekly">Par semaine</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="goal-deadline"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Échéance souhaitée
              </label>
              <input
                id="goal-deadline"
                type="date"
                min={getTodayISO()}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="goal-priority"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Priorité
              </label>
              <select
                id="goal-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as SavingsGoal['priority'])}
                className="w-full min-h-[44px] sm:min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="high">Prioritaire</option>
                <option value="medium">Modérée</option>
                <option value="low">Long terme</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="goal-desc"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Description (optionnelle)
            </label>
            <input
              id="goal-desc"
              type="text"
              maxLength={240}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex. Réserve pour 6 mois de charges essentielles"
              className="w-full min-h-[44px] sm:min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-red-700 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] sm:min-h-[38px] rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="min-h-[44px] sm:min-h-[38px] rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500 whitespace-nowrap"
            >
              {editingGoal ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
