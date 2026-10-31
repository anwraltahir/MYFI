import { Commitment, Occurrence, Category, NoteItem, UserSettings, PaymentStatus } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '../utils/constants';
import { migratedCommitments, migratedOccurrences, migratedNotes } from '../data/migratedData';
import { historicalCommitments, historicalOccurrences } from '../data/historicalReconciliation';

const DB_NAME = 'EltizamatiDB';
const DB_VERSION = 1;

// Local storage is not scoped by default (IndexedDB/localStorage are shared
// by every account that ever signs in on this browser). Multiple real
// accounts can now use this app, so every per-user database/key must be
// namespaced by the signed-in uid — otherwise switching accounts on one
// device leaks the previous account's data into the new one, both visually
// and via sync pushing it into the new account's own Firestore space.

interface DBSchema {
  commitments: Commitment;
  occurrences: Occurrence;
  categories: Category;
  notes: NoteItem;
  settings: UserSettings;
}

// LocalStorage Fallback keys. COMMITMENTS/OCCURRENCES/CATEGORIES/NOTES/
// LAST_BACKUP hold personal data and are namespaced per-uid at use (see
// StorageService.lsKey). SETTINGS is just UI preferences (language,
// currency, etc.) — harmless to share across accounts on one device, so it
// stays unscoped.
const LS_KEYS = {
  COMMITMENTS: 'eltizamati_commitments',
  OCCURRENCES: 'eltizamati_occurrences',
  CATEGORIES: 'eltizamati_categories',
  NOTES: 'eltizamati_notes',
  SETTINGS: 'eltizamati_settings',
  LAST_BACKUP: 'eltizamati_last_backup',
};
const UNSCOPED_LS_KEYS: string[] = [LS_KEYS.SETTINGS];

export type SyncCollection = 'commitments' | 'occurrences' | 'categories' | 'notes';
export type SyncChangeEvent =
  | { collection: SyncCollection; op: 'put'; id: string; data: any }
  | { collection: SyncCollection; op: 'delete'; id: string };
