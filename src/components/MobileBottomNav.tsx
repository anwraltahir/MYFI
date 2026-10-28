import React from 'react';
import { Calendar, LayoutDashboard, History, BarChart3, BookOpen, Settings } from 'lucide-react';
import { translations, Language } from '../utils/translations';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  lang: Language;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentTab, onSelectTab, lang }) => {
  const t = translations[lang];

  const navItems = [
    { id: 'commitments', label: t.tabs.commitments, icon: Calendar },
    { id: 'dashboard', label: t.tabs.dashboard, icon: LayoutDashboard },
    { id: 'history', label: t.tabs.history, icon: History },
    { id: 'analytics', label: t.tabs.analytics, icon: BarChart3 },
    { id: 'archive', label: t.tabs.archive, icon: BookOpen },
    { id: 'settings', label: t.tabs.settings, icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-w-0 active:scale-95 transition-transform"
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
              <span
                className={`text-[10px] font-bold truncate max-w-full px-0.5 ${
                  isActive ? 'text-teal-700' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
