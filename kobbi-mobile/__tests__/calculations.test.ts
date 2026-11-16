import {
  computePercent,
  formatNaira,
  koboToEditableString,
  parseNairaInputToKobo,
  percentageOfKobo,
  sanitizeIntegerKobo,
} from '../src/utils/money';
import {
  addFrequencyToDate,
  daysBetween,
  formatDate,
  formatMonthLabel,
  getCurrentMonthKey,
  shiftMonthKey,
  toDateOnlyISO,
} from '../src/utils/date';
import {
  getAccountBalanceKobo,
  getBudgetSummary,
  getCashFlowSeries,
  getCategorySpendingForMonth,
  getMonthlyCashFlow,
  getTotalBalanceKobo,
} from '../src/utils/calculations';
import { Account, Category, MonthlyBudget, Transaction } from '../src/types/finance';

describe('Financial Calculation Precision & Edge Cases', () => {
  describe('Kobo Integer Arithmetic', () => {
    it('converts Naira amounts to exact integer kobo without floating point drift', () => {
      expect(parseNairaInputToKobo('1')).toBe(100);
      expect(parseNairaInputToKobo('0.01')).toBe(1);
      expect(parseNairaInputToKobo('0.1')).toBe(10);
      expect(parseNairaInputToKobo('0.2')).toBe(20);
      expect(parseNairaInputToKobo('0.30')).toBe(30);
      expect(parseNairaInputToKobo('485000.75')).toBe(48500075);
    });

    it('formats kobo to formatted Naira with correct symbols and thousands separators', () => {
      expect(formatNaira(100)).toBe('₦1.00');
      expect(formatNaira(100, { hideDecimalsIfWhole: true })).toBe('₦1');
      expect(formatNaira(48500000)).toBe('₦485,000.00');
      expect(formatNaira(48500000, { hideDecimalsIfWhole: true })).toBe('₦485,000');
      expect(formatNaira(0)).toBe('₦0.00');
      expect(formatNaira(0, { hideDecimalsIfWhole: true })).toBe('₦0');
      expect(formatNaira(50)).toBe('₦0.50');
    });

    it('handles negative kobo balances cleanly with signs', () => {
      expect(formatNaira(-150000)).toBe('-₦1,500.00');
      expect(formatNaira(-150000, { showSign: true })).toBe('-₦1,500.00');
      expect(formatNaira(150000, { showSign: true })).toBe('+₦1,500.00');
    });

    it('masks sensitive figures when hideBalances is true', () => {
      expect(formatNaira(48500000, { masked: true })).toBe('₦ ••••••');
      expect(formatNaira(-2500000, { masked: true, showSign: true })).toBe('₦ ••••••');
    });

    it('calculates basis point percentages without fractional loss', () => {
      const totalBudgetKobo = 28000000; // ₦280,000.00
      const foodKobo = percentageOfKobo(totalBudgetKobo, 25); // 25%
      const rentKobo = percentageOfKobo(totalBudgetKobo, 40); // 40%
      const savingsKobo = percentageOfKobo(totalBudgetKobo, 35); // 35%

      expect(foodKobo).toBe(7000000);
      expect(rentKobo).toBe(11200000);
      expect(savingsKobo).toBe(9800000);
      expect(foodKobo + rentKobo + savingsKobo).toBe(totalBudgetKobo);
    });

    it('sanitizes non-integer or malformed numbers to valid integer kobo', () => {
      expect(sanitizeIntegerKobo(100.9)).toBe(101);
      expect(sanitizeIntegerKobo(NaN)).toBe(0);
      expect(sanitizeIntegerKobo(Infinity)).toBe(0);
      expect(sanitizeIntegerKobo(-Infinity)).toBe(0);
    });

    it('parses user input strings to exact kobo', () => {
      expect(parseNairaInputToKobo('')).toBe(0);
      expect(parseNairaInputToKobo('1500')).toBe(150000);
      expect(parseNairaInputToKobo('₦1,500.50')).toBe(150050);
      expect(parseNairaInputToKobo('250.00')).toBe(25000);
    });
  });

  describe('High Volume Ledger Performance (10,000 Transactions)', () => {
    it('accurately computes 10,000 ledger transactions without memory pressure or precision loss', () => {
      const gtbAccount: Account = {
        id: 'acc-gtb',
        name: 'GTBank',
        institution: 'GTBank',
        type: 'bank',
        openingBalanceKobo: 10000000, // ₦100,000.00
        color: '#087F5B',
        archived: false,
        createdAtISO: '2026-01-01T00:00:00',
      };

      const opayAccount: Account = {
        id: 'acc-opay',
        name: 'OPay',
        institution: 'OPay',
        type: 'mobile_money',
        openingBalanceKobo: 5000000, // ₦50,000.00
        color: '#16A34A',
        archived: false,
        createdAtISO: '2026-01-01T00:00:00',
      };

      const accounts: Account[] = [gtbAccount, opayAccount];
      const transactions: Transaction[] = [];
      const startTime = performance.now();

      // Generate 10,000 alternating transactions:
      // 5,000 income credits of ₦1,000.00 (100,000 kobo)
      // 3,000 expense debits of ₦500.00 (50,000 kobo)
      // 2,000 transfers from GTB to OPay of ₦200.00 (20,000 kobo)
      for (let i = 0; i < 5000; i++) {
        transactions.push({
          id: `tx-in-${i}`,
          type: 'income',
          amountKobo: 100000,
          accountId: 'acc-gtb',
          dateISO: '2026-05-15T10:00:00',
          title: `Income ${i}`,
          createdAtISO: '2026-05-15T10:00:00',
        });
      }

      for (let i = 0; i < 3000; i++) {
        transactions.push({
          id: `tx-out-${i}`,
          type: 'expense',
          amountKobo: 50000,
          accountId: 'acc-gtb',
          dateISO: '2026-05-15T11:00:00',
          title: `Expense ${i}`,
          createdAtISO: '2026-05-15T11:00:00',
        });
      }

      for (let i = 0; i < 2000; i++) {
        transactions.push({
          id: `tx-tr-${i}`,
          type: 'transfer',
          amountKobo: 20000,
          accountId: 'acc-gtb',
          destinationAccountId: 'acc-opay',
          dateISO: '2026-05-15T12:00:00',
          title: `Transfer ${i}`,
          createdAtISO: '2026-05-15T12:00:00',
        });
      }

      const gtbBalance = getAccountBalanceKobo(gtbAccount, transactions);
      const opayBalance = getAccountBalanceKobo(opayAccount, transactions);
      const totalBalance = getTotalBalanceKobo(accounts, transactions);
      const durationMs = performance.now() - startTime;

      // GTBank balance:
      // Opening: 10,000,000
      // Income: + (5,000 * 100,000) = + 500,000,000
      // Expense: - (3,000 * 50,000) = - 150,000,000
      // Outgoing Transfer: - (2,000 * 20,000) = - 40,000,000
      // Expected = 10,000,000 + 500,000,000 - 150,000,000 - 40,000,000 = 320,000,000 kobo (₦3,200,000.00)
      expect(gtbBalance).toBe(320000000);

      // OPay balance:
      // Opening: 5,000,000
      // Incoming Transfer: + (2,000 * 20,000) = + 40,000,000
      // Expected = 45,000,000 kobo (₦450,000.00)
      expect(opayBalance).toBe(45000000);

      // Total money in system must equal opening sum + net income
      const initialTotal = 15000000;
      const netIncomeTotal = 500000000 - 150000000; // 350,000,000
      expect(totalBalance).toBe(initialTotal + netIncomeTotal);

      // Must complete in under 500ms
      expect(durationMs).toBeLessThan(500);
    });
  });

  describe('Calendar & Leap Year Boundary Math', () => {
    it('correctly increments recurring transactions on leap years (February 29)', () => {
      // 2024 is a leap year
      const leapDay = '2024-02-29';
      const nextDay = addFrequencyToDate(leapDay, 'daily');
      expect(nextDay).toBe('2024-03-01');

      const nextWeek = addFrequencyToDate(leapDay, 'weekly');
      expect(nextWeek).toBe('2024-03-07');

      // Adding 1 year to Feb 29 2024 shifts cleanly to Feb 28 2025
      const nextYear = addFrequencyToDate(leapDay, 'yearly');
      expect(nextYear).toBe('2025-02-28');

      // Adding 1 month shifts cleanly to Mar 29 2024
      const nextMonth = addFrequencyToDate('2024-02-29', 'monthly');
      expect(nextMonth).toBe('2024-03-29');
    });

    it('correctly handles month end rollover (Day 31 to Day 30 / Day 28)', () => {
      // Jan 31 + 1 month -> Feb 28 (on non-leap year 2023)
      const jan31 = '2023-01-31';
      const feb = addFrequencyToDate(jan31, 'monthly');
      expect(feb).toBe('2023-02-28');

      // Aug 31 + 1 month -> Sep 30
      const aug31 = '2026-08-31';
      const sep = addFrequencyToDate(aug31, 'monthly');
      expect(sep).toBe('2026-09-30');
    });

    it('correctly shifts month keys across year boundaries', () => {
      expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
      expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
      expect(shiftMonthKey('2026-06', -6)).toBe('2025-12');
      expect(shiftMonthKey('2026-06', 12)).toBe('2027-06');
    });

    it('calculates days between dates accurately across months and years', () => {
      expect(daysBetween('2026-01-01', '2026-01-10')).toBe(9);
      expect(daysBetween('2025-12-30', '2026-01-02')).toBe(3);
      expect(daysBetween('2026-01-10', '2026-01-01')).toBe(-9);
    });
  });

  describe('Budget Tracking & Over-Budget Calculations', () => {
    const categories: Category[] = [
      { id: 'cat-food', name: 'Food', type: 'expense', iconName: 'Utensils', color: '#087F5B' },
      { id: 'cat-transit', name: 'Transit', type: 'expense', iconName: 'Car', color: '#F59E0B' },
    ];

    it('calculates budget utilization and detects over-budget situations correctly', () => {
      const budget: MonthlyBudget = {
        monthKey: '2026-11',
        totalBudgetKobo: 10000000, // ₦100,000.00
        allocations: [
          { id: 'a1', categoryId: 'cat-food', mode: 'fixed', amountKobo: 6000000 }, // ₦60,000.00
          { id: 'a2', categoryId: 'cat-transit', mode: 'fixed', amountKobo: 4000000 }, // ₦40,000.00
        ],
      };

      const transactions: Transaction[] = [
        {
          id: 't1',
          type: 'expense',
          amountKobo: 5000000, // ₦50,000.00 spent on food
          categoryId: 'cat-food',
          accountId: 'acc-1',
          dateISO: '2026-11-05T12:00:00',
          title: 'Food spend',
          createdAtISO: '2026-11-05T12:00:00',
        },
        {
          id: 't2',
          type: 'expense',
          amountKobo: 6000000, // ₦60,000.00 spent on transit (over ₦40k budget!)
          categoryId: 'cat-transit',
          accountId: 'acc-1',
          dateISO: '2026-11-10T12:00:00',
          title: 'Transit spend',
          createdAtISO: '2026-11-10T12:00:00',
        },
      ];

      const summary = getBudgetSummary(budget, transactions, categories, '2026-11');

      expect(summary.hasBudget).toBe(true);
      expect(summary.totalBudgetKobo).toBe(10000000);
      expect(summary.totalSpentKobo).toBe(11000000); // ₦110,000 total
      expect(summary.isOverBudget).toBe(true);
      expect(summary.remainingBudgetKobo).toBe(-1000000); // -₦10,000.00 deficit
      expect(summary.percentUsed).toBe(110);

      // Verify category allocation breakdown
      const transitAlloc = summary.categories.find((c) => c.categoryId === 'cat-transit');
      expect(transitAlloc).toBeDefined();
      expect(transitAlloc?.isOverspent).toBe(true);
      expect(transitAlloc?.remainingKobo).toBe(-2000000); // -₦20,000.00
      expect(transitAlloc?.percentUsed).toBe(150); // 150% used
    });
  });
});
