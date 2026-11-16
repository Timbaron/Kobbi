import React from 'react';
import { Calendar, CheckCircle2, Plus } from 'lucide-react';
import { DateFormatOption, SavingsGoal } from '../../types/finance';
import { daysBetween, formatDate, toDateOnlyISO } from '../../utils/date';
import { computePercent, formatNaira } from '../../utils/money';
import { CategoryIcon } from '../ui/CategoryIcon';

interface GoalCardProps {
  goal: SavingsGoal;
  currencySymbol: string;
  dateFormat: DateFormatOption;
  hideBalances: boolean;
  onContribute: () => void;
  onSelect: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  currencySymbol,
  dateFormat,
  hideBalances,
  onContribute,
  onSelect,
}) => {
  const pct = computePercent(goal.savedAmountKobo, goal.targetAmountKobo);
  const clampedPct = Math.min(100, Math.max(0, pct));
  const remainingKobo = Math.max(0, goal.targetAmountKobo - goal.savedAmountKobo);
  const daysLeft = daysBetween(toDateOnlyISO(new Date()), goal.targetDateISO);

  return (
    <div className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-4">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onSelect}
          className="flex items-center gap-3 min-w-0 text-left flex-1"
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: goal.color }}
          >
            <CategoryIcon name={goal.iconName} size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
              {goal.name}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
              <Calendar size={12} className="shrink-0" />
              <span>{formatDate(goal.targetDateISO, dateFormat)}</span>
              <span aria-hidden="true">·</span>
              <span>
                {goal.status === 'completed'
                  ? 'Goal reached'
                  : daysLeft >= 0
                  ? `${daysLeft}d left`
                  : 'Past target date'}
              </span>
            </p>
          </div>
        </button>

        {goal.status === 'active' ? (
          <button
            type="button"
            onClick={onContribute}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#DDF5E6] dark:bg-[#087F5B]/25 text-[#087F5B] dark:text-[#DDF5E6] hover:bg-[#CBEED9] dark:hover:bg-[#087F5B]/35 text-xs font-bold inline-flex items-center gap-1 shrink-0 transition-colors"
          >
            <Plus size={14} />
            <span>Add</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#087F5B] dark:text-[#DDF5E6] shrink-0 py-1">
            <CheckCircle2 size={14} />
            <span className="capitalize">{goal.status}</span>
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mt-3.5 h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${clampedPct}%`, backgroundColor: goal.color }}
        />
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2 text-xs">
        <div className="tabular-nums">
          <span className="font-display font-bold text-slate-900 dark:text-white">
            {formatNaira(goal.savedAmountKobo, {
              symbol: currencySymbol,
              masked: hideBalances,
              hideDecimalsIfWhole: true,
            })}
          </span>
          <span className="text-slate-400 dark:text-slate-500">
            {' '}
            /{' '}
            {formatNaira(goal.targetAmountKobo, {
              symbol: currencySymbol,
              masked: hideBalances,
              hideDecimalsIfWhole: true,
            })}
          </span>
        </div>

        <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">
          {pct}% ·{' '}
          {remainingKobo > 0
            ? `${formatNaira(remainingKobo, {
                symbol: currencySymbol,
                masked: hideBalances,
                hideDecimalsIfWhole: true,
              })} to go`
            : 'Complete'}
        </span>
      </div>
    </div>
  );
};
