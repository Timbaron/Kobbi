import { DatabaseConnection } from '../connection/DatabaseConnection';
import { Transaction, TransactionType } from '../../types/finance';
import { generateUUID } from '../../utils/uuid';
import { sanitizeIntegerKobo } from '../../utils/money';

export interface TransactionFilters {
  type?: 'all' | TransactionType;
  accountId?: string;
  categoryId?: string;
  monthKey?: string; // YYYY-MM
  startDateISO?: string; // YYYY-MM-DD
  endDateISO?: string; // YYYY-MM-DD
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export class TransactionRepository {
  constructor(private db: DatabaseConnection) {}

  private mapRowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      type: row.type as TransactionType,
      amountKobo: Number(row.amount_kobo),
      categoryId: row.category_id || undefined,
      accountId: row.account_id,
      destinationAccountId: row.destination_account_id || undefined,
      dateISO: row.date_iso,
      title: row.title,
      notes: row.notes || undefined,
      createdAtISO: row.created_at,
      recurringSourceId: row.recurring_source_id || undefined,
      source: row.source,
      externalId: row.external_id || undefined,
    };
  }

  async getAll(filters: TransactionFilters = {}): Promise<Transaction[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.type && filters.type !== 'all') {
      conditions.push('type = ?');
      params.push(filters.type);
    }

    if (filters.accountId && filters.accountId !== 'all') {
      conditions.push('(account_id = ? OR destination_account_id = ?)');
      params.push(filters.accountId, filters.accountId);
    }

    if (filters.categoryId && filters.categoryId !== 'all') {
      conditions.push('category_id = ?');
      params.push(filters.categoryId);
    }

    if (filters.monthKey) {
      conditions.push('substr(date_iso, 1, 7) = ?');
      params.push(filters.monthKey);
    }

    if (filters.startDateISO) {
      conditions.push('substr(date_iso, 1, 10) >= ?');
      params.push(filters.startDateISO);
    }

    if (filters.endDateISO) {
      conditions.push('substr(date_iso, 1, 10) <= ?');
      params.push(filters.endDateISO);
    }

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = `%${filters.searchQuery.trim().toLowerCase()}%`;
      conditions.push('(lower(title) LIKE ? OR lower(COALESCE(notes, "")) LIKE ?)');
      params.push(q, q);
    }

    let sql = 'SELECT * FROM transactions';
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY date_iso DESC, created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const res = await this.db.execute(sql, params);
    return res.rows.map(this.mapRowToTransaction);
  }

  async getRecent(limit = 5): Promise<Transaction[]> {
    return this.getAll({ limit });
  }

  async getById(id: string): Promise<Transaction | null> {
    const res = await this.db.execute('SELECT * FROM transactions WHERE id = ?', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToTransaction(res.rows[0]);
  }

  async create(payload: Omit<Transaction, 'id' | 'createdAtISO'> & { id?: string }): Promise<Transaction> {
    const id = payload.id || generateUUID();
    const now = new Date().toISOString();
    const amountKobo = sanitizeIntegerKobo(payload.amountKobo);

    if (amountKobo <= 0) {
      throw new Error('Amount must be greater than zero.');
    }
    if (payload.type === 'transfer' && payload.accountId === payload.destinationAccountId) {
      throw new Error('Source and destination accounts must be different.');
    }

    await this.db.execute(
      `INSERT INTO transactions (
        id, type, amount_kobo, category_id, account_id, destination_account_id,
        date_iso, title, notes, recurring_source_id, source, external_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.type,
        amountKobo,
        payload.type === 'transfer' ? null : payload.categoryId || null,
        payload.accountId,
        payload.type === 'transfer' ? payload.destinationAccountId || null : null,
        payload.dateISO,
        payload.title.trim(),
        payload.notes?.trim() || null,
        payload.recurringSourceId || null,
        payload.source || 'manual',
        payload.externalId || null,
        now,
        now,
      ]
    );

    return {
      id,
      type: payload.type,
      amountKobo,
      categoryId: payload.type === 'transfer' ? undefined : payload.categoryId,
      accountId: payload.accountId,
      destinationAccountId: payload.type === 'transfer' ? payload.destinationAccountId : undefined,
      dateISO: payload.dateISO,
      title: payload.title.trim(),
      notes: payload.notes?.trim() || undefined,
      createdAtISO: now,
      recurringSourceId: payload.recurringSourceId,
      source: payload.source || 'manual',
      externalId: payload.externalId,
    };
  }

  async update(id: string, patch: Partial<Omit<Transaction, 'id' | 'createdAtISO'>>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (patch.type !== undefined) {
      fields.push('type = ?');
      values.push(patch.type);
    }
    if (patch.amountKobo !== undefined) {
      const amt = sanitizeIntegerKobo(patch.amountKobo);
      if (amt <= 0) throw new Error('Amount must be greater than zero.');
      fields.push('amount_kobo = ?');
      values.push(amt);
    }
    if (patch.categoryId !== undefined) {
      fields.push('category_id = ?');
      values.push(patch.categoryId || null);
    }
    if (patch.accountId !== undefined) {
      fields.push('account_id = ?');
      values.push(patch.accountId);
    }
    if (patch.destinationAccountId !== undefined) {
      fields.push('destination_account_id = ?');
      values.push(patch.destinationAccountId || null);
    }
    if (patch.dateISO !== undefined) {
      fields.push('date_iso = ?');
      values.push(patch.dateISO);
    }
    if (patch.title !== undefined) {
      fields.push('title = ?');
      values.push(patch.title.trim());
    }
    if (patch.notes !== undefined) {
      fields.push('notes = ?');
      values.push(patch.notes?.trim() || null);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.execute(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM transactions WHERE id = ?', [id]);
  }

  /**
   * Calculates monthly cash flow excluding internal transfers
   */
  async getMonthlyCashFlow(monthKey: string) {
    const sql = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount_kobo ELSE 0 END), 0) as income_total,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_kobo ELSE 0 END), 0) as expense_total,
        COALESCE(SUM(CASE WHEN type = 'transfer' THEN amount_kobo ELSE 0 END), 0) as transfer_total
      FROM transactions
      WHERE substr(date_iso, 1, 7) = ?
    `;
    const res = await this.db.execute(sql, [monthKey]);
    const row = res.rows[0];
    const incomeKobo = Number(row?.income_total || 0);
    const expenseKobo = Number(row?.expense_total || 0);
    const transferKobo = Number(row?.transfer_total || 0);

    return {
      incomeKobo,
      expenseKobo,
      netKobo: incomeKobo - expenseKobo,
      transferKobo,
    };
  }

  /**
   * Returns spending per categoryId in integer kobo for a given month
   */
  async getCategorySpendingForMonth(monthKey: string): Promise<Record<string, number>> {
    const sql = `
      SELECT category_id, SUM(amount_kobo) as spent_kobo
      FROM transactions
      WHERE type = 'expense' AND category_id IS NOT NULL AND substr(date_iso, 1, 7) = ?
      GROUP BY category_id
    `;
    const res = await this.db.execute(sql, [monthKey]);
    const map: Record<string, number> = {};
    for (const r of res.rows) {
      if (r.category_id) {
        map[r.category_id] = Number(r.spent_kobo || 0);
      }
    }
    return map;
  }
}