export type SyncChangeListener = (event: SyncChangeEvent) => void;

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private hasIndexedDB = typeof window !== 'undefined' && 'indexedDB' in window;
  private changeListener: SyncChangeListener | null = null;
  private activeUid: string | null = null;

  constructor() {
    if (this.hasIndexedDB) {
      this.initDB();
    }
  }

  // Must be called (synchronously, before any other storage call) as soon as
  // the signed-in uid is known — switches IndexedDB/localStorage to that
  // account's own namespace so a different account's data already on this
  // device is never read, displayed, or re-synced into the new account.
  public setActiveUser(uid: string | null): void {
    if (this.activeUid === uid) return;
    this.activeUid = uid;
    this.dbPromise = null;
    if (this.hasIndexedDB) {
      this.initDB();
    }
  }

  private dbName(): string {
    return this.activeUid ? `${DB_NAME}_u_${this.activeUid}` : DB_NAME;
  }

  private lsKey(base: string): string {
    if (UNSCOPED_LS_KEYS.includes(base) || !this.activeUid) return base;
    return `${base}_u_${this.activeUid}`;
  }

  // Lets the sync service observe local writes so it can mirror them to Firestore.
  public setChangeListener(listener: SyncChangeListener | null): void {
    this.changeListener = listener;
  }

  // A failure in the (external) sync listener must never break local-first storage.
  private notifyChange(event: SyncChangeEvent): void {
    try {
      this.changeListener?.(event);
    } catch (e) {
      console.warn('Sync listener failed', e);
    }
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName(), DB_VERSION);

        request.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('commitments')) {
            db.createObjectStore('commitments', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('occurrences')) {
            db.createObjectStore('occurrences', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('categories')) {
            db.createObjectStore('categories', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('notes')) {
            db.createObjectStore('notes', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('meta')) {
            db.createObjectStore('meta', { keyPath: 'key' });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.warn('IndexedDB failed, falling back to localStorage', request.error);
          this.hasIndexedDB = false;
          resolve(null as unknown as IDBDatabase);
        };
      } catch (err) {
        console.warn('IndexedDB exception', err);
        this.hasIndexedDB = false;
        resolve(null as unknown as IDBDatabase);
      }
    });

    return this.dbPromise;
  }

  // --- Initial Seeding ---
  // seedOwnerData gates every block below: they all seed or reassert the
  // app owner's real, hardcoded historical data (migratedData.ts /
  // historicalReconciliation.ts). A newly signed-up account must start
  // completely empty — it must never receive this data locally (where it'd
  // be visible) or have it pushed into that account's own Firestore space
  // by sync. Call with seedOwnerData=false for every non-owner account.
  public async ensureInitialData(seedOwnerData: boolean = true): Promise<void> {
    if (!seedOwnerData) {
      // Only default category definitions (no personal data) — every other
      // account/table starts empty for a brand-new, non-owner sign-up.
      for (const cat of DEFAULT_CATEGORIES) {
        await this.saveCategory(cat);
      }
      return;
    }

    const isMigrated = localStorage.getItem('eltizamati_zoho_migrated_v1') === 'true';
    const commitments = await this.getCommitments();

    // If not yet migrated or empty, initialize with migrated historical data
    if (!isMigrated || commitments.length === 0) {
      await this.resetAllData(false);

      await this.saveCommitmentsBulk(migratedCommitments);
      await this.saveOccurrencesBulk(migratedOccurrences);

      for (const cat of DEFAULT_CATEGORIES) {
        await this.saveCategory(cat);
      }

      for (const n of migratedNotes) {
        await this.saveNote(n);
      }

      localStorage.setItem('eltizamati_zoho_migrated_v1', 'true');
      localStorage.removeItem('eltizamati_zoho_patch_unpaid_removed');
    }

    // Patch v2: remove unpaid zoho occurrences + deactivate zoho commitments (one-time cleanup)
    const patchApplied = localStorage.getItem('eltizamati_zoho_patch_unpaid_removed') === 'true';
    if (!patchApplied) {
      // 1. Keep only paid occurrences from zoho (non-zoho occurrences stay untouched)
      const allOccs = await this.getOccurrences();
      const paidOnly = allOccs.filter(
        (o) => o.status === 'paid' || !o.source_type || !o.source_type.startsWith('zoho')
      );

      // 2. Deactivate all zoho-migrated commitments so they stop generating new occurrences
      const allCommits = await this.getCommitments();
      const patchedCommits = allCommits.map((c) =>
        c.source_type && c.source_type.startsWith('zoho') ? { ...c, isActive: false } : c
      );

      // Apply to IndexedDB
      try {
        const db = await this.initDB();
        if (db) {
          // Overwrite occurrences
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('occurrences', 'readwrite');
            const store = tx.objectStore('occurrences');
            store.clear();
            for (const o of paidOnly) store.put(o);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
          // Overwrite commitments
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('commitments', 'readwrite');
            const store = tx.objectStore('commitments');
            store.clear();
            for (const c of patchedCommits) store.put(c);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
        }
      } catch { /* ignore */ }

      // Also patch localStorage
      localStorage.setItem(this.lsKey(LS_KEYS.OCCURRENCES), JSON.stringify(paidOnly));
      localStorage.setItem(this.lsKey(LS_KEYS.COMMITMENTS), JSON.stringify(patchedCommits));
      localStorage.setItem('eltizamati_zoho_patch_unpaid_removed', 'true');
    }

    // Patch v3: drop duplicate commitments (same title/amount/currency) where
    // one copy is already paid for the current month and the other isn't.
    const dedupApplied = localStorage.getItem('eltizamati_dedup_unpaid_v1') === 'true';
    if (!dedupApplied) {
      const now = new Date();
      const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const allCommits = await this.getCommitments();
      const allOccs = await this.getOccurrences();

      const groups = new Map<string, Commitment[]>();
      for (const c of allCommits) {
        if (!c.isActive) continue;
        const key = `${c.title.trim()}|${c.amount}|${c.currency}`;
        const group = groups.get(key) ?? [];
        group.push(c);
        groups.set(key, group);
      }

      const isPaidThisMonth = (commitmentId: string) =>
        allOccs.some((o) => o.commitmentId === commitmentId && o.yearMonth === currentYm && o.status === 'paid');

      for (const group of groups.values()) {
        if (group.length < 2) continue;
        const paid = group.filter((c) => isPaidThisMonth(c.id));
        const unpaid = group.filter((c) => !isPaidThisMonth(c.id));
        if (paid.length > 0 && unpaid.length > 0) {
          for (const c of unpaid) {
            await this.deleteCommitment(c.id);
          }
        }
      }

      localStorage.setItem('eltizamati_dedup_unpaid_v1', 'true');
    }

    // Patch v4: permanently delete active commitments that are genuinely
    // overdue right now (due day already passed this month, still unpaid).
    // One-time cleanup only — does not run again, so it won't keep deleting
    // bills every time a future due day passes.
    const overdueDeleteApplied = localStorage.getItem('eltizamati_delete_overdue_v1') === 'true';
    if (!overdueDeleteApplied) {
      const now = new Date();
      const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const currentDay = now.getDate();
      const allCommits = await this.getCommitments();
      const allOccs = await this.getOccurrences();

      const isPaidThisMonth = (commitmentId: string) =>
        allOccs.some((o) => o.commitmentId === commitmentId && o.yearMonth === currentYm && o.status === 'paid');

      for (const c of allCommits) {
        if (!c.isActive) continue;
        if (isPaidThisMonth(c.id)) continue;
        if (currentDay > c.dueDay) {
          await this.deleteCommitment(c.id);
        }
      }

      localStorage.setItem('eltizamati_delete_overdue_v1', 'true');
    }

    // Patch v6: historical payments reconciliation from the user's Zoho
    // Notebook export (Oct 2023 - Sep 2026). Only checklist items explicitly
    // checked (paid) were included — see src/data/historicalReconciliation.ts.
    // This both restores the 10 core recurring commitments (active going
    // forward) and backfills verified paid history as one_time commitments
    // for everything else, so past months never show as owed/overdue.
    // Re-checked every load (not one-time): a cloud sync pull can overwrite
    // these commitments with an older, inactive copy, so this must keep
    // reasserting isActive rather than running once and trusting it sticks.
    // Only creates missing ones or flips isActive back on — never overwrites
    // fields on a commitment that already exists, so a user edit sticks.
    const currentCommits = await this.getCommitments();
    const currentById = new Map(currentCommits.map((c) => [c.id, c]));
    const commitsToUpsert: Commitment[] = [];
    for (const c of historicalCommitments) {
      const existing = currentById.get(c.id);
      if (!existing) {
        commitsToUpsert.push(c);
      } else if (!existing.isActive) {
        commitsToUpsert.push({ ...existing, isActive: true });
      }
    }
    await this.saveCommitmentsBulk(commitsToUpsert);

    const existingOccs = await this.getOccurrences();
    const existingOccIds = new Set(existingOccs.map((o) => o.id));
    const occsToInsert = historicalOccurrences.filter((o) => !existingOccIds.has(o.id));
    await this.saveOccurrencesBulk(occsToInsert);
  }

  // --- Commitments ---
  public async getCommitments(): Promise<Commitment[]> {
    try {
      const db = await this.initDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction('commitments', 'readonly');
          const store = tx.objectStore('commitments');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve(this.getCommitmentsLS());
        });
      }
    } catch {
      // Fallback
    }
    return this.getCommitmentsLS();
  }

  private getCommitmentsLS(): Commitment[] {
    const raw = localStorage.getItem(this.lsKey(LS_KEYS.COMMITMENTS));
    return raw ? JSON.parse(raw) : [];
  }

  public async saveCommitment(commitment: Commitment): Promise<void> {
    try {
      const db = await this.initDB();
      if (db) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('commitments', 'readwrite');
          const store = tx.objectStore('commitments');
          store.put(commitment);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    } catch (e) {
      console.warn('DB error, using LS', e);
    }
    // Sync LS
    const list = this.getCommitmentsLS();
    const idx = list.findIndex((c) => c.id === commitment.id);
    if (idx >= 0) list[idx] = commitment;
    else list.push(commitment);
    localStorage.setItem(this.lsKey(LS_KEYS.COMMITMENTS), JSON.stringify(list));
    this.notifyChange({ collection: 'commitments', op: 'put', id: commitment.id, data: commitment });
  }

  // Bulk upsert: one IndexedDB transaction and one localStorage write for
  // the whole batch, instead of the per-item round trip saveCommitment does.
  // Used by sync, where pulling hundreds of remote docs one at a time was
  // the main cause of the slow/stuck load.
  public async saveCommitmentsBulk(commitments: Commitment[]): Promise<void> {
    if (commitments.length === 0) return;
    try {
      const db = await this.initDB();
      if (db) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('commitments', 'readwrite');
          const store = tx.objectStore('commitments');
          for (const c of commitments) store.put(c);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    } catch (e) {
      console.warn('DB error, using LS', e);
    }
    const list = this.getCommitmentsLS();
    const byId = new Map(list.map((c) => [c.id, c]));
    for (const c of commitments) byId.set(c.id, c);
    localStorage.setItem(this.lsKey(LS_KEYS.COMMITMENTS), JSON.stringify(Array.from(byId.values())));
    for (const c of commitments) {
      this.notifyChange({ collection: 'commitments', op: 'put', id: c.id, data: c });
    }
  }

  public async deleteCommitment(id: string): Promise<void> {
    try {
      const db = await this.initDB();
      if (db) {
        const tx = db.transaction(['commitments', 'occurrences'], 'readwrite');
        tx.objectStore('commitments').delete(id);
        // Note: occurrences will be filtered
      }
    } catch {
      // ignore
    }
    const list = this.getCommitmentsLS().filter((c) => c.id !== id);
    localStorage.setItem(this.lsKey(LS_KEYS.COMMITMENTS), JSON.stringify(list));
    this.notifyChange({ collection: 'commitments', op: 'delete', id });

    const allOccs = this.getOccurrencesLS();
    const removedOccs = allOccs.filter((o) => o.commitmentId === id);
    const occs = allOccs.filter((o) => o.commitmentId !== id);
    localStorage.setItem(this.lsKey(LS_KEYS.OCCURRENCES), JSON.stringify(occs));
    for (const o of removedOccs) {
      this.notifyChange({ collection: 'occurrences', op: 'delete', id: o.id });
    }
  }

  // --- Occurrences ---
  public async getOccurrences(): Promise<Occurrence[]> {
    try {
      const db = await this.initDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction('occurrences', 'readonly');
          const store = tx.objectStore('occurrences');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve(this.getOccurrencesLS());
        });
      }
    } catch {
      // ignore
    }
    return this.getOccurrencesLS();
  }

  private getOccurrencesLS(): Occurrence[] {
    const raw = localStorage.getItem(this.lsKey(LS_KEYS.OCCURRENCES));
    return raw ? JSON.parse(raw) : [];
  }

  public async saveOccurrence(occurrence: Occurrence): Promise<void> {
    try {
      const db = await this.initDB();
      if (db) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('occurrences', 'readwrite');
          tx.objectStore('occurrences').put(occurrence);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    } catch {
      // ignore
    }
    const list = this.getOccurrencesLS();
    const idx = list.findIndex((o) => o.id === occurrence.id);
    if (idx >= 0) list[idx] = occurrence;
    else list.push(occurrence);
    localStorage.setItem(this.lsKey(LS_KEYS.OCCURRENCES), JSON.stringify(list));
    this.notifyChange({ collection: 'occurrences', op: 'put', id: occurrence.id, data: occurrence });
  }

  // Bulk upsert — see saveCommitmentsBulk for why this exists.
  public async saveOccurrencesBulk(occurrences: Occurrence[]): Promise<void> {
    if (occurrences.length === 0) return;
    try {
      const db = await this.initDB();
      if (db) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('occurrences', 'readwrite');
          const store = tx.objectStore('occurrences');
          for (const o of occurrences) store.put(o);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    } catch {
      // ignore
    }
    const list = this.getOccurrencesLS();
    const byId = new Map(list.map((o) => [o.id, o]));
    for (const o of occurrences) byId.set(o.id, o);
    localStorage.setItem(this.lsKey(LS_KEYS.OCCURRENCES), JSON.stringify(Array.from(byId.values())));
    for (const o of occurrences) {
      this.notifyChange({ collection: 'occurrences', op: 'put', id: o.id, data: o });
    }
  }

  // --- Categories ---
  public async getCategories(): Promise<Category[]> {
    try {
      const db = await this.initDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction('categories', 'readonly');
          const store = tx.objectStore('categories');
          const req = store.getAll();
          req.onsuccess = () => {
            if (req.result && req.result.length > 0) resolve(req.result);
            else resolve(DEFAULT_CATEGORIES);
          };
          req.onerror = () => resolve(DEFAULT_CATEGORIES);
        });
      }
    } catch {
      // ignore
    }
    const raw = localStorage.getItem(this.lsKey(LS_KEYS.CATEGORIES));
    return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES;
  }

  public async saveCategory(category: Category): Promise<void> {
    try {
      const db = await this.initDB();
      if (db) {
        const tx = db.transaction('categories', 'readwrite');
        tx.objectStore('categories').put(category);
      }
    } catch {
      // ignore
    }
    const cats = await this.getCategories();
    const idx = cats.findIndex((c) => c.id === category.id);
    if (idx >= 0) cats[idx] = category;
    else cats.push(category);
    localStorage.setItem(this.lsKey(LS_KEYS.CATEGORIES), JSON.stringify(cats));
    this.notifyChange({ collection: 'categories', op: 'put', id: category.id, data: category });
  }

  // --- Notes (Archive) ---
  public async getNotes(): Promise<NoteItem[]> {
    try {
      const db = await this.initDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction('notes', 'readonly');
          const store = tx.objectStore('notes');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve(this.getNotesLS());
        });
      }
    } catch {
      // ignore
    }
    return this.getNotesLS();
  }

  private getNotesLS(): NoteItem[] {
    const raw = localStorage.getItem(this.lsKey(LS_KEYS.NOTES));
    return raw ? JSON.parse(raw) : [];
  }

  public async saveNote(note: NoteItem): Promise<void> {
    try {
      const db = await this.initDB();
      if (db) {
        const tx = db.transaction('notes', 'readwrite');
        tx.objectStore('notes').put(note);
      }
    } catch {
      // ignore
    }
    const list = this.getNotesLS();
    const idx = list.findIndex((n) => n.id === note.id);
    if (idx >= 0) list[idx] = note;
    else list.push(note);
    localStorage.setItem(this.lsKey(LS_KEYS.NOTES), JSON.stringify(list));
    this.notifyChange({ collection: 'notes', op: 'put', id: note.id, data: note });
  }

  public async deleteNote(id: string): Promise<void> {
    try {
      const db = await this.initDB();
      if (db) {
        const tx = db.transaction('notes', 'readwrite');
        tx.objectStore('notes').delete(id);
      }
    } catch {
      // ignore
    }
    const list = this.getNotesLS().filter((n) => n.id !== id);
    localStorage.setItem(this.lsKey(LS_KEYS.NOTES), JSON.stringify(list));
    this.notifyChange({ collection: 'notes', op: 'delete', id });
  }

  // --- Settings ---
  public getSettings(): UserSettings {
    const raw = localStorage.getItem(this.lsKey(LS_KEYS.SETTINGS));
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  }

  public saveSettings(settings: UserSettings): void {
    localStorage.setItem(this.lsKey(LS_KEYS.SETTINGS), JSON.stringify(settings));
  }

  // --- Snapshot & Undo for JSON backup restore ---
  public async createBackupSnapshot(): Promise<void> {
    const snapshot = {
      commitments: await this.getCommitments(),
      occurrences: await this.getOccurrences(),
      notes: await this.getNotes(),
      categories: await this.getCategories(),
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(this.lsKey(LS_KEYS.LAST_BACKUP), JSON.stringify(snapshot));
  }

  public async hasBackupSnapshot(): Promise<boolean> {
    return !!localStorage.getItem(this.lsKey(LS_KEYS.LAST_BACKUP));
  }

  public async restoreLastBackup(): Promise<boolean> {
    const raw = localStorage.getItem(this.lsKey(LS_KEYS.LAST_BACKUP));
    if (!raw) return false;
    try {
      const snapshot = JSON.parse(raw);
      if (snapshot.commitments) {
        // clear and restore
        await this.resetAllData(false);
        for (const c of snapshot.commitments) await this.saveCommitment(c);
        for (const o of snapshot.occurrences) await this.saveOccurrence(o);
        for (const n of snapshot.notes) await this.saveNote(n);
        for (const cat of snapshot.categories) await this.saveCategory(cat);
        localStorage.removeItem(this.lsKey(LS_KEYS.LAST_BACKUP));
        return true;
      }
    } catch (e) {
      console.error('Failed to restore backup snapshot', e);
    }
    return false;
  }

  // --- Export & Import JSON Backup ---
  public async exportAllData(): Promise<string> {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      commitments: await this.getCommitments(),
      occurrences: await this.getOccurrences(),
      categories: await this.getCategories(),
      notes: await this.getNotes(),
      settings: this.getSettings(),
    };
    return JSON.stringify(data, null, 2);
  }

  public async importAllData(jsonStr: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.commitments && !data.occurrences) {
        throw new Error('Invalid backup file structure');
      }

      await this.createBackupSnapshot();
      await this.resetAllData(false);

      if (Array.isArray(data.commitments)) {
        for (const c of data.commitments) await this.saveCommitment(c);
      }
      if (Array.isArray(data.occurrences)) {
        for (const o of data.occurrences) await this.saveOccurrence(o);
      }
      if (Array.isArray(data.categories)) {
        for (const cat of data.categories) await this.saveCategory(cat);
      }
      if (Array.isArray(data.notes)) {
        for (const n of data.notes) await this.saveNote(n);
      }
      if (data.settings) {
        this.saveSettings(data.settings);
      }
      return true;
    } catch (e) {
      console.error('Failed to import data', e);
      return false;
    }
  }

  public async resetAllData(clearBackup = true): Promise<void> {
    try {
      const db = await this.initDB();
      if (db) {
        const tx = db.transaction(['commitments', 'occurrences', 'notes'], 'readwrite');
        tx.objectStore('commitments').clear();
        tx.objectStore('occurrences').clear();
        tx.objectStore('notes').clear();
      }
    } catch {
      // ignore
    }
    localStorage.removeItem(this.lsKey(LS_KEYS.COMMITMENTS));
    localStorage.removeItem(this.lsKey(LS_KEYS.OCCURRENCES));
    localStorage.removeItem(this.lsKey(LS_KEYS.NOTES));
    if (clearBackup) {
      localStorage.removeItem(this.lsKey(LS_KEYS.LAST_BACKUP));
    }
  }
}

export const storage = new StorageService();
