import { DatabaseConnection } from '../connection/DatabaseConnection';
import { BudgetAllocation, MonthlyBudget } from '../../types/finance';
import { generateUUID } from '../../utils/uuid';
import { percentageOfKobo, sanitizeIntegerKobo } from '../../utils/money';

export class BudgetRepository {
  constructor(private db: DatabaseConnection) {}

  async getMonthlyBudget(monthKey: string): Promise<MonthlyBudget | null> {
    const budgetRes = await this.db.execute(
      'SELECT * FROM budgets WHERE month_key = ?',
      [monthKey]
    );

    if (budgetRes.rows.length === 0) return null;

    const row = budgetRes.rows[0];
    const totalBudgetKobo = Number(row.total_budget_kobo || 0);

    const allocRes = await this.db.execute(
      'SELECT * FROM budget_allocations WHERE month_key = ? ORDER BY amount_kobo DESC',
      [monthKey]
    );

    const allocations: BudgetAllocation[] = allocRes.rows.map((r: any) => ({
      id: r.id,
      categoryId: r.category_id,
      mode: r.mode as 'fixed' | 'percent',
      amountKobo: Number(r.amount_kobo),
      percentValue: r.percent_value !== null ? Number(r.percent_value) : undefined,
    }));

    return {
      monthKey,
      totalBudgetKobo,
      allocations,
    };
  }

  async setTotalBudget(monthKey: string, totalBudgetKobo: number): Promise<void> {
    const safeTotal = Math.max(0, sanitizeIntegerKobo(totalBudgetKobo));
    const now = new Date().toISOString();

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO budgets (month_key, total_budget_kobo, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(month_key) DO UPDATE SET total_budget_kobo = ?, updated_at = ?`,
        [monthKey, safeTotal, now, now, safeTotal, now]
      );

      // Recalculate any percent-based allocations for this month
      const allocRes = await tx.execute(
        "SELECT id, percent_value FROM budget_allocations WHERE month_key = ? AND mode = 'percent'",
        [monthKey]
      );

      for (const r of allocRes.rows) {
        if (r.percent_value !== null) {
          const recalculatedKobo = percentageOfKobo(safeTotal, Number(r.percent_value));
          await tx.execute(
            'UPDATE budget_allocations SET amount_kobo = ?, updated_at = ? WHERE id = ?',
            [recalculatedKobo, now, r.id]
          );
        }
      }
    });
  }

  async upsertAllocation(
    monthKey: string,
    allocation: {
      id?: string;
      categoryId: string;
      mode: 'fixed' | 'percent';
      amountKobo: number;
      percentValue?: number;
    }
  ): Promise<BudgetAllocation> {
    const budget = await this.getMonthlyBudget(monthKey);
    if (!budget || budget.totalBudgetKobo <= 0) {
      throw new Error('Please set a total monthly budget before allocating categories.');
    }

    const resolvedKobo =
      allocation.mode === 'percent' && allocation.percentValue !== undefined
        ? percentageOfKobo(budget.totalBudgetKobo, allocation.percentValue)
        : sanitizeIntegerKobo(allocation.amountKobo);

    if (resolvedKobo <= 0) {
      throw new Error('Allocation amount must be greater than zero.');
    }

    const otherAllocatedKobo = budget.allocations
      .filter((a) => a.id !== allocation.id && a.categoryId !== allocation.categoryId)
      .reduce((sum, a) => sum + a.amountKobo, 0);

    if (otherAllocatedKobo + resolvedKobo > budget.totalBudgetKobo) {
      const available = Math.max(0, budget.totalBudgetKobo - otherAllocatedKobo);
      throw new Error(`Exceeds unallocated budget. Only ₦${(available / 100).toLocaleString('en-NG')} available.`);
    }

    const id = allocation.id || generateUUID();
    const now = new Date().toISOString();

    await this.db.execute(
      `INSERT INTO budget_allocations (id, month_key, category_id, mode, amount_kobo, percent_value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(month_key, category_id) DO UPDATE SET
         mode = ?, amount_kobo = ?, percent_value = ?, updated_at = ?`,
      [
        id,
        monthKey,
        allocation.categoryId,
        allocation.mode,
        resolvedKobo,
        allocation.percentValue ?? null,
        now,
        now,
        allocation.mode,
        resolvedKobo,
        allocation.percentValue ?? null,
        now,
      ]
    );

    return {
      id,
      categoryId: allocation.categoryId,
      mode: allocation.mode,
      amountKobo: resolvedKobo,
      percentValue: allocation.percentValue,
    };
  }

  async deleteAllocation(allocationId: string): Promise<void> {
    await this.db.execute('DELETE FROM budget_allocations WHERE id = ?', [allocationId]);
  }
}
