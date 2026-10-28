import React from 'react';
import { translations, Language } from '../utils/translations';
import { Commitment, Occurrence, Category } from '../types';
import { BarChart3, TrendingUp, Award, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';

interface AnalyticsViewProps {
  commitments: Commitment[];
  occurrences: Occurrence[];
  categories: Category[];
  currentYearMonth: string;
  lang: Language;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  commitments,
  occurrences,
  categories,
  currentYearMonth,
  lang,
}) => {
  const t = translations[lang];
  const [currentYear] = currentYearMonth.split('-').map(Number);
  const currency = commitments[0]?.currency || 'QAR';

  // Calculate annual metrics for currentYear
  const activeCommitments = commitments.filter((c) => c.isActive);
  const monthlyTotalBase = activeCommitments.reduce((sum, c) => sum + c.amount, 0);

  // Analyze months 01 through 12 for this year
  const monthlyData: { month: number; monthName: string; total: number; paid: number }[] = [];
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const englishMonths = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const monthLabels = lang === 'ar' ? arabicMonths : englishMonths;

  let yearlyTotal = 0;
  let yearlyPaid = 0;
  let totalPaidCount = 0;
  let totalOverdueCount = 0;

  // Track category amounts across year
  const categoryYearlySpend: Record<string, number> = {};

  for (let m = 1; m <= 12; m++) {
    const ym = `${currentYear}-${String(m).padStart(2, '0')}`;
    let mTotal = 0;
    let mPaid = 0;

    for (const comm of activeCommitments) {
      const occ = occurrences.find((o) => o.commitmentId === comm.id && o.yearMonth === ym);
      const amt = occ?.customAmount ?? comm.amount;
      mTotal += amt;

      if (!categoryYearlySpend[comm.category]) {
        categoryYearlySpend[comm.category] = 0;
      }

      if (occ?.status === 'paid') {
        mPaid += amt;
        yearlyPaid += amt;
        totalPaidCount++;
        categoryYearlySpend[comm.category] += amt;
      } else if (occ?.status === 'overdue' || ym < currentYearMonth) {
        totalOverdueCount++;
      }
    }

    yearlyTotal += mTotal;
    monthlyData.push({
      month: m,
      monthName: monthLabels[m - 1],
      total: mTotal,
      paid: mPaid,
    });
  }

  // Monthly average
  const monthlyAverage = monthlyTotalBase;

  // Top spending category
  let topCategoryId = '';
  let topCategoryAmount = 0;
  for (const [catId, amount] of Object.entries(categoryYearlySpend)) {
    if (amount > topCategoryAmount) {
      topCategoryAmount = amount;
      topCategoryId = catId;
    }
  }

  const topCategoryObj = categories.find((c) => c.id === topCategoryId) || categories[0];

  // Maximum value for chart scaling
  const maxMonthValue = Math.max(...monthlyData.map((d) => Math.max(d.total, d.paid)), 1000);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
          {t.analytics.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          {t.analytics.subtitle}
        </p>
      </div>

      {/* 6 Key Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Monthly Average */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
            <span>{t.analytics.monthlyAvg}</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-800">
            {monthlyAverage.toLocaleString()} <span className="text-xs font-medium text-slate-400">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {lang === 'ar' ? 'معدل الالتزامات الشهري' : 'Base monthly target'}
          </div>
        </div>

        {/* Top Spending Category */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.analytics.topCategory}</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-800 truncate">
            {topCategoryObj ? `${topCategoryObj.icon} ${lang === 'ar' ? topCategoryObj.nameAr : topCategoryObj.nameEn}` : '—'}
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">
            {topCategoryAmount > 0 ? `${topCategoryAmount.toLocaleString()} ${currency}` : '—'}
          </div>
        </div>

        {/* Total Paid in Year */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t.analytics.yearlyPaid}</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-700">
            {yearlyPaid.toLocaleString()} <span className="text-xs font-medium text-emerald-600/70">{currency}</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">
            {currentYear}
          </div>
        </div>

        {/* Total Commitments in Year */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.analytics.yearlyTotal}</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-800">
            {yearlyTotal.toLocaleString()} <span className="text-xs font-medium text-slate-400">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {lang === 'ar' ? 'مجموع شهور السنة' : '12 months cumulative'}
          </div>
        </div>

        {/* Paid Count */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t.analytics.paidCount}</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-700">
            {totalPaidCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {lang === 'ar' ? 'سداد ناجح مسجل' : 'Confirmed payments'}
          </div>
        </div>

        {/* Overdue Count */}
        <div className={`rounded-2xl p-4 border shadow-2xs ${totalOverdueCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200/80'}`}>
          <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1 ${totalOverdueCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t.analytics.overdueCount}</span>
          </div>
          <div className={`text-lg sm:text-xl font-extrabold ${totalOverdueCount > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
            {totalOverdueCount}
          </div>
          <div className={`text-[11px] mt-0.5 ${totalOverdueCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
            {lang === 'ar' ? 'تجاوزت الموعد' : 'Overdue occurrences'}
          </div>
        </div>
      </div>

      {/* Visual Chart: 12-Month Annual Bar Chart */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              {t.analytics.yearOverview.replace('{year}', String(currentYear))}
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-teal-500" />
              <span className="text-slate-600">{t.summary.total}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
              <span className="text-slate-600">{t.summary.paid}</span>
            </div>
          </div>
        </div>

        {/* Bar chart grid */}
        <div className="h-56 flex items-end justify-between gap-1 sm:gap-3 pt-6 pb-2 border-b border-slate-100">
          {monthlyData.map((d) => {
            const totalHeightPercent = Math.min(100, Math.round((d.total / maxMonthValue) * 100));
            const paidHeightPercent = Math.min(100, Math.round((d.paid / maxMonthValue) * 100));
            const isSelected = `${currentYear}-${String(d.month).padStart(2, '0')}` === currentYearMonth;

            return (
              <div key={d.month} className="flex-1 flex flex-col items-center h-full justify-end group">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-1.5 rounded-md mb-1 whitespace-nowrap shadow-md pointer-events-none z-10">
                  {d.monthName}: {d.paid.toLocaleString()} / {d.total.toLocaleString()} {currency}
                </div>

                {/* Bars Pair */}
                <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-44">
                  {/* Total bar */}
                  <div
                    className={`w-2.5 sm:w-4 rounded-t-sm transition-all duration-300 ${
                      isSelected ? 'bg-teal-600' : 'bg-slate-200 group-hover:bg-slate-300'
                    }`}
                    style={{ height: `${Math.max(4, totalHeightPercent)}%` }}
                  />
                  {/* Paid bar */}
                  <div
                    className="w-2.5 sm:w-4 rounded-t-sm bg-emerald-500 group-hover:bg-emerald-600 transition-all duration-300"
                    style={{ height: `${Math.max(4, paidHeightPercent)}%` }}
                  />
                </div>

                {/* Label */}
                <span className={`text-[10px] font-semibold mt-2 ${isSelected ? 'text-teal-700 font-bold' : 'text-slate-400'}`}>
                  {d.monthName}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
