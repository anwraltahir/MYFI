import React from 'react';
import { Calendar, LayoutDashboard, History, BarChart3, BookOpen, Settings, Download } from 'lucide-react';
import { translations, Language } from '../utils/translations';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  lang: Language;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab, lang }) => {
  const t = translations[lang];
  const { isInstallable, install } = usePWAInstall();

  const navItems = [
    { id: 'commitments', label: t.tabs.commitments, icon: Calendar },
    { id: 'dashboard', label: t.tabs.dashboard, icon: LayoutDashboard },
    { id: 'history', label: t.tabs.history, icon: History },
    { id: 'analytics', label: t.tabs.analytics, icon: BarChart3 },
    { id: 'archive', label: t.tabs.archive, icon: BookOpen },
    { id: 'settings', label: t.tabs.settings, icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('commitments')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-700/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">
                {t.appName}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5 hidden sm:block">
                {t.appTagline}
              </p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Actions (Install PWA if available, or quick icon) */}
          <div className="flex items-center gap-2">
            {isInstallable && (
              <button
                onClick={install}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition"
                title={t.settings.installPwa}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.settings.installPwa}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Navigation Tabs */}
      <div className="md:hidden flex overflow-x-auto no-scrollbar px-3 py-1.5 border-t border-slate-100 gap-1.5 bg-slate-50/50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-white text-teal-700 shadow-xs border border-teal-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
