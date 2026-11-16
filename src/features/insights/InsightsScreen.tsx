import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Share2,
} from 'lucide-react-native';
import { AppHeader } from '../../components/common/AppHeader';
import { DateRangeSelector } from '../../components/finance/DateRangeSelector';
import { CashFlowChart, CategoryDonutChart, DonutSlice } from '../../components/finance/FinancialChart';
import { SummaryCard } from '../../components/finance/SummaryCard';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { DatabaseManager } from '../../database';
import { useTheme } from '../../theme/ThemeContext';
import { DesignTokens } from '../../theme/tokens';
import {
  Account,
  AppSettings,
  Category,
  MonthlyBudget,
  PrimaryTab,
  RecurringTransaction,
  SavingsGoal,
  SecondaryScreen,
  Transaction,
} from '../../types/finance';
import {
  getBudgetSummary,
  getCashFlowSeries,
  getCategorySpendingForMonth,
  getMonthlyCashFlow,
} from '../../utils/calculations';
import {
  formatDate,
  formatMonthLabel,
  getCurrentMonthKey,
  shiftMonthKey,
  toDateOnlyISO,
} from '../../utils/date';
import { computePercent, formatNaira } from '../../utils/money';
import { CsvExportService } from '../../services/export/CsvExportService';

interface InsightsScreenProps {
  onOpenSettings?: () => void;
  onNavigateTab?: (tab: PrimaryTab) => void;
  onOpenSecondary?: (screen: SecondaryScreen) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const InsightsScreen: React.FC<InsightsScreenProps> = ({
  onOpenSettings,
  onNavigateTab,
  onOpenSecondary,
  onShowToast,
}) => {
  const { colors, isDark } = useTheme();
  const db = DatabaseManager.getInstance();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [chartMode, setChartMode] = useState<'bar' | 'line'>('bar');
  const [monthKey, setMonthKey] = useState<string>(getCurrentMonthKey());
  const [exportOpen, setExportOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  const loadData = async () => {
    try {
      const [accList, catList, txList, goalList, recurList, setList, budgetData] = await Promise.all([
        db.repos.accounts.getAll(true),
        db.repos.categories.getAll(),
        db.repos.transactions.getAll(),
        db.repos.goals.getAll(),
        db.repos.recurring.getAll(),
        db.repos.settings.getSettings(),
        db.repos.budgets.getMonthlyBudget(monthKey),
      ]);

      setAccounts(accList);
      setCategories(catList);
      setTransactions(txList);
      setGoals(goalList);
      setRecurring(recurList);
      setSettings(setList);
      setBudget(budgetData);

      const balances: Record<string, number> = {};
      for (const a of accList) {
        balances[a.id] = await db.repos.accounts.getBalanceKobo(a.id);
      }
      setAccountBalances(balances);
    } catch {
      // Ignore or log in development
    }
  };

  useEffect(() => {
    loadData();
  }, [monthKey]);

  const sym = settings?.currencySymbol || '₦';
  const masked = settings?.hideBalances || false;

  const series = useMemo(
    () => getCashFlowSeries(transactions, period, new Date()),
    [transactions, period]
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
    () => getMonthlyCashFlow(transactions, monthKey),
    [transactions, monthKey]
  );
  const prevMonthKey = shiftMonthKey(monthKey, -1);
  const prevMonthFlow = useMemo(
    () => getMonthlyCashFlow(transactions, prevMonthKey),
    [transactions, prevMonthKey]
  );

  const expenseDeltaKobo = currMonthFlow.expenseKobo - prevMonthFlow.expenseKobo;
  const expenseDeltaPct =
    prevMonthFlow.expenseKobo > 0
      ? computePercent(Math.abs(expenseDeltaKobo), prevMonthFlow.expenseKobo)
      : 0;

  // Category Donut slices
  const categorySlices: DonutSlice[] = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    const currYear = String(now.getFullYear());
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysISO = toDateOnlyISO(sevenDaysAgo);

    if (period === 'monthly') {
      Object.assign(map, getCategorySpendingForMonth(transactions, monthKey));
    } else {
      for (const tx of transactions) {
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
        const cat = categories.find((c: Category) => c.id === catId);
        return {
          id: catId,
          label: cat?.name || 'Other',
          valueKobo,
          color: cat?.color || '#64748B',
        };
      });
  }, [transactions, categories, period, monthKey]);

  const totalCategorySpentKobo = useMemo(
    () => categorySlices.reduce((sum, s) => sum + s.valueKobo, 0),
    [categorySlices]
  );

