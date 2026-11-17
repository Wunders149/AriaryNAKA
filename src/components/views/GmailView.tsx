import React, { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  BellPlus,
  CheckCircle2,
  FilePlus2,
  Inbox,
  Mail,
  MailOpen,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  connectGmailWithGoogle,
  subscribeGmailAccessToken,
} from '../../firebase/client';
import {
  GmailAuthError,
  GmailLabel,
  GmailMessageSummary,
  buildReminderDraftFromEmail,
  buildTransactionDraftFromEmail,
  createGmailDraft,
  createGmailLabel,
  listGmailLabels,
  listGmailMessages,
  modifyGmailMessageLabels,
  sendGmailMessage,
  trashGmailMessage,
} from '../../services/gmailService';
import { PaymentReminder, Transaction } from '../../types/finance';
import { MonthlySummary } from '../../utils/budget';
import { formatAriary, formatDateFr, formatMonthLabel } from '../../utils/format';
import { EvaluatedReminder } from '../../utils/reminders';
import { GoogleSignInButton } from '../GoogleSignInButton';

interface GmailViewProps {
  userEmail: string;
  monthKey: string;
  summary: MonthlySummary;
  evaluatedAlerts: EvaluatedReminder[];
  onImportTransaction: (
    draft: Partial<Omit<Transaction, 'id' | 'createdAt'>>
  ) => void;
  onCreateReminder: (
    draft: Partial<Omit<PaymentReminder, 'id' | 'createdAt'>>
  ) => void;
}

type GmailTab = 'inbox' | 'compose' | 'labels';
type QuickFilter = 'all' | 'unread' | 'receipts';

interface PendingMutation {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  execute: () => Promise<void>;
}

const RECEIPTS_QUERY =
  'facture OR reçu OR paiement OR JIRAMA OR MVola OR Orange OR Airtel OR invoice OR receipt';

