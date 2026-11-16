import {
  Account,
  Category,
  MonthlyBudget,
  RecurringTransaction,
  SavingsGoal,
  Transaction,
} from '../types/finance';
import { addFrequencyToDate, daysBetween, formatMonthLabel, getMonthKey, shiftMonthKey, toDateOnlyISO } from './date';
import { computePercent, formatNaira } from './money';

/**
 * Calculates an account's current balance strictly from its opening balance
 * plus income, minus expenses, plus incoming transfers, minus outgoing transfers.
 */
export function getAccountBalanceKobo(account: Account, transactions: Transaction[]): number {
  let balance = account.openingBalanceKobo;

  for (const tx of transactions) {
    if (tx.type === 'income' && tx.accountId === account.id) {
      balance += tx.amountKobo;
    } else if (tx.type === 'expense' && tx.accountId === account.id) {
      balance -= tx.amountKobo;
    } else if (tx.type === 'transfer') {
      if (tx.accountId === account.id) {
        balance -= tx.amountKobo;
      }
      if (tx.destinationAccountId === account.id) {
        balance += tx.amountKobo;
      }
    }
  }

  return balance;
}

/**
 * Total available balance across all active (non-archived) accounts.
 */
export function getTotalBalanceKobo(accounts: Account[], transactions: Transaction[]): number {
  return accounts
    .filter((a) => !a.archived)
    .reduce((sum, acc) => sum + getAccountBalanceKobo(acc, transactions), 0);
}

/**
 * Monthly cash flow excluding internal transfers and opening balances.
 */
export function getMonthlyCashFlow(transactions: Transaction[], monthKey: string) {
  let incomeKobo = 0;
  let expenseKobo = 0;
  let transferKobo = 0;

  for (const tx of transactions) {
    if (getMonthKey(tx.dateISO) !== monthKey) continue;
    if (tx.type === 'income') incomeKobo += tx.amountKobo;
    else if (tx.type === 'expense') expenseKobo += tx.amountKobo;
    else if (tx.type === 'transfer') transferKobo += tx.amountKobo;
  }

  return {
    incomeKobo,
    expenseKobo,
    netKobo: incomeKobo - expenseKobo,
    transferKobo,
  };
}

/**
 * Returns spending per categoryId in integer kobo for a given month.
 */
export function getCategorySpendingForMonth(
  transactions: Transaction[],
  monthKey: string
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.type !== 'expense' || !tx.categoryId) continue;
    if (getMonthKey(tx.dateISO) !== monthKey) continue;
    map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amountKobo;
  }
  return map;
}

export interface CategoryBudgetProgress {
  allocationId: string;
  categoryId: string;
  categoryName: string;
  color: string;
  iconName: string;
  mode: 'fixed' | 'percent';
  percentValue?: number;
  allocatedKobo: number;
  spentKobo: number;
  remainingKobo: number;
  percentUsed: number;
  isOverspent: boolean;
}

export interface BudgetSummary {
  monthKey: string;
  hasBudget: boolean;
  totalBudgetKobo: number;
  totalAllocatedKobo: number;
  unallocatedKobo: number;
  totalSpentKobo: number; // Total monthly expenses across all categories
  allocatedSpentKobo: number; // Expenses within budgeted categories
  remainingBudgetKobo: number;
  percentUsed: number;
  isOverBudget: boolean;
  categories: CategoryBudgetProgress[];
}

export function getBudgetSummary(
  budget: MonthlyBudget | undefined,
  transactions: Transaction[],
  categories: Category[],
  monthKey: string
): BudgetSummary {
  const spendingMap = getCategorySpendingForMonth(transactions, monthKey);
  const totalMonthSpentKobo = Object.values(spendingMap).reduce((a, b) => a + b, 0);

  if (!budget || budget.totalBudgetKobo <= 0) {
    return {
      monthKey,
      hasBudget: false,
      totalBudgetKobo: 0,
      totalAllocatedKobo: 0,
      unallocatedKobo: 0,
      totalSpentKobo: totalMonthSpentKobo,
      allocatedSpentKobo: 0,
      remainingBudgetKobo: 0,
      percentUsed: 0,
      isOverBudget: false,
      categories: [],
    };
  }

  let totalAllocatedKobo = 0;
  let allocatedSpentKobo = 0;

  const categoryProgress: CategoryBudgetProgress[] = budget.allocations.map((alloc) => {
    const cat = categories.find((c) => c.id === alloc.categoryId);
    const spentKobo = spendingMap[alloc.categoryId] || 0;
    totalAllocatedKobo += alloc.amountKobo;
    allocatedSpentKobo += spentKobo;

    return {
      allocationId: alloc.id,
      categoryId: alloc.categoryId,
      categoryName: cat?.name || 'Uncategorized',
      color: cat?.color || '#64748B',
      iconName: cat?.iconName || 'Tag',
      mode: alloc.mode,
      percentValue: alloc.percentValue,
      allocatedKobo: alloc.amountKobo,
      spentKobo,
      remainingKobo: alloc.amountKobo - spentKobo,
      percentUsed: computePercent(spentKobo, alloc.amountKobo),
      isOverspent: spentKobo > alloc.amountKobo,
    };
  });

  const remainingBudgetKobo = budget.totalBudgetKobo - totalMonthSpentKobo;

  return {
    monthKey,
    hasBudget: true,
    totalBudgetKobo: budget.totalBudgetKobo,
    totalAllocatedKobo,
    unallocatedKobo: budget.totalBudgetKobo - totalAllocatedKobo,
    totalSpentKobo: totalMonthSpentKobo,
    allocatedSpentKobo,
    remainingBudgetKobo,
    percentUsed: computePercent(totalMonthSpentKobo, budget.totalBudgetKobo),
    isOverBudget: totalMonthSpentKobo > budget.totalBudgetKobo,
    categories: categoryProgress.sort((a, b) => b.percentUsed - a.percentUsed),
  };
}

