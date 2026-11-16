import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center p-5 bg-[#101828]/60 backdrop-blur-[2px] kb-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[340px] rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-5 shadow-2xl kb-sheet-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {destructive && (
            <div className="w-10 h-10 rounded-full bg-[#DC5C5C]/12 text-[#DC5C5C] dark:text-[#F07171] flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
          )}
          <div className="min-w-0">
            <h3
              id="confirm-dialog-title"
              className="font-display text-base font-bold text-[#101828] dark:text-[#F8FAFC]"
            >
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#667085] dark:text-[#CBD5E1]">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E4E7EC] dark:border-[#2B3952] text-sm font-semibold text-[#101828] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#222E44] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
              destructive
                ? 'bg-[#DC5C5C] hover:bg-[#C54848]'
                : 'bg-[#087F5B] hover:bg-[#066649]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
