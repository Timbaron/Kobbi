import { Share, Platform } from 'react-native';
import { Account, Category, Transaction, BudgetAllocation } from '../../types/finance';

/**
 * Escapes an RFC 4180 CSV cell value.
 * Wraps values with double quotes if they contain commas, double quotes, or newlines.
 */
function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export class CsvExportService {
  /**
   * Generates standard RFC 4180 CSV for all transactions.
   */
  public static generateTransactionsCsv(
    transactions: Transaction[],
    accounts: Account[],
    categories: Category[]
  ): string {
    const accountMap = new Map<string, string>();
    for (const a of accounts) {
      accountMap.set(a.id, a.name);
    }

    const categoryMap = new Map<string, string>();
    for (const c of categories) {
      categoryMap.set(c.id, c.name);
    }

    const headers = [
      'Transaction ID',
      'Date (ISO)',
      'Type',
      'Title',
      'Category',
      'Account',
      'Destination Account',
      'Amount (Naira)',
      'Amount (Kobo)',
      'Notes',
    ];

    const rows = [...transactions]
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
      .map((tx) => {
        const catName = tx.categoryId ? (categoryMap.get(tx.categoryId) || 'Other') : '';
        const accName = accountMap.get(tx.accountId) || 'Unknown Account';
        const destAccName = tx.destinationAccountId ? (accountMap.get(tx.destinationAccountId) || '') : '';
        const nairaVal = (tx.amountKobo / 100).toFixed(2);

        return [
          escapeCsv(tx.id),
          escapeCsv(tx.dateISO),
          escapeCsv(tx.type),
          escapeCsv(tx.title),
          escapeCsv(catName),
          escapeCsv(accName),
          escapeCsv(destAccName),
          escapeCsv(nairaVal),
          escapeCsv(tx.amountKobo),
          escapeCsv(tx.notes || ''),
        ].join(',');
      });

    return [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * Generates standard RFC 4180 CSV for accounts and calculated balances.
   */
  public static generateAccountsCsv(
    accounts: Account[],
    balances: Record<string, number>
  ): string {
    const headers = [
      'Account ID',
      'Name',
      'Institution',
      'Type',
      'Opening Balance (Naira)',
      'Current Balance (Naira)',
      'Current Balance (Kobo)',
      'Archived',
    ];

    const rows = accounts.map((acc) => {
      const currentKobo = balances[acc.id] ?? acc.openingBalanceKobo;
      return [
        escapeCsv(acc.id),
        escapeCsv(acc.name),
        escapeCsv(acc.institution),
        escapeCsv(acc.type),
        escapeCsv((acc.openingBalanceKobo / 100).toFixed(2)),
        escapeCsv((currentKobo / 100).toFixed(2)),
        escapeCsv(currentKobo),
        escapeCsv(acc.archived ? 'true' : 'false'),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * Generates standard RFC 4180 CSV for monthly budget performance.
   */
  public static generateBudgetCsv(
    monthKey: string,
    allocations: BudgetAllocation[],
    categories: Category[],
    spentMap: Record<string, number>
  ): string {
    const categoryMap = new Map<string, string>();
    for (const c of categories) {
      categoryMap.set(c.id, c.name);
    }

    const headers = [
      'Month',
      'Category',
      'Mode',
      'Allocated (Naira)',
      'Spent (Naira)',
      'Remaining (Naira)',
      'Percent Used (%)',
    ];

    const rows = allocations.map((a) => {
      const catName = categoryMap.get(a.categoryId) || 'Unknown';
      const allocatedKobo = a.amountKobo;
      const spentKobo = spentMap[a.categoryId] || 0;
      const remainingKobo = allocatedKobo - spentKobo;
      const pct = allocatedKobo > 0 ? Math.round((spentKobo / allocatedKobo) * 100) : 0;

      return [
        escapeCsv(monthKey),
        escapeCsv(catName),
        escapeCsv(a.mode),
        escapeCsv((allocatedKobo / 100).toFixed(2)),
        escapeCsv((spentKobo / 100).toFixed(2)),
        escapeCsv((remainingKobo / 100).toFixed(2)),
        escapeCsv(`${pct}%`),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * Invokes native sharing sheet for a CSV document.
   */
  public static async shareCsv(
    csvContent: string,
    filename: string,
    title: string = 'Kobbi Financial Statement'
  ): Promise<boolean> {
    try {
      const result = await Share.share(
        Platform.select({
          ios: {
            url: `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`,
            message: title,
          },
          default: {
            title,
            message: csvContent,
          },
        })
      );
      return result.action !== Share.dismissedAction;
    } catch {
      return false;
    }
  }
}
