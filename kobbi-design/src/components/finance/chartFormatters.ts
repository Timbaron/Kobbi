import { formatNaira } from '../../utils/money';

export function formatNairaSafe(kobo: number, symbol: string, masked: boolean): string {
  return formatNaira(kobo, {
    symbol,
    masked,
    hideDecimalsIfWhole: true,
  });
}

export function formatCompactNairaSafe(kobo: number, symbol: string, masked: boolean): string {
  return formatNaira(kobo, {
    symbol,
    masked,
    compact: true,
  });
}
