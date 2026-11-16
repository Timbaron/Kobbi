import { createBetterSqliteConnection, DatabaseConnection } from '../src/database/connection/DatabaseConnection';
import { DatabaseManager } from '../src/database';

describe('Financial Account Management', () => {
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

  test('creates account with valid opening balance', async () => {
    const acc = await manager.repos.accounts.create({
      name: 'GTBank Current',
      institution: 'GTBank',
      type: 'bank',
      openingBalanceKobo: 25000000, // ₦250,000.00
      color: '#087F5B',
    });

    expect(acc.id).toBeDefined();
    expect(acc.name).toBe('GTBank Current');
    expect(acc.openingBalanceKobo).toBe(25000000);
    expect(acc.archived).toBe(false);

    const balance = await manager.repos.accounts.getBalanceKobo(acc.id);
    expect(balance).toBe(25000000);
  });

  test('updates account metadata without corrupting opening balance', async () => {
    const acc = await manager.repos.accounts.create({
      name: 'Savings',
      institution: 'OPay',
      type: 'mobile_money',
      openingBalanceKobo: 5000000,
      color: '#087F5B',
    });

    await manager.repos.accounts.update(acc.id, {
      name: 'OPay Pocket Spend',
      color: '#7C3AED',
    });

    const updated = await manager.repos.accounts.getById(acc.id);
    expect(updated?.name).toBe('OPay Pocket Spend');
    expect(updated?.color).toBe('#7C3AED');
    expect(updated?.openingBalanceKobo).toBe(5000000);
  });

  test('archives and restores account', async () => {
    const acc = await manager.repos.accounts.create({
      name: 'Old Cash Drawer',
      institution: 'Cash',
      type: 'cash',
      openingBalanceKobo: 10000,
      color: '#101828',
    });

    let activeList = await manager.repos.accounts.getAll(false);
    expect(activeList.some((a) => a.id === acc.id)).toBe(true);

    // Archive
    await manager.repos.accounts.toggleArchive(acc.id);
    activeList = await manager.repos.accounts.getAll(false);
    expect(activeList.some((a) => a.id === acc.id)).toBe(false);

    let archivedList = await manager.repos.accounts.getAll(true);
    expect(archivedList.find((a) => a.id === acc.id)?.archived).toBe(true);

    // Restore
    await manager.repos.accounts.toggleArchive(acc.id);
    activeList = await manager.repos.accounts.getAll(false);
    expect(activeList.some((a) => a.id === acc.id)).toBe(true);
  });
});
