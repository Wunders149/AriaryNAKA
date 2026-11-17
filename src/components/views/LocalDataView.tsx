import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Download,
  FileSpreadsheet,
  Trash2,
  Upload,
} from 'lucide-react';
import { FinanceStore, UserProfile } from '../../types/finance';
import {
  exportTransactionsCsv,
  loadLocalStoreIfPresent,
  validateImportedStore,
} from '../../utils/storage';

interface LocalDataViewProps {
  profile: UserProfile;
  store: FinanceStore;
  onImportStore: (imported: FinanceStore) => Promise<void>;
  onClearAll: () => Promise<void>;
}

export const LocalDataView: React.FC<LocalDataViewProps> = ({
  profile,
  store,
  onImportStore,
  onClearAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);

  const localBackup = loadLocalStoreIfPresent();

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ariary-50-30-20-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({
      type: 'success',
      message: 'Sauvegarde JSON téléchargée sur votre appareil.',
    });
  };

  const handleDownloadCsv = () => {
    const csv = exportTransactionsCsv(store.transactions);
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ariary-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({
      type: 'success',
      message: 'Export CSV des opérations téléchargé.',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const validated = validateImportedStore(content);
      if (!validated) {
        setFeedback({
          type: 'error',
          message:
            'Fichier invalide. Veuillez sélectionner une sauvegarde JSON Ariary 50/30/20 valide.',
        });
        return;
      }
      setBusy(true);
      try {
        await onImportStore(validated);
        setFeedback({
          type: 'success',
          message: `${validated.transactions.length} opérations et ${validated.goals.length} objectifs restaurés dans votre espace Firestore.`,
        });
      } catch {
        setFeedback({
          type: 'error',
          message: 'Échec de l’importation vers Firestore. Vérifiez votre connexion.',
        });
      } finally {
        setBusy(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleMigrateLocal = async () => {
    if (!localBackup) return;
    setBusy(true);
    try {
      await onImportStore(localBackup);
      setFeedback({
        type: 'success',
        message: 'Vos données locales précédentes ont été importées dans votre compte Firestore.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Impossible d’importer les données locales. Vérifiez votre connexion.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          Synchronisation et sauvegarde
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Vos données sont synchronisées en temps réel sur Cloud Firestore pour votre compte Google ({profile.email}) et restent exportables à tout moment.
        </p>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Sync Inventory */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 dark:border-slate-800">
          <Cloud className="h-4 w-4 text-teal-700 dark:text-teal-400" />
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Inventaire de votre espace Firestore
          </h2>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Opérations
            </span>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {store.transactions.length}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Objectifs d’épargne
            </span>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {store.goals.length}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Rappels actifs
            </span>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {(store.reminders ?? []).length}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Catégories perso.
            </span>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {(store.categories ?? []).length}
            </p>
          </div>
        </div>
      </section>

      {localBackup && localBackup.transactions.length > 0 && (
        <section className="rounded-xl border border-teal-200 bg-teal-50/60 p-5 dark:border-teal-900/60 dark:bg-teal-950/30 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Données locales détectées sur cet appareil
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {localBackup.transactions.length} opérations locales trouvées. Vous pouvez les importer dans votre compte Firestore (remplace les données actuelles du compte).
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleMigrateLocal}
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600"
          >
            Importer mes données locales
          </button>
        </section>
      )}

      {/* Export / Import */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Exporter vos données
            </h2>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Téléchargez une archive JSON complète (opérations, objectifs, rappels, catégories) ou exportez vos opérations au format CSV pour tableur.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <Download className="h-3.5 w-3.5" />
              Sauvegarde JSON
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export CSV (Excel)
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Restaurer une sauvegarde
            </h2>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Importez un fichier JSON Ariary 50/30/20 pour restaurer vos opérations, objectifs, rappels et catégories dans votre compte Firestore.
            </p>
          </div>

          <div className="mt-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Upload className="h-3.5 w-3.5" />
              {busy ? 'Importation...' : 'Importer un fichier JSON'}
            </button>
          </div>
        </section>
      </div>

      {/* Reset Workspace */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Réinitialisation du compte
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Téléchargez d’abord une sauvegarde JSON ci-dessus avant de supprimer vos enregistrements. Cette opération supprime vos opérations, objectifs, rappels et catégories personnalisées.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {confirmClear ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-red-700 dark:text-red-400">
                Confirmer la suppression définitive de toutes vos données ?
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onClearAll();
                    setConfirmClear(false);
                    setFeedback({
                      type: 'success',
                      message: 'Toutes vos données ont été effacées. Votre compte repart à zéro.',
                    });
                  } catch {
                    setFeedback({
                      type: 'error',
                      message: 'Erreur lors de la suppression des données Firestore.',
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirmer l’effacement
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:bg-slate-950 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Effacer toutes les données du compte
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