export const GmailView: React.FC<GmailViewProps> = ({
  userEmail,
  monthKey,
  summary,
  evaluatedAlerts,
  onImportTransaction,
  onCreateReminder,
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [tab, setTab] = useState<GmailTab>('inbox');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [selectedLabelId, setSelectedLabelId] = useState<string>('');

  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [selectedMessage, setSelectedMessage] =
    useState<GmailMessageSummary | null>(null);

  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [mutating, setMutating] = useState(false);

  const [error, setError] = useState('');
  const [statusNotice, setStatusNotice] = useState('');

  // Compose state
  const [to, setTo] = useState(userEmail);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // New label state
  const [newLabelName, setNewLabelName] = useState('');

  // Mandatory explicit user confirmation modal state before any Gmail write/delete
  const [pendingMutation, setPendingMutation] =
    useState<PendingMutation | null>(null);

  useEffect(() => {
    const unsub = subscribeGmailAccessToken((token) => {
      setAccessToken(token);
    });
    return () => unsub();
  }, []);

  const handleApiError = useCallback((err: unknown, fallback: string) => {
    if (err instanceof GmailAuthError) {
      setError(err.message);
      return;
    }
    setError(err instanceof Error && err.message ? err.message : fallback);
  }, []);

  const loadMessages = useCallback(async () => {
    if (!accessToken) return;
    setLoadingMessages(true);
    setError('');
    try {
      let query = appliedQuery;
      const labelIds: string[] = [];

      if (selectedLabelId) {
        labelIds.push(selectedLabelId);
      } else if (quickFilter === 'unread') {
        labelIds.push('UNREAD');
      } else if (quickFilter === 'receipts') {
        query = query ? `(${query}) (${RECEIPTS_QUERY})` : RECEIPTS_QUERY;
      }

      const items = await listGmailMessages({
        query,
        labelIds,
        maxResults: 15,
      });
      setMessages(items);
      setSelectedMessage((prev) => {
        if (!prev) return null;
        return items.find((m) => m.id === prev.id) ?? null;
      });
    } catch (err) {
      handleApiError(err, 'Impossible de charger vos messages Gmail.');
    } finally {
      setLoadingMessages(false);
    }
  }, [accessToken, appliedQuery, quickFilter, selectedLabelId, handleApiError]);

  const loadLabels = useCallback(async () => {
    if (!accessToken) return;
    setLoadingLabels(true);
    try {
      const data = await listGmailLabels();
      setLabels(data);
    } catch (err) {
      handleApiError(err, 'Impossible de charger les libellés Gmail.');
    } finally {
      setLoadingLabels(false);
    }
  }, [accessToken, handleApiError]);

  useEffect(() => {
    if (!accessToken) return;
    void loadMessages();
  }, [accessToken, loadMessages]);

  useEffect(() => {
    if (!accessToken) return;
    void loadLabels();
  }, [accessToken, loadLabels]);

  const handleConnectGmail = async () => {
    setError('');
    setStatusNotice('');
    setConnecting(true);
    try {
      await connectGmailWithGoogle();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Échec de l’autorisation Gmail.';
      if (!msg.includes('popup-closed-by-user')) {
        setError(msg);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedQuery(searchInput.trim());
  };

  const handleConfirmMutation = async () => {
    if (!pendingMutation) return;
    setMutating(true);
    setError('');
    setStatusNotice('');
    try {
      await pendingMutation.execute();
      setPendingMutation(null);
    } catch (err) {
      handleApiError(err, 'L’opération Gmail a échoué.');
      setPendingMutation(null);
    } finally {
      setMutating(false);
    }
  };

  const handleFillBudgetReport = () => {
    const monthLabel = formatMonthLabel(monthKey);
    const alertsText =
      evaluatedAlerts.length > 0
        ? evaluatedAlerts
            .map(
              (a) =>
                `- ${a.reminder.title} : ${formatAriary(a.reminder.amount)} (${a.statusLabel}, échéance le ${formatDateFr(a.reminder.dueDate)})`
            )
            .join('\n')
        : 'Aucune facture urgente en attente.';

    setSubject(`Résumé budgétaire Ariary 50/30/20 — ${monthLabel}`);
    setBody(
      [
        `Résumé budgétaire Ariary 50/30/20 (${monthLabel})`,
        `« Chaque ariary compte. Chaque objectif se construit. »`,
        '',
        `Revenus du mois : ${formatAriary(summary.totalIncome)}`,
        `Dépenses & Épargne allouée : ${formatAriary(summary.totalExpenses)}`,
        `Solde disponible : ${formatAriary(summary.netBalance)}`,
        '',
        `Répartition 50/30/20 :`,
        `- Besoins (${summary.buckets.needs.targetPercent} %) : ${formatAriary(summary.buckets.needs.actualAmount)} / ${formatAriary(summary.buckets.needs.targetAmount)}`,
        `- Envies (${summary.buckets.wants.targetPercent} %) : ${formatAriary(summary.buckets.wants.actualAmount)} / ${formatAriary(summary.buckets.wants.targetAmount)}`,
        `- Épargne (${summary.buckets.savings.targetPercent} %) : ${formatAriary(summary.buckets.savings.actualAmount)} / ${formatAriary(summary.buckets.savings.targetAmount)}`,
        '',
        `Rappels d'échéances à surveiller :`,
        alertsText,
      ].join('\n')
    );
  };

  const requestSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setError('Veuillez renseigner le destinataire, l’objet et le message.');
      return;
    }

    setPendingMutation({
      title: 'Confirmer l’envoi de l’e-mail ?',
      description: `Vous allez envoyer un e-mail via Gmail à « ${to.trim()} » avec l’objet « ${subject.trim()} ».`,
      confirmLabel: 'Envoyer l’e-mail',
      execute: async () => {
        await sendGmailMessage({ to, subject, body });
        setStatusNotice(`E-mail envoyé à ${to.trim()}.`);
        setSubject('');
        setBody('');
      },
    });
  };

  const requestSaveDraft = () => {
    setError('');
    if (!subject.trim() && !body.trim()) {
      setError('Ajoutez un objet ou un contenu avant d’enregistrer un brouillon.');
      return;
    }
    setPendingMutation({
      title: 'Enregistrer un brouillon dans Gmail ?',
      description: `Un brouillon destiné à « ${to.trim() || 'Non spécifié'} » avec l’objet « ${subject.trim() || '(Sans objet)'} » sera créé dans votre compte Gmail.`,
      confirmLabel: 'Enregistrer le brouillon',
      execute: async () => {
        await createGmailDraft({ to, subject, body });
        setStatusNotice('Brouillon enregistré dans votre compte Gmail.');
      },
    });
  };

  const requestToggleRead = (msg: GmailMessageSummary) => {
    const markAsRead = msg.isUnread;
    setPendingMutation({
      title: markAsRead ? 'Marquer comme lu ?' : 'Marquer comme non lu ?',
      description: `L’e-mail « ${msg.subject} » sera marqué comme ${
        markAsRead ? 'lu' : 'non lu'
      } dans Gmail.`,
      confirmLabel: markAsRead ? 'Marquer comme lu' : 'Marquer comme non lu',
      execute: async () => {
        await modifyGmailMessageLabels(
          msg.id,
          markAsRead ? [] : ['UNREAD'],
          markAsRead ? ['UNREAD'] : []
        );
        setStatusNotice(
          markAsRead
            ? 'Message marqué comme lu.'
            : 'Message marqué comme non lu.'
        );
        await loadMessages();
      },
    });
  };

  const requestArchiveMessage = (msg: GmailMessageSummary) => {
    setPendingMutation({
      title: 'Archiver cet e-mail ?',
      description: `L’e-mail « ${msg.subject} » sera retiré de votre boîte de réception (INBOX) tout en restant dans Tous les messages.`,
      confirmLabel: 'Archiver',
      execute: async () => {
        await modifyGmailMessageLabels(msg.id, [], ['INBOX']);
        setStatusNotice('Message archivé.');
        setSelectedMessage(null);
        await loadMessages();
      },
    });
  };

  const requestTrashMessage = (msg: GmailMessageSummary) => {
    setPendingMutation({
      title: 'Déplacer cet e-mail vers la corbeille ?',
      description: `L’e-mail « ${msg.subject} » de ${msg.from} sera déplacé dans la corbeille Gmail.`,
      confirmLabel: 'Mettre à la corbeille',
      destructive: true,
      execute: async () => {
        await trashGmailMessage(msg.id);
        setStatusNotice('Message déplacé vers la corbeille Gmail.');
        setSelectedMessage(null);
        await loadMessages();
      },
    });
  };

  const requestCreateLabel = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLabelName.trim();
    if (!trimmed) {
      setError('Saisissez un nom pour le nouveau libellé Gmail.');
      return;
    }
    setPendingMutation({
      title: 'Créer un nouveau libellé Gmail ?',
      description: `Le libellé « ${trimmed} » sera ajouté à votre boîte Gmail.`,
      confirmLabel: 'Créer le libellé',
      execute: async () => {
        await createGmailLabel(trimmed);
        setNewLabelName('');
        setStatusNotice(`Libellé « ${trimmed} » créé.`);
        await loadLabels();
      },
    });
  };

  if (!accessToken) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="max-w-xl space-y-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400">
              <Mail className="h-5 w-5" />
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Connecter Gmail à Ariary 50/30/20
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Consultez vos reçus et factures par e-mail, transformez-les en opérations ou rappels 50/30/20 en un clic, et envoyez vos bilans mensuels par Gmail. Pour votre sécurité, le jeton d’accès Gmail reste uniquement en mémoire vive durant votre session.
            </p>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="pt-1">
              <GoogleSignInButton
                onClick={handleConnectGmail}
                loading={connecting}
                label="Autoriser Gmail avec Google"
                loadingLabel="Autorisation en cours..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Gmail & Reçus
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Importez vos factures dans votre budget 50/30/20 ou envoyez votre bilan mensuel.
          </p>
        </div>

        <div className="grid grid-cols-3 sm:inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {(
            [
              { id: 'inbox', label: 'Boîte', icon: Inbox },
              { id: 'compose', label: 'Écrire', icon: Send },
              { id: 'labels', label: 'Libellés', icon: Tag },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`min-h-[40px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-md px-3 text-xs sm:text-sm font-medium transition-colors ${
                  active
                    ? 'bg-teal-700 text-white dark:bg-teal-600'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Fermer"
            className="h-8 w-8 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {statusNotice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice('')}
            aria-label="Fermer"
            className="h-8 w-8 flex items-center justify-center rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TAB 1: INBOX & RECEIPTS */}
      {tab === 'inbox' && (
        <div className="space-y-4">
          {/* Search & Quick Filters */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Rechercher dans Gmail (ex : JIRAMA, facture, MVola...)"
                  className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 sm:flex-none min-h-[44px] rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                >
                  Rechercher
                </button>
                <button
                  type="button"
                  onClick={() => void loadMessages()}
                  disabled={loadingMessages}
                  aria-label="Actualiser les e-mails"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loadingMessages ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'all', label: 'Tous les messages' },
                  { id: 'unread', label: 'Non lus' },
                  { id: 'receipts', label: 'Factures & Reçus' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSelectedLabelId('');
                    setQuickFilter(f.id);
                  }}
                  className={`min-h-[36px] rounded-lg px-3 text-xs font-medium transition-colors ${
                    !selectedLabelId && quickFilter === f.id
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              {selectedLabelId && (
                <button
                  type="button"
                  onClick={() => setSelectedLabelId('')}
                  className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 text-xs font-medium text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                >
                  <Tag className="h-3.5 w-3.5" />
                  <span>
                    Libellé :{' '}
                    {labels.find((l) => l.id === selectedLabelId)?.name ??
                      selectedLabelId}
                  </span>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Master-Detail List & Reader */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Message List */}
            <div
              className={`lg:col-span-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden ${
                selectedMessage ? 'hidden lg:block' : 'block'
              }`}
            >
              {loadingMessages && messages.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  Chargement de vos e-mails...
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  Aucun message trouvé pour ce filtre.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[620px] overflow-y-auto">
                  {messages.map((msg) => {
                    const isSelected = selectedMessage?.id === msg.id;
                    return (
                      <button
                        key={msg.id}
                        type="button"
                        onClick={() => setSelectedMessage(msg)}
                        className={`w-full text-left p-4 transition-colors space-y-1.5 ${
                          isSelected
                            ? 'bg-teal-50/80 dark:bg-teal-950/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs truncate ${
                              msg.isUnread
                                ? 'font-bold text-slate-900 dark:text-slate-100'
                                : 'font-medium text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {msg.from.replace(/<.*?>/g, '').trim() || msg.from}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 shrink-0">
                            {formatDateFr(msg.isoDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {msg.isUnread && (
                            <span
                              className="h-2 w-2 rounded-full bg-teal-600 shrink-0"
                              aria-label="Non lu"
                            />
                          )}
                          <p
                            className={`text-sm truncate ${
                              msg.isUnread
                                ? 'font-semibold text-slate-900 dark:text-slate-100'
                                : 'font-medium text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {msg.subject}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {msg.snippet}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Message Detail */}
            <div
              className={`lg:col-span-7 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 sm:p-6 ${
                selectedMessage ? 'block' : 'hidden lg:flex lg:items-center lg:justify-center'
              }`}
            >
              {!selectedMessage ? (
                <div className="py-16 text-center space-y-2">
                  <Mail className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Sélectionnez un e-mail pour lire son contenu ou l’importer dans votre budget.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setSelectedMessage(null)}
                    className="lg:hidden min-h-[40px] inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 dark:text-teal-400"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Retour aux messages</span>
                  </button>

                  <div className="space-y-2 border-b border-slate-200 pb-4 dark:border-slate-800">
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 break-words">
                      {selectedMessage.subject}
                    </h2>
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 break-words">
                      <p>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          De :
                        </span>{' '}
                        {selectedMessage.from}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Date :
                        </span>{' '}
                        {formatDateFr(selectedMessage.isoDate)}
                      </p>
                    </div>
                  </div>

                  {/* Budget Integration Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onImportTransaction(
                          buildTransactionDraftFromEmail(selectedMessage)
                        )
                      }
                      className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-3.5 text-xs sm:text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                    >
                      <PlusCircle className="h-4 w-4 shrink-0" />
                      <span>Importer en opération</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onCreateReminder(
                          buildReminderDraftFromEmail(selectedMessage)
                        )
                      }
                      className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-xs sm:text-sm font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <BellPlus className="h-4 w-4 shrink-0" />
                      <span>Créer un rappel</span>
                    </button>
                  </div>

                  {/* Email Body */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 whitespace-pre-wrap break-words max-h-[340px] overflow-y-auto leading-relaxed">
                    {selectedMessage.bodyText || '(Message vide)'}
                  </div>

                  {/* Mutating Gmail Actions (all require explicit confirmation modal) */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => requestToggleRead(selectedMessage)}
                      className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <MailOpen className="h-4 w-4" />
                      <span>
                        {selectedMessage.isUnread
                          ? 'Marquer lu'
                          : 'Marquer non lu'}
                      </span>
                    </button>

                    {selectedMessage.labelIds.includes('INBOX') && (
                      <button
                        type="button"
                        onClick={() => requestArchiveMessage(selectedMessage)}
                        className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Archive className="h-4 w-4" />
                        <span>Archiver</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => requestTrashMessage(selectedMessage)}
                      className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Corbeille</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPOSE & SEND BUDGET SUMMARY */}
      {tab === 'compose' && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Envoyer un e-mail via Gmail
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Partagez ou archivez votre bilan budgétaire 50/30/20 en un clic.
              </p>
            </div>
            <button
              type="button"
              onClick={handleFillBudgetReport}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-950/70"
            >
              <FilePlus2 className="h-4 w-4 shrink-0" />
              <span>Insérer le résumé du mois</span>
            </button>
          </div>

          <form onSubmit={requestSendEmail} className="space-y-4">
            <div>
              <label
                htmlFor="gmail-to"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Destinataire
              </label>
              <input
                id="gmail-to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="exemple@gmail.com"
                required
                className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="gmail-subject"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Objet
              </label>
              <input
                id="gmail-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet de votre message"
                required
                className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="gmail-body"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Message
              </label>
              <textarea
                id="gmail-body"
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Rédigez votre e-mail ou cliquez sur « Insérer le résumé du mois »..."
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-base sm:text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
              <button
                type="button"
                onClick={requestSaveDraft}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span>Enregistrer brouillon</span>
              </button>
              <button
                type="submit"
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <Send className="h-4 w-4" />
                <span>Envoyer</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: LABELS */}
      {tab === 'labels' && (
        <div className="space-y-4">
          <form
            onSubmit={requestCreateLabel}
            className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="Nouveau libellé Gmail (ex : Ariary-Factures)"
              className="flex-1 min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <button
              type="submit"
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <Tag className="h-4 w-4" />
              <span>Créer le libellé</span>
            </button>
          </form>

          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Libellés de votre compte Gmail
              </h2>
              <button
                type="button"
                onClick={() => void loadLabels()}
                disabled={loadingLabels}
                className="min-h-[36px] inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loadingLabels ? 'animate-spin' : ''}`}
                />
                <span>Actualiser</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => {
                    setSelectedLabelId(label.id);
                    setTab('inbox');
                  }}
                  className="min-h-[44px] flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <span className="truncate">{label.name}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {label.type === 'system' ? 'Système' : 'Perso'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Explicit Confirmation Modal for ALL Mutating/Destructive Gmail Actions */}
      {pendingMutation && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gmail-confirm-title"
          onClick={() => {
            if (!mutating) setPendingMutation(null);
          }}
        >
          <div
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl border border-slate-200 bg-white p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-sheet-up space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden mx-auto h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="space-y-2">
              <h3
                id="gmail-confirm-title"
                className="font-display text-base font-bold text-slate-900 dark:text-slate-100"
              >
                {pendingMutation.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {pendingMutation.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                disabled={mutating}
                onClick={() => setPendingMutation(null)}
                className="min-h-[44px] rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={mutating}
                onClick={handleConfirmMutation}
                className={`min-h-[44px] rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60 ${
                  pendingMutation.destructive
                    ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500'
                    : 'bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500'
                }`}
              >
                {mutating ? 'En cours...' : pendingMutation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
