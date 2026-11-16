import { DatabaseConnection } from '../../database/connection/DatabaseConnection';
import {
  Account,
  Category,
  Transaction,
  MonthlyBudget,
  SavingsGoal,
  RecurringTransaction,
  AppSettings,
} from '../../types/finance';
import { AccountRepository } from '../../database/repositories/AccountRepository';
import { CategoryRepository } from '../../database/repositories/CategoryRepository';
import { TransactionRepository } from '../../database/repositories/TransactionRepository';
import { SavingsGoalRepository } from '../../database/repositories/SavingsGoalRepository';
import { RecurringRepository } from '../../database/repositories/RecurringRepository';
import { SettingsRepository } from '../../database/repositories/SettingsRepository';

import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes } from '@noble/hashes/utils.js';

declare const TextEncoder: any;
declare const TextDecoder: any;
declare const Buffer: any;

function stringToUtf8(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(str, 'utf8'));
  }
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }
  return new Uint8Array(utf8);
}

function utf8ToString(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('utf8');
  }
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return decodeURIComponent(escape(str));
}

export interface KobbiBackupData {
  version: number;
  app: 'kobbi';
  exportedAtISO: string;
  database: {
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    budgets: Record<string, MonthlyBudget>;
    savingsGoals: SavingsGoal[];
    recurringTransactions: RecurringTransaction[];
    settings: AppSettings;
  };
}

export interface EncryptedBackupEnvelope {
  version: number;
  app: 'kobbi';
  encrypted: true;
  algorithm: 'AES-256-GCM-PBKDF2';
  saltHex: string;
  nonceHex: string;
  iterations: number;
  ciphertextHex: string;
}

