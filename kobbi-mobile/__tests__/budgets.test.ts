import { DatabaseConnection } from '../src/database/connection/DatabaseConnection';
import { createBetterSqliteConnection } from './helpers/testDatabase';
import { DatabaseManager } from '../src/database';
import { getBudgetSummary } from '../src/utils/calculations';

describe('Monthly Budget Management', () => {
  let db: DatabaseConnection;
  let manager: DatabaseManager;

  beforeEach(async () => {
    db = createBetterSqliteConnection(true);
    manager = new DatabaseManager(db);
    await manager.initialize(false);
  });

  afterEach(async () => {
    await db.close();
  });

  test('creates budget and calculates remaining amount and percent used', async () => {
    const monthKey = '2026-11';
    await manager.repos.budgets.setTotalBudget(monthKey, 30000000); // ₦300,000.00

    const budget = await manager.repos.budgets.getMonthlyBudget(monthKey);
    expect(budget?.totalBudgetKobo).toBe(30000000);

    // Allocate ₦100,000 to Food
    await manager.repos.budgets.upsertAllocation(monthKey, {
      categoryId: 'cat-food',
      mode: 'fixed',
      amountKobo: 10000000,
    });

    // Create an account and add an eligible expense
    const acc = await manager.repos.accounts.create({
      name: 'OPay',
      institution: 'OPay',
      type: 'mobile_money',
      openingBalanceKobo: 50000000,
      color: '#087F5B',
    });

    await manager.repos.transactions.create({
      type: 'expense',
      amountKobo: 4500000, // ₦45,000.00
      accountId: acc.id,
      categoryId: 'cat-food',
      dateISO: '2026-11-05T12:00:00',
      title: 'Groceries',
    });

    const txs = await manager.repos.transactions.getAll({ monthKey });
    const cats = await manager.repos.categories.getAll();
    const updatedBudget = await manager.repos.budgets.getMonthlyBudget(monthKey);

    const summary = getBudgetSummary(updatedBudget || undefined, txs, cats, monthKey);
    expect(summary.hasBudget).toBe(true);
    expect(summary.totalSpentKobo).toBe(4500000);
    expect(summary.remainingBudgetKobo).toBe(25500000);
    expect(summary.percentUsed).toBe(15);
    expect(summary.isOverBudget).toBe(false);

    const foodProgress = summary.categories.find((c) => c.categoryId === 'cat-food');
    expect(foodProgress?.spentKobo).toBe(4500000);
    expect(foodProgress?.remainingKobo).toBe(5500000);
    expect(foodProgress?.percentUsed).toBe(45);
    expect(foodProgress?.isOverspent).toBe(false);
  });

  test('budget allocation does NOT alter financial account balances', async () => {
    const acc = await manager.repos.accounts.create({
      name: 'GTBank',
      institution: 'GTBank',
      type: 'bank',
      openingBalanceKobo: 50000000,
      color: '#C2410C',
    });

    const balanceBefore = await manager.repos.accounts.getBalanceKobo(acc.id);

    // Setting a budget and allocating categories
    await manager.repos.budgets.setTotalBudget('2026-11', 25000000);
    await manager.repos.budgets.upsertAllocation('2026-11', {
      categoryId: 'cat-rent',
      mode: 'fixed',
      amountKobo: 15000000,
    });

    const balanceAfter = await manager.repos.accounts.getBalanceKobo(acc.id);
    expect(balanceAfter).toBe(balanceBefore);
  });
});
