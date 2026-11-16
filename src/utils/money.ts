/**
 * Integer-Kobo Financial Arithmetic & Formatting
 * ----------------------------------------------
 * Rules:
 * - All monetary values are stored and calculated strictly in integer kobo (100 kobo = 1 Naira).
 * - Never use floating-point arithmetic (e.g. parseFloat * 100) for money calculations.
 */

export function sanitizeIntegerKobo(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

/**
 * Parses a human-entered currency string (e.g. "25,400.50" or "12000")
 * into exact integer kobo using string splitting rather than float multiplication.
 */
export function parseNairaInputToKobo(rawInput: string): number {
  const cleaned = rawInput.replace(/[^\d.]/g, '');
  if (!cleaned) return 0;

  const parts = cleaned.split('.');
  const nairaStr = parts[0] || '0';
  const koboRaw = parts[1] || '';

  const nairaInt = parseInt(nairaStr, 10);
  if (Number.isNaN(nairaInt)) return 0;

  // Pad or truncate fractional part to exactly 2 digits
  const koboPadded = (koboRaw + '00').slice(0, 2);
  const koboInt = parseInt(koboPadded, 10) || 0;

  return nairaInt * 100 + koboInt;
}

/**
 * Converts integer kobo to a clean editable string (e.g. 125050 -> "1250.50", 125000 -> "1250").
 */
export function koboToEditableString(kobo: number): string {
  const safe = sanitizeIntegerKobo(Math.abs(kobo));
  const naira = Math.trunc(safe / 100);
  const remKobo = safe % 100;
  if (remKobo === 0) return String(naira);
  return `${naira}.${String(remKobo).padStart(2, '0')}`;
}

export interface FormatMoneyOptions {
  symbol?: string;
  showSign?: boolean;
  hideDecimalsIfWhole?: boolean;
  masked?: boolean;
  compact?: boolean;
}

/**
 * Formats integer kobo into a localized Naira string (e.g., ₦145,250.00).
 */
export function formatNaira(
  kobo: number,
  options: FormatMoneyOptions = {}
): string {
  const {
    symbol = '₦',
    showSign = false,
    hideDecimalsIfWhole = false,
    masked = false,
    compact = false,
  } = options;

  if (masked) {
    return `${symbol} ••••••`;
  }

  const safeKobo = sanitizeIntegerKobo(kobo);
  const isNegative = safeKobo < 0;
  const absKobo = Math.abs(safeKobo);

  const wholeNaira = Math.trunc(absKobo / 100);
  const remKobo = absKobo % 100;

  const signPrefix = isNegative ? '-' : showSign && safeKobo > 0 ? '+' : '';

  if (compact) {
    if (wholeNaira >= 1_000_000) {
      const tenths = Math.trunc(wholeNaira / 100_000);
      const major = Math.trunc(tenths / 10);
      const decimal = tenths % 10;
      return `${signPrefix}${symbol}${major}${decimal > 0 ? `.${decimal}` : ''}M`;
    }
    if (wholeNaira >= 10_000) {
      const tenths = Math.trunc(wholeNaira / 100);
      const major = Math.trunc(tenths / 10);
      const decimal = tenths % 10;
      return `${signPrefix}${symbol}${major}${decimal > 0 ? `.${decimal}` : ''}K`;
    }
  }

  const formattedWhole = wholeNaira.toLocaleString('en-NG');
  if (hideDecimalsIfWhole && remKobo === 0) {
    return `${signPrefix}${symbol}${formattedWhole}`;
  }

  const koboStr = String(remKobo).padStart(2, '0');
  return `${signPrefix}${symbol}${formattedWhole}.${koboStr}`;
}

/**
 * Computes integer percentage (0..100+ clamped or unclamped) from kobo values.
 */
export function computePercent(partKobo: number, totalKobo: number): number {
  if (totalKobo <= 0) return 0;
  return Math.round((partKobo * 100) / totalKobo);
}

/**
 * Resolves a percentage (e.g., 25%) of a total budget in integer kobo safely.
 */
export function percentageOfKobo(totalKobo: number, percent: number): number {
  const safeTotal = sanitizeIntegerKobo(totalKobo);
  const basisPoints = Math.round(percent * 100); // e.g., 25.5% -> 2550 bps
  return Math.round((safeTotal * basisPoints) / 10000);
}
