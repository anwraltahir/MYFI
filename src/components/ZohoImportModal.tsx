import React, { useState, useRef } from 'react';
import { translations, Language } from '../utils/translations';
import { NoteItem, Commitment, DetectedObligation, ParsedImportResult, ImportHistoryItem } from '../types';
import { zohoParser } from '../services/zohoParser';
import { storage } from '../services/storage';
import {
  Upload,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  History,
  ShieldAlert,
} from 'lucide-react';

interface ZohoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  existingNotes: NoteItem[];
  existingCommitments: Commitment[];
  lang: Language;
}

type Step = 'upload' | 'analyzing' | 'preview' | 'importing' | 'completed';

export const ZohoImportModal: React.FC<ZohoImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  existingNotes,
  existingCommitments,
  lang,
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>('upload');
  const [analysisResult, setAnalysisResult] = useState<ParsedImportResult | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'ignore' | 'import_anyway' | 'replace'>('ignore');
  const [showObligationsReview, setShowObligationsReview] = useState(false);
  const [detectedList, setDetectedList] = useState<DetectedObligation[]>([]);
  const [progress, setProgress] = useState(0);
  const [hasUndoAvailable, setHasUndoAvailable] = useState(false);
  const [undoSuccessMessage, setUndoSuccessMessage] = useState(false);
  const [historyList, setHistoryList] = useState<ImportHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history & undo status on open
  React.useEffect(() => {
    if (isOpen) {
      storage.getImportHistory().then(setHistoryList);
      storage.hasBackupSnapshot().then(setHasUndoAvailable);
      setStep('upload');
      setAnalysisResult(null);
      setProgress(0);
      setUndoSuccessMessage(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep('analyzing');
    setProgress(30);

    try {
      setTimeout(async () => {
        setProgress(70);
        const result = await zohoParser.parseFile(file, existingNotes, existingCommitments);
        setAnalysisResult(result);
        setDetectedList(result.detectedObligations);
        setProgress(100);
        setStep('preview');
      }, 500);
    } catch (err) {
      console.error('Failed to parse file', err);
      alert(lang === 'ar' ? 'حدث خطأ أثناء قراءة الملف.' : 'Error reading file.');
      setStep('upload');
    }
  };

  const handleToggleObligation = (id: string) => {
    setDetectedList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleExecuteImport = async () => {
    if (!analysisResult) return;
    setStep('importing');
    setProgress(20);

    try {
      // 1. Create automatic backup snapshot for 1-click Undo!
      await storage.createBackupSnapshot();
      setProgress(40);

      const notesToSave: NoteItem[] = [];
      const duplicateNoteIds = new Set(analysisResult.duplicates.map((d) => d.note.id));

      for (const note of analysisResult.notes) {
        const isDup = duplicateNoteIds.has(note.id);
        if (isDup && duplicateAction === 'ignore') {
          continue;
        }
        notesToSave.push(note);
      }

      setProgress(60);

      // Save Notes
      for (const n of notesToSave) {
        await storage.saveNote(n);
      }

      // Convert selected detected obligations to Commitments
      const selectedObligations = detectedList.filter((d) => d.selected);
      let commitmentsCreatedCount = 0;

      for (const ob of selectedObligations) {
        const newCommitment: Commitment = {
          id: `comm-from-zoho-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          title: ob.detectedTitle,
          amount: ob.detectedAmount,
          currency: ob.detectedCurrency || 'QAR',
          dueDay: ob.detectedDueDay || 1,
          category: ob.detectedCategory || 'other',
          frequency: ob.detectedFrequency || 'monthly',
          notes: `مستورد من Zoho Notebook (${ob.originalNote.notebook || 'ملاحظات'})\n${ob.originalNote.content.slice(0, 100)}...`,
          icon: ob.detectedCategory === 'housing' ? '🏠' : ob.detectedCategory === 'services' ? '💡' : ob.detectedCategory === 'telecom' ? '📱' : '💳',
          isPinned: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await storage.saveCommitment(newCommitment);
        commitmentsCreatedCount++;

        // Update original note with linked commitment ID
        ob.originalNote.convertedToCommitmentId = newCommitment.id;
        await storage.saveNote(ob.originalNote);
      }

      setProgress(90);

      // Log to Import History
      const historyItem: ImportHistoryItem = {
        id: `import-${Date.now()}`,
        date: new Date().toISOString(),
        sourceName: `${analysisResult.fileName} (${analysisResult.fileType})`,
        notesCount: notesToSave.length,
        commitmentsCount: commitmentsCreatedCount,
        status: 'completed',
      };
      await storage.addImportHistory(historyItem);

      setProgress(100);
      setStep('completed');
      setHasUndoAvailable(true);
      onImportComplete();
    } catch (e) {
      console.error('Import execution failed', e);
      alert(lang === 'ar' ? 'فشلت عملية الاستيراد.' : 'Import failed.');
      setStep('preview');
    }
  };

  const handleUndoLastImport = async () => {
    const success = await storage.restoreLastBackup();
    if (success) {
      setHasUndoAvailable(false);
      setUndoSuccessMessage(true);
      onImportComplete();
      setTimeout(() => {
        onClose();
      }, 1800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {t.zohoImport.sectionTitle}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {t.zohoImport.sectionSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {undoSuccessMessage && (
            <div className="p-4 mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center animate-in fade-in">
              {lang === 'ar' ? 'تم التراجع عن آخر عملية استيراد بنجاح! تم استعادة البيانات السابقة.' : 'Last import undone successfully! Previous data restored.'}
            </div>
          )}

          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/30 hover:bg-teal-50/60 rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition group"
              >
                <div className="w-14 h-14 rounded-2xl bg-teal-100/80 text-teal-700 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  {t.zohoImport.dropzoneTitle}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  {t.zohoImport.dropzoneHint}
                </p>
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
                >
                  {lang === 'ar' ? 'اختيار ملف من الجهاز' : 'Browse File'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".zip,.json,.html,.htm,.csv,.txt"
                  className="hidden"
                />
              </div>

              {/* Supported Formats Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs text-slate-600">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-medium">
                  📦 Zoho ZIP
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-medium">
                  📄 Zoho JSON
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-medium">
                  🌐 HTML Exports
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-medium">
                  📊 CSV / Text
                </div>
              </div>

              {/* Undo Last Import Button if snapshot exists */}
              {hasUndoAvailable && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-medium">
                      {lang === 'ar' ? 'توجد نسخة احتياطية سابقة محفوظة على جهازك.' : 'A restore snapshot is available.'}
                    </span>
                  </div>
                  <button
                    onClick={handleUndoLastImport}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1 active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t.zohoImport.undoButton}</span>
                  </button>
                </div>
              )}

              {/* Import History Collapsible */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center justify-between w-full text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  <div className="flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-400" />
                    <span>{t.zohoImport.historyTitle} ({historyList.length})</span>
                  </div>
                  {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showHistory && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {historyList.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400">
                        {t.zohoImport.noHistory}
                      </div>
                    ) : (
                      historyList.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{item.sourceName}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(item.date).toLocaleDateString()} • {item.notesCount} {lang === 'ar' ? 'ملاحظة' : 'notes'} • {item.commitmentsCount} {lang === 'ar' ? 'التزام' : 'commitments'}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {item.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Analyzing */}
          {step === 'analyzing' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto animate-spin">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {t.zohoImport.analyzing}
              </h3>
              <div className="w-full max-w-xs mx-auto bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-teal-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Preview */}
          {step === 'preview' && analysisResult && (
            <div className="space-y-5">
              {/* Detected format banner */}
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-teal-700 shrink-0" />
                  <span className="font-bold text-teal-900">{analysisResult.fileName}</span>
                  <span className="px-2 py-0.5 rounded-md bg-white text-teal-800 text-[10px] font-semibold border border-teal-200">
                    {analysisResult.fileType}
                  </span>
                </div>
              </div>

              {/* 3 Metric Summary Blocks */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[11px] text-slate-500 font-semibold">{t.zohoImport.notesFound}</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-1">
                    {analysisResult.notes.length}
                  </div>
                </div>

                <div className="p-3 bg-teal-50 rounded-2xl border border-teal-100">
                  <div className="text-[11px] text-teal-700 font-semibold">{t.zohoImport.commitmentsDetected}</div>
                  <div className="text-xl font-extrabold text-teal-800 mt-1 flex items-center justify-center gap-1">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>{detectedList.length}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[11px] text-slate-500 font-semibold">{t.zohoImport.duplicatesFound}</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-1">
                    {analysisResult.duplicates.length}
                  </div>
                </div>
              </div>

              {/* Intelligence: Detected Commitments Review Screen */}
              {detectedList.length > 0 && (
                <div className="rounded-2xl border border-teal-200 bg-teal-50/30 overflow-hidden">
                  <div
                    onClick={() => setShowObligationsReview(!showObligationsReview)}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-teal-50/60 transition"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      <span>{t.zohoImport.reviewObligations} ({detectedList.filter((d) => d.selected).length}/{detectedList.length})</span>
                    </div>
                    <span className="text-xs font-bold text-teal-700 flex items-center gap-1">
                      {showObligationsReview ? (lang === 'ar' ? 'إغلاق المراجعة' : 'Close Review') : (lang === 'ar' ? 'مراجعة الالتزامات' : 'Review Items')}
                      {showObligationsReview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </div>

                  {showObligationsReview && (
                    <div className="p-3 pt-0 max-h-56 overflow-y-auto space-y-2 border-t border-teal-100">
                      <p className="text-[11px] text-slate-500 py-1">
                        {t.zohoImport.reviewSubtitle}
                      </p>
                      {detectedList.map((ob) => (
                        <div
                          key={ob.id}
                          onClick={() => handleToggleObligation(ob.id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer select-none transition ${
                            ob.selected
                              ? 'bg-white border-teal-400 shadow-2xs'
                              : 'bg-white/60 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={ob.selected}
                              onChange={() => {}} // handled by row click
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                            />
                            <div className="truncate">
                              <span className="font-bold text-slate-800">{ob.detectedTitle}</span>
                              <div className="text-[10px] text-slate-400">
                                {lang === 'ar' ? 'يستحق يوم' : 'Due day'}: {ob.detectedDueDay} • {ob.detectedCategory}
                              </div>
                            </div>
                          </div>

                          <div className="text-end font-bold text-teal-700 shrink-0">
                            {ob.detectedAmount.toLocaleString()} {ob.detectedCurrency}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Duplicate Handling Options if duplicates found */}
              {analysisResult.duplicates.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                  <span className="text-xs font-bold text-amber-900 block">
                    {t.zohoImport.duplicateAction}
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setDuplicateAction('ignore')}
                      className={`p-2 rounded-xl border font-bold text-center transition ${
                        duplicateAction === 'ignore'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {t.zohoImport.ignoreDup}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateAction('import_anyway')}
                      className={`p-2 rounded-xl border font-bold text-center transition ${
                        duplicateAction === 'import_anyway'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {t.zohoImport.importAnyway}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateAction('replace')}
                      className={`p-2 rounded-xl border font-bold text-center transition ${
                        duplicateAction === 'replace'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {t.zohoImport.replaceDup}
                    </button>
                  </div>
                </div>
              )}

              {/* Auto-backup notice */}
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>{t.zohoImport.backupCreatedNotice}</span>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  {lang === 'ar' ? 'إلغاء واختيار ملف آخر' : 'Choose another file'}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  className="px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 active:scale-95"
                >
                  {t.zohoImport.confirmImport}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Importing in Progress */}
          {step === 'importing' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto animate-spin">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {t.zohoImport.importingProgress}
              </h3>
              <div className="w-full max-w-xs mx-auto bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-teal-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 5: Completed */}
          {step === 'completed' && analysisResult && (
            <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {t.zohoImport.completedTitle}
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                {t.zohoImport.completedDesc
                  .replace('{notes}', String(analysisResult.notes.length))
                  .replace('{commitments}', String(detectedList.filter((d) => d.selected).length))}
              </p>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md active:scale-95"
                >
                  {lang === 'ar' ? 'عرض الالتزامات والأرشيف' : 'View Commitments & Archive'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
