import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes } from '@noble/hashes/utils.js';
import { DatabaseConnection } from '../../database/connection/DatabaseConnection';
import { SettingsRepository } from '../../database/repositories/SettingsRepository';

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export class SecurityService {
  private static readonly ITERATIONS = 50000;
  private static readonly KEY_LEN = 32;

  /**
   * Hashes a 4-6 digit PIN using PBKDF2-HMAC-SHA256 with a unique cryptographic salt.
   */
  public static hashPin(pin: string, saltBytes?: Uint8Array): { hashHex: string; saltHex: string } {
    const salt = saltBytes || randomBytes(16);
    const key = pbkdf2(sha256, pin, salt, { c: this.ITERATIONS, dkLen: this.KEY_LEN });
    return {
      hashHex: bytesToHex(key),
      saltHex: bytesToHex(salt),
    };
  }

  /**
   * Verifies an entered PIN against a stored hash and salt.
   */
  public static verifyPin(pin: string, storedHashHex: string, storedSaltHex: string): boolean {
    if (storedSaltHex.length % 2 !== 0) return false;
    const salt = new Uint8Array(storedSaltHex.length / 2);
    for (let i = 0; i < salt.length; i++) {
      salt[i] = parseInt(storedSaltHex.substring(i * 2, i * 2 + 2), 16);
    }

    const { hashHex } = this.hashPin(pin, salt);
    return hashHex === storedHashHex;
  }

  /**
   * Sets a new PIN in the SQLite database and enables appLock.
   */
  public static async setPin(db: DatabaseConnection, pin: string): Promise<void> {
    const { hashHex, saltHex } = this.hashPin(pin);
    const settingsRepo = new SettingsRepository(db);

    await db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO app_settings (key, value) VALUES ('app_pin_hash', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [hashHex]
      );
      await tx.execute(
        `INSERT INTO app_settings (key, value) VALUES ('app_pin_salt', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [saltHex]
      );
      await tx.execute(
        `INSERT INTO app_settings (key, value) VALUES ('app_lock_enabled', 'true')
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        []
      );
    });
  }

  /**
   * Removes PIN lock from SQLite database.
   */
  public static async removePin(db: DatabaseConnection): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.execute("DELETE FROM app_settings WHERE key IN ('app_pin_hash', 'app_pin_salt')");
      await tx.execute(
        `INSERT INTO app_settings (key, value) VALUES ('app_lock_enabled', 'false')
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        []
      );
    });
  }

  /**
   * Validates if entered PIN is correct according to database settings.
   */
  public static async validateStoredPin(db: DatabaseConnection, enteredPin: string): Promise<boolean> {
    const hashRes = await db.execute("SELECT value FROM app_settings WHERE key = 'app_pin_hash'");
    const saltRes = await db.execute("SELECT value FROM app_settings WHERE key = 'app_pin_salt'");

    if (hashRes.rows.length === 0 || saltRes.rows.length === 0) {
      return false;
    }

    const storedHash = hashRes.rows[0].value;
    const storedSalt = saltRes.rows[0].value;

    return this.verifyPin(enteredPin, storedHash, storedSalt);
  }

  /**
   * Checks if PIN lock is currently configured.
   */
  public static async isPinConfigured(db: DatabaseConnection): Promise<boolean> {
    const res = await db.execute(
      "SELECT value FROM app_settings WHERE key = 'app_pin_hash'"
    );
    return res.rows.length > 0 && Boolean(res.rows[0].value);
  }
}
