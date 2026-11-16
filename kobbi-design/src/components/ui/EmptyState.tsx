import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6 rounded-2xl border border-dashed border-[#E4E7EC] dark:border-[#2B3952] bg-white/70 dark:bg-[#182235]/60">
      <div className="w-12 h-12 rounded-2xl bg-[#DDF5E6] dark:bg-[#087F5B]/25 text-[#087F5B] dark:text-[#DDF5E6] flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-[#101828] dark:text-[#F8FAFC]">
        {title}
      </h3>
      <p className="mt-1 text-sm text-[#667085] dark:text-[#98A2B3] max-w-[260px] leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white text-sm font-semibold transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
