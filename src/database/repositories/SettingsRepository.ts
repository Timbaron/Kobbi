import { DatabaseConnection } from '../connection/DatabaseConnection';
import { AppSettings, FinanceState } from '../../types/finance';
import { DEFAULT_APP_SETTINGS, seedInitialData } from '../seeds/defaultData';

export class SettingsRepository {
  constructor(private db: DatabaseConnection) {}

  async getSettings(): Promise<AppSettings> {
    const res = await this.db.execute('SELECT key, value FROM app_settings');
    const settings: Partial<AppSettings> = { ...DEFAULT_APP_SETTINGS };

    for (const row of res.rows) {
      try {
        (settings as any)[row.key] = JSON.parse(row.value);
      } catch {
        (settings as any)[row.key] = row.value;
      }
    }

    return settings as AppSettings;
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const [key, value] of Object.entries(patch)) {
        await tx.execute(
          `INSERT INTO app_settings (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = ?`,
          [key, JSON.stringify(value), JSON.stringify(value)]
        );
      }
    });
  }

  /**
   * Complete database clear. Permanently deletes all financial ledger records.
   */
  async clearAllData(): Promise<void> {
    const currentSettings = await this.getSettings();

    await this.db.transaction(async (tx) => {
      await tx.execute('DELETE FROM savings_goal_entries');
      await tx.execute('DELETE FROM savings_goals');
      await tx.execute('DELETE FROM budget_allocations');
      await tx.execute('DELETE FROM budgets');
      await tx.execute('DELETE FROM transactions');
      await tx.execute('DELETE FROM recurring_transactions');
      await tx.execute('DELETE FROM accounts');

      await tx.execute(
        'UPDATE app_settings SET value = ? WHERE key = ?',
        [JSON.stringify(false), 'onboardingCompleted']
      );

      // Preserve user theme choice
      await tx.execute(
        'UPDATE app_settings SET value = ? WHERE key = ?',
        [JSON.stringify(currentSettings.theme), 'theme']
      );
    });
  }

  /**
   * Exports the complete relational state for backup
   */
  async exportFullState(): Promise<FinanceState> {
    const accountsRes = await this.db.execute('SELECT * FROM accounts');
    const categoriesRes = await this.db.execute('SELECT * FROM categories');
    const transactionsRes = await this.db.execute('SELECT * FROM transactions ORDER BY date_iso DESC');
    const budgetsRes = await this.db.execute('SELECT * FROM budgets');
    const budgetAllocRes = await this.db.execute('SELECT * FROM budget_allocations');
    const goalsRes = await this.db.execute('SELECT * FROM savings_goals');
    const goalEntriesRes = await this.db.execute('SELECT * FROM savings_goal_entries');
    const recurringRes = await this.db.execute('SELECT * FROM recurring_transactions');
    const settings = await this.getSettings();

    const budgets: Record<string, any> = {};
    for (const b of budgetsRes.rows) {
      budgets[b.month_key] = {
        monthKey: b.month_key,
        totalBudgetKobo: Number(b.total_budget_kobo),
        allocations: budgetAllocRes.rows
          .filter((a: any) => a.month_key === b.month_key)
          .map((a: any) => ({
            id: a.id,
            categoryId: a.category_id,
            mode: a.mode,
            amountKobo: Number(a.amount_kobo),
            percentValue: a.percent_value !== null ? Number(a.percent_value) : undefined,
          })),
      };
    }

    const goals = goalsRes.rows.map((g: any) => ({
      id: g.id,
      name: g.name,
      targetAmountKobo: Number(g.target_amount_kobo),
      savedAmountKobo: Number(g.saved_amount_kobo),
      targetDateISO: g.target_date_iso,
      iconName: g.icon_name,
      color: g.color,
      status: g.status,
      contributions: goalEntriesRes.rows
        .filter((e: any) => e.goal_id === g.id)
        .map((e: any) => ({
          id: e.id,
          amountKobo: Number(e.amount_kobo),
          dateISO: e.date_iso,
          note: e.note || undefined,
        })),
      createdAtISO: g.created_at,
    }));

    return {
      accounts: accountsRes.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        institution: r.institution,
        type: r.type,
        openingBalanceKobo: Number(r.opening_balance_kobo),
        color: r.color,
        archived: Boolean(r.archived),
        createdAtISO: r.created_at,
      })),
      categories: categoriesRes.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        iconName: r.icon_name,
        color: r.color,
        isDefault: Boolean(r.is_default),
      })),
      transactions: transactionsRes.rows.map((r: any) => ({
        id: r.id,
        type: r.type,
        amountKobo: Number(r.amount_kobo),
        categoryId: r.category_id || undefined,
        accountId: r.account_id,
        destinationAccountId: r.destination_account_id || undefined,
        dateISO: r.date_iso,
        title: r.title,
        notes: r.notes || undefined,
        createdAtISO: r.created_at,
        recurringSourceId: r.recurring_source_id || undefined,
        source: r.source,
        externalId: r.external_id || undefined,
      })),
      budgets,
      goals,
      recurring: recurringRes.rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        amountKobo: Number(r.amount_kobo),
        categoryId: r.category_id,
        accountId: r.account_id,
        frequency: r.frequency,
        startDateISO: r.start_date_iso,
        endDateISO: r.end_date_iso || undefined,
        nextDueDateISO: r.next_due_date_iso,
        status: r.status,
        autoRecord: Boolean(r.auto_record),
        notes: r.notes || undefined,
        lastRecordedDateISO: r.last_recorded_date_iso || undefined,
      })),
      settings,
    };
  }
}
