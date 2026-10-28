import React, { useState } from 'react';
import { translations, Language } from '../utils/translations';
import { NoteItem } from '../types';
import { Search, BookOpen, Calendar, Tag, CheckSquare, Square, ArrowUpRight, Plus, Trash2 } from 'lucide-react';

interface NotesArchiveViewProps {
  notes: NoteItem[];
  lang: Language;
  onConvertToCommitment: (note: NoteItem) => void;
  onSaveNote: (note: NoteItem) => void;
  onDeleteNote: (noteId: string) => void;
}

export const NotesArchiveView: React.FC<NotesArchiveViewProps> = ({
  notes,
  lang,
  onConvertToCommitment,
  onSaveNote,
  onDeleteNote,
}) => {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Note state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newNotebook, setNewNotebook] = useState('ملاحظات شخصية');
  const [newTags, setNewTags] = useState('');

  // Extract distinct years from notes
  const availableYears = Array.from(
    new Set(
      notes.map((n) => {
        try {
          return new Date(n.createdAt).getFullYear().toString();
        } catch {
          return '2026';
        }
      })
    )
  ).sort((a, b) => Number(b) - Number(a));

  // If empty, ensure default year list
  if (availableYears.length === 0) {
    availableYears.push('2026', '2025', '2024');
  }

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    // Year filter
    if (selectedYear !== 'all') {
      const noteYear = new Date(note.createdAt).getFullYear().toString();
      if (noteYear !== selectedYear) return false;
    }

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchTitle = note.title.toLowerCase().includes(q);
    const matchContent = note.content.toLowerCase().includes(q);
    const matchNotebook = note.notebook?.toLowerCase().includes(q);
    const matchTags = note.tags.some((t) => t.toLowerCase().includes(q));

    return matchTitle || matchContent || matchNotebook || matchTags;
  });

  const handleToggleChecklistItem = (note: NoteItem, checkId: string) => {
    if (!note.checklist) return;
    const updatedChecklist = note.checklist.map((item) =>
      item.id === checkId ? { ...item, done: !item.done } : item
    );
    onSaveNote({
      ...note,
      checklist: updatedChecklist,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const tagsArray = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newNote: NoteItem = {
      id: `manual-note-${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      notebook: newNotebook.trim() || 'ملاحظات',
      tags: tagsArray,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'manual',
    };

    onSaveNote(newNote);
    setShowAddModal(false);
    setNewTitle('');
    setNewContent('');
    setNewTags('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
            {t.notesArchive.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {t.notesArchive.subtitle}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="self-start sm:self-auto px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t.notesArchive.addManualNote}</span>
        </button>
      </div>

      {/* Year Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setSelectedYear('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
            selectedYear === 'all'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          {t.notesArchive.allYears} ({notes.length})
        </button>
        {availableYears.map((yr) => {
          const count = notes.filter((n) => new Date(n.createdAt).getFullYear().toString() === yr).length;
          return (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedYear === yr
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span>{t.notesArchive.year.replace('{year}', yr)}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedYear === yr ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.notesArchive.searchNotes}
          className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2.5 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 rtl:right-auto rtl:left-3 top-3 text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">{t.notesArchive.emptyArchive}</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {lang === 'ar' ? 'أضف ملاحظة جديدة هنا لتبدأ أرشيفك الشخصي.' : 'Add a new note here to start your personal archive.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => {
            let formattedDate = '';
            try {
              formattedDate = new Date(note.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
            } catch {
              // fallback
            }

            return (
              <div
                key={note.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
              >
                <div>
                  {/* Note header: Notebook name, Date, Delete button */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 font-bold text-[11px] flex items-center gap-1 border border-teal-100">
                        <BookOpen className="w-3 h-3 text-teal-600" />
                        <span>{note.notebook || t.notesArchive.title}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formattedDate}</span>
                      </span>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition ml-1"
                        title={lang === 'ar' ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-800 leading-snug mb-2">
                    {note.title}
                  </h3>

                  {/* Content */}
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-6 mb-3">
                    {note.content}
                  </p>

                  {/* Checklist if present */}
                  {note.checklist && note.checklist.length > 0 && (
                    <div className="mb-3 space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        {t.notesArchive.checklist}:
                      </span>
                      {note.checklist.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleToggleChecklistItem(note, item.id)}
                          className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none"
                        >
                          {item.done ? (
                            <CheckSquare className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className={item.done ? 'line-through text-slate-400' : ''}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-medium flex items-center gap-1"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer action: Convert to Commitment */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  {note.convertedToCommitmentId ? (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <span>{t.notesArchive.convertedToCommitment}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      {lang === 'ar' ? 'ملاحظة محفوظة' : 'Archived note'}
                    </span>
                  )}

                  <button
                    onClick={() => onConvertToCommitment(note)}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold transition flex items-center gap-1 active:scale-95"
                  >
                    <span>{lang === 'ar' ? 'جدولة كالتزام شهري' : 'Convert to Commitment'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Manual Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {t.notesArchive.addManualNote}
            </h3>

            <form onSubmit={handleCreateNote} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'عنوان الملاحظة' : 'Note Title'} *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: عقد الإيجار الجديد' : 'e.g. New Apartment Lease'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'دفتر الملاحظات (Notebook)' : 'Notebook'}
                </label>
                <input
                  type="text"
                  value={newNotebook}
                  onChange={(e) => setNewNotebook(e.target.value)}
                  placeholder="الالتزامات"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'المحتوى' : 'Content'}
                </label>
                <textarea
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={lang === 'ar' ? 'اكتب ملاحظاتك وتفاصيل الالتزام هنا...' : 'Type note content here...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'الوسوم (مفصولة بفواصل)' : 'Tags (comma separated)'}
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="سكن, إيجار, 2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  {t.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
                >
                  {lang === 'ar' ? 'حفظ الملاحظة' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
