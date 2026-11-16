import { createBetterSqliteConnection, DatabaseConnection } from '../src/database/connection/DatabaseConnection';
import { runMigrations } from '../src/database/migrations/migrator';
import { seedInitialData } from '../src/database/seeds/defaultData';
import { AccountRepository } from '../src/database/repositories/AccountRepository';
import { TransactionRepository } from '../src/database/repositories/TransactionRepository';
import { CategoryRepository } from '../src/database/repositories/CategoryRepository';
import { BudgetRepository } from '../src/database/repositories/BudgetRepository';
import { SavingsGoalRepository } from '../src/database/repositories/SavingsGoalRepository';
import { RecurringRepository } from '../src/database/repositories/RecurringRepository';
import { SettingsRepository } from '../src/database/repositories/SettingsRepository';
import { BackupService } from '../src/services/backup/BackupService';
import { CsvExportService } from '../src/services/export/CsvExportService';

describe('Backup and CSV Export Services', () => {
  let db: DatabaseConnection;

  beforeEach(async () => {
    db = createBetterSqliteConnection(true);
    await runMigrations(db);
    await seedInitialData(db, true);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('CsvExportService', () => {
    it('generates valid RFC 4180 CSV for transactions', async () => {
      const txRepo = new TransactionRepository(db);
      const accRepo = new AccountRepository(db);
      const catRepo = new CategoryRepository(db);

      const [txs, accs, cats] = await Promise.all([
        txRepo.getAll(),
        accRepo.getAll(true),
        catRepo.getAll(),
      ]);

      const csv = CsvExportService.generateTransactionsCsv(txs, accs, cats);
      expect(csv).toContain('Transaction ID,Date (ISO),Type,Title');
      expect(csv).toContain('November Salary Credit');
      expect(csv).toContain('485000.00'); // 48,500,000 kobo = 485,000.00 Naira
    });

    it('generates valid RFC 4180 CSV for accounts and balances', async () => {
      const accRepo = new AccountRepository(db);
      const accs = await accRepo.getAll(true);
      const balances: Record<string, number> = {};
      for (const a of accs) {
        balances[a.id] = await accRepo.getBalanceKobo(a.id);
      }

      const csv = CsvExportService.generateAccountsCsv(accs, balances);
      expect(csv).toContain('Account ID,Name,Institution,Type');
      expect(csv).toContain('GTBank');
      expect(csv).toContain('OPay');
    });

    it('generates valid RFC 4180 CSV for budgets', async () => {
      const budgetRepo = new BudgetRepository(db);
      const catRepo = new CategoryRepository(db);

      const budget = await budgetRepo.getMonthlyBudget('2026-11');
      const cats = await catRepo.getAll();

      const csv = CsvExportService.generateBudgetCsv('2026-11', budget?.allocations || [], cats, {});
      expect(csv).toContain('Month,Category,Mode,Allocated (Naira)');
    });
  });

  describe('BackupService', () => {
    it('exports all database entities into a structured Kobbi backup bundle', async () => {
      const backup = await BackupService.createBackup(db);

      expect(backup.app).toBe('kobbi');
      expect(backup.version).toBe(1);
      expect(backup.database.accounts.length).toBeGreaterThan(0);
      expect(backup.database.categories.length).toBeGreaterThan(0);
      expect(backup.database.transactions.length).toBeGreaterThan(0);
      expect(backup.database.savingsGoals.length).toBeGreaterThan(0);
      expect(backup.database.recurringTransactions.length).toBeGreaterThan(0);
      expect(backup.database.settings.userName).toBe('Tunde');
    });

    it('encrypts and decrypts backup with password using AES-256-GCM and PBKDF2', async () => {
      const backup = await BackupService.createBackup(db);
      const password = 'SuperSecretNairaPassword#2026';

      const encryptedEnvelopeJson = await BackupService.encryptBackup(backup, password);
      expect(encryptedEnvelopeJson).toContain('"encrypted": true');
      expect(encryptedEnvelopeJson).toContain('"algorithm": "AES-256-GCM-PBKDF2"');
      expect(encryptedEnvelopeJson).not.toContain('Salary (Tech Corp)'); // Ciphertext is protected

      // Decrypt with correct password
      const decryptedBackup = await BackupService.decryptBackup(encryptedEnvelopeJson, password);
      expect(decryptedBackup.app).toBe('kobbi');
      expect(decryptedBackup.database.accounts.length).toBe(backup.database.accounts.length);
      expect(decryptedBackup.database.transactions.length).toBe(backup.database.transactions.length);

      // Decrypt with incorrect password should throw
      await expect(
        BackupService.decryptBackup(encryptedEnvelopeJson, 'WrongPassword123')
      ).rejects.toThrow(/Decryption failed/);
    });

    it('handles unencrypted JSON backups transparently', async () => {
      const backup = await BackupService.createBackup(db);
      const unencryptedJson = await BackupService.encryptBackup(backup); // No password passed

      const decrypted = await BackupService.decryptBackup(unencryptedJson);
      expect(decrypted.app).toBe('kobbi');
      expect(decrypted.database.transactions.length).toBe(backup.database.transactions.length);
    });

    it('restores backup atomically into SQLite database', async () => {
      const backup = await BackupService.createBackup(db);

      // Create a fresh target database
      const targetDb = createBetterSqliteConnection(true);
      await runMigrations(targetDb);

      // Verify targetDb has 0 transactions
      const txCountBefore = await targetDb.execute('SELECT COUNT(*) as c FROM transactions');
      expect(txCountBefore.rows[0].c).toBe(0);

      // Restore
      const res = await BackupService.restoreBackup(targetDb, backup);
      expect(res.success).toBe(true);

      // Verify all tables populated in targetDb
      const txCountAfter = await targetDb.execute('SELECT COUNT(*) as c FROM transactions');
      expect(txCountAfter.rows[0].c).toBe(backup.database.transactions.length);

      const accCountAfter = await targetDb.execute('SELECT COUNT(*) as c FROM accounts');
      expect(accCountAfter.rows[0].c).toBe(backup.database.accounts.length);

      const settingsRepo = new SettingsRepository(targetDb);
      const restoredSettings = await settingsRepo.getSettings();
      expect(restoredSettings.userName).toBe('Tunde');

      await targetDb.close();
    });
  });
});
