import { DatabaseConnection } from '../src/database/connection/DatabaseConnection';
import { createBetterSqliteConnection } from './helpers/testDatabase';
import { DatabaseManager } from '../src/database';
import { computePercent } from '../src/utils/money';

describe('Savings Goals Management', () => {
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

  test('creates goal with correct target and 0 saved initial amount', async () => {
    const goal = await manager.repos.goals.create({
      name: 'Emergency Fund',
      targetAmountKobo: 150000000, // ₦1,500,000.00
      targetDateISO: '2027-04-01',
      iconName: 'ShieldCheck',
      color: '#087F5B',
    });

    expect(goal.id).toBeDefined();
    expect(goal.savedAmountKobo).toBe(0);
    expect(goal.status).toBe('active');
  });

  test('adding goal contribution does not inflate monthly cash flow expenses', async () => {
    const goal = await manager.repos.goals.create({
      name: 'Apartment Rent',
      targetAmountKobo: 180000000,
      targetDateISO: '2027-08-01',
      iconName: 'Home',
      color: '#7C3AED',
    });

    // Add contribution entry
    await manager.repos.goals.addContribution(goal.id, 25000000, 'August savings portion');

    const updated = await manager.repos.goals.getById(goal.id);
    expect(updated?.savedAmountKobo).toBe(25000000);
    expect(computePercent(updated!.savedAmountKobo, updated!.targetAmountKobo)).toBe(14);

    // Verify cash flow expenses did not increase
    const cashFlow = await manager.repos.transactions.getMonthlyCashFlow('2026-11');
    expect(cashFlow.expenseKobo).toBe(0);
  });
});
