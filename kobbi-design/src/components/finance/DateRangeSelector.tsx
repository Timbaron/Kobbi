import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthLabel, shiftMonthKey } from '../../utils/date';

interface DateRangeSelectorProps {
  monthKey: string;
  onChangeMonth: (nextMonthKey: string) => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  monthKey,
  onChangeMonth,
}) => {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] px-1.5 py-1">
      <button
        type="button"
        onClick={() => onChangeMonth(shiftMonthKey(monthKey, -1))}
        aria-label="Previous month"
        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <ChevronLeft size={18} />
      </button>

      <span className="font-display text-sm font-bold text-slate-900 dark:text-white select-none">
        {formatMonthLabel(monthKey, true)}
      </span>

      <button
        type="button"
        onClick={() => onChangeMonth(shiftMonthKey(monthKey, 1))}
        aria-label="Next month"
        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};
