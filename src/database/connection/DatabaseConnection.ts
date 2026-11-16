/**
 * Unified SQLite Database Connection Interface
 * --------------------------------------------
 * Runtime driver for @op-engineering/op-sqlite on mobile (Android/iOS).
 * Test connections can be injected using setDatabaseConnectionForTesting.
 */

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
    activeConnection = createOpSqliteConnection();
  }
  return activeConnection;
}

export function setDatabaseConnectionForTesting(conn: DatabaseConnection | null) {
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
    async execute(sql: string, params: any[] = []): Promise<QueryResult> {
      const res = await db.execute(sql, params);
      return {
        rows: res.rows?._array || res.rows || [],
        rowsAffected: res.rowsAffected || 0,
        insertId: res.insertId,
      };
    },

    async executeRaw(sql: string): Promise<void> {
      await db.executeRaw(sql);
    },

    async transaction<T>(callback: (tx: DatabaseConnection) => Promise<T>): Promise<T> {
      let result: T;
      await db.transaction(async (tx: any) => {
        const txConnection: DatabaseConnection = {
          async execute(sql: string, params: any[] = []): Promise<QueryResult> {
            const res = await tx.execute(sql, params);
            return {
              rows: res.rows?._array || res.rows || [],
              rowsAffected: res.rowsAffected || 0,
              insertId: res.insertId,
            };
          },
          async executeRaw(sql: string): Promise<void> {
            await tx.executeRaw(sql);
          },
          async transaction<U>(_nestedCallback: (t: DatabaseConnection) => Promise<U>): Promise<U> {
            throw new Error('Nested transactions are not supported');
          },
          async close(): Promise<void> {
            // No-op for transaction context
          },
        };

        result = await callback(txConnection);
      });

      return result!;
    },

    async close(): Promise<void> {
      db.close();
      activeConnection = null;
    },
  };

  return connection;
}
