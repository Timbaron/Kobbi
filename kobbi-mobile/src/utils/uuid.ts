/**
 * UUID v4 Generator
 * -----------------
 * Generates RFC4122-compliant v4 UUID strings using WebCrypto or Math.random fallback.
 */

declare const crypto: any;

export function generateUUID(): string {
  try {
    const globalCrypto = typeof crypto !== 'undefined' ? crypto : (globalThis as any)?.crypto;
    if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
      return globalCrypto.randomUUID();
    }
  } catch {
    // Fallback to RFC4122 math implementation below
  }

  // RFC4122 v4 compliant fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
