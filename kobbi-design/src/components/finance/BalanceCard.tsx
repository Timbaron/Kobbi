import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Eye, EyeOff, Wallet } from 'lucide-react';
import { formatNaira } from '../../utils/money';

interface BalanceCardProps {
  totalBalanceKobo: number;
  monthlyIncomeKobo: number;
  monthlyExpenseKobo: number;
  netCashFlowKobo: number;
  monthLabel: string;
  currencySymbol: string;
  hideBalances: boolean;
  onToggleHide: () => void;
  onOpenAccounts: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  totalBalanceKobo,
  monthlyIncomeKobo,
  monthlyExpenseKobo,
  netCashFlowKobo,
  monthLabel,
  currencySymbol,
  hideBalances,
  onToggleHide,
  onOpenAccounts,
}) => {
  return (
    <section
      aria-label="Kobbi total financial summary"
      className="relative overflow-hidden rounded-[24px] bg-[#101828] dark:bg-[#182235] text-[#F8FAFC] p-5 shadow-lg border border-[#1E293B] dark:border-[#2B3952]"
    >
      {/* Clean geometric emerald accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-12 w-48 h-48 rounded-full bg-[#087F5B]/30 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-12 w-44 h-44 rounded-full bg-[#DDF5E6]/10 blur-2xl"
      />

      <div className="relative z-10">
        {/* Top Row: Label + Privacy toggle */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onOpenAccounts}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#CBD5E1] hover:text-white transition-colors min-h-[36px]"
          >
            <Wallet size={14} className="text-[#DDF5E6]" />
            <span>Available Balance</span>
            <span className="text-[#667085]">·</span>
            <span className="text-[#DDF5E6] font-semibold">Accounts</span>
          </button>

          <button
            type="button"
            onClick={onToggleHide}
            aria-label={hideBalances ? 'Show balances' : 'Hide balances'}
            className="min-h-[40px] min-w-[40px] -mr-2 flex items-center justify-center rounded-full text-[#CBD5E1] hover:text-white hover:bg-white/10 transition-colors"
          >
            {hideBalances ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Hero Balance Figure */}
        <div className="mt-1">
          <p className="font-display text-[30px] leading-tight font-extrabold tracking-tight tabular-nums text-white">
            {formatNaira(totalBalanceKobo, {
              symbol: currencySymbol,
              masked: hideBalances,
            })}
          </p>
          <p className="mt-1 text-xs text-[#CBD5E1] flex items-center gap-1.5">
            <span>{monthLabel} Net Cash Flow:</span>
            <span
              className={`font-semibold tabular-nums ${
                netCashFlowKobo >= 0 ? 'text-[#DDF5E6]' : 'text-[#F07171]'
              }`}
            >
              {formatNaira(netCashFlowKobo, {
                symbol: currencySymbol,
                showSign: true,
                masked: hideBalances,
                hideDecimalsIfWhole: true,
              })}
            </span>
          </p>
        </div>

        {/* Divider */}
        <div className="my-4 h-px bg-white/10" />

        {/* Income / Expense Split */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#16A34A]/25 text-[#4ADE80] flex items-center justify-center shrink-0">
              <ArrowDownLeft size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#98A2B3]">Income</p>
              <p className="font-display text-sm font-bold tabular-nums text-white truncate">
                {formatNaira(monthlyIncomeKobo, {
                  symbol: currencySymbol,
                  masked: hideBalances,
                  hideDecimalsIfWhole: true,
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#DC5C5C]/25 text-[#F07171] flex items-center justify-center shrink-0">
              <ArrowUpRight size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#98A2B3]">Expenses</p>
              <p className="font-display text-sm font-bold tabular-nums text-white truncate">
                {formatNaira(monthlyExpenseKobo, {
                  symbol: currencySymbol,
                  masked: hideBalances,
                  hideDecimalsIfWhole: true,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
