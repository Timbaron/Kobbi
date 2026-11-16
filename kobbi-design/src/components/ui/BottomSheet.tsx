import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightClass?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeightClass = 'max-h-[88%]',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-[#101828]/55 backdrop-blur-[2px] kb-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxHeightClass} flex flex-col rounded-t-[28px] bg-white dark:bg-[#182235] text-[#101828] dark:text-[#F8FAFC] shadow-2xl border-t border-[#E4E7EC] dark:border-[#2B3952] overflow-hidden kb-sheet-enter`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#E4E7EC] dark:bg-[#2B3952]" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-1 border-b border-[#F2F4F7] dark:border-[#2B3952]/70 shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold tracking-tight text-[#101828] dark:text-[#F8FAFC] truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[#667085] dark:text-[#98A2B3] mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto mobile-scroll px-5 py-4">
          {children}
        </div>

        {/* Optional Fixed Footer */}
        {footer && (
          <div className="px-5 py-3.5 pb-safe border-t border-[#E4E7EC]/70 dark:border-[#2B3952] bg-white dark:bg-[#182235] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
