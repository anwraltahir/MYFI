import React, { useState } from 'react';
import { translations, Language } from '../utils/translations';
import { Commitment, Occurrence, Category } from '../types';
import { Calendar, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

interface HistoryViewProps {
  commitments: Commitment[];
  occurrences: Occurrence[];
  categories: Category[];
  currentYearMonth: string;
  lang: Language;
  onSelectMonthForManagement: (ym: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  commitments,
  occurrences,
  categories,
  currentYearMonth,
  lang,
  onSelectMonthForManagement,
}) => {
  const t = translations[lang];
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Month names
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const englishMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNames = lang === 'ar' ? arabicMonths : englishMonths;

  // Generate list of the last 12 months
  const now = new Date();
  const monthsList: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthsList.push(ym);
  }

  const currency = commitments[0]?.currency || 'QAR';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
          {t.history.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          {t.history.subtitle}
        </p>
      </div>

      <div className="space-y-3">
        {monthsList.map((ym) => {
          const [yearStr, monthStr] = ym.split('-');
          const mNum = parseInt(monthStr, 10);
          const monthTitle = `${monthNames[mNum - 1]} ${yearStr}`;
          const isCurrent = ym === currentYearMonth;
          const isExpanded = expandedMonth === ym;

          // Compute month stats
          let total = 0;
          let paid = 0;
          let overdue = 0;
          let paidCount = 0;

          const monthCommitments = commitments.filter((c) => c.isActive);

          for (const c of monthCommitments) {
            const occ = occurrences.find((o) => o.commitmentId === c.id && o.yearMonth === ym);
            const amt = occ?.customAmount ?? c.amount;
            total += amt;

            if (occ?.status === 'paid') {
              paid += amt;
              paidCount++;
            } else if (occ?.status === 'overdue' || ym < currentYearMonth) {
              overdue += amt;
            }
          }

          const remaining = Math.max(0, total - paid);
          const isAllSettled = total > 0 && remaining === 0;

          return (
            <div
              key={ym}
              className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
                isCurrent
                  ? 'bg-gradient-to-r from-teal-50/50 via-white to-white border-teal-300 shadow-xs'
                  : 'bg-white border-slate-200/80 shadow-2xs hover:border-slate-300'
              }`}
            >
              {/* Header card summary */}
              <div
                onClick={() => setExpandedMonth(isExpanded ? null : ym)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isAllSettled
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : isCurrent
                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800">{monthTitle}</h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white">
                          {lang === 'ar' ? 'الحالي' : 'Current'}
                        </span>
                      )}
                      {isAllSettled && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t.history.allSettled}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      {paidCount} {lang === 'ar' ? 'من' : 'of'} {monthCommitments.length} {lang === 'ar' ? 'التزام مسدد' : 'paid'}
                    </div>
                  </div>
                </div>

                {/* Numbers */}
                <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-start sm:text-end">
                    <div className="text-[11px] text-slate-400 font-medium">{t.summary.total}</div>
                    <div className="text-sm font-bold text-slate-800">
                      {total.toLocaleString()} {currency}
                    </div>
                  </div>

                  <div className="text-start sm:text-end">
                    <div className="text-[11px] text-emerald-600 font-medium">{t.summary.paid}</div>
                    <div className="text-sm font-bold text-emerald-700">
                      {paid.toLocaleString()} {currency}
                    </div>
                  </div>

                  <div className="text-start sm:text-end">
                    <div className="text-[11px] text-amber-600 font-medium">{t.summary.remaining}</div>
                    <div className="text-sm font-bold text-slate-700">
                      {remaining.toLocaleString()} {currency}
                    </div>
                  </div>

                  <button
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    aria-label="Toggle details"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">
                      {lang === 'ar' ? `تفاصيل التزامات ${monthTitle}:` : `Obligations for ${monthTitle}:`}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMonthForManagement(ym);
                      }}
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 hover:underline"
                    >
                      <span>{lang === 'ar' ? 'إدارة هذا الشهر في الرئيسية' : 'Manage this month in Home'}</span>
                      {lang === 'ar' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {monthCommitments.map((comm) => {
                      const occ = occurrences.find((o) => o.commitmentId === comm.id && o.yearMonth === ym);
                      const isPaidItem = occ?.status === 'paid';
                      const cat = categories.find((c) => c.id === comm.category);

                      return (
                        <div
                          key={comm.id}
                          className="p-3 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base shrink-0">{comm.icon}</span>
                            <div className="truncate">
                              <div className="font-bold text-slate-800 truncate">{comm.title}</div>
                              <div className="text-[10px] text-slate-400">
                                {lang === 'ar' ? cat?.nameAr : cat?.nameEn} • {t.status.dueOn.replace('{day}', String(comm.dueDay))}
                              </div>
                            </div>
                          </div>

                          <div className="text-end shrink-0 ml-2 rtl:ml-0 rtl:mr-2">
                            <div className="font-bold text-slate-800">
                              {(occ?.customAmount ?? comm.amount).toLocaleString()} {comm.currency}
                            </div>
                            <div className="mt-0.5">
                              {isPaidItem ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{t.status.paid}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                                  <Clock className="w-3 h-3" />
                                  <span>{t.status.unpaid}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
