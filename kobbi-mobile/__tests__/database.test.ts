import { createBetterSqliteConnection, DatabaseConnection } from '../src/database/connection/DatabaseConnection';
import { runMigrations } from '../src/database/migrations/migrator';
import { seedInitialData } from '../src/database/seeds/defaultData';
import { DatabaseManager } from '../src/database';

describe('Kobbi SQLite Database & Repositories', () => {
  let db: DatabaseConnection;
  let manager: DatabaseManager;

  beforeEach(async () => {
    // Clean in-memory SQLite database for each test
    db = createBetterSqliteConnection(true);
    manager = new DatabaseManager(db);
    await manager.initialize(false);
  });

  afterEach(async () => {
    await db.close();
  });

  test('runs migrations and creates all schema tables', async () => {
    const res = await db.execute(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
    `);
    const tableNames = res.rows.map((r: any) => r.name);

    expect(tableNames).toContain('accounts');
    expect(tableNames).toContain('app_settings');
    expect(tableNames).toContain('budget_allocations');
    expect(tableNames).toContain('budgets');
    expect(tableNames).toContain('categories');
    expect(tableNames).toContain('recurring_transactions');
    expect(tableNames).toContain('savings_goal_entries');
    expect(tableNames).toContain('savings_goals');
    expect(tableNames).toContain('schema_migrations');
    expect(tableNames).toContain('transactions');
  });

  test('seeds default categories and settings', async () => {
    const categories = await manager.repos.categories.getAll();
    expect(categories.length).toBeGreaterThanOrEqual(13);

    const foodCat = categories.find((c) => c.id === 'cat-food');
    expect(foodCat).toBeDefined();
    expect(foodCat?.type).toBe('expense');

    const salaryCat = categories.find((c) => c.id === 'cat-salary');
    expect(salaryCat).toBeDefined();
    expect(salaryCat?.type).toBe('income');

    const settings = await manager.repos.settings.getSettings();
    expect(settings.currencyCode).toBe('NGN');
    expect(settings.currencySymbol).toBe('₦');
  });

  test('account management and ledger balance calculations', async () => {
    // 1. Create two accounts
    const gtb = await manager.repos.accounts.create({
      name: 'GTBank',
      institution: 'GTBank',
      type: 'bank',
      openingBalanceKobo: 100000 * 100, // ₦100,000
      color: '#C2410C',
    });

    const opay = await manager.repos.accounts.create({
      name: 'OPay',
      institution: 'OPay',
      type: 'mobile_money',
      openingBalanceKobo: 20000 * 100, // ₦20,000
      color: '#087F5B',
    });

    expect(await manager.repos.accounts.getBalanceKobo(gtb.id)).toBe(100000 * 100);
    expect(await manager.repos.accounts.getBalanceKobo(opay.id)).toBe(20000 * 100);
    expect(await manager.repos.accounts.getTotalBalanceKobo()).toBe(120000 * 100);

    // 2. Add income to GTBank
    await manager.repos.transactions.create({
      type: 'income',
      amountKobo: 50000 * 100, // ₦50,000
      accountId: gtb.id,
      categoryId: 'cat-salary',
      dateISO: '2026-11-01T10:00:00',
      title: 'Salary',
    });

    expect(await manager.repos.accounts.getBalanceKobo(gtb.id)).toBe(150000 * 100);

    // 3. Add expense to OPay
    await manager.repos.transactions.create({
      type: 'expense',
      amountKobo: 5000 * 100, // ₦5,000
      accountId: opay.id,
      categoryId: 'cat-food',
      dateISO: '2026-11-02T12:00:00',
      title: 'Groceries',
    });

    expect(await manager.repos.accounts.getBalanceKobo(opay.id)).toBe(15000 * 100);

    // 4. Transfer ₦25,000 from GTBank to OPay
    await manager.repos.transactions.create({
      type: 'transfer',
      amountKobo: 25000 * 100, // ₦25,000
      accountId: gtb.id,
      destinationAccountId: opay.id,
      dateISO: '2026-11-03T15:00:00',
      title: 'Top-up OPay',
    });

    // GTBank: 100,000 + 50,000 - 25,000 = 125,000
    expect(await manager.repos.accounts.getBalanceKobo(gtb.id)).toBe(125000 * 100);
    // OPay: 20,000 - 5,000 + 25,000 = 40,000
    expect(await manager.repos.accounts.getBalanceKobo(opay.id)).toBe(40000 * 100);

    // Total balance must be exactly 165,000
    expect(await manager.repos.accounts.getTotalBalanceKobo()).toBe(165000 * 100);

    // 5. Monthly cash flow must NOT count internal transfers as income or expense
    const cashFlow = await manager.repos.transactions.getMonthlyCashFlow('2026-11');
    expect(cashFlow.incomeKobo).toBe(50000 * 100);
    expect(cashFlow.expenseKobo).toBe(5000 * 100);
    expect(cashFlow.netKobo).toBe(45000 * 100);
    expect(cashFlow.transferKobo).toBe(25000 * 100);
  });

  test('foreign key constraint prevents deleting account with transaction history', async () => {
    const acc = await manager.repos.accounts.create({
      name: 'Access Bank',
      institution: 'Access',
      type: 'bank',
      openingBalanceKobo: 10000,
      color: '#0369A1',
    });

    await manager.repos.transactions.create({
      type: 'income',
      amountKobo: 5000,
      accountId: acc.id,
      dateISO: '2026-11-01T10:00:00',
      title: 'Deposit',
    });

    // Deleting should fail due to ON DELETE RESTRICT foreign key
    await expect(db.execute('DELETE FROM accounts WHERE id = ?', [acc.id])).rejects.toThrow();

    // Archiving should succeed
    const archived = await manager.repos.accounts.toggleArchive(acc.id);
    expect(archived).toBe(true);
    const retrieved = await manager.repos.accounts.getById(acc.id);
    expect(retrieved?.archived).toBe(true);
  });

  test('monthly budget tracking with fixed and percentage allocations', async () => {
    const monthKey = '2026-11';
    await manager.repos.budgets.setTotalBudget(monthKey, 200000 * 100); // ₦200,000

    // Fixed allocation: ₦80,000 to Food
    await manager.repos.budgets.upsertAllocation(monthKey, {
      categoryId: 'cat-food',
      mode: 'fixed',
      amountKobo: 80000 * 100,
    });

    // Percent allocation: 25% (₦50,000) to Transport
    await manager.repos.budgets.upsertAllocation(monthKey, {
      categoryId: 'cat-transport',
      mode: 'percent',
      percentValue: 25,
      amountKobo: 50000 * 100,
    });

    const budget = await manager.repos.budgets.getMonthlyBudget(monthKey);
    expect(budget).toBeDefined();
    expect(budget?.totalBudgetKobo).toBe(200000 * 100);
    expect(budget?.allocations.length).toBe(2);

    const transportAlloc = budget?.allocations.find((a) => a.categoryId === 'cat-transport');
    expect(transportAlloc?.amountKobo).toBe(50000 * 100);

    // Over-allocation check: Remaining is ₦70,000. Allocating ₦100,000 must fail.
    await expect(
      manager.repos.budgets.upsertAllocation(monthKey, {
        categoryId: 'cat-rent',
        mode: 'fixed',
        amountKobo: 100000 * 100,
      })
    ).rejects.toThrow(/Exceeds unallocated budget/);
  });

  test('savings goals and contribution entries', async () => {
    const goal = await manager.repos.goals.create({
      name: 'MacBook M4',
      targetAmountKobo: 1000000 * 100, // ₦1,000,000
      targetDateISO: '2027-06-01',
      iconName: 'Laptop',
      color: '#2563EB',
    });

    expect(goal.savedAmountKobo).toBe(0);
    expect(goal.status).toBe('active');

    // Add first contribution
    await manager.repos.goals.addContribution(goal.id, 400000 * 100, 'Bonus');
    let updated = await manager.repos.goals.getById(goal.id);
    expect(updated?.savedAmountKobo).toBe(400000 * 100);
    expect(updated?.status).toBe('active');
    expect(updated?.contributions.length).toBe(1);

    // Complete goal with final contribution
    await manager.repos.goals.addContribution(goal.id, 650000 * 100, 'Final stretch');
    updated = await manager.repos.goals.getById(goal.id);
    expect(updated?.savedAmountKobo).toBe(1050000 * 100);
    expect(updated?.status).toBe('completed');
  });

  test('recurring transaction occurrences and duplicate guard', async () => {
    const acc = await manager.repos.accounts.create({
      name: 'Main Wallet',
      institution: 'OPay',
      type: 'mobile_money',
      openingBalanceKobo: 100000 * 100,
      color: '#087F5B',
    });

    const recurring = await manager.repos.recurring.create({
      title: 'Internet Fibre',
      type: 'expense',
      amountKobo: 15000 * 100,
      categoryId: 'cat-data',
      accountId: acc.id,
      frequency: 'monthly',
      startDateISO: '2026-11-01',
      nextDueDateISO: '2026-11-01',
      status: 'active',
      autoRecord: false,
    });

    // Record first occurrence
    const res1 = await manager.repos.recurring.recordOccurrence(recurring.id);
    expect(res1.ok).toBe(true);
    expect(res1.transaction).toBeDefined();
    expect(res1.transaction?.recurringSourceId).toBe(recurring.id);

    // Schedule next due date advanced by 1 month
    const updated = await manager.repos.recurring.getById(recurring.id);
    expect(updated?.nextDueDateISO).toBe('2026-12-01');

    // Attempting to record duplicate for the same cycle date should be rejected
    // (create simulated situation where due date matches recorded date)
    await manager.repos.recurring.update(recurring.id, { nextDueDateISO: '2026-11-01' });
    const duplicateRes = await manager.repos.recurring.recordOccurrence(recurring.id);
    expect(duplicateRes.ok).toBe(false);
    expect(duplicateRes.error).toMatch(/already been recorded/);
  });
});
