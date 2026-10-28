import React, { useEffect, useRef, useState } from 'react';
import { translations, Language } from '../utils/translations';
import { UserSettings } from '../types';
import { CURRENCIES } from '../utils/constants';
import { storage } from '../services/storage';
import { notificationService } from '../services/notifications';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useAuth } from '../contexts/AuthContext';
import {
  Globe,
  Coins,
  Bell,
  Download,
  Upload,
  Trash2,
  Layers,
  CheckCircle2,
  Smartphone,
  ShieldAlert,
  LogOut,
} from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  lang: Language;
  onOpenZohoImport: () => void;
  onResetAllData: () => void;
  onDataImported: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  lang,
  onOpenZohoImport,
  onResetAllData,
  onDataImported,
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();
  const { user, logout } = useAuth();

  const [notificationStatus, setNotificationStatus] = useState<string>(
    notificationService.getPermission()
  );
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportNotice, setExportNotice] = useState(false);
  const [zohoTestCount, setZohoTestCount] = useState(0);
  const [isCleaningZohoTest, setIsCleaningZohoTest] = useState(false);
  const [cleanupDone, setCleanupDone] = useState(false);

  const KEPT_SEED_NOTE_IDS = new Set(['note-zoho-sample-1', 'note-zoho-sample-2']);

  const countZohoTestData = async () => {
    const [commitments, notes] = await Promise.all([storage.getCommitments(), storage.getNotes()]);
    const testCommitments = commitments.filter((c) => c.id.startsWith('comm-from-zoho-'));
    const testNotes = notes.filter((n) => !n.id.startsWith('manual-note-') && !KEPT_SEED_NOTE_IDS.has(n.id));
    setZohoTestCount(testCommitments.length + testNotes.length);
  };

  useEffect(() => {
    countZohoTestData();
  }, []);

  const handleCleanupZohoTestData = async () => {
    setIsCleaningZohoTest(true);
    try {
      const [commitments, notes] = await Promise.all([storage.getCommitments(), storage.getNotes()]);
      const testCommitments = commitments.filter((c) => c.id.startsWith('comm-from-zoho-'));
      for (const c of testCommitments) {
        await storage.deleteCommitment(c.id);
      }
      const testNotes = notes.filter((n) => !n.id.startsWith('manual-note-') && !KEPT_SEED_NOTE_IDS.has(n.id));
      for (const n of testNotes) {
        await storage.deleteNote(n.id);
      }
      onDataImported();
      await countZohoTestData();
      setCleanupDone(true);
      setTimeout(() => setCleanupDone(false), 4000);
    } finally {
      setIsCleaningZohoTest(false);
    }
  };

  const handleLanguageChange = (newLang: Language) => {
    onUpdateSettings({ ...settings, language: newLang });
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleCurrencyChange = (curr: string) => {
    onUpdateSettings({ ...settings, currency: curr });
  };

  const handleToggleNotifications = async () => {
    if (!settings.notificationsEnabled) {
      const granted = await notificationService.requestPermission();
      setNotificationStatus(granted ? 'granted' : 'denied');
      onUpdateSettings({ ...settings, notificationsEnabled: granted });
      if (granted) {
        notificationService.sendNotification('التزاماتي - التنبيهات مفعلة بنجاح!', {
          body: 'سنقوم بتذكيرك قبل مواعيد استحقاق التزاماتك في الوقت المحدد.',
        });
      }
    } else {
      onUpdateSettings({ ...settings, notificationsEnabled: false });
    }
  };

  const handleTestNotification = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      notificationService.sendNotification('تذكير تجريبي من التزاماتي', {
        body: 'هذا إشعار تجريبي يؤكد أن التنبيهات تعمل بنجاح على جهازك.',
      });
    } else {
      alert(lang === 'ar' ? 'يرجى السماح بالإشعارات في إعدادات المتصفح أولاً.' : 'Please allow notifications in browser permissions first.');
    }
  };

  const handleExportJson = async () => {
    const jsonStr = await storage.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eltizamati-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = await storage.importAllData(text);
      if (success) {
        onDataImported();
        alert(lang === 'ar' ? 'تم استيراد النسخة الاحتياطية بنجاح!' : 'Backup imported successfully!');
      } else {
        alert(lang === 'ar' ? 'الملف غير صالح أو تالف.' : 'Invalid backup file.');
      }
    } catch {
      alert(lang === 'ar' ? 'حدث خطأ أثناء قراءة الملف.' : 'Error reading backup file.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
          {t.settings.title}
        </h2>
      </div>

      {/* Account & Sync */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-4">{t.auth.accountTitle}</h3>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-10 h-10 rounded-2xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-xs text-slate-400">{t.auth.signedInAs}</div>
              <div className="text-sm font-bold text-slate-800">{user?.displayName || user?.email}</div>
              <div className="text-[11px] text-slate-400 mt-0.5 max-w-xs">{t.auth.syncedDesc}</div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold border border-slate-200 transition shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.auth.signOut}</span>
          </button>
        </div>
      </div>

      {/* Zoho Notebook Import Center Showcase Card */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-teal-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-teal-200 text-[11px] font-bold">
              <Layers className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'مركز الاستيراد والترحيل' : 'Import Center'}</span>
            </span>
            <h3 className="text-lg sm:text-xl font-bold">
              {t.zohoImport.sectionTitle}
            </h3>
            <p className="text-teal-100 text-xs sm:text-sm max-w-lg">
              {t.zohoImport.sectionSubtitle}
            </p>
          </div>

          <button
            onClick={onOpenZohoImport}
            className="self-start sm:self-auto px-5 py-2.5 rounded-2xl bg-white text-teal-800 hover:bg-teal-50 text-xs font-bold transition shadow-sm flex items-center gap-2 active:scale-95 shrink-0"
          >
            <Upload className="w-4 h-4 text-teal-600" />
            <span>{t.zohoImport.ctaButton}</span>
          </button>
        </div>
      </div>

      {/* General Settings Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        {/* Language */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">{t.settings.language}</div>
              <div className="text-xs text-slate-400">العربية / English</div>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => handleLanguageChange('ar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                lang === 'ar' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              العربية
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                lang === 'en' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Currency */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">{t.settings.defaultCurrency}</div>
              <div className="text-xs text-slate-400">
                {lang === 'ar' ? 'العملة المعروضة مع المبالغ' : 'Display currency'}
              </div>
            </div>
          </div>

          <select
            value={settings.currency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="px-3 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} - {lang === 'ar' ? c.nameAr : c.symbol}
              </option>
            ))}
          </select>
        </div>

        {/* Notifications */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">{t.settings.notifications}</div>
              <div className="text-xs text-slate-400 max-w-sm">{t.settings.notificationsDesc}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {settings.notificationsEnabled && (
              <button
                onClick={handleTestNotification}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                {lang === 'ar' ? 'تجربة إشعار' : 'Test Alert'}
              </button>
            )}

            <button
              onClick={handleToggleNotifications}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
                settings.notificationsEnabled
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {settings.notificationsEnabled ? (lang === 'ar' ? 'مفعل ✓' : 'Enabled ✓') : (lang === 'ar' ? 'معطل' : 'Disabled')}
            </button>
          </div>
        </div>

        {/* Reminder Days Before */}
        {settings.notificationsEnabled && (
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 text-xs">
            <span className="font-bold text-slate-700">{t.settings.reminderTime}</span>
            <div className="flex items-center gap-1.5">
              {[1, 3, 7].map((days) => (
                <button
                  key={days}
                  onClick={() => onUpdateSettings({ ...settings, reminderDaysBefore: days })}
                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                    settings.reminderDaysBefore === days
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {days} {days === 1 ? t.settings.day : t.settings.days}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PWA App status & Install */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">
                {lang === 'ar' ? 'تطبيق الهاتف (PWA)' : 'Mobile App (PWA)'}
              </div>
              <div className="text-xs text-slate-400">
                {isInstalled
                  ? t.settings.pwaInstalled
                  : lang === 'ar'
                  ? 'يعمل كتطبيق كامل بدون شريط متصفح وبدون إنترنت'
                  : 'Works standalone and offline on mobile and desktop'}
              </div>
            </div>
          </div>

          <div>
            {isInstalled ? (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'مثبت' : 'Installed'}</span>
              </span>
            ) : isInstallable ? (
              <button
                onClick={install}
                className="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition"
              >
                {t.settings.installPwa}
              </button>
            ) : isIOS ? (
              <span className="text-xs text-slate-500 font-medium">
                {lang === 'ar' ? 'من سفاري: اضغط مشاركة ثم إضافة للشاشة' : 'Tap Safari Share → Add to Home Screen'}
              </span>
            ) : (
              <span className="text-xs text-emerald-600 font-bold">✓ PWA Ready</span>
            )}
          </div>
        </div>
      </div>

      {/* Backup & Restore Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 mb-2">
          {t.settings.backupRestore}
        </h3>

        {exportNotice && (
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold">
            {lang === 'ar' ? 'تم تنزيل النسخة الاحتياطية بنجاح!' : 'Backup downloaded successfully!'}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Export JSON */}
          <button
            onClick={handleExportJson}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-teal-50/50 border border-slate-200/80 text-start flex items-center justify-between group transition active:scale-98"
          >
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-teal-700">
                {t.settings.exportJson}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{t.settings.exportDesc}</div>
            </div>
            <Download className="w-5 h-5 text-slate-400 group-hover:text-teal-600 shrink-0" />
          </button>

          {/* Import JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-teal-50/50 border border-slate-200/80 text-start flex items-center justify-between group transition active:scale-98"
          >
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-teal-700">
                {t.settings.importJson}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{t.settings.importDesc}</div>
            </div>
            <Upload className="w-5 h-5 text-slate-400 group-hover:text-teal-600 shrink-0" />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJson}
              accept=".json"
              className="hidden"
            />
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-3xl p-6 border border-rose-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-rose-600">
          <ShieldAlert className="w-4 h-4" />
          <h3 className="text-sm font-bold">{t.settings.dangerZone}</h3>
        </div>

        {zohoTestCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-rose-100">
            <div>
              <div className="text-xs font-bold text-slate-800">
                {lang === 'ar' ? 'تنظيف بيانات تجربة استيراد Zoho' : 'Clean up Zoho import test data'}
              </div>
              <div className="text-[11px] text-slate-400 max-w-sm">
                {lang === 'ar'
                  ? `تم رصد ${zohoTestCount} عنصر من محاولات استيراد سابقة (قبل إصلاح المزامنة). هذا يحذفها فقط، بدون المساس بأي بيانات أضفتها يدوياً.`
                  : `${zohoTestCount} items detected from earlier import test runs (before the sync fix). This only removes those, your manually added data is untouched.`}
              </div>
              {cleanupDone && (
                <div className="text-[11px] text-emerald-600 font-bold mt-1">
                  {lang === 'ar' ? 'تم التنظيف بنجاح ✓' : 'Cleaned up successfully ✓'}
                </div>
              )}
            </div>
            <button
              onClick={handleCleanupZohoTestData}
              disabled={isCleaningZohoTest}
              className="px-4 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200 transition shrink-0 disabled:opacity-60"
            >
              {isCleaningZohoTest
                ? lang === 'ar'
                  ? 'جاري التنظيف...'
                  : 'Cleaning up...'
                : lang === 'ar'
                ? 'تنظيف الآن'
                : 'Clean up now'}
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-800">{t.settings.clearAllData}</div>
            <div className="text-[11px] text-slate-400">{t.settings.clearAllDesc}</div>
          </div>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition"
          >
            {t.settings.clearAllData}
          </button>
        </div>

        {showClearConfirm && (
          <div className="p-4 bg-rose-50/80 rounded-2xl border border-rose-200 space-y-3 animate-in fade-in">
            <div className="text-xs font-bold text-rose-900">{t.settings.clearConfirmTitle}</div>
            <p className="text-xs text-rose-700">{t.settings.clearConfirmMsg}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 bg-white text-slate-600 rounded-xl text-xs font-bold border border-slate-200"
              >
                {t.modal.cancel}
              </button>
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  onResetAllData();
                }}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
              >
                {lang === 'ar' ? 'نعم، امسح كل البيانات' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
