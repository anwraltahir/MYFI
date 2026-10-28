import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { Language } from '../utils/translations';

interface PWAInstallBannerProps {
  lang: Language;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) return null;

  return (
    <>
      {/* Banner for Android / Chrome / Desktop */}
      {isInstallable && (
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 text-white px-4 py-2.5 rounded-2xl shadow-sm mb-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium">
              {lang === 'ar'
                ? 'ثبّت تطبيق التزاماتي على هاتفك للوصول السريع بدون إنترنت'
                : 'Install My Commitments app on your phone for quick offline access'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={install}
              className="px-3 py-1.5 rounded-xl bg-white text-teal-800 font-bold hover:bg-teal-50 transition active:scale-95 shadow-2xs"
            >
              {lang === 'ar' ? 'تثبيت التطبيق' : 'Install'}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Banner for iOS Safari */}
      {isIOS && !isInstallable && (
        <div className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-2xl border border-slate-200/80 mb-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-medium">
              {lang === 'ar'
                ? 'هل تستخدم iPhone؟ ثبّت التطبيق على شاشتك الرئيسية.'
                : 'Using iPhone? Install app on your home screen.'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowIOSModal(true)}
              className="px-3 py-1 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700"
            >
              {lang === 'ar' ? 'كيفية التثبيت' : 'How to install'}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-3">
              <Share2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-2">
              {lang === 'ar' ? 'تثبيت التطبيق على iPhone و iPad' : 'Install on iPhone & iPad'}
            </h3>

            <div className="text-xs text-slate-600 text-start space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  {lang === 'ar'
                    ? 'اضغط على زر المشاركة (Share) في شريط متصفح سفاري بالأسفل.'
                    : 'Tap the Share icon in Safari toolbar at the bottom.'}
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <span className="flex items-center gap-1">
                  {lang === 'ar' ? 'اختر' : 'Select'} <strong>{lang === 'ar' ? 'إضافة إلى الصفحة الرئيسية' : 'Add to Home Screen'}</strong>
                  <PlusSquare className="w-3.5 h-3.5 text-teal-600 inline" />
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  {lang === 'ar'
                    ? 'اضغط "إضافة" (Add) في الزاوية العلوية.'
                    : 'Tap "Add" in the top corner.'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-2xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700"
            >
              {lang === 'ar' ? 'فهمت ذلك' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
