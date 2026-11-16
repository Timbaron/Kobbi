import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
} from 'lucide-react';
import { DateRangeSelector } from '../components/finance/DateRangeSelector';
import { CashFlowChart, CategoryDonutChart, DonutSlice } from '../components/finance/FinancialChart';
import { SummaryCard } from '../components/finance/SummaryCard';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomSheet } from '../components/ui/BottomSheet';
import { useFinance } from '../store/FinanceContext';
import { PrimaryTab, SecondaryScreen } from '../types/finance';
import {
  getBudgetSummary,
  getCashFlowSeries,
  getCategorySpendingForMonth,
  getMonthlyCashFlow,
} from '../utils/calculations';
import { formatDate, formatMonthLabel, getCurrentMonthKey, shiftMonthKey, toDateOnlyISO } from '../utils/date';
import { computePercent, formatNaira } from '../utils/money';

interface InsightsScreenProps {
  onOpenSettings: () => void;
  onNavigateTab: (tab: PrimaryTab) => void;
  onOpenSecondary: (screen: SecondaryScreen) => void;
}

export const InsightsScreen: React.FC<InsightsScreenProps> = ({
  onOpenSettings,
  onNavigateTab,
  onOpenSecondary,
}) => {
  const { state, showToast } = useFinance();

  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [chartMode, setChartMode] = useState<'bar' | 'line'>('bar');
  const [monthKey, setMonthKey] = useState<string>(getCurrentMonthKey());
  const [exportOpen, setExportOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  const sym = state.settings.currencySymbol;
  const masked = state.settings.hideBalances;

  const series = useMemo(
    () => getCashFlowSeries(state.transactions, period, new Date()),
    [state.transactions, period]
  );

  const periodTotals = useMemo(() => {
    return series.reduce(
      (acc, pt) => ({
        incomeKobo: acc.incomeKobo + pt.incomeKobo,
        expenseKobo: acc.expenseKobo + pt.expenseKobo,
        netKobo: acc.netKobo + pt.netKobo,
      }),
      { incomeKobo: 0, expenseKobo: 0, netKobo: 0 }
    );
  }, [series]);

  // Month-over-Month comparison for selected monthKey
  const currMonthFlow = useMemo(
    () => getMonthlyCashFlow(state.transactions, monthKey),
    [state.transactions, monthKey]
  );
  const prevMonthKey = shiftMonthKey(monthKey, -1);
  const prevMonthFlow = useMemo(
    () => getMonthlyCashFlow(state.transactions, prevMonthKey),
    [state.transactions, prevMonthKey]
  );

  const expenseDeltaKobo = currMonthFlow.expenseKobo - prevMonthFlow.expenseKobo;
  const expenseDeltaPct =
    prevMonthFlow.expenseKobo > 0
      ? computePercent(Math.abs(expenseDeltaKobo), prevMonthFlow.expenseKobo)
      : 0;

  // Category Donut slices (filtered by period context: weekly -> last 7 days, monthly -> monthKey, yearly -> current year)
  const categorySlices: DonutSlice[] = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    const currYear = String(now.getFullYear());
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysISO = toDateOnlyISO(sevenDaysAgo);

    if (period === 'monthly') {
      Object.assign(map, getCategorySpendingForMonth(state.transactions, monthKey));
    } else {
      for (const tx of state.transactions) {
        if (tx.type !== 'expense' || !tx.categoryId) continue;
        const d = tx.dateISO.slice(0, 10);
        if (period === 'weekly' && d < sevenDaysISO) continue;
        if (period === 'yearly' && !d.startsWith(currYear)) continue;
        map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amountKobo;
      }
    }

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([catId, valueKobo]) => {
        const cat = state.categories.find((c) => c.id === catId);
        return {
          id: catId,
          label: cat?.name || 'Other',
          valueKobo,
          color: cat?.color || '#64748B',
        };
      });
  }, [state.transactions, state.categories, period, monthKey]);

  const budgetSummary = useMemo(
    () => getBudgetSummary(state.budgets[monthKey], state.transactions, state.categories, monthKey),
    [state.budgets, state.transactions, state.categories, monthKey]
  );

  const activeGoalsSaved = useMemo(
    () =>
      state.goals
        .filter((g) => g.status !== 'archived')
        .reduce((s, g) => s + g.savedAmountKobo, 0),
    [state.goals]
  );
  const activeGoalsTarget = useMemo(
    () =>
      state.goals
        .filter((g) => g.status !== 'archived')
        .reduce((s, g) => s + g.targetAmountKobo, 0),
    [state.goals]
  );

  const handleDownloadCsv = () => {
    const headers = ['ID', 'Date', 'Type', 'Title', 'Category', 'Account', 'Destination Account', 'Amount (Naira)', 'Notes'];
    const rows = [...state.transactions]
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
      .map((tx) => {
        const cat = state.categories.find((c) => c.id === tx.categoryId)?.name || '';
        const acc = state.accounts.find((a) => a.id === tx.accountId)?.name || '';
        const dest = state.accounts.find((a) => a.id === tx.destinationAccountId)?.name || '';
        const nairaVal = (tx.amountKobo / 100).toFixed(2);
        return [
          tx.id,
          tx.dateISO,
          tx.type,
          `"${tx.title.replace(/"/g, '""')}"`,
          `"${cat.replace(/"/g, '""')}"`,
          `"${acc.replace(/"/g, '""')}"`,
          `"${dest.replace(/"/g, '""')}"`,
          nairaVal,
          `"${(tx.notes || '').replace(/"/g, '""')}"`,
        ].join(',');
      });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kobbi-transactions-${toDateOnlyISO(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportOpen(false);
    showToast('Kobbi CSV statement downloaded');
  };

  return (
    <div className="flex flex-col min-h-full kb-screen-enter">
      <AppHeader
        title="Insights & Reports"
        subtitle="Cash flow, category mix & exports"
        onOpenSettings={onOpenSettings}
        rightAction={
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            aria-label="Export Kobbi reports"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#087F5B] dark:text-[#DDF5E6] hover:bg-[#E4E7EC]/60 dark:hover:bg-[#182235] transition-colors"
          >
            <Download size={20} />
          </button>
        }
      />

      <div className="px-4 pt-3 pb-24 space-y-4">
        {/* Weekly / Monthly / Yearly Period Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#E4E7EC]/75 dark:bg-[#182235]">
          {(['weekly', 'monthly', 'yearly'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`min-h-[38px] rounded-lg text-xs font-semibold capitalize transition-colors ${
                period === p
                  ? 'bg-white dark:bg-[#101828] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {period === 'monthly' && (
          <DateRangeSelector monthKey={monthKey} onChangeMonth={setMonthKey} />
        )}

        {/* Cash Flow Summary Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <SummaryCard
            label={period === 'monthly' ? `${formatMonthLabel(monthKey, false)} Income` : 'Period Income'}
            value={formatNaira(
              period === 'monthly' ? currMonthFlow.incomeKobo : periodTotals.incomeKobo,
              { symbol: sym, masked, hideDecimalsIfWhole: true }
            )}
            tone="positive"
          />
          <SummaryCard
            label={period === 'monthly' ? `${formatMonthLabel(monthKey, false)} Expenses` : 'Period Expenses'}
            value={formatNaira(
              period === 'monthly' ? currMonthFlow.expenseKobo : periodTotals.expenseKobo,
              { symbol: sym, masked, hideDecimalsIfWhole: true }
            )}
            tone="negative"
          />
        </div>

        {/* Net Cash Flow & MoM Comparison */}
        <section className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-[#667085] dark:text-[#98A2B3]">
                {period === 'monthly'
                  ? `${formatMonthLabel(monthKey, true)} Net Cash Flow`
                  : `${period.charAt(0).toUpperCase() + period.slice(1)} Net Cash Flow`}
              </p>
              <p
                className={`mt-0.5 font-display text-xl font-extrabold tabular-nums ${
                  (period === 'monthly' ? currMonthFlow.netKobo : periodTotals.netKobo) >= 0
                    ? 'text-[#16A34A] dark:text-[#22C55E]'
                    : 'text-[#DC5C5C] dark:text-[#F07171]'
                }`}
              >
                {formatNaira(period === 'monthly' ? currMonthFlow.netKobo : periodTotals.netKobo, {
                  symbol: sym,
                  showSign: true,
                  masked,
                  hideDecimalsIfWhole: true,
                })}
              </p>
            </div>

            {period === 'monthly' && prevMonthFlow.expenseKobo > 0 && (
              <div className="text-right">
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  vs {formatMonthLabel(prevMonthKey, false)} spend
                </p>
                <p
                  className={`mt-0.5 text-xs font-bold inline-flex items-center gap-0.5 tabular-nums ${
                    expenseDeltaKobo <= 0
                      ? 'text-[#16A34A] dark:text-[#22C55E]'
                      : 'text-[#DC5C5C] dark:text-[#F07171]'
                  }`}
                >
                  {expenseDeltaKobo <= 0 ? (
                    <ArrowDownRight size={14} />
                  ) : (
                    <ArrowUpRight size={14} />
                  )}
                  <span>
                    {expenseDeltaPct}% {expenseDeltaKobo <= 0 ? 'lower' : 'higher'}
                  </span>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Income vs Expenses Trend Chart */}
        <section className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-display text-sm font-bold text-[#101828] dark:text-[#F8FAFC]">
                Income vs Expenses Trend
              </h2>
              <p className="text-[11px] text-[#667085] dark:text-[#98A2B3]">
                Tap a bar or point to inspect values
              </p>
            </div>

            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#F8FAFC] dark:bg-[#101828]">
              <button
                type="button"
                onClick={() => setChartMode('bar')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  chartMode === 'bar'
                    ? 'bg-white dark:bg-[#182235] text-[#101828] dark:text-white shadow-sm'
                    : 'text-[#667085]'
                }`}
              >
                Bar
              </button>
              <button
                type="button"
                onClick={() => setChartMode('line')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  chartMode === 'line'
                    ? 'bg-white dark:bg-[#182235] text-[#101828] dark:text-white shadow-sm'
                    : 'text-[#667085]'
                }`}
              >
                Line
              </button>
            </div>
          </div>

          <CashFlowChart
            data={series}
            currencySymbol={sym}
            hideBalances={masked}
            mode={chartMode}
          />
        </section>

        {/* Spending by Category Donut */}
        <section className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-4">
          <h2 className="font-display text-sm font-bold text-[#101828] dark:text-[#F8FAFC] mb-1">
            Spending by Category
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
            {period === 'monthly'
              ? `Breakdown for ${formatMonthLabel(monthKey, true)}`
              : period === 'weekly'
              ? 'Breakdown for the last 7 days'
              : 'Year-to-date category breakdown'}
          </p>

          <CategoryDonutChart
            slices={categorySlices}
            currencySymbol={sym}
            hideBalances={masked}
          />
        </section>

        {/* Budget Performance & Savings Progress */}
        <div className="grid grid-cols-2 gap-2.5">
          <SummaryCard
            label="Budget Used"
            value={budgetSummary.hasBudget ? `${budgetSummary.percentUsed}%` : 'Not set'}
            subtext={
              budgetSummary.hasBudget
                ? `${formatNaira(budgetSummary.totalSpentKobo, {
                    symbol: sym,
                    masked,
                    compact: true,
                  })} / ${formatNaira(budgetSummary.totalBudgetKobo, {
                    symbol: sym,
                    masked,
                    compact: true,
                  })}`
                : 'Tap to create'
            }
            tone={budgetSummary.isOverBudget ? 'negative' : 'neutral'}
            onClick={() => onNavigateTab('budgets')}
          />
          <SummaryCard
            label="Savings Goals"
            value={`${computePercent(activeGoalsSaved, activeGoalsTarget)}%`}
            subtext={`${formatNaira(activeGoalsSaved, {
              symbol: sym,
              masked,
              compact: true,
            })} saved`}
            tone="positive"
            onClick={() => onNavigateTab('goals')}
          />
        </div>

        {/* Recurring Transactions Quick Link */}
        <button
          type="button"
          onClick={() => onOpenSecondary('recurring')}
          className="w-full rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-4 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] dark:hover:bg-[#222E44] transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-[#F59E0B] dark:text-[#FBBF24] flex items-center justify-center shrink-0">
              <CalendarClock size={19} />
            </div>
            <div className="text-left min-w-0">
              <p className="font-display text-sm font-bold text-[#101828] dark:text-[#F8FAFC]">
                Recurring Schedules
              </p>
              <p className="text-xs text-[#667085] dark:text-[#98A2B3] truncate">
                {state.recurring.filter((r) => r.status === 'active').length} active bills & salary schedules
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-[#667085] shrink-0" />
        </button>

        {/* Export Reports CTA */}
        <button
          type="button"
          onClick={() => setExportOpen(true)}
          className="w-full min-h-[48px] rounded-xl border border-[#E4E7EC] dark:border-[#2B3952] bg-white dark:bg-[#182235] text-[#101828] dark:text-[#F8FAFC] text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#F8FAFC] dark:hover:bg-[#222E44] transition-colors"
        >
          <Download size={16} />
          <span>Export CSV or PDF Statement</span>
        </button>
      </div>

      {/* Export Options BottomSheet */}
      <BottomSheet
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Financial Reports"
        subtitle="Download your ledger or generate a printable report"
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-[#DDF5E6] dark:bg-[#087F5B]/25 text-[#087F5B] dark:text-[#DDF5E6] flex items-center justify-center shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Export CSV Spreadsheet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Downloads all {state.transactions.length} transactions for Excel or Google Sheets.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setExportOpen(false);
              setPdfPreviewOpen(true);
            }}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
                PDF Statement Preview (Prototype)
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Preview monthly summary and print / Save as PDF via browser print dialog.
              </p>
            </div>
          </button>
        </div>
      </BottomSheet>

      {/* PDF Report Prototype Preview Sheet */}
      <BottomSheet
        isOpen={pdfPreviewOpen}
        onClose={() => setPdfPreviewOpen(false)}
        title="PDF Report Preview"
        subtitle="Browser print-to-PDF prototype"
        footer={
          <button
            type="button"
            onClick={() => {
              window.print();
              showToast('Print / Save as PDF dialog opened', 'info');
            }}
            className="w-full min-h-[48px] rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white font-display text-sm font-bold flex items-center justify-center gap-2"
          >
            <Printer size={16} />
            <span>Print or Save as PDF</span>
          </button>
        }
      >
        <div className="rounded-2xl border border-[#E4E7EC] dark:border-[#2B3952] bg-white dark:bg-[#101828] p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#2B3952] pb-3">
            <div>
              <p className="font-display text-base font-extrabold text-[#101828] dark:text-[#F8FAFC]">
                Kobbi Financial Summary
              </p>
              <p className="text-[#667085] dark:text-[#98A2B3]">
                {formatMonthLabel(monthKey, true)} · Generated {formatDate(toDateOnlyISO(new Date()), state.settings.dateFormat)}
              </p>
            </div>
            <span className="font-bold text-[#087F5B] dark:text-[#DDF5E6]">
              {state.settings.currencyCode}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center py-1">
            <div className="p-2 rounded-xl bg-[#F8FAFC] dark:bg-[#182235]">
              <p className="text-[10.5px] text-[#667085] dark:text-[#98A2B3]">Income</p>
              <p className="font-bold tabular-nums text-[#16A34A] dark:text-[#22C55E] mt-0.5">
                {formatNaira(currMonthFlow.incomeKobo, { symbol: sym, hideDecimalsIfWhole: true })}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-[#F8FAFC] dark:bg-[#182235]">
              <p className="text-[10.5px] text-[#667085] dark:text-[#98A2B3]">Expenses</p>
              <p className="font-bold tabular-nums text-[#DC5C5C] dark:text-[#F07171] mt-0.5">
                {formatNaira(currMonthFlow.expenseKobo, { symbol: sym, hideDecimalsIfWhole: true })}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-[#F8FAFC] dark:bg-[#182235]">
              <p className="text-[10.5px] text-[#667085] dark:text-[#98A2B3]">Net</p>
              <p className="font-bold tabular-nums text-[#101828] dark:text-[#F8FAFC] mt-0.5">
                {formatNaira(currMonthFlow.netKobo, { symbol: sym, showSign: true, hideDecimalsIfWhole: true })}
              </p>
            </div>
          </div>

          <div>
            <p className="font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              Top Expense Categories
            </p>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {categorySlices.slice(0, 5).map((s) => (
                <div key={s.id} className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">{s.label}</span>
                  <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatNaira(s.valueKobo, { symbol: sym, hideDecimalsIfWhole: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
