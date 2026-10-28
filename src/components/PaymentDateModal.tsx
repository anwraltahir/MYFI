import React, { useState, useEffect } from 'react';
import { X, Calendar, Check } from 'lucide-react';
import { Commitment, Occurrence, PaymentStatus } from '../types';
import { Language } from '../utils/translations';

interface PaymentDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  commitment: Commitment | null;
  occurrence?: Occurrence;
  currentYearMonth: string;
  onSave: (paymentData: { paidAt: string | null; paymentNote?: string; status: PaymentStatus }) => void;
  lang: Language;
}

export const PaymentDateModal: React.FC<PaymentDateModalProps> = ({
  isOpen,
  onClose,
  commitment,
  occurrence,
  currentYearMonth,
  onSave,
  lang,
}) => {
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('12:00');
  const [paymentNote, setPaymentNote] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('paid');

  useEffect(() => {
    if (occurrence?.paidAt) {
      const d = new Date(occurrence.paidAt);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setDateStr(`${yyyy}-${mm}-${dd}`);
      setTimeStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      setPaymentNote(occurrence.paymentNote || '');
      setStatus(occurrence.status || 'paid');
    } else {
      // Default to today or due day in this month
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(commitment?.dueDay || today.getDate()).padStart(2, '0');
      setDateStr(`${yyyy}-${mm}-${dd}`);
      setTimeStr('12:00');
      setPaymentNote('');
      setStatus('paid');
    }
  }, [occurrence, commitment, isOpen]);

  if (!isOpen || !commitment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let fullIso: string | null = null;
    if (status === 'paid' && dateStr) {
      const combined = `${dateStr}T${timeStr || '12:00'}:00.000Z`;
      fullIso = new Date(combined).toISOString();
    }

    onSave({
      paidAt: fullIso,
      paymentNote: paymentNote.trim(),
      status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-800">
              {lang === 'ar' ? 'تعديل بيانات السداد والملاحظات' : 'Edit Payment Date & Note'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="font-bold text-sm text-slate-800">{commitment.title}</div>
            <div className="font-bold text-sm text-teal-700">
              {commitment.currency} {commitment.amount.toLocaleString()}
            </div>
          </div>

          {/* Status Choice */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'ar' ? 'حالة السداد' : 'Payment Status'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('paid')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                  status === 'paid'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {lang === 'ar' ? '✓ تم السداد' : '✓ Paid'}
              </button>
              <button
                type="button"
                onClick={() => setStatus('unpaid')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                  status === 'unpaid'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {lang === 'ar' ? '○ لم يسدد' : '○ Unpaid'}
              </button>
              <button
                type="button"
                onClick={() => setStatus('overdue')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                  status === 'overdue'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {lang === 'ar' ? '🔴 متأخر' : '🔴 Overdue'}
              </button>
            </div>
          </div>

          {/* Payment Date & Time if paid */}
          {status === 'paid' && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'تاريخ السداد' : 'Payment Date'}
                </label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'الوقت' : 'Time'}
                </label>
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Payment Note for this month */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'ar' ? 'ملاحظة سداد لهذا الشهر' : 'Payment Note for this Month'}
            </label>
            <textarea
              rows={2}
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder={lang === 'ar' ? 'مثال: تم التحويل إلى حساب المالك، رقم المرجع...' : 'e.g. Transferred to owner account, ref #...'}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'حفظ التعديل' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
