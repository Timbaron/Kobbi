import React from 'react';

interface SummaryCardProps {
  label: string;
  value: string;
  subtext?: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'warning';
  onClick?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  subtext,
  tone = 'neutral',
  onClick,
}) => {
  const toneClass =
    tone === 'positive'
      ? 'text-[#16A34A] dark:text-[#22C55E]'
      : tone === 'negative'
      ? 'text-[#DC5C5C] dark:text-[#F07171]'
      : tone === 'warning'
      ? 'text-[#F59E0B] dark:text-[#FBBF24]'
      : 'text-[#101828] dark:text-[#F8FAFC]';

  const baseClass =
    'w-full text-left rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-3.5 transition-colors';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} hover:bg-[#F8FAFC] dark:hover:bg-[#222E44] active:scale-[0.98] transition-transform`}
      >
        <p className="text-xs font-medium text-[#667085] dark:text-[#98A2B3] truncate">{label}</p>
        <p className={`mt-1 font-display text-base font-bold tabular-nums truncate ${toneClass}`}>
          {value}
        </p>
        {subtext && (
          <p className="mt-0.5 text-[11px] text-[#667085] dark:text-[#98A2B3] truncate">{subtext}</p>
        )}
      </button>
    );
  }

  return (
    <div className={baseClass}>
      <p className="text-xs font-medium text-[#667085] dark:text-[#98A2B3] truncate">{label}</p>
      <p className={`mt-1 font-display text-base font-bold tabular-nums truncate ${toneClass}`}>
        {value}
      </p>
      {subtext && (
        <p className="mt-0.5 text-[11px] text-[#667085] dark:text-[#98A2B3] truncate">{subtext}</p>
      )}
    </div>
  );
};
