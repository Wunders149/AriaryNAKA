import { clearGmailAccessToken, getGmailAccessToken } from '../firebase/client';
import { BudgetBucket, PaymentReminder, Transaction } from '../types/finance';
import { getTodayISO } from '../utils/format';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

export class GmailAuthError extends Error {
  constructor(message = 'Session Gmail expirée ou non autorisée.') {
    super(message);
    this.name = 'GmailAuthError';
  }
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: {
    size?: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

export interface GmailRawMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  dateHeader: string;
  isoDate: string;
  snippet: string;
  labelIds: string[];
  isUnread: boolean;
  bodyText: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type?: 'system' | 'user';
  messagesTotal?: number;
  messagesUnread?: number;
}

async function gmailFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getGmailAccessToken();
  if (!token) {
    throw new GmailAuthError('Veuillez autoriser la connexion Gmail avec Google.');
  }

  const res = await fetch(`${GMAIL_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    clearGmailAccessToken();
    throw new GmailAuthError(
      'Votre session Gmail a expiré. Reconnectez-vous avec Google pour continuer.'
    );
  }

  if (!res.ok) {
    let errMsg = `Erreur Gmail (${res.status})`;
    try {
      const payload = (await res.json()) as { error?: { message?: string } };
      if (payload?.error?.message) {
        errMsg = payload.error.message;
      }
    } catch {
      // ignore non-JSON body
    }
    throw new Error(errMsg);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

function decodeBase64UrlUtf8(data?: string): string {
  if (!data) return '';
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return '';
  }
}

function encodeBase64UrlUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractBodyText(payload?: GmailMessagePart): string {
  if (!payload) return '';

  const findPart = (
    part: GmailMessagePart,
    mime: string
  ): string | null => {
    if (part.mimeType === mime && part.body?.data) {
      return decodeBase64UrlUtf8(part.body.data);
    }
    if (part.parts) {
      for (const child of part.parts) {
        const found = findPart(child, mime);
        if (found) return found;
      }
    }
    return null;
  };

  const plain = findPart(payload, 'text/plain');
  if (plain && plain.trim()) {
    return plain.trim();
  }

  const html = findPart(payload, 'text/html');
  if (html && html.trim()) {
    return stripHtmlTags(html);
  }

  if (payload.body?.data) {
    return decodeBase64UrlUtf8(payload.body.data).trim();
  }

  return '';
}

function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers) return '';
  const match = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return match?.value ?? '';
}

function formatMessageSummary(raw: GmailRawMessage): GmailMessageSummary {
  const headers = raw.payload?.headers;
  const subject = getHeader(headers, 'Subject') || '(Sans objet)';
  const from = getHeader(headers, 'From') || 'Expéditeur inconnu';
  const to = getHeader(headers, 'To');
  const dateHeader = getHeader(headers, 'Date');

  let isoDate = getTodayISO();
  if (raw.internalDate) {
    const ms = Number(raw.internalDate);
    if (Number.isFinite(ms)) {
      isoDate = new Date(ms).toISOString().slice(0, 10);
    }
  } else if (dateHeader) {
    const parsed = new Date(dateHeader);
    if (!Number.isNaN(parsed.getTime())) {
      isoDate = parsed.toISOString().slice(0, 10);
    }
  }

  const labelIds = raw.labelIds ?? [];
  const bodyText = extractBodyText(raw.payload);

  return {
    id: raw.id,
    threadId: raw.threadId,
    subject,
    from,
    to,
    dateHeader,
    isoDate,
    snippet: raw.snippet ?? '',
    labelIds,
    isUnread: labelIds.includes('UNREAD'),
    bodyText: bodyText || raw.snippet || '',
  };
}

export async function listGmailMessages(params: {
  query?: string;
  labelIds?: string[];
  maxResults?: number;
}): Promise<GmailMessageSummary[]> {
  const search = new URLSearchParams();
  search.set('maxResults', String(params.maxResults ?? 15));
  if (params.query?.trim()) {
    search.set('q', params.query.trim());
  }
  if (params.labelIds && params.labelIds.length > 0) {
    params.labelIds.forEach((id) => search.append('labelIds', id));
  }

  const listRes = await gmailFetch<{
    messages?: { id: string; threadId: string }[];
  }>(`/messages?${search.toString()}`);

  const ids = listRes.messages ?? [];
  if (ids.length === 0) return [];

  const details = await Promise.all(
    ids.map((m) =>
      gmailFetch<GmailRawMessage>(`/messages/${encodeURIComponent(m.id)}?format=full`)
    )
  );

  return details.map(formatMessageSummary);
}

export async function listGmailLabels(): Promise<GmailLabel[]> {
  const res = await gmailFetch<{ labels?: GmailLabel[] }>('/labels');
  const labels = res.labels ?? [];
  return labels.sort((a, b) => {
    if (a.type === 'system' && b.type !== 'system') return -1;
    if (a.type !== 'system' && b.type === 'system') return 1;
    return a.name.localeCompare(b.name, 'fr');
  });
}

export async function createGmailLabel(name: string): Promise<GmailLabel> {
  return gmailFetch<GmailLabel>('/labels', {
    method: 'POST',
    body: JSON.stringify({
      name: name.trim(),
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    }),
  });
}

export async function modifyGmailMessageLabels(
  messageId: string,
  addLabelIds: string[],
  removeLabelIds: string[]
): Promise<void> {
  await gmailFetch<GmailRawMessage>(
    `/messages/${encodeURIComponent(messageId)}/modify`,
    {
      method: 'POST',
      body: JSON.stringify({ addLabelIds, removeLabelIds }),
    }
  );
}

export async function trashGmailMessage(messageId: string): Promise<void> {
  await gmailFetch<GmailRawMessage>(
    `/messages/${encodeURIComponent(messageId)}/trash`,
    {
      method: 'POST',
    }
  );
}

function buildMimeRaw(to: string, subject: string, body: string): string {
  const encodedSubject = `=?UTF-8?B?${btoa(
    Array.from(new TextEncoder().encode(subject), (b) =>
      String.fromCharCode(b)
    ).join('')
  )}?=`;

  const lines = [
    `To: ${to.trim()}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
  ];
  return encodeBase64UrlUtf8(lines.join('\r\n'));
}

