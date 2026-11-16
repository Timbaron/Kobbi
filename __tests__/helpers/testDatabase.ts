import {
  DatabaseConnection,
  QueryResult,
  setDatabaseConnectionForTesting,
} from '../../src/database/connection/DatabaseConnection';

/**
 * In-memory / file SQLite driver for Jest tests using better-sqlite3.
 * Kept exclusively in __tests__ so Metro never bundles it into Android/iOS builds.
 */
export function createBetterSqliteConnection(inMemory = true): DatabaseConnection {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require('better-sqlite3');
  const db = new Database(inMemory ? ':memory:' : 'kobbi_test.db');

  db.pragma('foreign_keys = ON');

  const connection: DatabaseConnection = {
    async execute(sql: string, params: any[] = []): Promise<QueryResult> {
      const trimmed = sql.trim();
      const isSelect =
        trimmed.startsWith('SELECT') ||
        trimmed.startsWith('select') ||
        trimmed.startsWith('PRAGMA') ||
        trimmed.startsWith('pragma') ||
        trimmed.startsWith('EXPLAIN') ||
        trimmed.startsWith('explain');

      if (isSelect) {
        const stmt = db.prepare(sql);
        const rows = stmt.all(...params);
        return { rows, rowsAffected: 0 };
      } else {
        const stmt = db.prepare(sql);
        const info = stmt.run(...params);
        return {
          rows: [],
          rowsAffected: info.changes,
          insertId: typeof info.lastInsertRowid === 'number' ? info.lastInsertRowid : undefined,
        };
      }
    },

    async executeRaw(sql: string): Promise<void> {
      db.exec(sql);
    },

    async transaction<T>(callback: (tx: DatabaseConnection) => Promise<T>): Promise<T> {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = await callback(connection);
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },

    async close(): Promise<void> {
      db.close();
    },
  };

  return connection;
}

export { setDatabaseConnectionForTesting };
