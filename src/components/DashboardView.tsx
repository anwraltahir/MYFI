import React from 'react';
import { translations, Language } from '../utils/translations';
import { Commitment, Occurrence, Category } from '../types';
import { CheckCircle2, AlertTriangle, ArrowUpRight, TrendingUp, PieChart, ShieldCheck } from 'lucide-react';
import { getEffectiveCommitment } from '../utils/commitmentOverrides';

interface DashboardViewProps {
  commitments: Commitment[];
  occurrences: Occurrence[];
  categories: Category[];
  currentYearMonth: string;
  lang: Language;
  onSelectMonth: (ym: string) => void;
  onNavigateToCommitments: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  commitments,
  occurrences,
  categories,
  currentYearMonth,
  lang,
  onNavigateToCommitments,
}) => {
  const t = translations[lang];

  // Calculate statistics for current month
  const activeCommitments = commitments.filter((c) => c.isActive);
  let calculatedTotal = 0;

  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentDay = now.getDate();

  let paidAmount = 0;
  let paidCount = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  let relevantCount = 0;

  const categoryTotals: Record<string, { amount: number; paid: number; nameAr: string; nameEn: string; icon: string }> = {};

  // Initialize categories
  for (const cat of categories) {
    categoryTotals[cat.id] = {
      amount: 0,
      paid: 0,
      nameAr: cat.nameAr,
      nameEn: cat.nameEn,
      icon: cat.icon,
    };
  }

  for (const comm of activeCommitments) {
    const occ = occurrences.find((o) => o.commitmentId === comm.id && o.yearMonth === currentYearMonth);
    if (occ?.removed) {
      continue;
    }
    if (comm.frequency === 'one_time' && !occ) {
      continue;
    }
    if (!occ && comm.createdAt && comm.createdAt.slice(0, 7) > currentYearMonth) {
      continue;
    }
    const effective = getEffectiveCommitment(comm, occ);
    const isPaid = occ?.status === 'paid';

    // Past months are closed: unpaid items from before the real current
    // month are no longer tracked as owed, so they don't inflate "remaining".
    if (!isPaid && currentYearMonth < currentYm) {
      continue;
    }

    const effectiveAmount = effective.amount;
    calculatedTotal += effectiveAmount;
    relevantCount++;

    let isOverdue = false;
    if (!isPaid && currentYearMonth === currentYm && currentDay > effective.dueDay) {
      isOverdue = true;
    }

    if (isPaid) {
      paidAmount += effectiveAmount;
      paidCount++;
    } else if (isOverdue) {
      overdueAmount += effectiveAmount;
      overdueCount++;
    }

    if (!categoryTotals[effective.category]) {
      categoryTotals[effective.category] = {
        amount: 0,
        paid: 0,
        nameAr: effective.category,
        nameEn: effective.category,
        icon: '📦',
      };
    }
    categoryTotals[effective.category].amount += effectiveAmount;
    if (isPaid) {
      categoryTotals[effective.category].paid += effectiveAmount;
    }
  }

  const totalAmount = calculatedTotal;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const percentage = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
  const currency = commitments[0]?.currency || 'QAR';

  // Category breakdown list sorted by amount
  const sortedCategories = Object.entries(categoryTotals)
    .filter(([, data]) => data.amount > 0)
    .sort((a, b) => b[1].amount - a[1].amount);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
          {t.dashboard.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          {t.dashboard.subtitle}
        </p>
      </div>

      {/* Hero Completion Card */}
      <div className="bg-gradient-to-br from-teal-800 via-teal-700 to-teal-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-white/5 blur-xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-teal-100 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'مؤشر الالتزام المالي' : 'Financial Health Index'}</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold">
              {percentage}% {lang === 'ar' ? 'مكتمل' : 'Completed'}
            </h3>
            <p className="text-teal-100 text-xs sm:text-sm mt-1 max-w-md">
              {percentage === 100
                ? t.dashboard.completionMessage
                : lang === 'ar'
                ? `تم سداد ${paidAmount.toLocaleString()} من إجمالي ${totalAmount.toLocaleString()} ${currency}. متبقي ${remainingAmount.toLocaleString()} ${currency}.`
                : `Settled ${paidAmount.toLocaleString()} of total ${totalAmount.toLocaleString()} ${currency}. Remaining ${remainingAmount.toLocaleString()} ${currency}.`}
            </p>
          </div>

          <button
            onClick={onNavigateToCommitments}
            className="self-start sm:self-auto px-5 py-2.5 rounded-2xl bg-white text-teal-800 hover:bg-teal-50 text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <span>{lang === 'ar' ? 'عرض الالتزامات' : 'View Commitments'}</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Big Progress Bar */}
        <div className="mt-5 w-full bg-teal-950/40 rounded-full h-3 p-0.5 overflow-hidden">
          <div
            className="bg-emerald-400 h-full rounded-full transition-all duration-700 shadow-sm"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold">{t.summary.total}</span>
          <div className="text-lg sm:text-xl font-extrabold text-slate-800 mt-1">
            <span className="text-xs text-slate-400 font-medium ml-1">{currency}</span>
            {totalAmount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{relevantCount} {lang === 'ar' ? 'التزام' : 'items'}</div>
        </div>

        {/* Paid */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs">
          <span className="text-xs text-emerald-600 font-semibold">{t.summary.paid}</span>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-700 mt-1">
            <span className="text-xs text-emerald-500 font-medium ml-1">{currency}</span>
            {paidAmount.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">{paidCount} {lang === 'ar' ? 'مسدد' : 'paid'}</div>
        </div>

        {/* Remaining */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-amber-600 font-semibold">{t.summary.remaining}</span>
          <div className="text-lg sm:text-xl font-extrabold text-slate-700 mt-1">
            <span className="text-xs text-slate-400 font-medium ml-1">{currency}</span>
            {remainingAmount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{relevantCount - paidCount} {lang === 'ar' ? 'متبقي' : 'pending'}</div>
        </div>

        {/* Overdue */}
        <div className={`rounded-2xl p-4 border shadow-2xs ${overdueCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200/80'}`}>
          <span className={`text-xs font-semibold ${overdueCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>{t.summary.overdue}</span>
          <div className={`text-lg sm:text-xl font-extrabold mt-1 ${overdueCount > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
            <span className="text-xs font-medium ml-1">{currency}</span>
            {overdueAmount.toLocaleString()}
          </div>
          <div className={`text-[11px] mt-1 ${overdueCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
            {overdueCount} {lang === 'ar' ? 'متأخر' : 'overdue'}
          </div>
        </div>
      </div>

      {/* Visual Chart: Paid vs Remaining Comparison */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              {lang === 'ar' ? 'مقارنة السداد المالي للشهر' : 'Monthly Financial Settlement'}
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {currency} {totalAmount.toLocaleString()}
          </span>
        </div>

        {/* Stacked comparison bar */}
        <div className="w-full h-8 bg-slate-100 rounded-2xl overflow-hidden flex shadow-inner p-1">
          {paidAmount > 0 && (
            <div
              className="bg-emerald-500 rounded-xl h-full transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold"
              style={{ width: `${(paidAmount / Math.max(1, totalAmount)) * 100}%` }}
              title={`Paid: ${paidAmount.toLocaleString()}`}
            >
              {(paidAmount / totalAmount) > 0.15 ? `${Math.round((paidAmount / totalAmount) * 100)}%` : ''}
            </div>
          )}
          {overdueAmount > 0 && (
            <div
              className="bg-rose-500 rounded-xl h-full transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold mx-0.5"
              style={{ width: `${(overdueAmount / Math.max(1, totalAmount)) * 100}%` }}
              title={`Overdue: ${overdueAmount.toLocaleString()}`}
            >
              {(overdueAmount / totalAmount) > 0.15 ? `${Math.round((overdueAmount / totalAmount) * 100)}%` : ''}
            </div>
          )}
          {remainingAmount - overdueAmount > 0 && (
            <div
              className="bg-amber-400 rounded-xl h-full transition-all duration-500 flex items-center justify-center text-[10px] text-slate-800 font-bold"
              style={{ width: `${((remainingAmount - overdueAmount) / Math.max(1, totalAmount)) * 100}%` }}
              title={`Pending: ${(remainingAmount - overdueAmount).toLocaleString()}`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>{t.summary.paid}: {paidAmount.toLocaleString()} {currency}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span>{lang === 'ar' ? 'متبقي في الموعد' : 'Upcoming'}: {Math.max(0, remainingAmount - overdueAmount).toLocaleString()} {currency}</span>
          </div>
          {overdueAmount > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span>{t.summary.overdue}: {overdueAmount.toLocaleString()} {currency}</span>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            {t.dashboard.categorySpending}
          </h3>
        </div>

        <div className="space-y-3">
          {sortedCategories.map(([catId, data]) => {
            const catPercent = totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0;
            const catPaidPercent = data.amount > 0 ? Math.round((data.paid / data.amount) * 100) : 0;

            return (
              <div key={catId} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{data.icon}</span>
                    <span>{lang === 'ar' ? data.nameAr : data.nameEn}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-teal-700">{data.amount.toLocaleString()} {currency}</span>
                    <span className="text-slate-400 font-normal">({catPercent}%)</span>
                  </div>
                </div>

                {/* Progress of paid within this category */}
                <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${catPaidPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-medium">
                  <span>{lang === 'ar' ? `تم سداد: ${data.paid.toLocaleString()} ${currency}` : `Paid: ${data.paid.toLocaleString()} ${currency}`}</span>
                  <span>{catPaidPercent}% {lang === 'ar' ? 'مسدد' : 'paid'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
