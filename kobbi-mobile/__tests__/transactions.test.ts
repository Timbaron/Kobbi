import { createBetterSqliteConnection, DatabaseConnection } from '../src/database/connection/DatabaseConnection';
import { DatabaseManager } from '../src/database';

describe('Transaction Management', () => {
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

  test('records income and calculates correct account balance', async () => {
    const acc = await manager.repos.accounts.create({
      name: 'GTBank',
      institution: 'GTBank',
      type: 'bank',
      openingBalanceKobo: 50000 * 100,
      color: '#087F5B',
    });

    const tx = await manager.repos.transactions.create({
      type: 'income',
      amountKobo: 25000 * 100,
      accountId: acc.id,
      categoryId: 'cat-salary',
      dateISO: '2026-11-10T09:00:00',
      title: 'Consulting fee',
    });

    expect(tx.id).toBeDefined();
    expect(tx.amountKobo).toBe(2500000);

    const balance = await manager.repos.accounts.getBalanceKobo(acc.id);
    expect(balance).toBe(7500000); // 50,000 + 25,000 = 75,000
  });

  test('records expense and recalculates balance and monthly category spending', async () => {
    const acc = await manager.repos.accounts.create({
      name: 'OPay',
      institution: 'OPay',
      type: 'mobile_money',
      openingBalanceKobo: 40000 * 100,
      color: '#087F5B',
    });

    await manager.repos.transactions.create({
      type: 'expense',
      amountKobo: 12000 * 100,
      accountId: acc.id,
      categoryId: 'cat-food',
      dateISO: '2026-11-12T14:30:00',
      title: 'Supermarket stock-up',
    });

    const balance = await manager.repos.accounts.getBalanceKobo(acc.id);
    expect(balance).toBe(2800000); // 40,000 - 12,000 = 28,000

    const spendingMap = await manager.repos.transactions.getCategorySpendingForMonth('2026-11');
    expect(spendingMap['cat-food']).toBe(1200000);
  });

  test('rejects transfer where source and destination accounts are the same', async () => {
    const acc = await manager.repos.accounts.create({
      name: 'Cash',
      institution: 'Cash',
      type: 'cash',
      openingBalanceKobo: 100000,
      color: '#101828',
    });

    await expect(
      manager.repos.transactions.create({
        type: 'transfer',
        amountKobo: 50000,
        accountId: acc.id,
        destinationAccountId: acc.id,
        dateISO: '2026-11-14T11:00:00',
        title: 'Invalid Self Transfer',
      })
    ).rejects.toThrow(/Source and destination accounts must be different/);
  });

  test('deleting a transaction correctly reverses its financial effect', async () => {
    const acc = await manager.repos.accounts.create({
      name: 'Wallet',
      institution: 'Cash',
      type: 'cash',
      openingBalanceKobo: 100000,
      color: '#101828',
    });

    const tx = await manager.repos.transactions.create({
      type: 'expense',
      amountKobo: 30000,
      accountId: acc.id,
      categoryId: 'cat-transport',
      dateISO: '2026-11-15T08:00:00',
      title: 'Ride to office',
    });

    expect(await manager.repos.accounts.getBalanceKobo(acc.id)).toBe(70000);

    // Delete transaction
    await manager.repos.transactions.delete(tx.id);
    expect(await manager.repos.accounts.getBalanceKobo(acc.id)).toBe(100000);
  });
});
