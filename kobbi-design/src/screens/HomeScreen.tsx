import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  Lightbulb,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import { AccountCard } from '../components/finance/AccountCard';
import { BalanceCard } from '../components/finance/BalanceCard';
import { CashFlowChart } from '../components/finance/FinancialChart';
import { TransactionItem } from '../components/finance/TransactionItem';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomSheet } from '../components/ui/BottomSheet';
import { useFinance } from '../store/FinanceContext';
import { PrimaryTab, SecondaryScreen, Transaction, TransactionType } from '../types/finance';
import {
  getAccountBalanceKobo,
  getBudgetSummary,
  getCashFlowSeries,
  getMonthlyCashFlow,
  getRuleBasedInsights,
  getTotalBalanceKobo,
} from '../utils/calculations';
import { daysBetween, formatDate, formatMonthLabel, getCurrentMonthKey, getGreeting, toDateOnlyISO } from '../utils/date';
import { formatNaira } from '../utils/money';

interface HomeScreenProps {
  onNavigateTab: (tab: PrimaryTab) => void;
  onOpenSecondary: (screen: SecondaryScreen) => void;
  onOpenTransactionForm: (type: TransactionType, editing?: Transaction) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateTab,
  onOpenSecondary,
  onOpenTransactionForm,
}) => {
  const { state, updateSettings, recordRecurringOccurrence } = useFinance();
  const [remindersOpen, setRemindersOpen] = useState(false);

  const now = new Date();
  const currMonth = getCurrentMonthKey(now);
  const todayLabel = formatDate(toDateOnlyISO(now), state.settings.dateFormat);
  const greeting = `${getGreeting(now)}, ${state.settings.userName || 'Friend'}`;

  const activeAccounts = useMemo(
    () => state.accounts.filter((a) => !a.archived),
    [state.accounts]
  );

  const totalBalanceKobo = useMemo(
    () => getTotalBalanceKobo(state.accounts, state.transactions),
    [state.accounts, state.transactions]
  );

  const monthFlow = useMemo(
    () => getMonthlyCashFlow(state.transactions, currMonth),
    [state.transactions, currMonth]
  );

  const budgetSummary = useMemo(
    () => getBudgetSummary(state.budgets[currMonth], state.transactions, state.categories, currMonth),
    [state.budgets, state.transactions, state.categories, currMonth]
  );

  const weeklySeries = useMemo(
    () => getCashFlowSeries(state.transactions, 'weekly', now),
    [state.transactions]
  );

  const insights = useMemo(
    () =>
      getRuleBasedInsights({
        transactions: state.transactions,
        categories: state.categories,
        budgetSummary,
        goals: state.goals,
        recurring: state.recurring,
        monthKey: currMonth,
        alertThresholdPct: state.settings.budgetAlertThresholdPct,
        currencySymbol: state.settings.currencySymbol,
      }),
    [state.transactions, state.categories, budgetSummary, state.goals, state.recurring, currMonth, state.settings]
  );

  const recentTransactions = useMemo(
    () =>
      [...state.transactions]
        .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
        .slice(0, 5),
    [state.transactions]
  );

  const todayISO = toDateOnlyISO(now);
  const dueRecurring = useMemo(
    () =>
      state.recurring.filter(
        (r) => r.status === 'active' && daysBetween(todayISO, r.nextDueDateISO) <= 5
      ),
    [state.recurring, todayISO]
  );
  const budgetAlerts = useMemo(
    () =>
      budgetSummary.categories.filter(
        (c) => c.percentUsed >= state.settings.budgetAlertThresholdPct
      ),
    [budgetSummary.categories, state.settings.budgetAlertThresholdPct]
  );
  const totalAlertCount = state.settings.notificationsEnabled
    ? dueRecurring.length + budgetAlerts.length
    : 0;

  const quickActions: Array<{
    id: string;
    label: string;
    Icon: React.ComponentType<{ size?: number }>;
    tint: string;
    onPress: () => void;
  }> = [
    {
      id: 'income',
      label: 'Add Income',
      Icon: ArrowDownLeft,
      tint: 'bg-[#DDF5E6] dark:bg-[#16A34A]/20 text-[#16A34A] dark:text-[#22C55E]',
      onPress: () => onOpenTransactionForm('income'),
    },
    {
      id: 'expense',
      label: 'Add Expense',
      Icon: ArrowUpRight,
      tint: 'bg-[#DC5C5C]/12 dark:bg-[#DC5C5C]/20 text-[#DC5C5C] dark:text-[#F07171]',
      onPress: () => onOpenTransactionForm('expense'),
    },
    {
      id: 'transfer',
      label: 'Transfer',
      Icon: ArrowLeftRight,
      tint: 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
      onPress: () => onOpenTransactionForm('transfer'),
    },
    {
      id: 'budget',
      label: 'Budget',
      Icon: PieChart,
      tint: 'bg-[#F59E0B]/15 dark:bg-[#F59E0B]/20 text-[#D97706] dark:text-[#FBBF24]',
      onPress: () => onNavigateTab('budgets'),
    },
  ];

  const budgetBarPct = Math.min(100, Math.max(0, budgetSummary.percentUsed));
  const budgetBarColor = budgetSummary.isOverBudget
    ? '#DC5C5C'
    : budgetSummary.percentUsed >= 80
    ? '#F59E0B'
    : '#087F5B';

  return (
    <div className="flex flex-col min-h-full kb-screen-enter">
      <AppHeader
        title={greeting}
        subtitle={`kobbi. · ${todayLabel}`}
        showBrandMark
        alertCount={totalAlertCount}
        onOpenNotifications={() => setRemindersOpen(true)}
        onOpenSettings={() => onOpenSecondary('settings')}
      />

      <div className="px-4 pt-3 pb-24 space-y-5">
        {/* Main Financial Card */}
        <BalanceCard
          totalBalanceKobo={totalBalanceKobo}
          monthlyIncomeKobo={monthFlow.incomeKobo}
          monthlyExpenseKobo={monthFlow.expenseKobo}
          netCashFlowKobo={monthFlow.netKobo}
          monthLabel={formatMonthLabel(currMonth, false)}
          currencySymbol={state.settings.currencySymbol}
          hideBalances={state.settings.hideBalances}
          onToggleHide={() => updateSettings({ hideBalances: !state.settings.hideBalances })}
          onOpenAccounts={() => onOpenSecondary('accounts')}
        />

        {/* Quick Actions */}
        <section aria-label="Quick actions" className="grid grid-cols-4 gap-2">
          {quickActions.map(({ id, label, Icon, tint, onPress }) => (
            <button
              key={id}
              type="button"
              onClick={onPress}
              className="min-h-[76px] rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-2 flex flex-col items-center justify-center gap-1.5 hover:bg-[#F8FAFC] dark:hover:bg-[#222E44] active:scale-[0.97] transition-all"
            >
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tint}`}>
                <Icon size={18} />
              </span>
              <span className="text-[11px] font-semibold text-[#101828] dark:text-[#F8FAFC] whitespace-nowrap">
                {label}
              </span>
            </button>
          ))}
        </section>

        {/* Accounts Strip */}
        <section aria-label="Your accounts">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="font-display text-sm font-bold text-[#101828] dark:text-[#F8FAFC]">
              Wallets & Accounts
            </h2>
            <button
              type="button"
              onClick={() => onOpenSecondary('accounts')}
              className="min-h-[36px] inline-flex items-center gap-0.5 text-xs font-semibold text-[#087F5B] dark:text-[#DDF5E6]"
            >
              <span>Manage ({activeAccounts.length})</span>
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            {activeAccounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                balanceKobo={getAccountBalanceKobo(acc, state.transactions)}
                currencySymbol={state.settings.currencySymbol}
                hideBalances={state.settings.hideBalances}
                compact
                onClick={() => onOpenSecondary('accounts')}
              />
            ))}
          </div>
        </section>

        {/* Monthly Budget Overview */}
        <section aria-label="Monthly budget overview">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="font-display text-sm font-bold text-[#101828] dark:text-[#F8FAFC]">
              {formatMonthLabel(currMonth, true)} Budget
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('budgets')}
              className="min-h-[36px] inline-flex items-center gap-0.5 text-xs font-semibold text-[#087F5B] dark:text-[#DDF5E6]"
            >
              <span>{budgetSummary.hasBudget ? 'Details' : 'Create'}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {budgetSummary.hasBudget ? (
            <button
              type="button"
              onClick={() => onNavigateTab('budgets')}
              className="w-full text-left rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-4 hover:bg-[#F8FAFC] dark:hover:bg-[#222E44]/70 transition-colors"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs text-[#667085] dark:text-[#98A2B3]">Spent so far</p>
                  <p className="font-display text-lg font-extrabold tabular-nums text-[#101828] dark:text-[#F8FAFC]">
                    {formatNaira(budgetSummary.totalSpentKobo, {
                      symbol: state.settings.currencySymbol,
                      masked: state.settings.hideBalances,
                      hideDecimalsIfWhole: true,
                    })}{' '}
                    <span className="text-xs font-medium text-[#667085] dark:text-[#98A2B3]">
                      of{' '}
                      {formatNaira(budgetSummary.totalBudgetKobo, {
                        symbol: state.settings.currencySymbol,
                        masked: state.settings.hideBalances,
                        hideDecimalsIfWhole: true,
                      })}
                    </span>
                  </p>
                </div>

                <span
                  className={`font-display text-sm font-bold tabular-nums ${
                    budgetSummary.isOverBudget
                      ? 'text-[#DC5C5C] dark:text-[#F07171]'
                      : budgetSummary.percentUsed >= 80
                      ? 'text-[#F59E0B] dark:text-[#FBBF24]'
                      : 'text-[#087F5B] dark:text-[#DDF5E6]'
                  }`}
                >
                  {budgetSummary.percentUsed}%
                </span>
              </div>

              <div className="mt-3 h-2.5 w-full rounded-full bg-[#F1F5F9] dark:bg-[#101828] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${budgetBarPct}%`, backgroundColor: budgetBarColor }}
                />
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs text-[#667085] dark:text-[#98A2B3]">
                <span>
                  {budgetSummary.remainingBudgetKobo >= 0
                    ? `${formatNaira(budgetSummary.remainingBudgetKobo, {
                        symbol: state.settings.currencySymbol,
                        masked: state.settings.hideBalances,
                        hideDecimalsIfWhole: true,
                      })} remaining`
                    : `${formatNaira(Math.abs(budgetSummary.remainingBudgetKobo), {
                        symbol: state.settings.currencySymbol,
                        masked: state.settings.hideBalances,
                        hideDecimalsIfWhole: true,
                      })} over budget`}
                </span>
                <span>{budgetSummary.categories.length} categories tracked</span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateTab('budgets')}
              className="w-full rounded-2xl border border-dashed border-[#E4E7EC] dark:border-[#2B3952] p-4 text-center hover:bg-white dark:hover:bg-[#182235] transition-colors"
            >
              <p className="text-sm font-semibold text-[#101828] dark:text-[#F8FAFC]">
                No budget set for {formatMonthLabel(currMonth, true)}
              </p>
              <p className="mt-0.5 text-xs text-[#667085] dark:text-[#98A2B3]">
                Give every kobo a purpose with a monthly spending plan
              </p>
            </button>
          )}
        </section>

        {/* Rule-Based Financial Insights */}
        {insights.length > 0 && (
          <section aria-label="Financial insights">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="font-display text-sm font-bold text-[#101828] dark:text-[#F8FAFC]">
                Clarity & Observations
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('insights')}
                className="min-h-[36px] inline-flex items-center gap-0.5 text-xs font-semibold text-[#087F5B] dark:text-[#DDF5E6]"
              >
                <span>All Insights</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {insights.slice(0, 2).map((ins) => {
                const iconWrap =
                  ins.severity === 'alert'
                    ? 'bg-[#DC5C5C]/12 dark:bg-[#DC5C5C]/20 text-[#DC5C5C] dark:text-[#F07171]'
                    : ins.severity === 'warning'
                    ? 'bg-[#F59E0B]/15 dark:bg-[#F59E0B]/20 text-[#D97706] dark:text-[#FBBF24]'
                    : ins.severity === 'positive'
                    ? 'bg-[#DDF5E6] dark:bg-[#16A34A]/20 text-[#16A34A] dark:text-[#22C55E]'
                    : 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400';

                const IconComp =
                  ins.severity === 'alert' || ins.severity === 'warning'
                    ? AlertTriangle
                    : ins.severity === 'positive'
                    ? TrendingUp
                    : Lightbulb;

                return (
                  <button
                    key={ins.id}
                    type="button"
                    onClick={() => ins.targetTab && onNavigateTab(ins.targetTab)}
                    className="w-full text-left rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-3.5 flex items-start gap-3 hover:bg-[#F8FAFC] dark:hover:bg-[#222E44] transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconWrap}`}>
                      <IconComp size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#101828] dark:text-[#F8FAFC]">
                        {ins.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[#667085] dark:text-[#98A2B3] leading-relaxed">
                        {ins.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Compact 7-Day Spending Summary */}
        <section aria-label="7-day cash flow">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="font-display text-sm font-bold text-[#101828] dark:text-[#F8FAFC]">
              Last 7 Days Cash Flow
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('insights')}
              className="min-h-[36px] inline-flex items-center gap-0.5 text-xs font-semibold text-[#087F5B] dark:text-[#DDF5E6]"
            >
              <span>Reports</span>
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-4">
            <CashFlowChart
              data={weeklySeries}
              currencySymbol={state.settings.currencySymbol}
              hideBalances={state.settings.hideBalances}
              mode="bar"
              compact
            />
          </div>
        </section>

        {/* Recent Transactions */}
        <section aria-label="Recent transactions">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="font-display text-sm font-bold text-[#101828] dark:text-[#F8FAFC]">
              Recent Transactions
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('transactions')}
              className="min-h-[36px] inline-flex items-center gap-0.5 text-xs font-semibold text-[#087F5B] dark:text-[#DDF5E6]"
            >
              <span>See All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] divide-y divide-[#F2F4F7] dark:divide-[#2B3952]/70 overflow-hidden">
            {recentTransactions.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-[#667085] dark:text-[#98A2B3]">
                  No transactions yet. Start tracking where your money goes.
                </p>
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  category={state.categories.find((c) => c.id === tx.categoryId)}
                  account={state.accounts.find((a) => a.id === tx.accountId)}
                  destinationAccount={state.accounts.find((a) => a.id === tx.destinationAccountId)}
                  currencySymbol={state.settings.currencySymbol}
                  dateFormat={state.settings.dateFormat}
                  hideBalances={state.settings.hideBalances}
                  showDateInMeta
                  onClick={() => onOpenTransactionForm(tx.type, tx)}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* Local Reminders & Alerts Sheet */}
      <BottomSheet
        isOpen={remindersOpen}
        onClose={() => setRemindersOpen(false)}
        title="Kobbi Reminders"
        subtitle="Local budget alerts and scheduled transactions"
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[#667085] dark:text-[#98A2B3]">
                Due Scheduled Transactions
              </h3>
              <button
                type="button"
                onClick={() => {
                  setRemindersOpen(false);
                  onOpenSecondary('recurring');
                }}
                className="text-xs font-semibold text-[#087F5B] dark:text-[#DDF5E6]"
              >
                Manage All
              </button>
            </div>

            {dueRecurring.length === 0 ? (
              <p className="text-xs text-[#667085] dark:text-[#98A2B3] py-2">
                No scheduled bills due in the next 5 days.
              </p>
            ) : (
              <div className="space-y-2">
                {dueRecurring.map((rec) => {
                  const delta = daysBetween(todayISO, rec.nextDueDateISO);
                  return (
                    <div
                      key={rec.id}
                      className="rounded-xl bg-[#F8FAFC] dark:bg-[#101828] border border-[#E4E7EC] dark:border-[#2B3952] p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CalendarClock size={18} className="text-[#F59E0B] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#101828] dark:text-[#F8FAFC] truncate">
                            {rec.title}
                          </p>
                          <p className="text-xs text-[#667085] dark:text-[#98A2B3] tabular-nums">
                            {formatNaira(rec.amountKobo, { symbol: state.settings.currencySymbol })} ·{' '}
                            {delta <= 0 ? 'Due today' : `In ${delta}d`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => recordRecurringOccurrence(rec.id)}
                        className="min-h-[38px] px-3 rounded-lg bg-[#087F5B] hover:bg-[#066649] text-white text-xs font-bold shrink-0"
                      >
                        Record
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-bold text-[#667085] dark:text-[#98A2B3] mb-2">
              Budget Threshold Alerts ({state.settings.budgetAlertThresholdPct}%+)
            </h3>
            {budgetAlerts.length === 0 ? (
              <p className="text-xs text-[#667085] dark:text-[#98A2B3] py-2">
                All budgeted categories are comfortably below your alert threshold.
              </p>
            ) : (
              <div className="space-y-2">
                {budgetAlerts.map((cat) => (
                  <button
                    key={cat.allocationId}
                    type="button"
                    onClick={() => {
                      setRemindersOpen(false);
                      onNavigateTab('budgets');
                    }}
                    className="w-full text-left rounded-xl bg-[#F8FAFC] dark:bg-[#101828] border border-[#E4E7EC] dark:border-[#2B3952] p-3 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#101828] dark:text-[#F8FAFC]">
                        {cat.categoryName}
                      </p>
                      <p className="text-xs text-[#667085] dark:text-[#98A2B3]">
                        {cat.percentUsed}% of allocation spent
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        cat.isOverspent ? 'text-[#DC5C5C]' : 'text-[#F59E0B]'
                      }`}
                    >
                      {cat.isOverspent ? 'Overspent' : 'Near limit'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
