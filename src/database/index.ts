import { DatabaseConnection, getDatabaseConnection } from './connection/DatabaseConnection';
import { runMigrations } from './migrations/migrator';
import { seedInitialData } from './seeds/defaultData';
import { AccountRepository } from './repositories/AccountRepository';
import { CategoryRepository } from './repositories/CategoryRepository';
import { TransactionRepository } from './repositories/TransactionRepository';
import { BudgetRepository } from './repositories/BudgetRepository';
import { SavingsGoalRepository } from './repositories/SavingsGoalRepository';
import { RecurringRepository } from './repositories/RecurringRepository';
import { SettingsRepository } from './repositories/SettingsRepository';

export interface DatabaseRepositories {
  accounts: AccountRepository;
  categories: CategoryRepository;
  transactions: TransactionRepository;
  budgets: BudgetRepository;
  goals: SavingsGoalRepository;
  recurring: RecurringRepository;
  settings: SettingsRepository;
}

export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  public db: DatabaseConnection;
  public repos: DatabaseRepositories;
  private initialized = false;

  constructor(customDb?: DatabaseConnection) {
    this.db = customDb || getDatabaseConnection();
    this.repos = {
      accounts: new AccountRepository(this.db),
      categories: new CategoryRepository(this.db),
      transactions: new TransactionRepository(this.db),
      budgets: new BudgetRepository(this.db),
      goals: new SavingsGoalRepository(this.db),
      recurring: new RecurringRepository(this.db),
      settings: new SettingsRepository(this.db),
    };
  }

  static getInstance(customDb?: DatabaseConnection): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(customDb);
    }
    return DatabaseManager.instance;
  }

  async initialize(includeDemoData = false): Promise<void> {
    if (this.initialized) return;
    await runMigrations(this.db);
    await seedInitialData(this.db, includeDemoData);
    this.initialized = true;
  }
}
