import { DatabaseConnection } from '../connection/DatabaseConnection';

export const migration001 = {
  version: 1,
  name: '001_initial_schema',
  async up(db: DatabaseConnection): Promise<void> {
    await db.executeRaw(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        institution TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('bank', 'mobile_money', 'cash', 'other')),
        opening_balance_kobo INTEGER NOT NULL DEFAULT 0,
        color TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_accounts_archived ON accounts(archived);

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        icon_name TEXT NOT NULL,
        color TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
        amount_kobo INTEGER NOT NULL CHECK(amount_kobo > 0),
        category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        destination_account_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT,
        date_iso TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        recurring_source_id TEXT,
        source TEXT NOT NULL DEFAULT 'manual',
        external_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK(type != 'transfer' OR (destination_account_id IS NOT NULL AND destination_account_id != account_id))
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date_iso DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_dest_account ON transactions(destination_account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(recurring_source_id);

      CREATE TABLE IF NOT EXISTS budgets (
        month_key TEXT PRIMARY KEY,
        total_budget_kobo INTEGER NOT NULL DEFAULT 0 CHECK(total_budget_kobo >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS budget_allocations (
        id TEXT PRIMARY KEY,
        month_key TEXT NOT NULL REFERENCES budgets(month_key) ON DELETE CASCADE,
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        mode TEXT NOT NULL CHECK(mode IN ('fixed', 'percent')),
        amount_kobo INTEGER NOT NULL CHECK(amount_kobo >= 0),
        percent_value REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(month_key, category_id)
      );

      CREATE INDEX IF NOT EXISTS idx_budget_allocations_month ON budget_allocations(month_key);

      CREATE TABLE IF NOT EXISTS savings_goals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        target_amount_kobo INTEGER NOT NULL CHECK(target_amount_kobo > 0),
        saved_amount_kobo INTEGER NOT NULL DEFAULT 0 CHECK(saved_amount_kobo >= 0),
        target_date_iso TEXT NOT NULL,
        icon_name TEXT NOT NULL,
        color TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'archived')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_savings_goals_status ON savings_goals(status);

      CREATE TABLE IF NOT EXISTS savings_goal_entries (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
        amount_kobo INTEGER NOT NULL CHECK(amount_kobo > 0),
        date_iso TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_savings_entries_goal ON savings_goal_entries(goal_id);

      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        amount_kobo INTEGER NOT NULL CHECK(amount_kobo > 0),
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
        start_date_iso TEXT NOT NULL,
        end_date_iso TEXT,
        next_due_date_iso TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('active', 'paused')),
        auto_record INTEGER NOT NULL DEFAULT 0 CHECK(auto_record IN (0, 1)),
        notes TEXT,
        last_recorded_date_iso TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_recurring_due ON recurring_transactions(next_due_date_iso, status);

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  },
};
