import { DatabaseConnection } from '../connection/DatabaseConnection';
import { migration001 } from './001_initial_schema';

const ALL_MIGRATIONS = [migration001];

export async function runMigrations(db: DatabaseConnection): Promise<number> {
  // Ensure schema_migrations table exists
  await db.executeRaw(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRes = await db.execute('SELECT version FROM schema_migrations ORDER BY version ASC');
  const appliedVersions = new Set<number>(appliedRes.rows.map((r: any) => r.version));

  let migratedCount = 0;

  for (const mig of ALL_MIGRATIONS) {
    if (!appliedVersions.has(mig.version)) {
      await db.transaction(async (tx) => {
        await mig.up(tx);
        await tx.execute(
          'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
          [mig.version, new Date().toISOString()]
        );
      });
      migratedCount++;
    }
  }

  return migratedCount;
}
