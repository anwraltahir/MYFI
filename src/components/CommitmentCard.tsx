import React, { useState } from 'react';
import { MoreVertical, Pin, CheckCircle2, Circle, AlertCircle, Copy, Edit2, Trash2, Power, Calendar, FileText } from 'lucide-react';
import { Commitment, Occurrence, Category, PaymentStatus } from '../types';
import { translations, Language } from '../utils/translations';

interface CommitmentCardProps {
  commitment: Commitment;
  occurrence?: Occurrence;
  category?: Category;
  currentYearMonth: string;
  lang: Language;
  onToggleStatus: (commitmentId: string, currentStatus: PaymentStatus) => void;
  onEdit: (commitment: Commitment) => void;
  onDuplicate: (commitment: Commitment) => void;
  onToggleActive: (commitment: Commitment) => void;
  onTogglePin: (commitment: Commitment) => void;
  onDelete: (commitment: Commitment) => void;
  onEditPaymentDate: (commitment: Commitment, occurrence?: Occurrence) => void;
}

export const CommitmentCard: React.FC<CommitmentCardProps> = ({
  commitment,
  occurrence,
  category,
  currentYearMonth,
  lang,
  onToggleStatus,
  onEdit,
  onDuplicate,
  onToggleActive,
  onTogglePin,
  onDelete,
  onEditPaymentDate,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const t = translations[lang];

  // Determine current effective status
  // 1. If occurrence is explicitly marked 'paid', status is 'paid'
  // 2. If occurrence is marked 'overdue', status is 'overdue'
  // 3. If unpaid: check if today's date in this yearMonth exceeds dueDay
  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentDay = now.getDate();

  let effectiveStatus: PaymentStatus = occurrence?.status || 'unpaid';

  if (effectiveStatus !== 'paid') {
    if (occurrence?.status === 'overdue') {
      effectiveStatus = 'overdue';
    } else if (currentYearMonth < currentYm) {
      // Past month and unpaid -> overdue
      effectiveStatus = 'overdue';
    } else if (currentYearMonth === currentYm && currentDay > commitment.dueDay) {
      // Current month and day passed -> overdue
      effectiveStatus = 'overdue';
    }
  }

  const isPaid = effectiveStatus === 'paid';
  const isOverdue = effectiveStatus === 'overdue';

  // Format paid date if present
  let formattedPaidAt = '';
  if (occurrence?.paidAt) {
    try {
      const date = new Date(occurrence.paidAt);
      formattedPaidAt = date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      // ignore
    }
  }

  return (
    <div
      className={`group relative rounded-3xl p-5 transition-all duration-200 border ${
        commitment.isPinned
          ? 'bg-gradient-to-b from-teal-50/40 via-white to-white border-teal-200 shadow-sm'
          : isPaid
          ? 'bg-white/90 border-emerald-100 shadow-2xs hover:shadow-xs'
          : isOverdue
          ? 'bg-white border-rose-200 shadow-2xs hover:shadow-xs'
          : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-xs'
      } ${!commitment.isActive ? 'opacity-50 grayscale' : ''}`}
    >
      {/* Top Row: Icon, Title, Pin badge, Menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 min-w-0">
          {/* Category Icon Badge */}
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-inner transition-transform group-hover:scale-105 ${
              isPaid
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                : isOverdue
                ? 'bg-rose-50 text-rose-800 border border-rose-200/60'
                : 'bg-slate-100 text-slate-800 border border-slate-200/60'
            }`}
          >
            {commitment.icon || '📄'}
          </div>

          <div className="min-w-0">
            <div className="flex items-start gap-2">
              <h3 className="text-base font-bold text-slate-800 line-clamp-2 leading-snug">
                {commitment.title}
              </h3>
              {commitment.isPinned && (
                <span
                  title={lang === 'ar' ? 'مثبت في الأعلى' : 'Pinned'}
                  className="p-1 rounded-md bg-teal-100/70 text-teal-700 shrink-0 mt-0.5"
                >
                  <Pin className="w-3 h-3 rotate-45" />
                </span>
              )}
            </div>

            {/* Category tag & Due day */}
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
              {category && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">
                  {lang === 'ar' ? category.nameAr : category.nameEn}
                </span>
              )}
              <span className="text-slate-400">•</span>
              <span className={`font-medium ${isOverdue ? 'text-rose-600 font-semibold' : ''}`}>
                {t.status.dueOn.replace('{day}', String(commitment.dueDay).padStart(2, '0'))}
              </span>
            </div>
          </div>
        </div>

        {/* Amount & Actions button */}
        <div className="flex items-start gap-1 shrink-0">
          <div className="text-end">
            <div className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">
              <span className="text-xs font-semibold text-slate-400 mr-1 rtl:mr-0 rtl:ml-1">
                {commitment.currency}
              </span>
              <span>{(occurrence?.customAmount ?? commitment.amount).toLocaleString()}</span>
            </div>
          </div>

          {/* Actions Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95"
              aria-label="Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-1.5 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs font-medium">
                  {/* Edit */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(commitment);
                    }}
                    className="w-full px-3 py-2 text-start flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.commitmentActions.edit}</span>
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDuplicate(commitment);
                    }}
                    className="w-full px-3 py-2 text-start flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.commitmentActions.duplicate}</span>
                  </button>

                  {/* Pin / Unpin */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onTogglePin(commitment);
                    }}
                    className="w-full px-3 py-2 text-start flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Pin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{commitment.isPinned ? t.commitmentActions.unpin : t.commitmentActions.pin}</span>
                  </button>

                  {/* Change Payment Date / Note */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEditPaymentDate(commitment, occurrence);
                    }}
                    className="w-full px-3 py-2 text-start flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.commitmentActions.changePaymentDate}</span>
                  </button>

                  {/* Toggle Active */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleActive(commitment);
                    }}
                    className="w-full px-3 py-2 text-start flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Power className="w-3.5 h-3.5 text-slate-400" />
                    <span>{commitment.isActive ? t.commitmentActions.disable : t.commitmentActions.enable}</span>
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  {/* Delete */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(commitment);
                    }}
                    className="w-full px-3 py-2 text-start flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.commitmentActions.delete}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Notes display inspired by Notebook */}
      {(commitment.notes || occurrence?.paymentNote) && (
        <div className="mt-3.5 pt-3 border-t border-slate-100/90 text-xs">
          <div
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center justify-between text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              <span>{lang === 'ar' ? 'ملاحظة' : 'Note'}:</span>
              <span className="truncate max-w-[200px] sm:max-w-xs text-slate-500">
                {occurrence?.paymentNote || commitment.notes}
              </span>
            </div>
            <span className="text-[10px] text-teal-600 font-semibold hover:underline">
              {showNotes ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'عرض' : 'View')}
            </span>
          </div>

          {showNotes && (
            <div className="mt-2 p-2.5 rounded-xl bg-slate-50/80 text-slate-700 leading-relaxed text-xs border border-slate-100 whitespace-pre-wrap">
              {occurrence?.paymentNote && (
                <div className="mb-1 text-emerald-800 font-medium">
                  <span className="font-bold">سداد الشهر: </span>
                  {occurrence.paymentNote}
                </div>
              )}
              {commitment.notes && <div>{commitment.notes}</div>}
            </div>
          )}
        </div>
      )}

      {/* Bottom Row: Payment Status Toggle Button */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* Payment Timestamp if paid */}
        <div className="text-[11px] text-slate-400 font-medium">
          {isPaid && formattedPaidAt && (
            <span>{t.status.paidAt.replace('{date}', formattedPaidAt)}</span>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => onToggleStatus(commitment.id, effectiveStatus)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-95 shadow-2xs ${
            isPaid
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
              : isOverdue
              ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100/80'
              : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 border border-slate-200/80'
          }`}
        >
          {isPaid ? (
            <>
              <CheckCircle2 className="w-4 h-4 fill-white text-emerald-500 animate-in zoom-in-75 duration-200" />
              <span>{t.status.paid} ✓</span>
            </>
          ) : isOverdue ? (
            <>
              <AlertCircle className="w-4 h-4 text-rose-600 animate-pulse" />
              <span>🔴 {t.status.overdue}</span>
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
              <span>○ {t.status.unpaid}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
