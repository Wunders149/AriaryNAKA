import React, { useState } from 'react';
import { Bell, PieChart, ShieldCheck, Target } from 'lucide-react';
import { signInWithGoogle } from '../firebase/client';
import { GoogleSignInButton } from './GoogleSignInButton';

export const AuthGate: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      const msg =
        err instanceof Error
          ? err.message
          : 'Impossible d’ouvrir la fenêtre de connexion Google.';

      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setError(
          `Domaine (${window.location.hostname}) non autorisé dans Firebase Authentication. Ajoutez-le dans Console Firebase > Authentication > Settings > Authorized domains.`
        );
      } else if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
        setError(
          'La fenêtre de connexion Google a été bloquée par le navigateur. Autorisez les pop-ups puis réessayez.'
        );
      } else if (!msg.includes('popup-closed-by-user')) {
        setError('Échec de la connexion Google. Veuillez réessayer.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col justify-between px-4 py-5 sm:p-10 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <header className="max-w-5xl w-full mx-auto flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-lg sm:text-xl font-bold tracking-tight">
          Ariary <span className="text-teal-700 dark:text-teal-400">50/30/20</span>
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Gestion financière · Madagascar (Ar)
        </span>
      </header>

      <main className="max-w-5xl w-full mx-auto my-8 sm:my-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        <div className="lg:col-span-7 space-y-4 sm:space-y-5">
          <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
            Méthode budgétaire 50 / 30 / 20
          </p>
          <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
            Chaque ariary compte. Chaque objectif se construit.
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
            Organisez vos revenus et vos dépenses en Ariary, catégorisez vos postes de sortie, planifiez vos rappels d’échéances et suivez vos objectifs d’épargne sur tous vos appareils grâce à la synchronisation sécurisée Google & Firestore.
          </p>

          <div className="pt-2 space-y-3">
            <GoogleSignInButton
              onClick={handleSignIn}
              loading={loading}
              label="Se connecter avec Google"
              loadingLabel="Connexion en cours..."
            />

            {error && (
              <p className="text-xs font-medium text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
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
