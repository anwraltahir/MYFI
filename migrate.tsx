import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LoginScreen } from './src/components/LoginScreen';
import { storage } from './src/services/storage';
import { pushAllLocalData } from './src/services/sync';
import { legacyNotes } from './migrate-data';

function MigrateScreen() {
  const { user, loading, syncing } = useAuth();
  const [existingCount, setExistingCount] = useState<number | null>(null);
  const [confirmedOnce, setConfirmedOnce] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'local' | 'cloud' | 'done'>('idle');

  useEffect(() => {
    if (user && !loading && !syncing) {
      storage.getNotes().then((notes) => {
        setExistingCount(notes.filter((n) => n.id.startsWith('zoho-legacy-')).length);
      });
    }
  }, [user, loading, syncing]);

  if (loading || syncing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-slate-500 font-medium">جاري التحقق من الحساب...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen lang="ar" />;
  }

  const runImport = async () => {
    setRunning(true);
    setPhase('local');
    for (let i = 0; i < legacyNotes.length; i++) {
      await storage.saveNote(legacyNotes[i]);
      setProgress(i + 1);
    }
    // Local writes trigger the live sync listener, but that's fire-and-forget
    // (not awaited) — closing the tab right after local completion can abort
    // in-flight Firestore writes. Force one explicit, awaited full push so we
    // only declare success once everything has actually reached the cloud.
    setPhase('cloud');
    await pushAllLocalData(user.uid);
    setRunning(false);
    setPhase('done');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 space-y-5 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-700/20">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4v16m8-8H4" />
          </svg>
        </div>

        <div className="space-y-1">
          <h1 className="text-lg font-extrabold text-slate-800">استيراد الأرشيف القديم</h1>
          <p className="text-sm text-slate-500">
            مسجّل دخولك باسم <span className="font-bold text-slate-700">{user.email}</span>
          </p>
        </div>

        {phase === 'done' ? (
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-sm font-bold space-y-1">
            <div>تم الاستيراد والمزامنة بنجاح! تمت إضافة {legacyNotes.length} ملاحظة لأرشيفك وتأكدنا وصولها للسحابة.</div>
            <div className="text-xs font-medium text-emerald-700">
              الآن أغلق هذا التبويب وافتح التطبيق العادي، تبويب الأرشيف.
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              جاهز لاستيراد <span className="font-bold text-teal-700">{legacyNotes.length}</span> ملاحظة (سجلات
              مصروفات شهرية + ملاحظات شخصية) إلى أرشيفك.
            </p>

            {existingCount !== null && existingCount > 0 && !confirmedOnce && (
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-800 text-xs font-bold text-right">
                يبدو إن هذا الاستيراد تم من قبل ({existingCount} ملاحظة من هذا المصدر موجودة محلياً بالفعل). هذا
                الاستيراد آمن يعيد كتابتها فقط (نفس المعرّفات)، ومهم تشغّله عشان يتأكد وصولها الفعلي للسحابة هذه
                المرة. هل تحب تكمل؟
              </div>
            )}

            {running && (
              <p className="text-xs text-slate-500 font-bold">
                {phase === 'local'
                  ? `جاري الحفظ المحلي... ${progress} / ${legacyNotes.length}`
                  : 'جاري التأكد من وصول كل شيء للسحابة... (لا تغلق هذا التبويب)'}
              </p>
            )}

            <button
              onClick={() => {
                if (existingCount !== null && existingCount > 0 && !confirmedOnce) {
                  setConfirmedOnce(true);
                  return;
                }
                runImport();
              }}
              disabled={running}
              className="w-full px-4 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-sm transition active:scale-98 disabled:opacity-60"
            >
              {running
                ? 'جاري الاستيراد...'
                : existingCount !== null && existingCount > 0 && !confirmedOnce
                ? 'نعم، استورد وزامن مرة أخرى'
                : `استيراد ${legacyNotes.length} ملاحظة الآن`}
            </button>

            {!running && (
              <p className="text-[11px] text-rose-500 font-bold">
                مهم: لا تغلق هذا التبويب إلا بعد ما تشوف رسالة "تم الاستيراد والمزامنة بنجاح".
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <MigrateScreen />
  </AuthProvider>
);
