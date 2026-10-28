import { Commitment, Occurrence, Category, NoteItem, ImportHistoryItem, UserSettings, PaymentStatus } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '../utils/constants';

const DB_NAME = 'EltizamatiDB';
const DB_VERSION = 1;

interface DBSchema {
  commitments: Commitment;
  occurrences: Occurrence;
  categories: Category;
  notes: NoteItem;
  importHistory: ImportHistoryItem;
  settings: UserSettings;
}

// LocalStorage Fallback keys
const LS_KEYS = {
  COMMITMENTS: 'eltizamati_commitments',
  OCCURRENCES: 'eltizamati_occurrences',
  CATEGORIES: 'eltizamati_categories',
  NOTES: 'eltizamati_notes',
  IMPORT_HISTORY: 'eltizamati_import_history',
  SETTINGS: 'eltizamati_settings',
  LAST_BACKUP: 'eltizamati_last_backup',
};

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private hasIndexedDB = typeof window !== 'undefined' && 'indexedDB' in window;

  constructor() {
    if (this.hasIndexedDB) {
      this.initDB();
    }
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

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
          if (!db.objectStoreNames.contains('importHistory')) {
            db.createObjectStore('importHistory', { keyPath: 'id' });
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
  public async ensureInitialData(): Promise<void> {
    const commitments = await this.getCommitments();
    if (commitments.length === 0) {
      // Seed Demo data as requested
      const initialCommitments: Commitment[] = [
        {
          id: 'comm-1',
          title: 'الإيجار السكني',
          amount: 2000,
          currency: 'QAR',
          dueDay: 1,
          category: 'housing',
          frequency: 'monthly',
          notes: 'تم التحويل لحساب المالك عبر بنك QNB',
          icon: '🏠',
          isPinned: true,
          isActive: true,
          createdAt: '2026-08-01T10:00:00.000Z',
          updatedAt: '2026-08-01T10:00:00.000Z',
        },
        {
          id: 'comm-2',
          title: 'الكهرباء والماء (كهرماء)',
          amount: 350,
          currency: 'QAR',
          dueDay: 10,
          category: 'services',
          frequency: 'monthly',
          notes: 'رقم المشترك: 88492019',
          icon: '💡',
          isPinned: false,
          isActive: true,
          createdAt: '2026-08-01T10:00:00.000Z',
          updatedAt: '2026-08-01T10:00:00.000Z',
        },
        {
          id: 'comm-3',
          title: 'الإنترنت المنزلي (Ooredoo)',
          amount: 300,
          currency: 'QAR',
          dueDay: 15,
          category: 'telecom',
          frequency: 'monthly',
          notes: 'باقة الفايبر 500 ميغابت',
          icon: '📱',
          isPinned: false,
          isActive: true,
          createdAt: '2026-08-01T10:00:00.000Z',
          updatedAt: '2026-08-01T10:00:00.000Z',
        },
        {
          id: 'comm-4',
          title: 'قسط تمويل السيارة',
          amount: 1200,
          currency: 'QAR',
          dueDay: 25,
          category: 'installments',
          frequency: 'monthly',
          notes: 'استقطاع بنكي دوري',
          icon: '💳',
          isPinned: true,
          isActive: true,
          createdAt: '2026-08-01T10:00:00.000Z',
          updatedAt: '2026-08-01T10:00:00.000Z',
        },
        {
          id: 'comm-5',
          title: 'اشتراك نتفلكس والعائلة',
          amount: 50,
          currency: 'QAR',
          dueDay: 18,
          category: 'subscriptions',
          frequency: 'monthly',
          notes: 'بطاقة فيزا الائتمانية',
          icon: '🔄',
          isPinned: false,
          isActive: true,
          createdAt: '2026-08-01T10:00:00.000Z',
          updatedAt: '2026-08-01T10:00:00.000Z',
        },
        {
          id: 'comm-6',
          title: 'مصروفات وإعاشة الأسرة',
          amount: 1500,
          currency: 'QAR',
          dueDay: 5,
          category: 'family',
          frequency: 'monthly',
          notes: 'مخصص المصروف الشهري المنزلي',
          icon: '👨‍👩‍👧',
          isPinned: false,
          isActive: true,
          createdAt: '2026-08-01T10:00:00.000Z',
          updatedAt: '2026-08-01T10:00:00.000Z',
        },
        {
          id: 'comm-7',
          title: 'قسط أنشطة المدرسة',
          amount: 450,
          currency: 'QAR',
          dueDay: 28,
          category: 'education',
          frequency: 'monthly',
          notes: 'رسوم النقل والنشاط',
          icon: '🎓',
          isPinned: false,
          isActive: true,
          createdAt: '2026-08-01T10:00:00.000Z',
          updatedAt: '2026-08-01T10:00:00.000Z',
        },
      ];

      for (const item of initialCommitments) {
        await this.saveCommitment(item);
      }

      // Initial occurrences for current month October 2026
      // Total = 5,850 QAR
      // Paid: Rent (2000) + Family (1200 / 1500)
      const currentYearMonth = '2026-10';
      const initialOccurrences: Occurrence[] = [
        {
          id: `comm-1_${currentYearMonth}`,
          commitmentId: 'comm-1',
          yearMonth: currentYearMonth,
          status: 'paid',
          paidAt: '2026-10-01T11:30:00.000Z',
          paymentNote: 'تم التحويل إلى حساب المالك في موعده.',
        },
        {
          id: `comm-6_${currentYearMonth}`,
          commitmentId: 'comm-6',
          yearMonth: currentYearMonth,
          status: 'paid',
          paidAt: '2026-10-05T09:15:00.000Z',
          paymentNote: 'تم تسليم المبلغ كاملاً.',
        },
      ];

      for (const occ of initialOccurrences) {
        await this.saveOccurrence(occ);
      }

      // Previous month September 2026 for rich History page demonstration
      const prevYearMonth = '2026-09';
      for (const item of initialCommitments) {
        const isPaid = item.id !== 'comm-2'; // Everything paid except water/elec
        await this.saveOccurrence({
          id: `${item.id}_${prevYearMonth}`,
          commitmentId: item.id,
          yearMonth: prevYearMonth,
          status: isPaid ? 'paid' : 'overdue',
          paidAt: isPaid ? `2026-09-${String(item.dueDay).padStart(2, '0')}T10:00:00.000Z` : null,
        });
      }

      // Initial Categories
      for (const cat of DEFAULT_CATEGORIES) {
        await this.saveCategory(cat);
      }

      // Sample initial archived note from Zoho Notebook
      const sampleNotes: NoteItem[] = [
        {
          id: 'note-zoho-sample-1',
          title: 'عقد الإيجار وحساب المالك 2026',
          content: 'رقم الآيبان: QA12QNBA00000000123456789\nاسم المالك: أبو راشد\nيتم التحويل أول كل شهر ميلادي بمبلغ 2000 ريال.',
          notebook: 'الالتزامات السكنية',
          tags: ['إيجار', 'سكن', 'سداد'],
          createdAt: '2026-01-01T08:00:00.000Z',
          updatedAt: '2026-01-01T08:00:00.000Z',
          source: 'zoho',
          convertedToCommitmentId: 'comm-1',
        },
        {
          id: 'note-zoho-sample-2',
          title: 'ملاحظات اشتراكات البرامج والترفيه',
          content: 'نتفلكس: تم التجديد السنوي\nسبوتيفاي: ملغى مؤقتاً\nتطبيق القرآن: مجاني',
          notebook: 'المصروفات العامة',
          tags: ['اشتراكات', 'ترفيه'],
          checklist: [
            { id: 'chk-1', text: 'سداد نتفلكس 50 ريال', done: true },
            { id: 'chk-2', text: 'مراجعة فاتورة آيكلاود 11 ريال', done: false },
          ],
          createdAt: '2025-11-15T14:20:00.000Z',
          updatedAt: '2025-11-15T14:20:00.000Z',
          source: 'zoho',
        },
      ];

      for (const n of sampleNotes) {
        await this.saveNote(n);
      }
    }
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
    const raw = localStorage.getItem(LS_KEYS.COMMITMENTS);
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
    localStorage.setItem(LS_KEYS.COMMITMENTS, JSON.stringify(list));
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
    localStorage.setItem(LS_KEYS.COMMITMENTS, JSON.stringify(list));

    const occs = this.getOccurrencesLS().filter((o) => o.commitmentId !== id);
    localStorage.setItem(LS_KEYS.OCCURRENCES, JSON.stringify(occs));
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
    const raw = localStorage.getItem(LS_KEYS.OCCURRENCES);
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
    localStorage.setItem(LS_KEYS.OCCURRENCES, JSON.stringify(list));
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
    const raw = localStorage.getItem(LS_KEYS.CATEGORIES);
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
    localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(cats));
  }

  // --- Notes (Archive & Zoho) ---
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
    const raw = localStorage.getItem(LS_KEYS.NOTES);
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
    localStorage.setItem(LS_KEYS.NOTES, JSON.stringify(list));
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
    localStorage.setItem(LS_KEYS.NOTES, JSON.stringify(list));
  }

  // --- Import History ---
  public async getImportHistory(): Promise<ImportHistoryItem[]> {
    try {
      const db = await this.initDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction('importHistory', 'readonly');
          const store = tx.objectStore('importHistory');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve(this.getImportHistoryLS());
        });
      }
    } catch {
      // ignore
    }
    return this.getImportHistoryLS();
  }

  private getImportHistoryLS(): ImportHistoryItem[] {
    const raw = localStorage.getItem(LS_KEYS.IMPORT_HISTORY);
    return raw ? JSON.parse(raw) : [];
  }

  public async addImportHistory(item: ImportHistoryItem): Promise<void> {
    try {
      const db = await this.initDB();
      if (db) {
        const tx = db.transaction('importHistory', 'readwrite');
        tx.objectStore('importHistory').put(item);
      }
    } catch {
      // ignore
    }
    const list = this.getImportHistoryLS();
    list.unshift(item);
    localStorage.setItem(LS_KEYS.IMPORT_HISTORY, JSON.stringify(list));
  }

  // --- Settings ---
  public getSettings(): UserSettings {
    const raw = localStorage.getItem(LS_KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  }

  public saveSettings(settings: UserSettings): void {
    localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // --- Snapshot & Undo for Zoho Import ---
  public async createBackupSnapshot(): Promise<void> {
    const snapshot = {
      commitments: await this.getCommitments(),
      occurrences: await this.getOccurrences(),
      notes: await this.getNotes(),
      categories: await this.getCategories(),
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(LS_KEYS.LAST_BACKUP, JSON.stringify(snapshot));
  }

  public async hasBackupSnapshot(): Promise<boolean> {
    return !!localStorage.getItem(LS_KEYS.LAST_BACKUP);
  }

  public async restoreLastBackup(): Promise<boolean> {
    const raw = localStorage.getItem(LS_KEYS.LAST_BACKUP);
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
        localStorage.removeItem(LS_KEYS.LAST_BACKUP);
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
      importHistory: await this.getImportHistory(),
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
      if (Array.isArray(data.importHistory)) {
        for (const h of data.importHistory) await this.addImportHistory(h);
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
        const tx = db.transaction(['commitments', 'occurrences', 'notes', 'importHistory'], 'readwrite');
        tx.objectStore('commitments').clear();
        tx.objectStore('occurrences').clear();
        tx.objectStore('notes').clear();
        tx.objectStore('importHistory').clear();
      }
    } catch {
      // ignore
    }
    localStorage.removeItem(LS_KEYS.COMMITMENTS);
    localStorage.removeItem(LS_KEYS.OCCURRENCES);
    localStorage.removeItem(LS_KEYS.NOTES);
    localStorage.removeItem(LS_KEYS.IMPORT_HISTORY);
    if (clearBackup) {
      localStorage.removeItem(LS_KEYS.LAST_BACKUP);
    }
  }
}

export const storage = new StorageService();
