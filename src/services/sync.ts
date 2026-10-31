import { collection, deleteDoc, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { storage, SyncCollection } from './storage';

const COLLECTIONS: SyncCollection[] = ['commitments', 'occurrences', 'categories', 'notes'];

let activeUid: string | null = null;

function userDoc(uid: string, collectionName: SyncCollection, id: string) {
  return doc(db, 'users', uid, collectionName, id);
}

// A deletion record so other devices know to remove an item they still have
// locally, instead of silently re-adding it on their next pull (upserts
// alone can never express "this was removed").
function tombstoneDoc(uid: string, collectionName: SyncCollection, id: string) {
  return doc(db, 'users', uid, 'tombstones', `${collectionName}_${id}`);
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
      setDoc(tombstoneDoc(uid, event.collection, event.id), { deletedAt: Date.now() }).catch((e) =>
        console.warn('tombstone write failed', e)
      );
    } else {
      setDoc(ref, sanitize(event.data)).catch((e) => console.warn('sync write failed', e));
    }
  });
}

export function stopSync(): void {
  activeUid = null;
  storage.setChangeListener(null);
}

// Pulls everything from Firestore into local storage (upsert), applies any
// tombstoned deletions locally, and returns whether the account had remote
// data at all. Local-only items (not yet uploaded by this device) are left
// as-is here — pushAllLocalData handles getting those up to Firestore.
export async function pullRemoteData(uid: string): Promise<boolean> {
  let hadAny = false;

  const tombstoneSnap = await getDocs(collection(db, 'users', uid, 'tombstones'));
  const tombstoned = new Set(tombstoneSnap.docs.map((d) => d.id)); // "<collection>_<id>"

  for (const col of COLLECTIONS) {
    const snap = await getDocs(collection(db, 'users', uid, col));
    if (!snap.empty) hadAny = true;
    const docs = snap.docs.filter((d) => !tombstoned.has(`${col}_${d.id}`));

    // Commitments/occurrences can run into the hundreds (e.g. after a
    // historical import) — saving them one at a time was the main reason
    // sync felt stuck, since each save re-reads and re-writes all of
    // localStorage. Bulk-save writes the whole batch once instead.
    if (col === 'commitments') {
      await storage.saveCommitmentsBulk(docs.map((d) => d.data() as any));
    } else if (col === 'occurrences') {
      await storage.saveOccurrencesBulk(docs.map((d) => d.data() as any));
    } else {
      for (const d of docs) {
        const data = d.data();
        if (col === 'categories') await storage.saveCategory(data as any);
        else if (col === 'notes') await storage.saveNote(data as any);
      }
    }
  }

  // Remove anything this device still has locally that was deleted elsewhere.
  // (Only commitments/notes are individually deletable from the UI; deleting
  // a commitment already cascades to its occurrences locally.)
  if (tombstoned.size > 0) {
    const localCommitments = await storage.getCommitments();
    for (const c of localCommitments) {
      if (tombstoned.has(`commitments_${c.id}`)) {
        await storage.deleteCommitment(c.id);
      }
    }
    const localNotes = await storage.getNotes();
    for (const n of localNotes) {
      if (tombstoned.has(`notes_${n.id}`)) {
        await storage.deleteNote(n.id);
      }
    }
  }

  return hadAny;
}

// Pushes everything currently on this device up to Firestore. Safe to call
// every time (upsert), so a device's pre-existing local-only items reliably
// reach the cloud instead of being stranded there forever.
export async function pushAllLocalData(uid: string): Promise<void> {
  const [commitments, occurrences, categories, notes] = await Promise.all([
    storage.getCommitments(),
    storage.getOccurrences(),
    storage.getCategories(),
    storage.getNotes(),
  ]);

  const writes: { ref: ReturnType<typeof userDoc>; data: any }[] = [];
  commitments.forEach((c) => writes.push({ ref: userDoc(uid, 'commitments', c.id), data: sanitize(c) }));
  occurrences.forEach((o) => writes.push({ ref: userDoc(uid, 'occurrences', o.id), data: sanitize(o) }));
  categories.forEach((cat) => writes.push({ ref: userDoc(uid, 'categories', cat.id), data: sanitize(cat) }));
  notes.forEach((n) => writes.push({ ref: userDoc(uid, 'notes', n.id), data: sanitize(n) }));

  // Firestore caps a single batch at 500 operations, so large accounts
  // (e.g. after a historical import) must be split into several batches.
  const CHUNK_SIZE = 450;
  for (let i = 0; i < writes.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    for (const w of writes.slice(i, i + CHUNK_SIZE)) {
      batch.set(w.ref, w.data);
    }
    await batch.commit();
  }
}
