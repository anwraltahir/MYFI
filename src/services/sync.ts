import { collection, deleteDoc, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { storage, SyncCollection } from './storage';

const COLLECTIONS: SyncCollection[] = ['commitments', 'occurrences', 'categories', 'notes', 'importHistory'];

let activeUid: string | null = null;

function userDoc(uid: string, collectionName: SyncCollection, id: string) {
  return doc(db, 'users', uid, collectionName, id);
}

// Firestore rejects `undefined` field values (thrown synchronously). Local
// objects sometimes carry them for optional fields (e.g. an empty checklist),
// so strip them before every write instead of letting them crash the caller.
function sanitize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// Mirrors every local write to Firestore while a user is signed in.
export function startSync(uid: string): void {
  activeUid = uid;
  storage.setChangeListener((event) => {
    if (activeUid !== uid) return;
    const ref = userDoc(uid, event.collection, event.id);
    if (event.op === 'delete') {
      deleteDoc(ref).catch((e) => console.warn('sync delete failed', e));
    } else {
      setDoc(ref, sanitize(event.data)).catch((e) => console.warn('sync write failed', e));
    }
  });
}

export function stopSync(): void {
  activeUid = null;
  storage.setChangeListener(null);
}

// Pulls everything from Firestore into local storage. Returns true if the account had any remote data.
export async function pullRemoteData(uid: string): Promise<boolean> {
  let hadAny = false;
  for (const col of COLLECTIONS) {
    const snap = await getDocs(collection(db, 'users', uid, col));
    if (!snap.empty) hadAny = true;
    for (const d of snap.docs) {
      const data = d.data();
      switch (col) {
        case 'commitments':
          await storage.saveCommitment(data as any);
          break;
        case 'occurrences':
          await storage.saveOccurrence(data as any);
          break;
        case 'categories':
          await storage.saveCategory(data as any);
          break;
        case 'notes':
          await storage.saveNote(data as any);
          break;
        case 'importHistory':
          await storage.addImportHistory(data as any);
          break;
      }
    }
  }
  return hadAny;
}

// Pushes everything currently on this device up to Firestore (used the first time an account signs in with no remote data yet).
export async function pushAllLocalData(uid: string): Promise<void> {
  const [commitments, occurrences, categories, notes, importHistory] = await Promise.all([
    storage.getCommitments(),
    storage.getOccurrences(),
    storage.getCategories(),
    storage.getNotes(),
    storage.getImportHistory(),
  ]);

  const batch = writeBatch(db);
  commitments.forEach((c) => batch.set(userDoc(uid, 'commitments', c.id), sanitize(c)));
  occurrences.forEach((o) => batch.set(userDoc(uid, 'occurrences', o.id), sanitize(o)));
  categories.forEach((cat) => batch.set(userDoc(uid, 'categories', cat.id), sanitize(cat)));
  notes.forEach((n) => batch.set(userDoc(uid, 'notes', n.id), sanitize(n)));
  importHistory.forEach((h) => batch.set(userDoc(uid, 'importHistory', h.id), sanitize(h)));
  await batch.commit();
}
