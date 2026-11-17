import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { Bell, PieChart, ShieldCheck, Target } from 'lucide-react';
import { auth, googleProvider } from '../firebase/client';

export const AuthGate: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Impossible d’ouvrir la fenêtre de connexion Google.';
      if (!msg.includes('popup-closed-by-user')) {
        setError('Échec de la connexion Google. Veuillez réessayer.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col justify-between p-6 sm:p-10">
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <span className="font-display text-xl font-bold tracking-tight">
          Ariary <span className="text-teal-700 dark:text-teal-400">50/30/20</span>
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Gestion financière personnelle · Madagascar (Ar)
        </span>
      </header>

      <main className="max-w-5xl w-full mx-auto my-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-5">
          <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
            Méthode budgétaire 50 / 30 / 20
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
            Chaque ariary compte. Chaque objectif se construit.
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
            Organisez vos revenus et vos dépenses en Ariary, catégorisez vos postes de sortie, planifiez vos rappels d’échéances et suivez vos objectifs d’épargne sur tous vos appareils grâce à la synchronisation sécurisée Google & Firestore.
          </p>

          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={loading}
              className="inline-flex items-center justify-center gap-3 rounded-lg bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81"
                />
              </svg>
              {loading ? 'Connexion en cours...' : 'Se connecter avec Google'}
            </button>

            {error && (
              <p className="text-xs font-medium text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
          <div className="pb-4 flex items-start gap-3">
            <PieChart className="h-5 w-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Répartition 50/30/20 & Catégories
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Visualisez vos dépenses par enveloppe et créez vos propres catégories personnalisées.
              </p>
            </div>
          </div>

          <div className="py-4 flex items-start gap-3">
            <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Rappels de paiement récurrents
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Anticipez vos factures (JIRAMA, loyer, abonnements) avec des alertes avant échéance.
              </p>
            </div>
          </div>

          <div className="py-4 flex items-start gap-3">
            <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Objectifs d’épargne mesurables
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Définissez montant cible, échéance et versements réguliers pour concrétiser vos projets.
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Espace privé chiffré par compte
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Vos données sont isolées et synchronisées sur Firestore uniquement pour votre compte Google.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto text-xs text-slate-500 dark:text-slate-400">
        Ariary 50/30/20 · Authentification Firebase & Cloud Firestore
      </footer>
    </div>
  );
};
