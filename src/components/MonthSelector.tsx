import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { Language } from '../utils/translations';

interface MonthSelectorProps {
  currentYearMonth: string; // 'YYYY-MM'
  onChange: (ym: string) => void;
  lang: Language;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ currentYearMonth, onChange, lang }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [year, month] = currentYearMonth.split('-').map(Number);

  // Month names in Arabic and English
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const englishMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthNames = lang === 'ar' ? arabicMonths : englishMonths;
  const currentMonthName = monthNames[month - 1];

  const now = new Date();
  const realCurrentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = currentYearMonth === realCurrentYm;

  const handlePrev = () => {
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    onChange(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNext = () => {
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    onChange(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleGoCurrent = () => {
    onChange(realCurrentYm);
    setShowPicker(false);
  };

  return (
    <div className="relative inline-block w-full">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between">
        {/* Previous Month button (Note: in RTL, right arrow goes forward or backward according to arrow direction) */}
        <button
          onClick={lang === 'ar' ? handleNext : handlePrev}
          className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition active:scale-95"
          aria-label="Previous Month"
        >
          {lang === 'ar' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        {/* Center label */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-2 text-slate-800 hover:text-teal-700 font-bold text-base sm:text-lg transition px-2 py-1 rounded-lg hover:bg-slate-50"
          >
            <CalendarIcon className="w-4 h-4 text-teal-600" />
            <span>{currentMonthName} {year}</span>
          </button>

          {!isCurrentMonth && (
            <button
              onClick={handleGoCurrent}
              title={lang === 'ar' ? 'العودة للشهر الحالي' : 'Jump to Current Month'}
              className="px-2 py-1 rounded-md text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'اليوم' : 'Today'}</span>
            </button>
          )}
        </div>

        {/* Next Month button */}
        <button
          onClick={lang === 'ar' ? handlePrev : handleNext}
          className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition active:scale-95"
          aria-label="Next Month"
        >
          {lang === 'ar' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Quick Month Picker Dropdown */}
      {showPicker && (
        <div className="absolute top-full mt-2 left-0 right-0 z-30 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500">
              {lang === 'ar' ? 'اختر الشهر' : 'Select Month'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onChange(`${year - 1}-${String(month).padStart(2, '0')}`)}
                className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-bold"
              >
                {year - 1}
              </button>
              <span className="font-bold text-slate-800 text-sm">{year}</span>
              <button
                onClick={() => onChange(`${year + 1}-${String(month).padStart(2, '0')}`)}
                className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-bold"
              >
                {year + 1}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {monthNames.map((name, idx) => {
              const mNum = idx + 1;
              const isSelected = mNum === month;
              return (
                <button
                  key={name}
                  onClick={() => {
                    onChange(`${year}-${String(mNum).padStart(2, '0')}`);
                    setShowPicker(false);
                  }}
                  className={`py-2 px-2 text-xs rounded-xl font-medium transition ${
                    isSelected
                      ? 'bg-teal-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