export interface FinancialInsight {
  id: string;
  severity: 'info' | 'warning' | 'positive' | 'alert';
  title: string;
  description: string;
  actionLabel?: string;
  targetTab?: 'budgets' | 'transactions' | 'goals' | 'insights';
}

/**
 * Generates rule-based, non-AI financial insights strictly from real state.
 */
export function getRuleBasedInsights(params: {
  transactions: Transaction[];
  categories: Category[];
  budgetSummary: BudgetSummary;
  goals: SavingsGoal[];
  recurring: RecurringTransaction[];
  monthKey: string;
  alertThresholdPct: number;
  currencySymbol: string;
}): FinancialInsight[] {
  const {
    transactions,
    categories,
    budgetSummary,
    goals,
    recurring,
    monthKey,
    alertThresholdPct,
    currencySymbol,
  } = params;

  const insights: FinancialInsight[] = [];

  // 1. Overspent or near-threshold budget categories
  for (const cat of budgetSummary.categories) {
    if (cat.isOverspent) {
      insights.push({
        id: `over-${cat.categoryId}`,
        severity: 'alert',
        title: `${cat.categoryName} budget exceeded`,
        description: `You have spent ${formatNaira(cat.spentKobo, { symbol: currencySymbol, hideDecimalsIfWhole: true })} against a ${formatNaira(cat.allocatedKobo, { symbol: currencySymbol, hideDecimalsIfWhole: true })} allocation (${cat.percentUsed}%).`,
        actionLabel: 'Review Budget',
        targetTab: 'budgets',
      });
    } else if (cat.percentUsed >= alertThresholdPct) {
      insights.push({
        id: `warn-${cat.categoryId}`,
        severity: 'warning',
        title: `${cat.percentUsed}% of ${cat.categoryName} budget used`,
        description: `${formatNaira(cat.remainingKobo, { symbol: currencySymbol, hideDecimalsIfWhole: true })} remaining for the rest of ${formatMonthLabel(monthKey)}.`,
        actionLabel: 'Adjust',
        targetTab: 'budgets',
      });
    }
  }

  // 2. Top spending category
  const spendingMap = getCategorySpendingForMonth(transactions, monthKey);
  const sortedCats = Object.entries(spendingMap).sort((a, b) => b[1] - a[1]);
  if (sortedCats.length > 0 && budgetSummary.totalSpentKobo > 0) {
    const [topId, topSpent] = sortedCats[0];
    const topCat = categories.find((c) => c.id === topId);
    const sharePct = computePercent(topSpent, budgetSummary.totalSpentKobo);
    if (topCat) {
      insights.push({
        id: `top-cat-${topId}`,
        severity: 'info',
        title: `${topCat.name} leads your spending (${sharePct}%)`,
        description: `Total of ${formatNaira(topSpent, { symbol: currencySymbol, hideDecimalsIfWhole: true })} spent in ${topCat.name} this month.`,
        actionLabel: 'See Breakdown',
        targetTab: 'insights',
      });
    }
  }

  // 3. Month-over-month net cash flow comparison
  const currFlow = getMonthlyCashFlow(transactions, monthKey);
  const prevMonthKey = shiftMonthKey(monthKey, -1);
  const prevFlow = getMonthlyCashFlow(transactions, prevMonthKey);
  if (prevFlow.expenseKobo > 0 && currFlow.expenseKobo > 0) {
    const diff = currFlow.expenseKobo - prevFlow.expenseKobo;
    const pctChange = computePercent(Math.abs(diff), prevFlow.expenseKobo);
    if (diff < 0) {
      insights.push({
        id: 'mom-lower',
        severity: 'positive',
        title: `Spending is ${pctChange}% lower than ${formatMonthLabel(prevMonthKey)}`,
        description: `You have saved ${formatNaira(Math.abs(diff), { symbol: currencySymbol, hideDecimalsIfWhole: true })} compared to last month's expenses.`,
      });
    } else if (diff > 0 && pctChange >= 10) {
      insights.push({
        id: 'mom-higher',
        severity: 'warning',
        title: `Spending up ${pctChange}% vs ${formatMonthLabel(prevMonthKey)}`,
        description: `Monthly expenses are ${formatNaira(diff, { symbol: currencySymbol, hideDecimalsIfWhole: true })} higher than last month.`,
      });
    }
  }

  // 4. Upcoming due recurring items within 5 days
  const todayISO = toDateOnlyISO(new Date());
  const dueSoon = recurring.filter((r) => {
    if (r.status !== 'active') return false;
    const delta = daysBetween(todayISO, r.nextDueDateISO);
    return delta <= 5;
  });

  if (dueSoon.length > 0) {
    const first = dueSoon[0];
    const delta = daysBetween(todayISO, first.nextDueDateISO);
    const dueLabel = delta < 0 ? `${Math.abs(delta)}d overdue` : delta === 0 ? 'due today' : `due in ${delta}d`;
    insights.push({
      id: `rec-due-${first.id}`,
      severity: delta <= 0 ? 'warning' : 'info',
      title: `Scheduled: ${first.title} (${dueLabel})`,
      description: `${formatNaira(first.amountKobo, { symbol: currencySymbol, hideDecimalsIfWhole: true })} scheduled item waiting for confirmation.`,
    });
  }

  // 5. Goal milestone
  const activeGoal = goals.find((g) => g.status === 'active' && g.targetAmountKobo > 0);
  if (activeGoal) {
    const pct = computePercent(activeGoal.savedAmountKobo, activeGoal.targetAmountKobo);
    if (pct >= 75) {
      insights.push({
        id: `goal-${activeGoal.id}`,
        severity: 'positive',
        title: `${activeGoal.name} is ${pct}% funded`,
        description: `Only ${formatNaira(Math.max(0, activeGoal.targetAmountKobo - activeGoal.savedAmountKobo), { symbol: currencySymbol, hideDecimalsIfWhole: true })} left to reach your target.`,
        actionLabel: 'View Goals',
        targetTab: 'goals',
      });
    }
  }

  return insights.slice(0, 4);
}

