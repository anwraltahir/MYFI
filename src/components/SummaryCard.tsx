import React from 'react';
import { translations, Language } from '../utils/translations';
import { CheckCircle2, Clock, AlertTriangle, Wallet } from 'lucide-react';

interface SummaryCardProps {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  overdueAmount: number;
  currency: string;
  totalCount: number;
  paidCount: number;
  overdueCount: number;
  lang: Language;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  totalAmount,
  paidAmount,
  remainingAmount,
  overdueAmount,
  currency,
  totalCount,
  paidCount,
  overdueCount,
  lang,
}) => {
  const t = translations[lang];

  const percentage = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
      {/* 3 Columns Stat Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 divide-x divide-slate-100 rtl:divide-x-reverse text-center sm:text-start">
        {/* Total */}
        <div className="px-1 sm:px-3">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-500 mb-1">
            <Wallet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold truncate">{t.summary.total}</span>
          </div>
          <div className="text-base sm:text-2xl font-extrabold text-slate-800 tracking-tight">
            <span className="text-xs sm:text-sm font-medium text-slate-500 ml-1">{currency}</span>
            <span>{totalAmount.toLocaleString()}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
            {t.summary.itemsCount.replace('{count}', String(totalCount))}
          </div>
        </div>

        {/* Paid */}
        <div className="px-1 sm:px-3">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-600 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold truncate">{t.summary.paid}</span>
          </div>
          <div className="text-base sm:text-2xl font-extrabold text-emerald-700 tracking-tight">
            <span className="text-xs sm:text-sm font-medium text-emerald-600/70 ml-1">{currency}</span>
            <span>{paidAmount.toLocaleString()}</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            {paidCount} {lang === 'ar' ? 'مسدد' : 'paid'}
          </div>
        </div>

        {/* Remaining */}
        <div className="px-1 sm:px-3">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-amber-600 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold truncate">{t.summary.remaining}</span>
          </div>
          <div className="text-base sm:text-2xl font-extrabold text-slate-700 tracking-tight">
            <span className="text-xs sm:text-sm font-medium text-slate-400 ml-1">{currency}</span>
            <span>{remainingAmount.toLocaleString()}</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">
            {totalCount - paidCount} {lang === 'ar' ? 'متبقي' : 'pending'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
          <span className="flex items-center gap-1.5">
            <span>{t.summary.progress}</span>
            {percentage === 100 && (
              <span className="text-emerald-600 text-xs font-bold">🎉 {lang === 'ar' ? 'اكتمل السداد' : 'All Settled'}</span>
            )}
          </span>
          <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
            {percentage}%
          </span>
        </div>

        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              percentage === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-teal-500 to-emerald-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Overdue alert banner if any overdue */}
      {overdueCount > 0 && (
        <div className="mt-3.5 p-2.5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
            <span className="font-semibold">
              {lang === 'ar'
                ? `تنبيه: لديك ${overdueCount} التزامات متأخرة بمبلغ ${overdueAmount.toLocaleString()} ${currency}`
                : `Alert: You have ${overdueCount} overdue item(s) totaling ${overdueAmount.toLocaleString()} ${currency}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
