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
 * Splits a multi-statement SQL script into individual executable statements,
 * safely handling single/double quoted string literals.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (inString) {
      current += char;
      if (char === stringChar) {
        if (sql[i + 1] === stringChar) {
          current += sql[i + 1];
          i++;
        } else {
          inString = false;
        }
      }
    } else {
      if (char === "'" || char === '"' || char === '`') {
        inString = true;
        stringChar = char;
        current += char;
      } else if (char === ';') {
        const trimmed = current.trim();
        if (trimmed) {
          statements.push(trimmed);
        }
        current = '';
      } else {
        current += char;
      }
    }
  }

  const remainder = current.trim();
  if (remainder) {
    statements.push(remainder);
  }

  return statements;
}

/**
 * Standardize row extraction across different op-sqlite / SQLite driver return shapes
 */
export function extractRows(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res.rows)) return res.rows;
  if (res.rows && Array.isArray(res.rows._array)) return res.rows._array;
  if (res.rows && typeof res.rows.item === 'function') {
    const list: any[] = [];
    for (let i = 0; i < res.rows.length; i++) {
      list.push(res.rows.item(i));
    }
    return list;
  }
  return [];
}

/**
 * Native runtime driver using @op-engineering/op-sqlite
 */
function createOpSqliteConnection(dbName = 'kobbi.db'): DatabaseConnection {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { open } = require('@op-engineering/op-sqlite');
  const db = open({ name: dbName });

  // Enable foreign keys & WAL mode safely
  try {
    if (typeof db.executeSync === 'function') {
      db.executeSync('PRAGMA foreign_keys = ON;');
      db.executeSync('PRAGMA journal_mode = WAL;');
    } else {
      db.execute('PRAGMA foreign_keys = ON;').catch(() => {});
      db.execute('PRAGMA journal_mode = WAL;').catch(() => {});
    }
  } catch {
    // Ignore pragma errors if sync execution is unsupported in environment
  }

  const connection: DatabaseConnection = {
    async execute(sql: string, params: any[] = []): Promise<QueryResult> {
      const res = await db.execute(sql, params);
      return {
        rows: extractRows(res),
        rowsAffected: res?.rowsAffected ?? 0,
        insertId: res?.insertId,
      };
    },

    async executeRaw(sql: string): Promise<void> {
      const statements = splitSqlStatements(sql);
      for (const statement of statements) {
        await db.execute(statement);
      }
    },

    async transaction<T>(callback: (tx: DatabaseConnection) => Promise<T>): Promise<T> {
      let result: T;
      await db.transaction(async (tx: any) => {
        const txConnection: DatabaseConnection = {
          async execute(sql: string, params: any[] = []): Promise<QueryResult> {
            const res = await tx.execute(sql, params);
            return {
              rows: extractRows(res),
              rowsAffected: res?.rowsAffected ?? 0,
              insertId: res?.insertId,
            };
          },
          async executeRaw(sql: string): Promise<void> {
            const statements = splitSqlStatements(sql);
            for (const statement of statements) {
              await tx.execute(statement);
            }
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
