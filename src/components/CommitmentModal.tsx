import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Commitment, Category, RecurrenceType } from '../types';
import { translations, Language } from '../utils/translations';
import { AVAILABLE_ICONS, CURRENCIES } from '../utils/constants';

interface CommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (commitmentData: Omit<Commitment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  categories: Category[];
  onAddCategory: (category: Category) => void;
  initialCommitment?: Commitment | null;
  defaultCurrency: string;
  lang: Language;
}

export const CommitmentModal: React.FC<CommitmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  onAddCategory,
  initialCommitment,
  defaultCurrency,
  lang,
}) => {
  const t = translations[lang];

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [dueDay, setDueDay] = useState<number>(1);
  const [category, setCategory] = useState('housing');
  const [frequency, setFrequency] = useState<RecurrenceType>('monthly');
  const [notes, setNotes] = useState('');
  const [icon, setIcon] = useState('🏠');
  const [isPinned, setIsPinned] = useState(false);

  // New category inline creation
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');

  // Error state
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCommitment) {
      setTitle(initialCommitment.title);
      setAmount(String(initialCommitment.amount));
      setCurrency(initialCommitment.currency || defaultCurrency);
      setDueDay(initialCommitment.dueDay || 1);
      setCategory(initialCommitment.category || 'other');
      setFrequency(initialCommitment.frequency || 'monthly');
      setNotes(initialCommitment.notes || '');
      setIcon(initialCommitment.icon || '🏠');
      setIsPinned(initialCommitment.isPinned || false);
    } else {
      setTitle('');
      setAmount('');
      setCurrency(defaultCurrency);
      setDueDay(1);
      setCategory(categories[0]?.id || 'housing');
      setFrequency('monthly');
      setNotes('');
      setIcon('🏠');
      setIsPinned(false);
    }
    setError(null);
    setShowNewCatInput(false);
    setNewCatName('');
  }, [initialCommitment, isOpen, defaultCurrency, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError(lang === 'ar' ? 'يرجى إدخال اسم الالتزام' : 'Please enter commitment name');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError(lang === 'ar' ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    onSave({
      title: title.trim(),
      amount: numericAmount,
      currency,
      dueDay: Math.max(1, Math.min(31, Number(dueDay))),
      category,
      frequency,
      notes: notes.trim(),
      icon,
      isPinned,
      isActive: true,
    });

    onClose();
  };

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return;
    const newId = `cat-${Date.now()}`;
    const newCat: Category = {
      id: newId,
      nameAr: newCatName.trim(),
      nameEn: newCatName.trim(),
      icon: newCatIcon,
      color: '#14b8a6',
    };
    onAddCategory(newCat);
    setCategory(newId);
    setIcon(newCatIcon);
    setShowNewCatInput(false);
    setNewCatName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">
            {initialCommitment ? t.modal.editTitle : t.modal.addNew}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.modal.titleLabel} *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.modal.titlePlaceholder}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-medium text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t.modal.amountLabel} *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2000"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-bold text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t.modal.currencyLabel}
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold text-slate-800 bg-white"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {lang === 'ar' ? c.nameAr : c.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Day & Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t.modal.dueDayLabel}
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t.modal.frequencyLabel}
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceType)}
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold text-slate-800 bg-white"
              >
                <option value="monthly">{t.modal.freqMonthly}</option>
                <option value="weekly">{t.modal.freqWeekly}</option>
                <option value="yearly">{t.modal.freqYearly}</option>
                <option value="one_time">{t.modal.freqOneTime}</option>
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                {t.modal.categoryLabel}
              </label>
              <button
                type="button"
                onClick={() => setShowNewCatInput(!showNewCatInput)}
                className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>{t.modal.newCategory}</span>
              </button>
            </div>

            {showNewCatInput ? (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 mb-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder={t.modal.newCategoryName}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                  />
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="w-12 text-center text-sm py-1.5 rounded-xl border border-slate-200 bg-white"
                    title="Icon"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700"
                  >
                    {lang === 'ar' ? 'إضافة' : 'Add'}
                  </button>
                </div>
              </div>
            ) : (
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  const found = categories.find((c) => c.id === e.target.value);
                  if (found) setIcon(found.icon);
                }}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold text-slate-800 bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {lang === 'ar' ? c.nameAr : c.nameEn}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Icon Picker Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.modal.iconLabel}
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-100 max-h-24 overflow-y-auto">
              {AVAILABLE_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition ${
                    icon === emoji
                      ? 'bg-teal-600 text-white shadow-xs scale-110'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.modal.notesLabel}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.modal.notesPlaceholder}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-xs text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Pin toggle checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="pinCommitment"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
            />
            <label htmlFor="pinCommitment" className="text-xs font-bold text-slate-700 cursor-pointer">
              {t.commitmentActions.pin}
            </label>
          </div>

          {/* Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              {t.modal.cancel}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition active:scale-95"
            >
              {t.modal.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
