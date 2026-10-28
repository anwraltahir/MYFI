/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { Commitment, Occurrence, Category, NoteItem, UserSettings, PaymentStatus } from './types';
import { storage } from './services/storage';
import { notificationService } from './services/notifications';
import { translations, Language } from './utils/translations';
import { Header } from './components/Header';
import { MonthSelector } from './components/MonthSelector';
import { SummaryCard } from './components/SummaryCard';
import { CommitmentCard } from './components/CommitmentCard';
import { CommitmentModal } from './components/CommitmentModal';
import { PaymentDateModal } from './components/PaymentDateModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { AnalyticsView } from './components/AnalyticsView';
import { NotesArchiveView } from './components/NotesArchiveView';
import { SettingsView } from './components/SettingsView';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { LoginScreen } from './components/LoginScreen';
import { SplashScreen } from './components/SplashScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Plus, Search, Filter, ArrowUpDown } from 'lucide-react';

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { user, loading, syncing } = useAuth();
  const lang: Language = storage.getSettings().language || 'ar';

  if (loading || syncing) return <SplashScreen lang={lang} syncing={syncing} />;
  if (!user) return <LoginScreen lang={lang} />;
  return <AppContent />;
}

function AppContent() {
  const [isPending, startTransition] = useTransition();

  // Core Data
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(() => storage.getSettings());

  const lang: Language = settings.language || 'ar';
  const t = translations[lang];

  // Navigation & Month
  const [currentTab, setCurrentTab] = useState<string>('commitments');
  const [currentYearMonth, setCurrentYearMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid' | 'overdue'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dueDay' | 'amountDesc' | 'amountAsc' | 'title'>('dueDay');

  // Modals state
  const [commitmentModalOpen, setCommitmentModalOpen] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null);

  const [paymentDateModalOpen, setPaymentDateModalOpen] = useState(false);
  const [activePaymentCommitment, setActivePaymentCommitment] = useState<Commitment | null>(null);
  const [activePaymentOccurrence, setActivePaymentOccurrence] = useState<Occurrence | undefined>(undefined);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingCommitment, setDeletingCommitment] = useState<Commitment | null>(null);

  // Initialize and load data
  const loadAllData = async () => {
    await storage.ensureInitialData();
    const [cList, oList, catList, nList] = await Promise.all([
      storage.getCommitments(),
      storage.getOccurrences(),
      storage.getCategories(),
      storage.getNotes(),
    ]);
    startTransition(() => {
      setCommitments(cList);
      setOccurrences(oList);
      setCategories(catList);
      setNotes(nList);
    });
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Update HTML lang & dir on setting change
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Check notification reminders
  useEffect(() => {
    if (settings.notificationsEnabled && commitments.length > 0) {
      notificationService.checkAndNotifyDueCommitments(
        commitments,
        occurrences,
        currentYearMonth,
        settings.reminderDaysBefore || 3
      );
    }
  }, [commitments, occurrences, currentYearMonth, settings.notificationsEnabled, settings.reminderDaysBefore]);

  // Status computation for occurrences
  const now = new Date();
  const realCurrentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentDay = now.getDate();

  // Summary Metrics for current selected month
  const activeCommitments = useMemo(() => commitments.filter((c) => c.isActive), [commitments]);

  const summaryStats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let overdue = 0;
    let paidCount = 0;
    let overdueCount = 0;

    for (const comm of activeCommitments) {
      const occ = occurrences.find((o) => o.commitmentId === comm.id && o.yearMonth === currentYearMonth);
      const effectiveAmount = occ?.customAmount ?? comm.amount;
      total += effectiveAmount;

      let isPaid = occ?.status === 'paid';
      let isOverdue = false;

      if (!isPaid) {
        if (occ?.status === 'overdue') {
          isOverdue = true;
        } else if (currentYearMonth < realCurrentYm) {
          isOverdue = true;
        } else if (currentYearMonth === realCurrentYm && currentDay > comm.dueDay) {
          isOverdue = true;
        }
      }

      if (isPaid) {
        paid += effectiveAmount;
        paidCount++;
      } else if (isOverdue) {
        overdue += effectiveAmount;
        overdueCount++;
      }
    }

    return {
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: Math.max(0, total - paid),
      overdueAmount: overdue,
      totalCount: activeCommitments.length,
      paidCount,
      overdueCount,
    };
  }, [activeCommitments, occurrences, currentYearMonth, realCurrentYm, currentDay]);

  // Filtered & Sorted Commitments
  const visibleCommitments = useMemo(() => {
    return activeCommitments
      .filter((comm) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = comm.title.toLowerCase().includes(q);
          const matchNotes = comm.notes?.toLowerCase().includes(q);
          if (!matchTitle && !matchNotes) return false;
        }

        // Category filter
        if (categoryFilter !== 'all' && comm.category !== categoryFilter) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'all') {
          const occ = occurrences.find((o) => o.commitmentId === comm.id && o.yearMonth === currentYearMonth);
          let effectiveStatus: PaymentStatus = occ?.status || 'unpaid';

          if (effectiveStatus !== 'paid') {
            if (occ?.status === 'overdue') {
              effectiveStatus = 'overdue';
            } else if (currentYearMonth < realCurrentYm) {
              effectiveStatus = 'overdue';
            } else if (currentYearMonth === realCurrentYm && currentDay > comm.dueDay) {
              effectiveStatus = 'overdue';
            }
          }

          if (effectiveStatus !== statusFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Pinned always on top
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        if (sortBy === 'dueDay') {
          return a.dueDay - b.dueDay;
        } else if (sortBy === 'amountDesc') {
          return b.amount - a.amount;
        } else if (sortBy === 'amountAsc') {
          return a.amount - b.amount;
        } else if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [activeCommitments, searchQuery, categoryFilter, statusFilter, sortBy, occurrences, currentYearMonth, realCurrentYm, currentDay]);

  // Handlers for Commitments
  const handleTogglePaymentStatus = async (commitmentId: string, currentStatus: PaymentStatus) => {
    const occId = `${commitmentId}_${currentYearMonth}`;
    const existingOcc = occurrences.find((o) => o.id === occId);

    const willBePaid = currentStatus !== 'paid';
    const newStatus: PaymentStatus = willBePaid ? 'paid' : 'unpaid';
    const paidAt = willBePaid ? new Date().toISOString() : null;

    const updatedOccurrence: Occurrence = {
      id: occId,
      commitmentId,
      yearMonth: currentYearMonth,
      status: newStatus,
      paidAt,
      paymentNote: existingOcc?.paymentNote,
      customAmount: existingOcc?.customAmount,
      manuallyOverridden: true,
    };

    await storage.saveOccurrence(updatedOccurrence);
    setOccurrences((prev) => {
      const idx = prev.findIndex((o) => o.id === occId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedOccurrence;
        return copy;
      }
      return [...prev, updatedOccurrence];
    });
  };

  const handleSaveCommitment = async (data: Omit<Commitment, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingCommitment) {
      const updated: Commitment = {
        ...editingCommitment,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await storage.saveCommitment(updated);
      setCommitments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } else {
      const created: Commitment = {
        ...data,
        id: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await storage.saveCommitment(created);
      setCommitments((prev) => [created, ...prev]);
    }
  };

  const handleDuplicateCommitment = async (commitment: Commitment) => {
    const duplicated: Commitment = {
      ...commitment,
      id: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: `${commitment.title} (${lang === 'ar' ? 'نسخة' : 'Copy'})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await storage.saveCommitment(duplicated);
    setCommitments((prev) => [duplicated, ...prev]);
  };

  const handleTogglePin = async (commitment: Commitment) => {
    const updated = { ...commitment, isPinned: !commitment.isPinned, updatedAt: new Date().toISOString() };
    await storage.saveCommitment(updated);
    setCommitments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleToggleActive = async (commitment: Commitment) => {
    const updated = { ...commitment, isActive: !commitment.isActive, updatedAt: new Date().toISOString() };
    await storage.saveCommitment(updated);
    setCommitments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteCommitment = async () => {
    if (!deletingCommitment) return;
    await storage.deleteCommitment(deletingCommitment.id);
    setCommitments((prev) => prev.filter((c) => c.id !== deletingCommitment.id));
    setOccurrences((prev) => prev.filter((o) => o.commitmentId !== deletingCommitment.id));
    setDeletingCommitment(null);
  };

  const handleSavePaymentDate = async (paymentData: { paidAt: string | null; paymentNote?: string; status: PaymentStatus }) => {
    if (!activePaymentCommitment) return;
    const occId = `${activePaymentCommitment.id}_${currentYearMonth}`;
    const updatedOccurrence: Occurrence = {
      id: occId,
      commitmentId: activePaymentCommitment.id,
      yearMonth: currentYearMonth,
      status: paymentData.status,
      paidAt: paymentData.paidAt,
      paymentNote: paymentData.paymentNote,
      manuallyOverridden: true,
    };
    await storage.saveOccurrence(updatedOccurrence);
    setOccurrences((prev) => {
      const idx = prev.findIndex((o) => o.id === occId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedOccurrence;
        return copy;
      }
      return [...prev, updatedOccurrence];
    });
  };

  const handleAddCategory = async (newCat: Category) => {
    await storage.saveCategory(newCat);
    setCategories((prev) => [...prev, newCat]);
  };

  const handleConvertToCommitmentFromNote = (note: NoteItem) => {
    setEditingCommitment(null);
    setCommitmentModalOpen(true);
  };

  const handleSaveNote = async (note: NoteItem) => {
    await storage.saveNote(note);
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === note.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = note;
        return copy;
      }
      return [note, ...prev];
    });
  };

  const handleDeleteNote = async (noteId: string) => {
    await storage.deleteNote(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handleResetAllData = async () => {
    await storage.resetAllData();
    await loadAllData();
  };

  const primaryCurrency = commitments[0]?.currency || settings.currency || 'QAR';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-24 md:pb-16 flex flex-col">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        lang={lang}
      />

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        {/* In-App PWA Install Banner */}
        <PWAInstallBanner lang={lang} />

        {/* VIEW 1: COMMITMENTS (Home) */}
        {currentTab === 'commitments' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Top Month Selector: ‹ أكتوبر 2026 › */}
            <MonthSelector
              currentYearMonth={currentYearMonth}
              onChange={setCurrentYearMonth}
              lang={lang}
            />

            {/* Quick Summary Card: Total, Paid, Remaining, Progress Bar */}
            <SummaryCard
              totalAmount={summaryStats.totalAmount}
              paidAmount={summaryStats.paidAmount}
              remainingAmount={summaryStats.remainingAmount}
              overdueAmount={summaryStats.overdueAmount}
              currency={primaryCurrency}
              totalCount={summaryStats.totalCount}
              paidCount={summaryStats.paidCount}
              overdueCount={summaryStats.overdueCount}
              lang={lang}
            />

            {/* Filters, Search & Sorting Bar */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.filters.searchPlaceholder}
                    className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Dropdown */}
                <div className="flex items-center gap-2">
                  <div className="relative shrink-0">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                      <option value="all">{t.filters.allCategories}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {lang === 'ar' ? c.nameAr : c.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative shrink-0">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                      <option value="dueDay">{t.filters.sortDueDay}</option>
                      <option value="amountDesc">{t.filters.sortAmount}</option>
                      <option value="amountAsc">{t.filters.sortAmountAsc}</option>
                      <option value="title">{t.filters.sortTitle}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    statusFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.status.all} ({activeCommitments.length})
                </button>
                <button
                  onClick={() => setStatusFilter('unpaid')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    statusFilter === 'unpaid'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ○ {t.status.unpaid} ({summaryStats.totalCount - summaryStats.paidCount})
                </button>
                <button
                  onClick={() => setStatusFilter('paid')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    statusFilter === 'paid'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ✓ {t.status.paid} ({summaryStats.paidCount})
                </button>
                <button
                  onClick={() => setStatusFilter('overdue')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    statusFilter === 'overdue'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🔴 {t.status.overdue} ({summaryStats.overdueCount})
                </button>
              </div>
            </div>

            {/* Commitments Cards List */}
            {visibleCommitments.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {t.emptyState.noCommitmentsTitle}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                  {t.emptyState.noCommitmentsDesc}
                </p>
                <button
                  onClick={() => {
                    setEditingCommitment(null);
                    setCommitmentModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
                >
                  {t.emptyState.addFirst}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleCommitments.map((comm) => {
                  const occ = occurrences.find(
                    (o) => o.commitmentId === comm.id && o.yearMonth === currentYearMonth
                  );
                  const cat = categories.find((c) => c.id === comm.category);

                  return (
                    <CommitmentCard
                      key={comm.id}
                      commitment={comm}
                      occurrence={occ}
                      category={cat}
                      currentYearMonth={currentYearMonth}
                      lang={lang}
                      onToggleStatus={handleTogglePaymentStatus}
                      onEdit={(c) => {
                        setEditingCommitment(c);
                        setCommitmentModalOpen(true);
                      }}
                      onDuplicate={handleDuplicateCommitment}
                      onToggleActive={handleToggleActive}
                      onTogglePin={handleTogglePin}
                      onDelete={(c) => {
                        setDeletingCommitment(c);
                        setDeleteConfirmOpen(true);
                      }}
                      onEditPaymentDate={(c, o) => {
                        setActivePaymentCommitment(c);
                        setActivePaymentOccurrence(o);
                        setPaymentDateModalOpen(true);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: DASHBOARD */}
        {currentTab === 'dashboard' && (
          <DashboardView
            commitments={commitments}
            occurrences={occurrences}
            categories={categories}
            currentYearMonth={currentYearMonth}
            lang={lang}
            onSelectMonth={setCurrentYearMonth}
            onNavigateToCommitments={() => setCurrentTab('commitments')}
          />
        )}

        {/* VIEW 3: HISTORY (السجل) */}
        {currentTab === 'history' && (
          <HistoryView
            commitments={commitments}
            occurrences={occurrences}
            categories={categories}
            currentYearMonth={currentYearMonth}
            lang={lang}
            onSelectMonthForManagement={(ym) => {
              setCurrentYearMonth(ym);
              setCurrentTab('commitments');
            }}
          />
        )}

        {/* VIEW 4: ANALYTICS (الإحصائيات) */}
        {currentTab === 'analytics' && (
          <AnalyticsView
            commitments={commitments}
            occurrences={occurrences}
            categories={categories}
            currentYearMonth={currentYearMonth}
            lang={lang}
          />
        )}

        {/* VIEW 5: NOTES ARCHIVE */}
        {currentTab === 'archive' && (
          <NotesArchiveView
            notes={notes}
            lang={lang}
            onConvertToCommitment={handleConvertToCommitmentFromNote}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
          />
        )}

        {/* VIEW 6: SETTINGS */}
        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={(newSettings) => {
              setSettings(newSettings);
              storage.saveSettings(newSettings);
            }}
            lang={lang}
            onResetAllData={handleResetAllData}
            onDataImported={loadAllData}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) on Mobile and Desktop for Adding Commitment */}
      {currentTab === 'commitments' && (
        <div className="fixed bottom-6 right-6 rtl:right-auto rtl:left-6 z-30">
          <button
            onClick={() => {
              setEditingCommitment(null);
              setCommitmentModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-xl shadow-teal-600/30 transition-all duration-200 active:scale-95 group hover:pr-6 rtl:hover:pr-5 rtl:hover:pl-6"
            aria-label="Add Commitment"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            <span>{t.commitmentActions.add}</span>
          </button>
        </div>
      )}

      {/* Commitment Add/Edit Modal */}
      <CommitmentModal
        isOpen={commitmentModalOpen}
        onClose={() => setCommitmentModalOpen(false)}
        onSave={handleSaveCommitment}
        categories={categories}
        onAddCategory={handleAddCategory}
        initialCommitment={editingCommitment}
        defaultCurrency={primaryCurrency}
        lang={lang}
      />

      {/* Payment Date & Note Modal */}
      <PaymentDateModal
        isOpen={paymentDateModalOpen}
        onClose={() => setPaymentDateModalOpen(false)}
        commitment={activePaymentCommitment}
        occurrence={activePaymentOccurrence}
        currentYearMonth={currentYearMonth}
        onSave={handleSavePaymentDate}
        lang={lang}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteCommitment}
        title={deletingCommitment?.title || ''}
        lang={lang}
      />
    </div>
  );
}
