/**
 * Unified SQLite Database Connection Interface
 * --------------------------------------------
 * Allows runtime switching between @op-engineering/op-sqlite on mobile
 * and better-sqlite3 in Jest test environments.
 */

declare const process: any;

export interface QueryResult {
  rows: any[];
  rowsAffected: number;
  insertId?: number;
}

export interface DatabaseConnection {
  execute(sql: string, params?: any[]): Promise<QueryResult>;
  executeRaw(sql: string): Promise<void>;
  transaction<T>(callback: (tx: DatabaseConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

let activeConnection: DatabaseConnection | null = null;

export function getDatabaseConnection(): DatabaseConnection {
  if (!activeConnection) {
    if (process.env.NODE_ENV === 'test') {
      activeConnection = createBetterSqliteConnection();
    } else {
      activeConnection = createOpSqliteConnection();
    }
  }
  return activeConnection;
}

export function setDatabaseConnectionForTesting(conn: DatabaseConnection) {
  activeConnection = conn;
}

/**
 * Native runtime driver using @op-engineering/op-sqlite
 */
function createOpSqliteConnection(dbName = 'kobbi.db'): DatabaseConnection {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { open } = require('@op-engineering/op-sqlite');
  const db = open({ name: dbName });

  // Enable foreign keys & WAL mode
  db.execute('PRAGMA foreign_keys = ON;');
  db.execute('PRAGMA journal_mode = WAL;');

  const connection: DatabaseConnection = {
    async execute(sql: string, params?: any[]): Promise<QueryResult> {
      const res = db.execute(sql, params);
      const rows = res.rows ? (res.rows._array || res.rows) : [];
      return {
        rows: Array.isArray(rows) ? rows : [],
        rowsAffected: res.rowsAffected || 0,
        insertId: res.insertId,
      };
    },

    async executeRaw(sql: string): Promise<void> {
      db.executeRaw(sql);
    },

    async transaction<T>(callback: (tx: DatabaseConnection) => Promise<T>): Promise<T> {
      return db.transaction(async (txOp: any) => {
        const txWrapper: DatabaseConnection = {
          async execute(sql: string, params?: any[]): Promise<QueryResult> {
            const res = txOp.execute(sql, params);
            const rows = res.rows ? (res.rows._array || res.rows) : [];
            return {
              rows: Array.isArray(rows) ? rows : [],
              rowsAffected: res.rowsAffected || 0,
              insertId: res.insertId,
            };
          },
          async executeRaw(sql: string): Promise<void> {
            txOp.executeRaw(sql);
          },
          async transaction<U>(_cb: (tx: DatabaseConnection) => Promise<U>): Promise<U> {
            throw new Error('Nested transactions are not supported');
          },
          async close(): Promise<void> {},
        };

        return callback(txWrapper);
      });
    },

    async close(): Promise<void> {
      db.close();
      activeConnection = null;
    },
  };

  return connection;
}

/**
 * In-memory / file SQLite driver for Jest tests using better-sqlite3
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