export type AnyBackupEnvelope = KobbiBackupData | EncryptedBackupEnvelope;

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export class BackupService {
  /**
   * Reads all financial records and settings from SQLite to create a complete backup bundle.
   */
  public static async createBackup(db: DatabaseConnection): Promise<KobbiBackupData> {
    const accRepo = new AccountRepository(db);
    const catRepo = new CategoryRepository(db);
    const txRepo = new TransactionRepository(db);
    const goalRepo = new SavingsGoalRepository(db);
    const recurRepo = new RecurringRepository(db);
    const settingsRepo = new SettingsRepository(db);

    const [accounts, categories, transactions, goals, recurring, settings] = await Promise.all([
      accRepo.getAll(true),
      catRepo.getAll(),
      txRepo.getAll(),
      goalRepo.getAll(),
      recurRepo.getAll(),
      settingsRepo.getSettings(),
    ]);

    // Query budgets and allocations directly
    const budgetsRes = await db.execute('SELECT * FROM budgets');
    const allocsRes = await db.execute('SELECT * FROM budget_allocations ORDER BY amount_kobo DESC');

    const budgetsMap: Record<string, MonthlyBudget> = {};
    for (const b of budgetsRes.rows) {
      const monthKey = b.month_key;
      budgetsMap[monthKey] = {
        monthKey,
        totalBudgetKobo: Number(b.total_budget_kobo || 0),
        allocations: [],
      };
    }

    for (const a of allocsRes.rows) {
      const monthKey = a.month_key;
      if (!budgetsMap[monthKey]) {
        budgetsMap[monthKey] = {
          monthKey,
          totalBudgetKobo: 0,
          allocations: [],
        };
      }
      budgetsMap[monthKey].allocations.push({
        id: a.id,
        categoryId: a.category_id,
        mode: a.mode as 'fixed' | 'percent',
        amountKobo: Number(a.amount_kobo),
        percentValue: a.percent_value !== null ? Number(a.percent_value) : undefined,
      });
    }

    return {
      version: 1,
      app: 'kobbi',
      exportedAtISO: new Date().toISOString(),
      database: {
        accounts,
        categories,
        transactions,
        budgets: budgetsMap,
        savingsGoals: goals,
        recurringTransactions: recurring,
        settings,
      },
    };
  }

  /**
   * Encrypts a backup payload with password using PBKDF2-HMAC-SHA256 and AES-256-GCM.
   * If password is omitted, returns formatted JSON string.
   */
  public static async encryptBackup(
    backup: KobbiBackupData,
    password?: string
  ): Promise<string> {
    const jsonStr = JSON.stringify(backup, null, 2);

    if (!password || !password.trim()) {
      return jsonStr;
    }

    const salt = randomBytes(16);
    const nonce = randomBytes(12);
    const iterations = 100000;

    const key = pbkdf2(sha256, password, salt, { c: iterations, dkLen: 32 });
    const cipher = gcm(key, nonce);

    const plaintextBytes = stringToUtf8(jsonStr);
    const ciphertext = cipher.encrypt(plaintextBytes);

    const envelope: EncryptedBackupEnvelope = {
      version: 1,
      app: 'kobbi',
      encrypted: true,
      algorithm: 'AES-256-GCM-PBKDF2',
      saltHex: bytesToHex(salt),
      nonceHex: bytesToHex(nonce),
      iterations,
      ciphertextHex: bytesToHex(ciphertext),
    };

    return JSON.stringify(envelope, null, 2);
  }

  /**
   * Decrypts or parses a backup file.
   * Handles both unencrypted KobbiBackupData and AES-256-GCM EncryptedBackupEnvelope.
   */
  public static async decryptBackup(
    backupJson: string,
    password?: string
  ): Promise<KobbiBackupData> {
    let parsed: any;
    try {
      parsed = JSON.parse(backupJson);
    } catch {
      throw new Error('Invalid JSON format: backup file is not valid JSON.');
    }

    if (!parsed || parsed.app !== 'kobbi') {
      throw new Error('Invalid Kobbi backup: missing app identifier.');
    }

    if (parsed.encrypted === true) {
      if (!password || !password.trim()) {
        throw new Error('Password required: this backup is encrypted with AES-256-GCM.');
      }

      const env = parsed as EncryptedBackupEnvelope;
      if (!env.saltHex || !env.nonceHex || !env.ciphertextHex) {
        throw new Error('Corrupted encrypted backup: missing cryptographic parameters.');
      }

      const salt = hexToBytes(env.saltHex);
      const nonce = hexToBytes(env.nonceHex);
      const ciphertext = hexToBytes(env.ciphertextHex);
      const iterations = env.iterations || 100000;

      const key = pbkdf2(sha256, password, salt, { c: iterations, dkLen: 32 });
      const decipher = gcm(key, nonce);

      let decryptedBytes: Uint8Array;
      try {
        decryptedBytes = decipher.decrypt(ciphertext);
      } catch {
        throw new Error('Decryption failed: incorrect password or corrupted backup file.');
      }

      const decryptedText = utf8ToString(decryptedBytes);
      const decryptedBackup = JSON.parse(decryptedText) as KobbiBackupData;

      if (!decryptedBackup || decryptedBackup.app !== 'kobbi' || !decryptedBackup.database) {
        throw new Error('Decrypted contents do not match Kobbi database structure.');
      }

      return decryptedBackup;
    }

    if (!parsed.database) {
      throw new Error('Invalid Kobbi backup: missing database object.');
    }

    return parsed as KobbiBackupData;
  }

  /**
   * Restores a KobbiBackupData into SQLite inside a single atomic transaction.
   * If any step fails, the entire transaction rolls back to preserve existing data integrity.
   */
  public static async restoreBackup(
    db: DatabaseConnection,
    backup: KobbiBackupData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const data = backup.database;
      if (!data) {
        return { success: false, error: 'Backup does not contain database records.' };
      }

      await db.transaction(async (tx) => {
        // Clear existing tables in dependency order
        await tx.execute('DELETE FROM recurring_transactions');
        await tx.execute('DELETE FROM savings_goal_entries');
        await tx.execute('DELETE FROM savings_goals');
        await tx.execute('DELETE FROM budget_allocations');
        await tx.execute('DELETE FROM budgets');
        await tx.execute('DELETE FROM transactions');
        await tx.execute('DELETE FROM categories');
        await tx.execute('DELETE FROM accounts');

        const now = new Date().toISOString();

        // Restore Categories
        for (const c of data.categories || []) {
          await tx.execute(
            `INSERT INTO categories (id, name, type, icon_name, color, is_default, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [c.id, c.name, c.type, c.iconName, c.color, c.isDefault ? 1 : 0, now, now]
          );
        }

        // Restore Accounts
        for (const a of data.accounts || []) {
          await tx.execute(
            `INSERT INTO accounts (id, name, institution, type, opening_balance_kobo, color, archived, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              a.id,
              a.name,
              a.institution || a.name,
              a.type,
              a.openingBalanceKobo,
              a.color,
              a.archived ? 1 : 0,
              a.createdAtISO || now,
              now,
            ]
          );
        }

        // Restore Transactions
        for (const t of data.transactions || []) {
          await tx.execute(
            `INSERT INTO transactions (
              id, type, amount_kobo, category_id, account_id, destination_account_id,
              date_iso, title, notes, recurring_source_id, source, external_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              t.id,
              t.type,
              t.amountKobo,
              t.categoryId || null,
              t.accountId,
              t.destinationAccountId || null,
              t.dateISO,
              t.title,
              t.notes || null,
              t.recurringSourceId || null,
              t.source || 'manual',
              t.externalId || null,
              t.createdAtISO || now,
              now,
            ]
          );
        }

        // Restore Budgets & Allocations
        if (data.budgets) {
          for (const [monthKey, b] of Object.entries(data.budgets)) {
            await tx.execute(
              `INSERT INTO budgets (month_key, total_budget_kobo, created_at, updated_at)
               VALUES (?, ?, ?, ?)`,
              [monthKey, b.totalBudgetKobo, now, now]
            );

            for (const alloc of b.allocations || []) {
              await tx.execute(
                `INSERT INTO budget_allocations (id, month_key, category_id, mode, amount_kobo, percent_value, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  alloc.id,
                  monthKey,
                  alloc.categoryId,
                  alloc.mode,
                  alloc.amountKobo,
                  alloc.percentValue ?? null,
                  now,
                  now,
                ]
              );
            }
          }
        }

        // Restore Savings Goals & Contributions
        for (const g of data.savingsGoals || []) {
          await tx.execute(
            `INSERT INTO savings_goals (id, name, target_amount_kobo, saved_amount_kobo, target_date_iso, icon_name, color, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              g.id,
              g.name,
              g.targetAmountKobo,
              g.savedAmountKobo,
              g.targetDateISO || null,
              g.iconName,
              g.color,
              g.status,
              g.createdAtISO || now,
              now,
            ]
          );

          for (const c of g.contributions || []) {
            await tx.execute(
              `INSERT INTO savings_goal_entries (id, goal_id, amount_kobo, date_iso, note, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [c.id, g.id, c.amountKobo, c.dateISO, c.note || null, now]
            );
          }
        }

        // Restore Recurring Transactions
        for (const r of data.recurringTransactions || []) {
          await tx.execute(
            `INSERT INTO recurring_transactions (
              id, title, type, amount_kobo, category_id, account_id, frequency,
              start_date_iso, end_date_iso, next_due_date_iso, status, auto_record, notes, last_recorded_date_iso, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              r.id,
              r.title,
              r.type,
              r.amountKobo,
              r.categoryId,
              r.accountId,
              r.frequency,
              r.startDateISO,
              r.endDateISO || null,
              r.nextDueDateISO,
              r.status,
              r.autoRecord ? 1 : 0,
              r.notes || null,
              r.lastRecordedDateISO || null,
              now,
              now,
            ]
          );
        }

        // Restore Settings
        if (data.settings) {
          const s = data.settings;
          const settingsRows: [string, string][] = [
            ['user_name', s.userName],
            ['currency_code', s.currencyCode],
            ['currency_symbol', s.currencySymbol],
            ['theme', s.theme],
            ['date_format', s.dateFormat],
            ['hide_balances', s.hideBalances ? 'true' : 'false'],
            ['app_lock_enabled', s.appLockEnabled ? 'true' : 'false'],
            ['biometric_lock_enabled', s.biometricLockEnabled ? 'true' : 'false'],
            ['onboarding_completed', s.onboardingCompleted ? 'true' : 'false'],
            ['budget_alert_threshold_pct', String(s.budgetAlertThresholdPct)],
            ['monthly_start_day', String(s.monthlyStartDay)],
            ['notifications_enabled', s.notificationsEnabled ? 'true' : 'false'],
          ];

          if (s.defaultAccountId) {
            settingsRows.push(['default_account_id', s.defaultAccountId]);
          }

          for (const [key, val] of settingsRows) {
            await tx.execute(
              `INSERT INTO app_settings (key, value) VALUES (?, ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
              [key, val]
            );
          }
        }
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to restore database.' };
    }
  }
}
