import React from 'react';
import { Building2, ChevronRight, Smartphone, Wallet } from 'lucide-react';
import { Account } from '../../types/finance';
import { formatNaira } from '../../utils/money';

interface AccountCardProps {
  account: Account;
  balanceKobo: number;
  currencySymbol: string;
  hideBalances: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  balanceKobo,
  currencySymbol,
  hideBalances,
  compact = false,
  onClick,
}) => {
  const Icon =
    account.type === 'mobile_money'
      ? Smartphone
      : account.type === 'bank'
      ? Building2
      : Wallet;

  const typeLabel =
    account.type === 'mobile_money'
      ? 'Mobile Wallet'
      : account.type === 'bank'
      ? 'Bank Account'
      : account.type === 'cash'
      ? 'Physical Cash'
      : 'Other';

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-[154px] shrink-0 text-left rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-3.5 hover:bg-[#F8FAFC] dark:hover:bg-[#222E44] transition-colors active:scale-[0.98]"
      >
        <div className="flex items-center justify-between gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: account.color }}
          >
            <Icon size={15} />
          </div>
          <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 truncate">
            {account.institution}
          </span>
        </div>
        <p className="mt-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
          {account.name}
        </p>
        <p className="mt-0.5 font-display text-sm font-bold tabular-nums text-slate-900 dark:text-white truncate">
          {formatNaira(balanceKobo, {
            symbol: currencySymbol,
            masked: hideBalances,
            hideDecimalsIfWhole: true,
          })}
        </p>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-4 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] dark:hover:bg-[#222E44] transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: account.color }}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
            {account.name}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
            <span>{account.institution}</span>
            <span aria-hidden="true">·</span>
            <span>{typeLabel}</span>
            {account.archived && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">Archived</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <p className="font-display text-sm font-bold tabular-nums text-slate-900 dark:text-white">
            {formatNaira(balanceKobo, {
              symbol: currencySymbol,
              masked: hideBalances,
            })}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            Open: {formatNaira(account.openingBalanceKobo, { symbol: currencySymbol, masked: hideBalances, hideDecimalsIfWhole: true })}
          </p>
        </div>
        <ChevronRight size={16} className="text-slate-400" />
      </div>
    </button>
  );
};