export async function sendGmailMessage(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ id: string }> {
  const raw = buildMimeRaw(params.to, params.subject, params.body);
  return gmailFetch<{ id: string }>('/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw }),
  });
}

export async function createGmailDraft(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ id: string }> {
  const raw = buildMimeRaw(params.to, params.subject, params.body);
  return gmailFetch<{ id: string }>('/drafts', {
    method: 'POST',
    body: JSON.stringify({ message: { raw } }),
  });
}

function detectAriaryAmount(text: string): number {
  const patterns = [
    /(\d[\d\s.,]{1,12})\s*(?:ar|ariary|mga)\b/i,
    /(?:ar|ariary|mga)\s*[:.]?\s*(\d[\d\s.,]{1,12})/i,
  ];
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match?.[1]) {
      const cleaned = match[1].replace(/[\s.,]/g, '');
      const val = Number(cleaned);
      if (Number.isFinite(val) && val > 0) {
        return Math.round(val);
      }
    }
  }
  return 0;
}

function inferBucketAndCategory(text: string): {
  bucket: BudgetBucket;
  category: string;
} {
  const lower = text.toLowerCase();
  if (lower.includes('jirama') || lower.includes('eau') || lower.includes('électricité')) {
    return { bucket: 'needs', category: 'JIRAMA (Eau & Électricité)' };
  }
  if (lower.includes('loyer') || lower.includes('logement')) {
    return { bucket: 'needs', category: 'Loyer & Logement' };
  }
  if (
    lower.includes('telma') ||
    lower.includes('orange') ||
    lower.includes('airtel') ||
    lower.includes('yas') ||
    lower.includes('internet') ||
    lower.includes('fibre')
  ) {
    return { bucket: 'needs', category: 'Télécom & Connexion' };
  }
  if (
    lower.includes('netflix') ||
    lower.includes('spotify') ||
    lower.includes('abonnement') ||
    lower.includes('canal')
  ) {
    return { bucket: 'wants', category: 'Abonnements & Streaming' };
  }
  if (lower.includes('épargne') || lower.includes('epargne') || lower.includes('mvola')) {
    return { bucket: 'savings', category: 'Épargne Mobile Money' };
  }
  return { bucket: 'needs', category: 'Alimentation & Marché' };
}

export function buildTransactionDraftFromEmail(
  msg: GmailMessageSummary
): Partial<Omit<Transaction, 'id' | 'createdAt'>> {
  const combined = `${msg.subject}\n${msg.bodyText}`;
  const amount = detectAriaryAmount(combined);
  const { bucket, category } = inferBucketAndCategory(combined);
  return {
    date: msg.isoDate,
    label: msg.subject.slice(0, 80),
    amount: amount > 0 ? amount : undefined,
    kind: 'expense',
    bucket,
    category,
    note: `Importé depuis Gmail (${msg.from})`,
  };
}

export function buildReminderDraftFromEmail(
  msg: GmailMessageSummary
): Partial<Omit<PaymentReminder, 'id' | 'createdAt'>> {
  const combined = `${msg.subject}\n${msg.bodyText}`;
  const amount = detectAriaryAmount(combined);
  const { bucket, category } = inferBucketAndCategory(combined);
  return {
    title: msg.subject.slice(0, 80),
    amount: amount > 0 ? amount : undefined,
    dueDate: msg.isoDate,
    frequency: 'monthly',
    bucket,
    category,
    notifyDaysBefore: 3,
    enabled: true,
    note: `Créé depuis Gmail (${msg.from})`,
  };
}
