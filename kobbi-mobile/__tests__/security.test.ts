import { createBetterSqliteConnection, DatabaseConnection } from '../src/database/connection/DatabaseConnection';
import { runMigrations } from '../src/database/migrations/migrator';
import { SecurityService } from '../src/services/security/SecurityService';

describe('SecurityService (PBKDF2-HMAC-SHA256 PIN Management)', () => {
  let db: DatabaseConnection;

  beforeEach(async () => {
    db = createBetterSqliteConnection(true);
    await runMigrations(db);
  });

  afterEach(async () => {
    await db.close();
  });

  it('hashes and verifies PIN accurately', () => {
    const pin = '1984';
    const { hashHex, saltHex } = SecurityService.hashPin(pin);

    expect(hashHex).toBeDefined();
    expect(saltHex).toBeDefined();
    expect(hashHex.length).toBe(64); // 32 bytes = 64 hex chars
    expect(saltHex.length).toBe(32); // 16 bytes = 32 hex chars

    // Verifies correct PIN
    const isValid = SecurityService.verifyPin(pin, hashHex, saltHex);
    expect(isValid).toBe(true);

    // Rejects incorrect PIN
    const isInvalid = SecurityService.verifyPin('1234', hashHex, saltHex);
    expect(isInvalid).toBe(false);
  });

  it('sets, validates and removes PIN in SQLite settings', async () => {
    expect(await SecurityService.isPinConfigured(db)).toBe(false);

    // Set PIN 2026
    await SecurityService.setPin(db, '2026');
    expect(await SecurityService.isPinConfigured(db)).toBe(true);

    // Validate PIN
    const isCorrect = await SecurityService.validateStoredPin(db, '2026');
    expect(isCorrect).toBe(true);

    const isWrong = await SecurityService.validateStoredPin(db, '9999');
    expect(isWrong).toBe(false);

    // Remove PIN
    await SecurityService.removePin(db);
    expect(await SecurityService.isPinConfigured(db)).toBe(false);
  });
});
