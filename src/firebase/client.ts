import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
] as const;

const app = initializeApp(firebaseConfig);
const firestoreDatabaseId =
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId ||
  'ai-studio-ariary503020budg-0d458a39-1852-4443-9e5d-8121aa033cc1';
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => googleProvider.addScope(scope));
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

const gmailConsentProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => gmailConsentProvider.addScope(scope));
gmailConsentProvider.setCustomParameters({
  prompt: 'consent',
});

// In-memory cache only (never stored in localStorage or sessionStorage).
let cachedAccessToken: string | null = null;
const tokenListeners = new Set<(token: string | null) => void>();

function setCachedAccessToken(token: string | null): void {
  cachedAccessToken = token;
  tokenListeners.forEach((listener) => listener(cachedAccessToken));
}

onAuthStateChanged(auth, (user: User | null) => {
  if (!user) {
    setCachedAccessToken(null);
  }
});

export function subscribeGmailAccessToken(
  listener: (token: string | null) => void
): () => void {
  tokenListeners.add(listener);
  listener(cachedAccessToken);
  return () => {
    tokenListeners.delete(listener);
  };
}

export function getGmailAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearGmailAccessToken(): void {
  setCachedAccessToken(null);
}

export async function signInWithGoogle(): Promise<{
  user: User;
  accessToken: string | null;
}> {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken ?? null;
  if (accessToken) {
    setCachedAccessToken(accessToken);
  }
  return { user: result.user, accessToken };
}

export async function connectGmailWithGoogle(): Promise<{
  user: User;
  accessToken: string;
}> {
  const result = await signInWithPopup(auth, gmailConsentProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error("Impossible d'obtenir le jeton d'accès Google Gmail.");
  }
  setCachedAccessToken(credential.accessToken);
  return { user: result.user, accessToken: credential.accessToken };
}

export async function signOutGoogle(): Promise<void> {
  setCachedAccessToken(null);
  await signOut(auth);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
