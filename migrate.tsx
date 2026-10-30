import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LoginScreen } from './src/components/LoginScreen';
import { storage } from './src/services/storage';
import { legacyNotes } from './migrate-data';

function MigrateScreen() {
  const { user, loading, syncing } = useAuth();
  const [existingCount, setExistingCount] = useState<number | null>(null);
  const [confirmedOnce, setConfirmedOnce] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

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
    for (let i = 0; i < legacyNotes.length; i++) {
      await storage.saveNote(legacyNotes[i]);
      setProgress(i + 1);
    }
    setRunning(false);
    setDone(true);
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

        {done ? (
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-sm font-bold">
            تم الاستيراد بنجاح! تمت إضافة {legacyNotes.length} ملاحظة لأرشيفك. افتح تبويب الأرشيف في التطبيق للمراجعة.
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              جاهز لاستيراد <span className="font-bold text-teal-700">{legacyNotes.length}</span> ملاحظة (سجلات
              مصروفات شهرية + ملاحظات شخصية) إلى أرشيفك.
            </p>

            {existingCount !== null && existingCount > 0 && !confirmedOnce && (
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-800 text-xs font-bold text-right">
                يبدو إن هذا الاستيراد تم من قبل ({existingCount} ملاحظة من هذا المصدر موجودة بالفعل). هل تحب تستورد
                مرة أخرى؟
              </div>
            )}

            {running && (
              <p className="text-xs text-slate-500 font-bold">
                جاري الاستيراد... {progress} / {legacyNotes.length}
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
                ? 'نعم، استورد مرة أخرى'
                : `استيراد ${legacyNotes.length} ملاحظة الآن`}
            </button>
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
