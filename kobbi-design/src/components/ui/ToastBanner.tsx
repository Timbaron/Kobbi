import React from 'react';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { useFinance } from '../../store/FinanceContext';

export const ToastBanner: React.FC = () => {
  const { toast, dismissToast } = useFinance();

  if (!toast) return null;

  const styles =
    toast.type === 'error'
      ? 'bg-[#DC5C5C] text-white'
      : toast.type === 'info'
      ? 'bg-[#101828] dark:bg-[#F8FAFC] text-[#F8FAFC] dark:text-[#101828]'
      : 'bg-[#087F5B] text-white';

  const Icon =
    toast.type === 'error'
      ? AlertCircle
      : toast.type === 'info'
      ? Info
      : CheckCircle2;

  return (
    <div className="pointer-events-none absolute top-14 left-4 right-4 z-[70] flex justify-center kb-fade-in">
      <div
        role="status"
        className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold max-w-full ${styles}`}
      >
        <Icon size={16} className="shrink-0" />
        <span className="truncate">{toast.message}</span>
        <button
          type="button"
          onClick={dismissToast}
          aria-label="Dismiss notification"
          className="ml-1 opacity-80 hover:opacity-100 p-1"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
