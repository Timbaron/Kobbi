import { DatabaseConnection } from '../connection/DatabaseConnection';
import { RecurrenceFrequency, RecurringTransaction, Transaction } from '../../types/finance';
import { generateUUID } from '../../utils/uuid';
import { sanitizeIntegerKobo } from '../../utils/money';
import { addFrequencyToDate, toDateOnlyISO } from '../../utils/date';

export class RecurringRepository {
  constructor(private db: DatabaseConnection) {}

  private mapRowToRecurring(row: any): RecurringTransaction {
    return {
      id: row.id,
      title: row.title,
      type: row.type as 'income' | 'expense',
      amountKobo: Number(row.amount_kobo),
      categoryId: row.category_id,
      accountId: row.account_id,
      frequency: row.frequency as RecurrenceFrequency,
      startDateISO: row.start_date_iso,
      endDateISO: row.end_date_iso || undefined,
      nextDueDateISO: row.next_due_date_iso,
      status: row.status as 'active' | 'paused',
      autoRecord: Boolean(row.auto_record),
      notes: row.notes || undefined,
      lastRecordedDateISO: row.last_recorded_date_iso || undefined,
    };
  }

  async getAll(): Promise<RecurringTransaction[]> {
    const res = await this.db.execute('SELECT * FROM recurring_transactions ORDER BY next_due_date_iso ASC');
    return res.rows.map(this.mapRowToRecurring);
  }

  async getById(id: string): Promise<RecurringTransaction | null> {
    const res = await this.db.execute('SELECT * FROM recurring_transactions WHERE id = ?', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToRecurring(res.rows[0]);
  }

  async create(payload: Omit<RecurringTransaction, 'id'> & { id?: string }): Promise<RecurringTransaction> {
    const id = payload.id || generateUUID();
    const now = new Date().toISOString();
    const amountKobo = sanitizeIntegerKobo(payload.amountKobo);

    await this.db.execute(
      `INSERT INTO recurring_transactions (
        id, title, type, amount_kobo, category_id, account_id, frequency,
        start_date_iso, end_date_iso, next_due_date_iso, status, auto_record, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.title.trim(),
        payload.type,
        amountKobo,
        payload.categoryId,
        payload.accountId,
        payload.frequency,
        payload.startDateISO,
        payload.endDateISO || null,
        payload.nextDueDateISO,
        payload.status,
        payload.autoRecord ? 1 : 0,
        payload.notes?.trim() || null,
        now,
        now,
      ]
    );

    return {
      id,
      title: payload.title.trim(),
      type: payload.type,
      amountKobo,
      categoryId: payload.categoryId,
      accountId: payload.accountId,
      frequency: payload.frequency,
      startDateISO: payload.startDateISO,
      endDateISO: payload.endDateISO,
      nextDueDateISO: payload.nextDueDateISO,
      status: payload.status,
      autoRecord: payload.autoRecord,
      notes: payload.notes?.trim(),
    };
  }

  async update(id: string, patch: Partial<Omit<RecurringTransaction, 'id'>>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (patch.title !== undefined) {
      fields.push('title = ?');
      values.push(patch.title.trim());
    }
    if (patch.type !== undefined) {
      fields.push('type = ?');
      values.push(patch.type);
    }
    if (patch.amountKobo !== undefined) {
      fields.push('amount_kobo = ?');
      values.push(sanitizeIntegerKobo(patch.amountKobo));
    }
    if (patch.categoryId !== undefined) {
      fields.push('category_id = ?');
      values.push(patch.categoryId);
    }
    if (patch.accountId !== undefined) {
      fields.push('account_id = ?');
      values.push(patch.accountId);
    }
    if (patch.frequency !== undefined) {
      fields.push('frequency = ?');
      values.push(patch.frequency);
    }
    if (patch.startDateISO !== undefined) {
      fields.push('start_date_iso = ?');
      values.push(patch.startDateISO);
    }
    if (patch.endDateISO !== undefined) {
      fields.push('end_date_iso = ?');
      values.push(patch.endDateISO || null);
    }
    if (patch.nextDueDateISO !== undefined) {
      fields.push('next_due_date_iso = ?');
      values.push(patch.nextDueDateISO);
    }
    if (patch.status !== undefined) {
      fields.push('status = ?');
      values.push(patch.status);
    }
    if (patch.autoRecord !== undefined) {
      fields.push('auto_record = ?');
      values.push(patch.autoRecord ? 1 : 0);
    }
    if (patch.notes !== undefined) {
      fields.push('notes = ?');
      values.push(patch.notes?.trim() || null);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.execute(`UPDATE recurring_transactions SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async toggleStatus(id: string): Promise<'active' | 'paused'> {
    const target = await this.getById(id);
    if (!target) throw new Error('Schedule not found.');
    const nextStatus = target.status === 'active' ? 'paused' : 'active';
    await this.update(id, { status: nextStatus });
    return nextStatus;
  }

  /**
   * Atomically records an occurrence of a recurring transaction to the financial ledger
   * and advances its nextDueDateISO, with duplicate protection for the same cycle.
   */
  async recordOccurrence(id: string): Promise<{ ok: boolean; transaction?: Transaction; error?: string }> {
    const target = await this.getById(id);
    if (!target) return { ok: false, error: 'Recurring schedule not found.' };

    const todayStr = toDateOnlyISO(new Date());

    // Duplicate protection: Check if already recorded for this recurringSourceId on this due date or today
    const checkRes = await this.db.execute(
      `SELECT id FROM transactions
       WHERE recurring_source_id = ? AND (substr(date_iso, 1, 10) = ? OR substr(date_iso, 1, 10) = ?)`,
      [target.id, target.nextDueDateISO, todayStr]
    );

    if (checkRes.rows.length > 0) {
      return { ok: false, error: 'This occurrence has already been recorded.' };
    }

    const txId = generateUUID();
    const nowTime = new Date().toTimeString().slice(0, 5);
    const txDateISO = `${todayStr}T${nowTime}:00`;
    const nextDue = addFrequencyToDate(target.nextDueDateISO, target.frequency);
    const nowISO = new Date().toISOString();

    let createdTx: Transaction;

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO transactions (
          id, type, amount_kobo, category_id, account_id, destination_account_id,
          date_iso, title, notes, recurring_source_id, source, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 'recurring', ?, ?)`,
        [
          txId,
          target.type,
          target.amountKobo,
          target.categoryId,
          target.accountId,
          txDateISO,
          target.title,
          target.notes ? `${target.notes} (Scheduled)` : 'Recorded from recurring schedule',
          target.id,
          nowISO,
          nowISO,
        ]
      );

      await tx.execute(
        'UPDATE recurring_transactions SET next_due_date_iso = ?, last_recorded_date_iso = ?, updated_at = ? WHERE id = ?',
        [nextDue, todayStr, nowISO, target.id]
      );

      createdTx = {
        id: txId,
        type: target.type,
        amountKobo: target.amountKobo,
        categoryId: target.categoryId,
        accountId: target.accountId,
        dateISO: txDateISO,
        title: target.title,
        notes: target.notes ? `${target.notes} (Scheduled)` : 'Recorded from recurring schedule',
        createdAtISO: nowISO,
        recurringSourceId: target.id,
        source: 'recurring',
      };
    });

    return { ok: true, transaction: createdTx! };
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM recurring_transactions WHERE id = ?', [id]);
  }
}