  const budgetSummary = useMemo(
    () => getBudgetSummary(budget || undefined, transactions, categories, monthKey),
    [budget, transactions, categories, monthKey]
  );

  const activeGoals = useMemo(
    () => goals.filter((g: SavingsGoal) => g.status !== 'archived'),
    [goals]
  );
  const activeGoalsSaved = useMemo(
    () => activeGoals.reduce((s: number, g: SavingsGoal) => s + g.savedAmountKobo, 0),
    [activeGoals]
  );
  const activeGoalsTarget = useMemo(
    () => activeGoals.reduce((s: number, g: SavingsGoal) => s + g.targetAmountKobo, 0),
    [activeGoals]
  );

  const handleDownloadCsv = async () => {
    try {
      const csv = CsvExportService.generateTransactionsCsv(transactions, accounts, categories);
      const filename = `kobbi-transactions-${toDateOnlyISO(new Date())}.csv`;
      await CsvExportService.shareCsv(csv, filename, 'Kobbi Transactions Statement');
      setExportOpen(false);
      onShowToast?.('Kobbi CSV statement ready', 'success');
    } catch {
      onShowToast?.('Failed to generate CSV', 'error');
    }
  };

  const handleShareSummary = async () => {
    const summaryText = [
      `KOBBI FINANCIAL STATEMENT (${formatMonthLabel(monthKey, true)})`,
      `Generated: ${formatDate(toDateOnlyISO(new Date()), settings?.dateFormat || 'DD MMM YYYY')}`,
      `----------------------------------------`,
      `Income:   ${formatNaira(currMonthFlow.incomeKobo, { symbol: sym })}`,
      `Expenses: ${formatNaira(currMonthFlow.expenseKobo, { symbol: sym })}`,
      `Net:      ${formatNaira(currMonthFlow.netKobo, { symbol: sym, showSign: true })}`,
      `----------------------------------------`,
      `Top Categories:`,
      ...categorySlices.slice(0, 5).map((s) => `• ${s.label}: ${formatNaira(s.valueKobo, { symbol: sym })}`),
      `----------------------------------------`,
      `kobbi. — Every kobo counts.`,
    ].join('\n');

    await CsvExportService.shareCsv(summaryText, 'kobbi-summary.txt', 'Kobbi Financial Summary');
    setPdfPreviewOpen(false);
    onShowToast?.('Statement summary shared', 'success');
  };

