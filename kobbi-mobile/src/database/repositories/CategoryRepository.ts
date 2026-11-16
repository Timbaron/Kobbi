import { DatabaseConnection } from '../connection/DatabaseConnection';
import { Category } from '../../types/finance';
import { generateUUID } from '../../utils/uuid';

export class CategoryRepository {
  constructor(private db: DatabaseConnection) {}

  private mapRowToCategory(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      type: row.type as 'income' | 'expense',
      iconName: row.icon_name,
      color: row.color,
      isDefault: Boolean(row.is_default),
    };
  }

  async getAll(): Promise<Category[]> {
    const res = await this.db.execute('SELECT * FROM categories ORDER BY is_default DESC, name ASC');
    return res.rows.map(this.mapRowToCategory);
  }

  async getById(id: string): Promise<Category | null> {
    const res = await this.db.execute('SELECT * FROM categories WHERE id = ?', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToCategory(res.rows[0]);
  }

  async create(payload: {
    name: string;
    type: 'income' | 'expense';
    iconName: string;
    color: string;
    id?: string;
  }): Promise<Category> {
    const id = payload.id || generateUUID();
    const now = new Date().toISOString();

    await this.db.execute(
      `INSERT INTO categories (id, name, type, icon_name, color, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, payload.name.trim(), payload.type, payload.iconName, payload.color, now, now]
    );

    return {
      id,
      name: payload.name.trim(),
      type: payload.type,
      iconName: payload.iconName,
      color: payload.color,
      isDefault: false,
    };
  }

  async delete(id: string): Promise<{ ok: boolean; error?: string }> {
    // Check if in use by transactions
    const txCheck = await this.db.execute('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?', [id]);
    if (txCheck.rows[0]?.count > 0) {
      return { ok: false, error: 'Category is in use by transactions.' };
    }

    // Check if in use by budget allocations
    const allocCheck = await this.db.execute('SELECT COUNT(*) as count FROM budget_allocations WHERE category_id = ?', [id]);
    if (allocCheck.rows[0]?.count > 0) {
      return { ok: false, error: 'Category is allocated in monthly budgets.' };
    }

    await this.db.execute('DELETE FROM categories WHERE id = ?', [id]);
    return { ok: true };
  }
}
