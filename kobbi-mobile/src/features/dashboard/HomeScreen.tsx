import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  Lightbulb,
  PieChart,
} from 'lucide-react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import {
  Account,
  AppSettings,
  Category,
  PrimaryTab,
  RecurringTransaction,
  SavingsGoal,
  SecondaryScreen,
  Transaction,
  TransactionType,
} from '../../types/finance';
import { DatabaseManager } from '../../database';
import { AppHeader } from '../../components/common/AppHeader';
import { BalanceCard } from '../../components/finance/BalanceCard';
import { AccountCard } from '../../components/finance/AccountCard';
import { CashFlowChart } from '../../components/finance/FinancialChart';
import { TransactionItem } from '../../components/finance/TransactionItem';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/common/Button';
import {
  getBudgetSummary,
  getCashFlowSeries,
  getMonthlyCashFlow,
  getRuleBasedInsights,
} from '../../utils/calculations';
import {
  daysBetween,
  formatDate,
  formatMonthLabel,
  getCurrentMonthKey,
  getGreeting,
  toDateOnlyISO,
} from '../../utils/date';
import { formatNaira } from '../../utils/money';

interface HomeScreenProps {
  onNavigateTab: (tab: PrimaryTab) => void;
  onOpenSecondary: (screen: SecondaryScreen) => void;
  onOpenTransactionForm: (type: TransactionType, editing?: Transaction) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateTab,
  onOpenSecondary,
  onOpenTransactionForm,
  onShowToast,
}) => {
  const { colors, isDark } = useTheme();
  const db = DatabaseManager.getInstance();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [budget, setBudget] = useState<any>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);

  const [remindersOpen, setRemindersOpen] = useState(false);

  const now = new Date();
  const currMonth = getCurrentMonthKey(now);
  const todayLabel = formatDate(toDateOnlyISO(now));
  const greeting = `${getGreeting(now)}, ${settings?.userName || 'Friend'}`;

  const loadData = async () => {
    const accList = await db.repos.accounts.getAll(false);
    setAccounts(accList);

    const balances: Record<string, number> = {};
    for (const a of accList) {
      balances[a.id] = await db.repos.accounts.getBalanceKobo(a.id);
    }
    setAccountBalances(balances);

    const txList = await db.repos.transactions.getAll();
    setTransactions(txList);

    const catList = await db.repos.categories.getAll();
    setCategories(catList);

    const s = await db.repos.settings.getSettings();
    setSettings(s);

    const b = await db.repos.budgets.getMonthlyBudget(currMonth);
    setBudget(b);

    const gList = await db.repos.goals.getAll();
    setGoals(gList);

    const rList = await db.repos.recurring.getAll();
    setRecurring(rList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalBalanceKobo = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (accountBalances[acc.id] || 0), 0);
  }, [accounts, accountBalances]);

  const monthFlow = useMemo(
    () => getMonthlyCashFlow(transactions, currMonth),
    [transactions, currMonth]
  );

  const budgetSummary = useMemo(
    () => getBudgetSummary(budget || undefined, transactions, categories, currMonth),
    [budget, transactions, categories, currMonth]
  );

  const weeklySeries = useMemo(
    () => getCashFlowSeries(transactions, 'weekly', now),
    [transactions]
  );

  const insights = useMemo(
    () =>
      getRuleBasedInsights({
        transactions,
        categories,
        budgetSummary,
        goals,
        recurring,
        monthKey: currMonth,
        alertThresholdPct: settings?.budgetAlertThresholdPct || 80,
        currencySymbol: settings?.currencySymbol || '₦',
      }),
    [transactions, categories, budgetSummary, goals, recurring, currMonth, settings]
  );

  const recentTransactions = useMemo(
    () => transactions.slice(0, 5),
    [transactions]
  );

  const todayISO = toDateOnlyISO(now);
  const dueRecurring = useMemo(
    () =>
      recurring.filter(
        (r) => r.status === 'active' && daysBetween(todayISO, r.nextDueDateISO) <= 5
      ),
    [recurring, todayISO]
  );

  const budgetAlerts = useMemo(
    () =>
      budgetSummary.categories.filter(
        (c) => c.percentUsed >= (settings?.budgetAlertThresholdPct || 80)
      ),
    [budgetSummary.categories, settings]
  );

  const totalAlertCount = settings?.notificationsEnabled
    ? dueRecurring.length + budgetAlerts.length
    : 0;

  const quickActions = [
    {
      id: 'income',
      label: 'Add Income',
      Icon: ArrowDownLeft,
      bg: isDark ? 'rgba(22, 163, 74, 0.2)' : colors.mintTint,
      color: isDark ? colors.semantic.incomeBright : colors.semantic.income,
      onPress: () => onOpenTransactionForm('income'),
    },
    {
      id: 'expense',
      label: 'Add Expense',
      Icon: ArrowUpRight,
      bg: isDark ? 'rgba(220, 92, 92, 0.2)' : 'rgba(220, 92, 92, 0.12)',
      color: isDark ? colors.semantic.expenseBright : colors.semantic.expense,
      onPress: () => onOpenTransactionForm('expense'),
    },
    {
      id: 'transfer',
      label: 'Transfer',
      Icon: ArrowLeftRight,
      bg: isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.12)',
      color: isDark ? colors.semantic.transferBright : colors.semantic.transfer,
      onPress: () => onOpenTransactionForm('transfer'),
    },
    {
      id: 'budget',
      label: 'Budget',
      Icon: PieChart,
      bg: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)',
      color: isDark ? colors.semantic.warningBright : '#D97706',
      onPress: () => onNavigateTab('budgets'),
    },
  ];

  const budgetBarPct = Math.min(100, Math.max(0, budgetSummary.percentUsed));
  const budgetBarColor = budgetSummary.isOverBudget
    ? colors.semantic.expense
    : budgetSummary.percentUsed >= 80
    ? colors.semantic.warning
    : colors.primary;

  const handleToggleHideBalances = async () => {
    if (!settings) return;
    const nextVal = !settings.hideBalances;
    await db.repos.settings.updateSettings({ hideBalances: nextVal });
    setSettings({ ...settings, hideBalances: nextVal });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title={greeting}
        subtitle={`kobbi. · ${todayLabel}`}
        showBrandMark
        alertCount={totalAlertCount}
        onOpenNotifications={() => setRemindersOpen(true)}
        onOpenSettings={() => onOpenSecondary('settings')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Financial Balance Card */}
        <BalanceCard
          totalBalanceKobo={totalBalanceKobo}
          monthlyIncomeKobo={monthFlow.incomeKobo}
          monthlyExpenseKobo={monthFlow.expenseKobo}
          netCashFlowKobo={monthFlow.netKobo}
          monthLabel={formatMonthLabel(currMonth, false)}
          currencySymbol={settings?.currencySymbol || '₦'}
          hideBalances={settings?.hideBalances || false}
          onToggleHide={handleToggleHideBalances}
          onOpenAccounts={() => onOpenSecondary('accounts')}
        />

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => {
            const Icon = action.Icon;
            return (
              <Pressable
                key={action.id}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={({ pressed }) => [
                  styles.quickActionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] },
                ]}
              >
                <View style={[styles.quickActionIconCircle, { backgroundColor: action.bg }]}>
                  <Icon size={18} color={action.color} />
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.quickActionLabel, { color: colors.textPrimary }]}
                >
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Wallets & Accounts Strip */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Wallets & Accounts
          </Text>
          <Pressable
            onPress={() => onOpenSecondary('accounts')}
            style={styles.manageLink}
          >
            <Text style={[styles.manageLinkText, { color: colors.primary }]}>
              Manage ({accounts.length})
            </Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.accountsStrip}
        >
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              balanceKobo={accountBalances[acc.id] || 0}
              currencySymbol={settings?.currencySymbol}
              hideBalances={settings?.hideBalances}
              compact
              onClick={() => onOpenSecondary('accounts')}
            />
          ))}
        </ScrollView>

        {/* Monthly Budget Overview */}
        <View style={[styles.sectionHeaderRow, { marginTop: DesignTokens.spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {formatMonthLabel(currMonth, true)} Budget
          </Text>
          <Pressable
            onPress={() => onNavigateTab('budgets')}
            style={styles.manageLink}
          >
            <Text style={[styles.manageLinkText, { color: colors.primary }]}>
              {budgetSummary.hasBudget ? 'Details' : 'Create'}
            </Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        </View>

        {budgetSummary.hasBudget ? (
          <Pressable
            onPress={() => onNavigateTab('budgets')}
            style={[
              styles.budgetOverviewCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.budgetTopRow}>
              <View>
                <Text style={[styles.budgetSpentLabel, { color: colors.textSecondary }]}>
                  Spent so far
                </Text>
                <Text style={[styles.budgetSpentValue, { color: colors.textPrimary }]}>
                  {formatNaira(budgetSummary.totalSpentKobo, {
                    symbol: settings?.currencySymbol,
                    masked: settings?.hideBalances,
                    hideDecimalsIfWhole: true,
                  })}{' '}
                  <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary }}>
                    of{' '}
                    {formatNaira(budgetSummary.totalBudgetKobo, {
                      symbol: settings?.currencySymbol,
                      masked: settings?.hideBalances,
                      hideDecimalsIfWhole: true,
                    })}
                  </Text>
                </Text>
              </View>

              <Text
                style={[
                  styles.budgetPercentText,
                  {
                    color: budgetSummary.isOverBudget
                      ? colors.semantic.expense
                      : budgetSummary.percentUsed >= 80
                      ? colors.semantic.warning
                      : colors.primary,
                  },
                ]}
              >
                {budgetSummary.percentUsed}%
              </Text>
            </View>

            <View
              style={[
                styles.budgetBarBg,
                { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
              ]}
            >
              <View
                style={[
                  styles.budgetBarFill,
                  {
                    width: `${budgetBarPct}%`,
                    backgroundColor: budgetBarColor,
                  },
                ]}
              />
            </View>

            <View style={styles.budgetBottomRow}>
              <Text style={[styles.budgetRemainingText, { color: colors.textSecondary }]}>
                {budgetSummary.remainingBudgetKobo >= 0
                  ? `${formatNaira(budgetSummary.remainingBudgetKobo, {
                      symbol: settings?.currencySymbol,
                      masked: settings?.hideBalances,
                      hideDecimalsIfWhole: true,
                    })} remaining`
                  : `${formatNaira(Math.abs(budgetSummary.remainingBudgetKobo), {
                      symbol: settings?.currencySymbol,
                      masked: settings?.hideBalances,
                      hideDecimalsIfWhole: true,
                    })} over budget`}
              </Text>
              <Text style={[styles.budgetAllocatedPill, { color: colors.textMuted }]}>
                {budgetSummary.categories.length} categories
              </Text>
            </View>
          </Pressable>
        ) : (
          <View
            style={[
              styles.budgetEmptyBanner,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.budgetEmptyText, { color: colors.textSecondary }]}>
              No monthly budget set for {formatMonthLabel(currMonth, true)}.
            </Text>
            <Button
              label="Set Budget"
              onPress={() => onNavigateTab('budgets')}
              size="sm"
            />
          </View>
        )}

        {/* Weekly Cash Flow Chart */}
        <View style={[styles.sectionHeaderRow, { marginTop: DesignTokens.spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Last 7 Days Activity
          </Text>
          <Pressable
            onPress={() => onNavigateTab('insights')}
            style={styles.manageLink}
          >
            <Text style={[styles.manageLinkText, { color: colors.primary }]}>
              Analytics
            </Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        </View>

        <View
          style={[
            styles.chartCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <CashFlowChart
            data={weeklySeries}
            currencySymbol={settings?.currencySymbol}
            hideBalances={settings?.hideBalances}
            compact
          />
        </View>

        {/* Rule-Based Financial Insights */}
        {insights.length > 0 && (
          <View style={{ marginTop: DesignTokens.spacing.lg }}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Lightbulb size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Financial Insights
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.insightsStrip}
            >
              {insights.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.insightCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor:
                        item.severity === 'alert'
                          ? colors.semantic.expense
                          : item.severity === 'warning'
                          ? colors.semantic.warning
                          : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.insightTitle,
                      {
                        color:
                          item.severity === 'alert'
                            ? colors.semantic.expense
                            : item.severity === 'warning'
                            ? colors.semantic.warning
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text style={[styles.insightDesc, { color: colors.textSecondary }]}>
                    {item.description}
                  </Text>

                  {item.actionLabel && item.targetTab && (
                    <Pressable
                      onPress={() => onNavigateTab(item.targetTab!)}
                      style={styles.insightAction}
                    >
                      <Text style={[styles.insightActionText, { color: colors.primary }]}>
                        {item.actionLabel}
                      </Text>
                      <ChevronRight size={12} color={colors.primary} />
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Transactions List */}
        <View style={[styles.sectionHeaderRow, { marginTop: DesignTokens.spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Recent Transactions
          </Text>
          <Pressable
            onPress={() => onNavigateTab('transactions')}
            style={styles.manageLink}
          >
            <Text style={[styles.manageLinkText, { color: colors.primary }]}>
              See All
            </Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.recentList}>
          {recentTransactions.map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              category={categories.find((c) => c.id === tx.categoryId)}
              account={accounts.find((a) => a.id === tx.accountId)}
              destinationAccount={accounts.find((a) => a.id === tx.destinationAccountId)}
              currencySymbol={settings?.currencySymbol}
              hideBalances={settings?.hideBalances}
              onPress={() => onNavigateTab('transactions')}
            />
          ))}
        </View>
      </ScrollView>

      {/* Reminders & Alerts Bottom Sheet */}
      <BottomSheet
        isOpen={remindersOpen}
        onClose={() => setRemindersOpen(false)}
        title="Reminders & Alerts"
        subtitle="Stay ahead of your money"
      >
        <View style={styles.sheetInner}>
          {dueRecurring.length > 0 && (
            <View style={styles.reminderSection}>
              <Text style={[styles.reminderHeader, { color: colors.textPrimary }]}>
                Upcoming Bills ({dueRecurring.length})
              </Text>
              {dueRecurring.map((r) => {
                const delta = daysBetween(todayISO, r.nextDueDateISO);
                return (
                  <View
                    key={r.id}
                    style={[
                      styles.reminderItem,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reminderTitle, { color: colors.textPrimary }]}>
                        {r.title}
                      </Text>
                      <Text style={[styles.reminderSub, { color: colors.textSecondary }]}>
                        Due: {formatDate(r.nextDueDateISO)}{' '}
                        {delta <= 0 ? '(Due today)' : `(in ${delta}d)`}
                      </Text>
                    </View>
                    <Text style={[styles.reminderAmt, { color: colors.textPrimary }]}>
                      {formatNaira(r.amountKobo, { hideDecimalsIfWhole: true })}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {budgetAlerts.length > 0 && (
            <View style={styles.reminderSection}>
              <Text style={[styles.reminderHeader, { color: colors.textPrimary }]}>
                Budget Warning Categories ({budgetAlerts.length})
              </Text>
              {budgetAlerts.map((c) => (
                <View
                  key={c.categoryId}
                  style={[
                    styles.reminderItem,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reminderTitle, { color: colors.textPrimary }]}>
                      {c.categoryName} ({c.percentUsed}%)
                    </Text>
                    <Text style={[styles.reminderSub, { color: colors.textSecondary }]}>
                      {formatNaira(c.spentKobo, { hideDecimalsIfWhole: true })} spent of{' '}
                      {formatNaira(c.allocatedKobo, { hideDecimalsIfWhole: true })}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.reminderAmt,
                      {
                        color: c.isOverspent
                          ? colors.semantic.expense
                          : colors.semantic.warning,
                      },
                    ]}
                  >
                    {c.isOverspent ? 'Over budget' : 'Near limit'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {dueRecurring.length === 0 && budgetAlerts.length === 0 && (
            <Text style={[styles.emptyRemindersText, { color: colors.textMuted }]}>
              All good! No upcoming bill deadlines or budget warnings at this time.
            </Text>
          )}
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: DesignTokens.spacing.lg,
    paddingBottom: 40,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: DesignTokens.spacing.lg,
  },
  quickActionCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 74,
  },
  quickActionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  manageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  manageLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  accountsStrip: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: DesignTokens.spacing.lg,
  },
  budgetOverviewCard: {
    padding: 16,
    borderRadius: DesignTokens.radii.xl,
    borderWidth: 1,
  },
  budgetTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  budgetSpentLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  budgetSpentValue: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    marginTop: 2,
  },
  budgetPercentText: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  budgetBarBg: {
    height: 9,
    borderRadius: 4.5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  budgetBarFill: {
    height: '100%',
    borderRadius: 4.5,
  },
  budgetBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetRemainingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  budgetAllocatedPill: {
    fontSize: 11,
  },
  budgetEmptyBanner: {
    padding: 16,
    borderRadius: DesignTokens.radii.xl,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  budgetEmptyText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  chartCard: {
    padding: 14,
    borderRadius: DesignTokens.radii.xl,
    borderWidth: 1,
  },
  insightsStrip: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: DesignTokens.spacing.lg,
  },
  insightCard: {
    width: 250,
    padding: 14,
    borderRadius: DesignTokens.radii.xl,
    borderWidth: 1.5,
    justifyContent: 'space-between',
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  insightDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  insightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
  },
  insightActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  recentList: {
    gap: 4,
  },
  sheetInner: {
    paddingBottom: 24,
  },
  reminderSection: {
    marginBottom: 18,
  },
  reminderHeader: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
    marginBottom: 8,
  },
  reminderTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  reminderSub: {
    fontSize: 11,
    marginTop: 2,
  },
  reminderAmt: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  emptyRemindersText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
