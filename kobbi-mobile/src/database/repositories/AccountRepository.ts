import { DatabaseConnection } from '../connection/DatabaseConnection';
import { Account, AccountType } from '../../types/finance';
import { generateUUID } from '../../utils/uuid';
import { sanitizeIntegerKobo } from '../../utils/money';

export class AccountRepository {
  constructor(private db: DatabaseConnection) {}

  private mapRowToAccount(row: any): Account {
    return {
      id: row.id,
      name: row.name,
      institution: row.institution,
      type: row.type as AccountType,
      openingBalanceKobo: Number(row.opening_balance_kobo),
      color: row.color,
      archived: Boolean(row.archived),
      createdAtISO: row.created_at,
    };
  }

  async getAll(includeArchived = false): Promise<Account[]> {
    const query = includeArchived
      ? 'SELECT * FROM accounts ORDER BY created_at ASC'
      : 'SELECT * FROM accounts WHERE archived = 0 ORDER BY created_at ASC';
    const res = await this.db.execute(query);
    return res.rows.map(this.mapRowToAccount);
  }

  async getById(id: string): Promise<Account | null> {
    const res = await this.db.execute('SELECT * FROM accounts WHERE id = ?', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToAccount(res.rows[0]);
  }

  async create(payload: {
    name: string;
    institution: string;
    type: AccountType;
    openingBalanceKobo: number;
    color: string;
    id?: string;
  }): Promise<Account> {
    const id = payload.id || generateUUID();
    const now = new Date().toISOString();
    const openingKobo = sanitizeIntegerKobo(payload.openingBalanceKobo);

    await this.db.execute(
      `INSERT INTO accounts (id, name, institution, type, opening_balance_kobo, color, archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, payload.name.trim(), payload.institution.trim(), payload.type, openingKobo, payload.color, now, now]
    );

    return {
      id,
      name: payload.name.trim(),
      institution: payload.institution.trim(),
      type: payload.type,
      openingBalanceKobo: openingKobo,
      color: payload.color,
      archived: false,
      createdAtISO: now,
    };
  }

  async update(id: string, patch: Partial<Omit<Account, 'id' | 'createdAtISO'>>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (patch.name !== undefined) {
      fields.push('name = ?');
      values.push(patch.name.trim());
    }
    if (patch.institution !== undefined) {
      fields.push('institution = ?');
      values.push(patch.institution.trim());
    }
    if (patch.type !== undefined) {
      fields.push('type = ?');
      values.push(patch.type);
    }
    if (patch.openingBalanceKobo !== undefined) {
      fields.push('opening_balance_kobo = ?');
      values.push(sanitizeIntegerKobo(patch.openingBalanceKobo));
    }
    if (patch.color !== undefined) {
      fields.push('color = ?');
      values.push(patch.color);
    }
    if (patch.archived !== undefined) {
      fields.push('archived = ?');
      values.push(patch.archived ? 1 : 0);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.execute(
      `UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async toggleArchive(id: string): Promise<boolean> {
    const target = await this.getById(id);
    if (!target) return false;
    const nextArchived = !target.archived;
    await this.update(id, { archived: nextArchived });
    return nextArchived;
  }

  /**
   * Deterministic Account Balance:
   * Balance = opening_balance_kobo + Income credits - Expense debits + Incoming transfers - Outgoing transfers
   */
  async getBalanceKobo(accountId: string): Promise<number> {
    const acc = await this.getById(accountId);
    if (!acc) return 0;

    const sql = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' AND account_id = ? THEN amount_kobo ELSE 0 END), 0) as income_total,
        COALESCE(SUM(CASE WHEN type = 'expense' AND account_id = ? THEN amount_kobo ELSE 0 END), 0) as expense_total,
        COALESCE(SUM(CASE WHEN type = 'transfer' AND destination_account_id = ? THEN amount_kobo ELSE 0 END), 0) as transfer_in_total,
        COALESCE(SUM(CASE WHEN type = 'transfer' AND account_id = ? THEN amount_kobo ELSE 0 END), 0) as transfer_out_total
      FROM transactions
      WHERE account_id = ? OR destination_account_id = ?
    `;

    const res = await this.db.execute(sql, [
      accountId,
      accountId,
      accountId,
      accountId,
      accountId,
      accountId,
    ]);

    const row = res.rows[0];
    const income = Number(row?.income_total || 0);
    const expense = Number(row?.expense_total || 0);
    const transferIn = Number(row?.transfer_in_total || 0);
    const transferOut = Number(row?.transfer_out_total || 0);

    return acc.openingBalanceKobo + income - expense + transferIn - transferOut;
  }

  async getTotalBalanceKobo(): Promise<number> {
    const activeAccounts = await this.getAll(false);
    let total = 0;
    for (const acc of activeAccounts) {
      total += await this.getBalanceKobo(acc.id);
    }
    return total;
  }
}
