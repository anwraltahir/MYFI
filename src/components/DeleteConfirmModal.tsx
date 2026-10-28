import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { translations, Language } from '../utils/translations';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  lang: Language;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  lang,
}) => {
  const t = translations[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 p-6 text-center animate-in fade-in zoom-in-95 duration-150">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-slate-900 mb-1">
          {t.modal.confirmDeleteTitle}
        </h3>

        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          {t.modal.confirmDeleteMsg.replace('{title}', title)}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
          >
            {t.modal.cancel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm"
          >
            {t.modal.confirmButton}
          </button>
        </div>
      </div>
    </div>
  );
};