  const activePeriodIncomeKobo = period === 'monthly' ? currMonthFlow.incomeKobo : periodTotals.incomeKobo;
  const activePeriodExpenseKobo = period === 'monthly' ? currMonthFlow.expenseKobo : periodTotals.expenseKobo;
  const activePeriodNetKobo = period === 'monthly' ? currMonthFlow.netKobo : periodTotals.netKobo;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Insights & Reports"
        subtitle="Cash flow, category mix & exports"
        onOpenSettings={onOpenSettings}
        rightAction={
          <TouchableOpacity
            onPress={() => setExportOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Export Kobbi reports"
            style={[
              styles.headerIconButton,
              { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
            ]}
          >
            <Download size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weekly / Monthly / Yearly Period Switcher */}
        <View style={[styles.periodSwitcher, { backgroundColor: isDark ? colors.surfaceSubtle : '#E4E7EC' }]}>
          {(['weekly', 'monthly', 'yearly'] as const).map((p) => {
            const isSelected = period === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                style={[
                  styles.periodTab,
                  isSelected && {
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    {
                      color: isSelected ? colors.textPrimary : colors.textSecondary,
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {period === 'monthly' && (
          <DateRangeSelector monthKey={monthKey} onChangeMonth={setMonthKey} />
        )}

        {/* Cash Flow Summary Cards */}
        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <SummaryCard
              label={period === 'monthly' ? `${formatMonthLabel(monthKey, false)} Income` : 'Period Income'}
              amountKobo={activePeriodIncomeKobo}
              currencySymbol={sym}
              hideBalances={masked}
              tone="income"
            />
          </View>
          <View style={styles.gridCol}>
            <SummaryCard
              label={period === 'monthly' ? `${formatMonthLabel(monthKey, false)} Expenses` : 'Period Expenses'}
              amountKobo={activePeriodExpenseKobo}
              currencySymbol={sym}
              hideBalances={masked}
              tone="expense"
            />
          </View>
        </View>

        {/* Net Cash Flow & MoM Comparison */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
                {period === 'monthly'
                  ? `${formatMonthLabel(monthKey, true)} Net Cash Flow`
                  : `${period.charAt(0).toUpperCase() + period.slice(1)} Net Cash Flow`}
              </Text>
              <Text
                style={[
                  styles.netFlowValue,
                  {
                    color:
                      activePeriodNetKobo >= 0
                        ? colors.semantic.income
                        : colors.semantic.expense,
                  },
                ]}
              >
                {formatNaira(activePeriodNetKobo, {
                  symbol: sym,
                  showSign: true,
                  masked,
                  hideDecimalsIfWhole: true,
                })}
              </Text>
            </View>

            {period === 'monthly' && prevMonthFlow.expenseKobo > 0 && (
              <View style={styles.momBadgeContainer}>
                <Text style={[styles.momSubtext, { color: colors.textSecondary }]}>
                  vs {formatMonthLabel(prevMonthKey, false)} spend
                </Text>
                <View style={styles.momDeltaRow}>
                  {expenseDeltaKobo <= 0 ? (
                    <ArrowDownRight size={14} color={colors.semantic.income} />
                  ) : (
                    <ArrowUpRight size={14} color={colors.semantic.expense} />
                  )}
                  <Text
                    style={[
                      styles.momDeltaText,
                      {
                        color:
                          expenseDeltaKobo <= 0
                            ? colors.semantic.income
                            : colors.semantic.expense,
                      },
                    ]}
                  >
                    {expenseDeltaPct}% {expenseDeltaKobo <= 0 ? 'lower' : 'higher'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Income vs Expenses Trend Chart */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Income vs Expenses Trend
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Tap a bar or point to inspect values
              </Text>
            </View>

            <View style={[styles.modeToggle, { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' }]}>
              <TouchableOpacity
                onPress={() => setChartMode('bar')}
                style={[
                  styles.modeButton,
                  chartMode === 'bar' && {
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color: chartMode === 'bar' ? colors.textPrimary : colors.textSecondary,
                    },
                  ]}
                >
                  Bar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setChartMode('line')}
                style={[
                  styles.modeButton,
                  chartMode === 'line' && {
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color: chartMode === 'line' ? colors.textPrimary : colors.textSecondary,
                    },
                  ]}
                >
                  Line
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.chartWrapper}>
            <CashFlowChart
              data={series}
              currencySymbol={sym}
              hideBalances={masked}
              mode={chartMode}
            />
          </View>
        </View>

        {/* Spending by Category Donut */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Spending by Category
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary, marginBottom: 12 }]}>
            {period === 'monthly'
              ? `Breakdown for ${formatMonthLabel(monthKey, true)}`
              : period === 'weekly'
              ? 'Breakdown for the last 7 days'
              : 'Year-to-date category breakdown'}
          </Text>

          <CategoryDonutChart
            slices={categorySlices}
            totalKobo={totalCategorySpentKobo}
            currencySymbol={sym}
            hideBalances={masked}
          />
        </View>

        {/* Budget Performance & Savings Progress */}
        <View style={styles.gridRow}>
          <Pressable
            style={styles.gridCol}
            onPress={() => onNavigateTab?.('budgets')}
          >
            <SummaryCard
              label="Budget Used"
              amountKobo={budgetSummary.totalSpentKobo}
              subtitle={
                budgetSummary.hasBudget
                  ? `${budgetSummary.percentUsed}% of ${formatNaira(budgetSummary.totalBudgetKobo, {
                      symbol: sym,
                      masked,
                      compact: true,
                    })}`
                  : 'Tap to create'
              }
              currencySymbol={sym}
              hideBalances={masked}
              tone={budgetSummary.isOverBudget ? 'expense' : 'neutral'}
            />
          </Pressable>
          <Pressable
            style={styles.gridCol}
            onPress={() => onNavigateTab?.('goals')}
          >
            <SummaryCard
              label="Savings Goals"
              amountKobo={activeGoalsSaved}
              subtitle={`${computePercent(activeGoalsSaved, activeGoalsTarget)}% achieved`}
              currencySymbol={sym}
              hideBalances={masked}
              tone="income"
            />
          </Pressable>
        </View>

        {/* Recurring Transactions Quick Link */}
        <TouchableOpacity
          onPress={() => onOpenSecondary?.('recurring')}
          style={[
            styles.recurringLinkCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.recurringLinkLeft}>
            <View
              style={[
                styles.recurringIconBox,
                { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' },
              ]}
            >
              <CalendarClock size={20} color={colors.semantic.warning} />
            </View>
            <View style={styles.recurringTextWrap}>
              <Text style={[styles.recurringTitle, { color: colors.textPrimary }]}>
                Recurring Schedules
              </Text>
              <Text style={[styles.recurringSubtext, { color: colors.textSecondary }]}>
                {recurring.filter((r) => r.status === 'active').length} active bills & salary schedules
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Export Reports CTA */}
        <TouchableOpacity
          onPress={() => setExportOpen(true)}
          style={[
            styles.exportCtaButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Download size={16} color={colors.textPrimary} />
          <Text style={[styles.exportCtaText, { color: colors.textPrimary }]}>
            Export CSV or Financial Statement
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Export Options BottomSheet */}
      <BottomSheet
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Financial Reports"
        subtitle="Download your ledger or generate a printable report"
      >
        <View style={styles.exportSheetContent}>
          <TouchableOpacity
            onPress={handleDownloadCsv}
            style={[
              styles.exportOptionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <View
              style={[
                styles.exportOptionIconBox,
                { backgroundColor: isDark ? 'rgba(8, 127, 91, 0.25)' : '#DDF5E6' },
              ]}
            >
              <FileSpreadsheet size={22} color={colors.primary} />
            </View>
            <View style={styles.exportOptionTextWrap}>
              <Text style={[styles.exportOptionTitle, { color: colors.textPrimary }]}>
                Export CSV Spreadsheet
              </Text>
              <Text style={[styles.exportOptionDesc, { color: colors.textSecondary }]}>
                Downloads all {transactions.length} transactions for Excel or Google Sheets.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setExportOpen(false);
              setPdfPreviewOpen(true);
            }}
            style={[
              styles.exportOptionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <View
              style={[
                styles.exportOptionIconBox,
                { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF' },
              ]}
            >
              <FileText size={22} color="#3B82F6" />
            </View>
            <View style={styles.exportOptionTextWrap}>
              <Text style={[styles.exportOptionTitle, { color: colors.textPrimary }]}>
                Monthly Statement Summary
              </Text>
              <Text style={[styles.exportOptionDesc, { color: colors.textSecondary }]}>
                Preview monthly breakdown and share or save to files.
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Statement Preview BottomSheet */}
      <BottomSheet
        isOpen={pdfPreviewOpen}
        onClose={() => setPdfPreviewOpen(false)}
        title="Statement Summary"
        subtitle="Monthly financial overview"
      >
        <View style={{ gap: DesignTokens.spacing.md }}>
          <View
            style={[
              styles.statementPreviewBox,
              {
                backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC',
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.statementPreviewHeader}>
              <View>
                <Text style={[styles.statementBrandTitle, { color: colors.textPrimary }]}>
                  Kobbi Financial Summary
                </Text>
                <Text style={[styles.statementBrandSubtitle, { color: colors.textSecondary }]}>
                  {formatMonthLabel(monthKey, true)} · Generated {formatDate(toDateOnlyISO(new Date()), settings?.dateFormat || 'DD MMM YYYY')}
                </Text>
              </View>
              <Text style={[styles.statementCurrencyCode, { color: colors.primary }]}>
                {settings?.currencyCode || 'NGN'}
              </Text>
            </View>

            <View style={styles.statementMetricsRow}>
              <View style={[styles.statementMetricCell, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statementMetricLabel, { color: colors.textSecondary }]}>Income</Text>
                <Text style={[styles.statementMetricValue, { color: colors.semantic.income }]}>
                  {formatNaira(currMonthFlow.incomeKobo, { symbol: sym, hideDecimalsIfWhole: true })}
                </Text>
              </View>
              <View style={[styles.statementMetricCell, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statementMetricLabel, { color: colors.textSecondary }]}>Expenses</Text>
                <Text style={[styles.statementMetricValue, { color: colors.semantic.expense }]}>
                  {formatNaira(currMonthFlow.expenseKobo, { symbol: sym, hideDecimalsIfWhole: true })}
                </Text>
              </View>
              <View style={[styles.statementMetricCell, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statementMetricLabel, { color: colors.textSecondary }]}>Net</Text>
                <Text
                  style={[
                    styles.statementMetricValue,
                    {
                      color:
                        currMonthFlow.netKobo >= 0
                          ? colors.semantic.income
                          : colors.semantic.expense,
                    },
                  ]}
                >
                  {formatNaira(currMonthFlow.netKobo, {
                    symbol: sym,
                    showSign: true,
                    hideDecimalsIfWhole: true,
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.statementTopCategories}>
              <Text style={[styles.statementSectionHeading, { color: colors.textPrimary }]}>
                Top Expense Categories
              </Text>
              {categorySlices.slice(0, 5).map((s) => (
                <View
                  key={s.id}
                  style={[styles.statementCatRow, { borderBottomColor: colors.borderSubtle }]}
                >
                  <Text style={[styles.statementCatLabel, { color: colors.textSecondary }]}>
                    {s.label}
                  </Text>
                  <Text style={[styles.statementCatValue, { color: colors.textPrimary }]}>
                    {formatNaira(s.valueKobo, { symbol: sym, hideDecimalsIfWhole: true })}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleShareSummary}
            style={[styles.shareStatementButton, { backgroundColor: colors.primary }]}
          >
            <Share2 size={16} color="#FFFFFF" />
            <Text style={styles.shareStatementButtonText}>Share Statement Summary</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: DesignTokens.spacing.md,
    paddingTop: DesignTokens.spacing.sm,
    paddingBottom: DesignTokens.spacing.xxl + 40,
    gap: DesignTokens.spacing.md,
  },
  periodSwitcher: {
    flexDirection: 'row',
    borderRadius: DesignTokens.radii.lg,
    padding: 3,
  },
  periodTab: {
    flex: 1,
    height: 36,
    borderRadius: DesignTokens.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabText: {
    fontSize: DesignTokens.typography.sizes.caption,
  },
  gridRow: {
    flexDirection: 'row',
    gap: DesignTokens.spacing.sm,
  },
  gridCol: {
    flex: 1,
  },
  card: {
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
    padding: DesignTokens.spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '500',
  },
  netFlowValue: {
    fontSize: DesignTokens.typography.sizes.title,
    fontWeight: '800',
    marginTop: 2,
  },
  momBadgeContainer: {
    alignItems: 'flex-end',
  },
  momSubtext: {
    fontSize: 11,
  },
  momDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  momDeltaText: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: DesignTokens.typography.sizes.section,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: DesignTokens.radii.sm,
    padding: 2,
  },
  modeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: DesignTokens.radii.sm,
  },
  modeButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartWrapper: {
    marginTop: DesignTokens.spacing.sm,
  },
  recurringLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: DesignTokens.spacing.md,
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
  },
  recurringLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DesignTokens.spacing.sm,
    flex: 1,
  },
  recurringIconBox: {
    width: 40,
    height: 40,
    borderRadius: DesignTokens.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringTextWrap: {
    flex: 1,
  },
  recurringTitle: {
    fontSize: DesignTokens.typography.sizes.body,
    fontWeight: '700',
  },
  recurringSubtext: {
    fontSize: DesignTokens.typography.sizes.caption,
    marginTop: 1,
  },
  exportCtaButton: {
    minHeight: 48,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DesignTokens.spacing.xs,
  },
  exportCtaText: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
  },
  exportSheetContent: {
    gap: DesignTokens.spacing.sm,
  },
  exportOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: DesignTokens.spacing.md,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
    gap: DesignTokens.spacing.md,
  },
  exportOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: DesignTokens.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOptionTextWrap: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: DesignTokens.typography.sizes.body,
    fontWeight: '700',
  },
  exportOptionDesc: {
    fontSize: DesignTokens.typography.sizes.caption,
    marginTop: 2,
  },
  statementPreviewBox: {
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
    padding: DesignTokens.spacing.md,
    gap: DesignTokens.spacing.md,
  },
  statementPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: DesignTokens.spacing.sm,
  },
  statementBrandTitle: {
    fontSize: DesignTokens.typography.sizes.section,
    fontWeight: '800',
  },
  statementBrandSubtitle: {
    fontSize: DesignTokens.typography.sizes.caption,
    marginTop: 1,
  },
  statementCurrencyCode: {
    fontSize: DesignTokens.typography.sizes.body,
    fontWeight: '700',
  },
  statementMetricsRow: {
    flexDirection: 'row',
    gap: DesignTokens.spacing.xs,
  },
  statementMetricCell: {
    flex: 1,
    padding: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.radii.sm,
    alignItems: 'center',
  },
  statementMetricLabel: {
    fontSize: 10.5,
  },
  statementMetricValue: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
    marginTop: 2,
  },
  statementTopCategories: {
    gap: DesignTokens.spacing.xs,
  },
  statementSectionHeading: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
    marginBottom: 4,
  },
  statementCatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statementCatLabel: {
    fontSize: DesignTokens.typography.sizes.caption,
  },
  statementCatValue: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
  },
  shareStatementButton: {
    minHeight: 48,
    borderRadius: DesignTokens.radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DesignTokens.spacing.xs,
  },
  shareStatementButtonText: {
    fontSize: DesignTokens.typography.sizes.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
