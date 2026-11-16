import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { CategoryBudgetProgress } from '../../utils/calculations';
import { formatNaira } from '../../utils/money';
import { CategoryIcon } from '../ui/CategoryIcon';

interface BudgetProgressCardProps {
  item: CategoryBudgetProgress;
  currencySymbol: string;
  hideBalances: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const BudgetProgressCard: React.FC<BudgetProgressCardProps> = ({
  item,
  currencySymbol,
  hideBalances,
  onEdit,
  onDelete,
}) => {
  const clampedPct = Math.min(100, Math.max(0, item.percentUsed));
  const barColor = item.isOverspent
    ? '#DC5C5C'
    : item.percentUsed >= 80
    ? '#F59E0B'
    : item.color || '#087F5B';

  const statusText = item.isOverspent
    ? `Overspent by ${formatNaira(Math.abs(item.remainingKobo), {
        symbol: currencySymbol,
        masked: hideBalances,
        hideDecimalsIfWhole: true,
      })}`
    : `${formatNaira(item.remainingKobo, {
        symbol: currencySymbol,
        masked: hideBalances,
        hideDecimalsIfWhole: true,
      })} left`;

  return (
    <div className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${item.color}1A`, color: item.color }}
          >
            <CategoryIcon name={item.iconName} size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold text-[#101828] dark:text-[#F8FAFC] truncate">
              {item.categoryName}
            </h3>
            <p className="text-xs text-[#667085] dark:text-[#98A2B3] mt-0.5 tabular-nums">
              {formatNaira(item.spentKobo, {
                symbol: currencySymbol,
                masked: hideBalances,
                hideDecimalsIfWhole: true,
              })}{' '}
              of{' '}
              {formatNaira(item.allocatedKobo, {
                symbol: currencySymbol,
                masked: hideBalances,
                hideDecimalsIfWhole: true,
              })}
              {item.mode === 'percent' && item.percentValue !== undefined && (
                <span> · {item.percentValue}%</span>
              )}
            </p>
          </div>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex items-center gap-0.5 -mr-1.5 -mt-1 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${item.categoryName} allocation`}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-[#667085] hover:text-[#101828] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#222E44] transition-colors"
              >
                <Pencil size={15} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                aria-label={`Delete ${item.categoryName} allocation`}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-[#667085] hover:text-[#DC5C5C] dark:hover:text-[#F07171] hover:bg-[#DC5C5C]/10 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress Track */}
      <div className="mt-3 h-2 w-full rounded-full bg-[#F1F5F9] dark:bg-[#101828] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${clampedPct}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span
          className={`font-semibold ${
            item.isOverspent
              ? 'text-[#DC5C5C] dark:text-[#F07171]'
              : item.percentUsed >= 80
              ? 'text-[#F59E0B] dark:text-[#FBBF24]'
              : 'text-[#16A34A] dark:text-[#22C55E]'
          }`}
        >
          {statusText}
        </span>
        <span className="font-semibold tabular-nums text-[#667085] dark:text-[#98A2B3]">
          {item.percentUsed}% used
        </span>
      </div>
    </div>
  );
};
