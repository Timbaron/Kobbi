import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Account, Category, DateFormatOption, Transaction } from '../../types/finance';
import { formatDate, formatTime } from '../../utils/date';
import { formatNaira } from '../../utils/money';
import { CategoryIcon } from '../ui/CategoryIcon';

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  destinationAccount?: Account;
  currencySymbol: string;
  dateFormat: DateFormatOption;
  hideBalances: boolean;
  showDateInMeta?: boolean;
  onClick?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  category,
  account,
  destinationAccount,
  currencySymbol,
  dateFormat,
  hideBalances,
  showDateInMeta = false,
  onClick,
}) => {
  const isTransfer = transaction.type === 'transfer';
  const isIncome = transaction.type === 'income';

  const iconBg = isTransfer
    ? '#2563EB1A'
    : category
    ? `${category.color}1A`
    : '#64748B1A';
  const iconColor = isTransfer
    ? '#2563EB'
    : category
    ? category.color
    : '#64748B';

  const accountLabel = isTransfer
    ? `${account?.name || 'Source'} → ${destinationAccount?.name || 'Destination'}`
    : account?.name || 'Account';

  const timeLabel = formatTime(transaction.dateISO);
  const dateLabel = formatDate(transaction.dateISO, dateFormat);

  const amountColor = isTransfer
    ? 'text-blue-600 dark:text-blue-400'
    : isIncome
    ? 'text-[#16A34A] dark:text-[#22C55E]'
    : 'text-[#101828] dark:text-[#F8FAFC]';

  const signedDisplay = isTransfer
    ? formatNaira(transaction.amountKobo, {
        symbol: currencySymbol,
        masked: hideBalances,
        hideDecimalsIfWhole: true,
      })
    : formatNaira(isIncome ? transaction.amountKobo : -transaction.amountKobo, {
        symbol: currencySymbol,
        showSign: true,
        masked: hideBalances,
        hideDecimalsIfWhole: true,
      });

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-[62px] py-2.5 px-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#F8FAFC] dark:hover:bg-[#222E44]/50 active:bg-[#F1F5F9] dark:active:bg-[#222E44] transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {isTransfer ? (
            <ArrowLeftRight size={18} />
          ) : (
            <CategoryIcon name={category?.iconName || 'Tag'} size={18} />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#101828] dark:text-[#F8FAFC] truncate">
            {transaction.title}
          </p>
          <p className="mt-0.5 text-xs text-[#667085] dark:text-[#98A2B3] truncate flex items-center gap-1.5">
            <span>{isTransfer ? 'Transfer' : category?.name || 'General'}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{accountLabel}</span>
            {showDateInMeta && (
              <>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">{dateLabel}</span>
              </>
            )}
            {!showDateInMeta && timeLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">{timeLabel}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className={`font-display text-sm font-bold tabular-nums ${amountColor}`}>
          {signedDisplay}
        </p>
        <p className="text-[10.5px] text-[#667085] dark:text-[#98A2B3] capitalize">
          {transaction.type}
        </p>
      </div>
    </button>
  );
};