export interface ChartDataPoint {
  label: string;
  incomeKobo: number;
  expenseKobo: number;
  netKobo: number;
}

/**
 * Generates Weekly (last 7 days), Monthly (last 6 months), or Yearly (last 3 years)
 * Income vs Expense series directly from transactions.
 */
export function getCashFlowSeries(
  transactions: Transaction[],
  period: 'weekly' | 'monthly' | 'yearly',
  refDate: Date = new Date()
): ChartDataPoint[] {
  if (period === 'weekly') {
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const points: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(refDate);
      d.setDate(d.getDate() - i);
      const iso = toDateOnlyISO(d);
      let incomeKobo = 0;
      let expenseKobo = 0;
      for (const tx of transactions) {
        if (tx.dateISO.slice(0, 10) !== iso) continue;
        if (tx.type === 'income') incomeKobo += tx.amountKobo;
        else if (tx.type === 'expense') expenseKobo += tx.amountKobo;
      }
      points.push({
        label: dayLabels[d.getDay()],
        incomeKobo,
        expenseKobo,
        netKobo: incomeKobo - expenseKobo,
      });
    }
    return points;
  }

  if (period === 'monthly') {
    const currMonth = getMonthKey(toDateOnlyISO(refDate));
    const points: ChartDataPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const mKey = shiftMonthKey(currMonth, -i);
      const flow = getMonthlyCashFlow(transactions, mKey);
      const shortMonth = formatMonthLabel(mKey, false).split(' ')[0];
      points.push({
        label: shortMonth,
        incomeKobo: flow.incomeKobo,
        expenseKobo: flow.expenseKobo,
        netKobo: flow.netKobo,
      });
    }
    return points;
  }

  // Yearly: last 3 calendar years
  const currYear = refDate.getFullYear();
  const points: ChartDataPoint[] = [];
  for (let y = currYear - 2; y <= currYear; y++) {
    const yStr = String(y);
    let incomeKobo = 0;
    let expenseKobo = 0;
    for (const tx of transactions) {
      if (!tx.dateISO.startsWith(yStr)) continue;
      if (tx.type === 'income') incomeKobo += tx.amountKobo;
      else if (tx.type === 'expense') expenseKobo += tx.amountKobo;
    }
    points.push({
      label: yStr,
      incomeKobo,
      expenseKobo,
      netKobo: incomeKobo - expenseKobo,
    });
  }
  return points;
}

/**
 * Computes upcoming occurrences for a recurring item (preview only, never auto-posted).
 */
export function getUpcomingOccurrences(item: RecurringTransaction, count = 4): string[] {
  const dates: string[] = [];
  let cursor = item.nextDueDateISO;
  for (let i = 0; i < count; i++) {
    if (item.endDateISO && cursor > item.endDateISO) break;
    dates.push(cursor);
    cursor = addFrequencyToDate(cursor, item.frequency);
  }
  return dates;
}
