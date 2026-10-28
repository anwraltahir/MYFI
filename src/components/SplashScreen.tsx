import React from 'react';
import { translations, Language } from '../utils/translations';

interface SplashScreenProps {
  lang: Language;
  syncing?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ lang, syncing }) => {
  const t = translations[lang].auth;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-700/20 animate-pulse">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        {syncing && (
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-700">{t.syncingTitle}</p>
            <p className="text-xs text-slate-400">{t.syncingSubtitle}</p>
          </div>
        )}
      </div>
    </div>
  );
};
