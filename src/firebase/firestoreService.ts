import { User } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  BudgetSplit,
  CustomCategory,
  FinanceStore,
  PaymentReminder,
  SavingsGoal,
  Transaction,
  UserProfile,
} from '../types/finance';
import { createId } from '../utils/format';
import { createSeedData } from '../utils/storage';
import { OperationType, db, handleFirestoreError } from './client';

function sanitizeId(raw: string, prefix: string): string {
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return clean.length > 0 ? clean : createId(prefix);
}

function isoFromTimestamp(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function clampString(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export async function ensureUserProfile(user: User): Promise<void> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const displayName = clampString(
        user.displayName || user.email?.split('@')[0] || 'Utilisateur',
        100
      );
      const email = clampString(user.email || '', 160);
      await setDoc(userRef, {
        uid: user.uid,
        displayName,
        email,
        splitNeeds: 50,
        splitWants: 30,
        splitSavings: 20,
        theme: 'light',
        browserNotificationsEnabled: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Seed starter dataset for brand new accounts so charts & rule 50/30/20 are immediately alive
      const seed = createSeedData();
      await writeStoreToFirestore(user.uid, seed);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export function subscribeToUserProfile(
  uid: string,
  onData: (profile: UserProfile) => void
): () => void {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      onData({
        uid: String(d.uid ?? uid),
        displayName: String(d.displayName ?? 'Utilisateur'),
        email: String(d.email ?? ''),
        splitNeeds: Number(d.splitNeeds ?? 50),
        splitWants: Number(d.splitWants ?? 30),
        splitSavings: Number(d.splitSavings ?? 20),
        theme: d.theme === 'dark' ? 'dark' : 'light',
        browserNotificationsEnabled: Boolean(d.browserNotificationsEnabled),
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToTransactions(
  uid: string,
  onData: (items: Transaction[]) => void
): () => void {
  const path = `users/${uid}/transactions`;
  const q = query(collection(db, 'users', uid, 'transactions'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: Transaction[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          date: String(d.date),
          label: String(d.label),
          amount: Number(d.amount),
          kind: d.kind === 'income' ? 'income' : 'expense',
          bucket: d.kind === 'income' ? undefined : (d.bucket as Transaction['bucket']) ?? 'needs',
          category: String(d.category),
          note: typeof d.note === 'string' && d.note.length > 0 ? d.note : undefined,
          goalId: typeof d.goalId === 'string' && d.goalId.length > 0 ? d.goalId : undefined,
          createdAt: isoFromTimestamp(d.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToGoals(
  uid: string,
  onData: (items: SavingsGoal[]) => void
): () => void {
  const path = `users/${uid}/goals`;
  const q = query(collection(db, 'users', uid, 'goals'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: SavingsGoal[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          title: String(d.title),
          targetAmount: Number(d.targetAmount),
          currentAmount: Number(d.currentAmount ?? 0),
          regularAmount: Number(d.regularAmount ?? 0),
          regularFrequency: d.regularFrequency === 'weekly' ? 'weekly' : 'monthly',
          deadline: String(d.deadline),
          priority: (d.priority as SavingsGoal['priority']) ?? 'medium',
          description:
            typeof d.description === 'string' && d.description.length > 0
              ? d.description
              : undefined,
          createdAt: isoFromTimestamp(d.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToReminders(
  uid: string,
  onData: (items: PaymentReminder[]) => void
): () => void {
  const path = `users/${uid}/reminders`;
  const q = query(collection(db, 'users', uid, 'reminders'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: PaymentReminder[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          title: String(d.title),
          amount: Number(d.amount),
          dueDate: String(d.dueDate),
          frequency: (d.frequency as PaymentReminder['frequency']) ?? 'monthly',
          bucket: (d.bucket as PaymentReminder['bucket']) ?? 'needs',
          category: String(d.category),
          notifyDaysBefore: Number(d.notifyDaysBefore ?? 3),
          enabled: Boolean(d.enabled),
          lastPaidDate:
            typeof d.lastPaidDate === 'string' && d.lastPaidDate.length > 0
              ? d.lastPaidDate
              : undefined,
          note: typeof d.note === 'string' && d.note.length > 0 ? d.note : undefined,
          createdAt: isoFromTimestamp(d.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToCategories(
  uid: string,
  onData: (items: CustomCategory[]) => void
): () => void {
  const path = `users/${uid}/categories`;
  const q = query(collection(db, 'users', uid, 'categories'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: CustomCategory[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          name: String(d.name),
          kind: d.kind === 'income' ? 'income' : 'expense',
          bucket: d.kind === 'income' ? undefined : (d.bucket as CustomCategory['bucket']) ?? 'needs',
          color: String(d.color ?? '#0F766E'),
          createdAt: isoFromTimestamp(d.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// --- Profile Updates ---
export async function updateUserSplit(uid: string, split: BudgetSplit): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      splitNeeds: Math.round(split.needs),
      splitWants: Math.round(split.wants),
      splitSavings: Math.round(split.savings),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserTheme(uid: string, theme: 'light' | 'dark'): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      theme,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserBrowserNotifications(
  uid: string,
  enabled: boolean
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      browserNotificationsEnabled: enabled,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- Transactions CRUD ---
function buildTransactionPayload(
  uid: string,
  data: Omit<Transaction, 'id' | 'createdAt'>,
  isCreate: boolean
) {
  const payload: Record<string, unknown> = {
    uid,
    date: clampString(data.date, 10),
    label: clampString(data.label, 120),
    amount: Math.max(1, Math.round(data.amount)),
    kind: data.kind,
    bucket: data.kind === 'income' ? 'none' : data.bucket ?? 'needs',
    category: clampString(data.category, 60),
    updatedAt: serverTimestamp(),
  };
  if (data.note && data.note.trim().length > 0) {
    payload.note = clampString(data.note, 240);
  }
  if (data.kind === 'expense' && data.bucket === 'savings' && data.goalId) {
    payload.goalId = sanitizeId(data.goalId, 'goal');
  }
  if (isCreate) {
    payload.createdAt = serverTimestamp();
  }
  return payload;
}

export async function upsertTransaction(
  uid: string,
  data: Omit<Transaction, 'id' | 'createdAt'>,
  existingId?: string
): Promise<string> {
  const txId = existingId ? sanitizeId(existingId, 'tx') : createId('tx');
  const path = `users/${uid}/transactions/${txId}`;
  try {
    if (existingId) {
      await updateDoc(
        doc(db, 'users', uid, 'transactions', txId),
        buildTransactionPayload(uid, data, false)
      );
    } else {
      await setDoc(
        doc(db, 'users', uid, 'transactions', txId),
        buildTransactionPayload(uid, data, true)
      );
    }
    return txId;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function deleteTransactionDoc(uid: string, txId: string): Promise<void> {
  const safeId = sanitizeId(txId, 'tx');
  const path = `users/${uid}/transactions/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'transactions', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Goals CRUD ---
function buildGoalPayload(
  uid: string,
  data: Omit<SavingsGoal, 'id' | 'createdAt'>,
  isCreate: boolean
) {
  const payload: Record<string, unknown> = {
    uid,
    title: clampString(data.title, 100),
    targetAmount: Math.max(1, Math.round(data.targetAmount)),
    currentAmount: Math.max(0, Math.round(data.currentAmount)),
    regularAmount: Math.max(0, Math.round(data.regularAmount ?? 0)),
    regularFrequency: data.regularFrequency === 'weekly' ? 'weekly' : 'monthly',
    deadline: clampString(data.deadline, 10),
    priority: data.priority,
    updatedAt: serverTimestamp(),
  };
  if (data.description && data.description.trim().length > 0) {
    payload.description = clampString(data.description, 240);
  }
  if (isCreate) {
    payload.createdAt = serverTimestamp();
  }
  return payload;
}

export async function upsertGoal(
  uid: string,
  data: Omit<SavingsGoal, 'id' | 'createdAt'>,
  existingId?: string
): Promise<string> {
  const goalId = existingId ? sanitizeId(existingId, 'goal') : createId('goal');
  const path = `users/${uid}/goals/${goalId}`;
  try {
    if (existingId) {
      await updateDoc(
        doc(db, 'users', uid, 'goals', goalId),
        buildGoalPayload(uid, data, false)
      );
    } else {
      await setDoc(
        doc(db, 'users', uid, 'goals', goalId),
        buildGoalPayload(uid, data, true)
      );
    }
    return goalId;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function updateGoalCurrentAmount(
  uid: string,
  goalId: string,
  newCurrentAmount: number
): Promise<void> {
  const safeId = sanitizeId(goalId, 'goal');
  const path = `users/${uid}/goals/${safeId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'goals', safeId), {
      currentAmount: Math.max(0, Math.round(newCurrentAmount)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteGoalDoc(uid: string, goalId: string): Promise<void> {
  const safeId = sanitizeId(goalId, 'goal');
  const path = `users/${uid}/goals/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'goals', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Reminders CRUD ---
function buildReminderPayload(
  uid: string,
  data: Omit<PaymentReminder, 'id' | 'createdAt'>,
  isCreate: boolean
) {
  const payload: Record<string, unknown> = {
    uid,
    title: clampString(data.title, 100),
    amount: Math.max(1, Math.round(data.amount)),
    dueDate: clampString(data.dueDate, 10),
    frequency: data.frequency,
    bucket: data.bucket,
    category: clampString(data.category, 60),
    notifyDaysBefore: Math.max(0, Math.min(60, Math.round(data.notifyDaysBefore))),
    enabled: Boolean(data.enabled),
    updatedAt: serverTimestamp(),
  };
  if (data.lastPaidDate && data.lastPaidDate.trim().length > 0) {
    payload.lastPaidDate = clampString(data.lastPaidDate, 10);
  }
  if (data.note && data.note.trim().length > 0) {
    payload.note = clampString(data.note, 240);
  }
  if (isCreate) {
    payload.createdAt = serverTimestamp();
  }
  return payload;
}

export async function upsertReminder(
  uid: string,
  data: Omit<PaymentReminder, 'id' | 'createdAt'>,
  existingId?: string
): Promise<string> {
  const remId = existingId ? sanitizeId(existingId, 'rem') : createId('rem');
  const path = `users/${uid}/reminders/${remId}`;
  try {
    if (existingId) {
      await updateDoc(
        doc(db, 'users', uid, 'reminders', remId),
        buildReminderPayload(uid, data, false)
      );
    } else {
      await setDoc(
        doc(db, 'users', uid, 'reminders', remId),
        buildReminderPayload(uid, data, true)
      );
    }
    return remId;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function toggleReminderEnabled(
  uid: string,
  reminderId: string,
  enabled: boolean
): Promise<void> {
  const safeId = sanitizeId(reminderId, 'rem');
  const path = `users/${uid}/reminders/${safeId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'reminders', safeId), {
      enabled,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markReminderPaidInFirestore(
  uid: string,
  reminderId: string,
  nextDueDate: string,
  lastPaidDate: string,
  keepEnabled: boolean
): Promise<void> {
  const safeId = sanitizeId(reminderId, 'rem');
  const path = `users/${uid}/reminders/${safeId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'reminders', safeId), {
      dueDate: nextDueDate,
      lastPaidDate,
      enabled: keepEnabled,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteReminderDoc(uid: string, reminderId: string): Promise<void> {
  const safeId = sanitizeId(reminderId, 'rem');
  const path = `users/${uid}/reminders/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'reminders', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Custom Categories CRUD ---
export async function createCustomCategory(
  uid: string,
  data: Omit<CustomCategory, 'id' | 'createdAt'>
): Promise<string> {
  const catId = createId('cat');
  const path = `users/${uid}/categories/${catId}`;
  const validColor = /^#[0-9A-Fa-f]{6}$/.test(data.color) ? data.color : '#0F766E';
  try {
    await setDoc(doc(db, 'users', uid, 'categories', catId), {
      uid,
      name: clampString(data.name, 50),
      kind: data.kind,
      bucket: data.kind === 'income' ? 'none' : data.bucket ?? 'needs',
      color: validColor,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return catId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCustomCategoryDoc(
  uid: string,
  categoryId: string
): Promise<void> {
  const safeId = sanitizeId(categoryId, 'cat');
  const path = `users/${uid}/categories/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'categories', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Bulk Import / Clear / Seed ---
export async function clearUserSubcollections(uid: string): Promise<void> {
  const subcollections = ['transactions', 'goals', 'reminders', 'categories'] as const;
  try {
    const batch = writeBatch(db);
    let count = 0;
    for (const colName of subcollections) {
      const q = query(collection(db, 'users', uid, colName), where('uid', '==', uid));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        batch.delete(d.ref);
        count++;
        if (count >= 450) {
          await batch.commit();
          count = 0;
        }
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
}

export async function writeStoreToFirestore(
  uid: string,
  storeData: FinanceStore
): Promise<void> {
  try {
    let batch = writeBatch(db);
    let opCount = 0;

    const commitIfNeeded = async () => {
      if (opCount >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    };

    for (const tx of storeData.transactions) {
      const id = sanitizeId(tx.id, 'tx');
      batch.set(
        doc(db, 'users', uid, 'transactions', id),
        buildTransactionPayload(uid, tx, true)
      );
      opCount++;
      await commitIfNeeded();
    }

    for (const g of storeData.goals) {
      const id = sanitizeId(g.id, 'goal');
      batch.set(doc(db, 'users', uid, 'goals', id), buildGoalPayload(uid, g, true));
      opCount++;
      await commitIfNeeded();
    }

    for (const r of storeData.reminders ?? []) {
      const id = sanitizeId(r.id, 'rem');
      batch.set(
        doc(db, 'users', uid, 'reminders', id),
        buildReminderPayload(uid, r, true)
      );
      opCount++;
      await commitIfNeeded();
    }

    for (const c of storeData.categories ?? []) {
      const id = sanitizeId(c.id, 'cat');
      const validColor = /^#[0-9A-Fa-f]{6}$/.test(c.color) ? c.color : '#0F766E';
      batch.set(doc(db, 'users', uid, 'categories', id), {
        uid,
        name: clampString(c.name, 50),
        kind: c.kind,
        bucket: c.kind === 'income' ? 'none' : c.bucket ?? 'needs',
        color: validColor,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      opCount++;
      await commitIfNeeded();
    }

    if (opCount > 0) {
      await batch.commit();
    }

    await updateUserSplit(uid, storeData.split);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}
