import { DatabaseConnection } from '../connection/DatabaseConnection';
import { GoalContribution, GoalStatus, SavingsGoal } from '../../types/finance';
import { generateUUID } from '../../utils/uuid';
import { sanitizeIntegerKobo } from '../../utils/money';
import { toDateOnlyISO } from '../../utils/date';

export class SavingsGoalRepository {
  constructor(private db: DatabaseConnection) {}

  async getAll(statusFilter?: GoalStatus): Promise<SavingsGoal[]> {
    let sql = 'SELECT * FROM savings_goals';
    const params: any[] = [];
    if (statusFilter) {
      sql += ' WHERE status = ?';
      params.push(statusFilter);
    }
    sql += ' ORDER BY created_at DESC';

    const res = await this.db.execute(sql, params);
    const goals: SavingsGoal[] = [];

    for (const row of res.rows) {
      const entriesRes = await this.db.execute(
        'SELECT * FROM savings_goal_entries WHERE goal_id = ? ORDER BY date_iso DESC, created_at DESC',
        [row.id]
      );
      const contributions: GoalContribution[] = entriesRes.rows.map((e: any) => ({
        id: e.id,
        amountKobo: Number(e.amount_kobo),
        dateISO: e.date_iso,
        note: e.note || undefined,
      }));

      goals.push({
        id: row.id,
        name: row.name,
        targetAmountKobo: Number(row.target_amount_kobo),
        savedAmountKobo: Number(row.saved_amount_kobo),
        targetDateISO: row.target_date_iso,
        iconName: row.icon_name,
        color: row.color,
        status: row.status as GoalStatus,
        contributions,
        createdAtISO: row.created_at,
      });
    }

    return goals;
  }

  async getById(id: string): Promise<SavingsGoal | null> {
    const res = await this.db.execute('SELECT * FROM savings_goals WHERE id = ?', [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    const entriesRes = await this.db.execute(
      'SELECT * FROM savings_goal_entries WHERE goal_id = ? ORDER BY date_iso DESC, created_at DESC',
      [id]
    );
    const contributions: GoalContribution[] = entriesRes.rows.map((e: any) => ({
      id: e.id,
      amountKobo: Number(e.amount_kobo),
      dateISO: e.date_iso,
      note: e.note || undefined,
    }));

    return {
      id: row.id,
      name: row.name,
      targetAmountKobo: Number(row.target_amount_kobo),
      savedAmountKobo: Number(row.saved_amount_kobo),
      targetDateISO: row.target_date_iso,
      iconName: row.icon_name,
      color: row.color,
      status: row.status as GoalStatus,
      contributions,
      createdAtISO: row.created_at,
    };
  }

  async create(payload: {
    name: string;
    targetAmountKobo: number;
    targetDateISO: string;
    iconName: string;
    color: string;
    id?: string;
  }): Promise<SavingsGoal> {
    const id = payload.id || generateUUID();
    const now = new Date().toISOString();
    const targetKobo = sanitizeIntegerKobo(payload.targetAmountKobo);

    await this.db.execute(
      `INSERT INTO savings_goals (id, name, target_amount_kobo, saved_amount_kobo, target_date_iso, icon_name, color, status, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?, ?, 'active', ?, ?)`,
      [id, payload.name.trim(), targetKobo, payload.targetDateISO, payload.iconName, payload.color, now, now]
    );

    return {
      id,
      name: payload.name.trim(),
      targetAmountKobo: targetKobo,
      savedAmountKobo: 0,
      targetDateISO: payload.targetDateISO,
      iconName: payload.iconName,
      color: payload.color,
      status: 'active',
      contributions: [],
      createdAtISO: now,
    };
  }

  async update(id: string, patch: Partial<Pick<SavingsGoal, 'name' | 'targetAmountKobo' | 'targetDateISO' | 'iconName' | 'color'>>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (patch.name !== undefined) {
      fields.push('name = ?');
      values.push(patch.name.trim());
    }
    if (patch.targetAmountKobo !== undefined) {
      fields.push('target_amount_kobo = ?');
      values.push(sanitizeIntegerKobo(patch.targetAmountKobo));
    }
    if (patch.targetDateISO !== undefined) {
      fields.push('target_date_iso = ?');
      values.push(patch.targetDateISO);
    }
    if (patch.iconName !== undefined) {
      fields.push('icon_name = ?');
      values.push(patch.iconName);
    }
    if (patch.color !== undefined) {
      fields.push('color = ?');
      values.push(patch.color);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.execute(`UPDATE savings_goals SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async addContribution(goalId: string, amountKobo: number, note?: string): Promise<GoalContribution> {
    const safeAmount = sanitizeIntegerKobo(amountKobo);
    if (safeAmount <= 0) {
      throw new Error('Contribution must be greater than zero.');
    }

    const goal = await this.getById(goalId);
    if (!goal) throw new Error('Goal not found.');

    const entryId = generateUUID();
    const todayISO = toDateOnlyISO(new Date());
    const now = new Date().toISOString();
    const nextSaved = goal.savedAmountKobo + safeAmount;
    const nextStatus = nextSaved >= goal.targetAmountKobo ? 'completed' : goal.status;

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO savings_goal_entries (id, goal_id, amount_kobo, date_iso, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [entryId, goalId, safeAmount, todayISO, note?.trim() || null, now]
      );

      await tx.execute(
        'UPDATE savings_goals SET saved_amount_kobo = ?, status = ?, updated_at = ? WHERE id = ?',
        [nextSaved, nextStatus, now, goalId]
      );
    });

    return {
      id: entryId,
      amountKobo: safeAmount,
      dateISO: todayISO,
      note: note?.trim(),
    };
  }

  async setStatus(id: string, status: GoalStatus): Promise<void> {
    await this.db.execute(
      'UPDATE savings_goals SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date().toISOString(), id]
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM savings_goals WHERE id = ?', [id]);
  }
}
