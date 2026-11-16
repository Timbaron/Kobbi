import { DatabaseConnection } from '../connection/DatabaseConnection';
import { AppSettings, Category, FinanceState } from '../../types/finance';
import { getCurrentMonthKey, shiftMonthKey, toDateOnlyISO } from '../../utils/date';

export const DEFAULT_CATEGORIES: Category[] = [
  // Expense categories
  { id: 'cat-food', name: 'Food & Groceries', type: 'expense', iconName: 'Utensils', color: '#087F5B', isDefault: true },
  { id: 'cat-transport', name: 'Transportation', type: 'expense', iconName: 'Car', color: '#F59E0B', isDefault: true },
  { id: 'cat-power', name: 'Utilities & Power', type: 'expense', iconName: 'Zap', color: '#EA580C', isDefault: true },
  { id: 'cat-data', name: 'Airtime & Data', type: 'expense', iconName: 'Wifi', color: '#2563EB', isDefault: true },
  { id: 'cat-rent', name: 'Rent & Housing', type: 'expense', iconName: 'Home', color: '#7C3AED', isDefault: true },
  { id: 'cat-health', name: 'Health & Pharmacy', type: 'expense', iconName: 'HeartPulse', color: '#DC5C5C', isDefault: true },
  { id: 'cat-shopping', name: 'Shopping & Style', type: 'expense', iconName: 'ShoppingBag', color: '#DB2777', isDefault: true },
  { id: 'cat-leisure', name: 'Entertainment', type: 'expense', iconName: 'Film', color: '#4F46E5', isDefault: true },
  { id: 'cat-family', name: 'Family & Support', type: 'expense', iconName: 'Users', color: '#0D9488', isDefault: true },
  // Income categories
  { id: 'cat-salary', name: 'Monthly Salary', type: 'income', iconName: 'Briefcase', color: '#16A34A', isDefault: true },
  { id: 'cat-freelance', name: 'Freelance & Gigs', type: 'income', iconName: 'Laptop', color: '#087F5B', isDefault: true },
  { id: 'cat-business', name: 'Business Sales', type: 'income', iconName: 'Store', color: '#0D9488', isDefault: true },
  { id: 'cat-refund', name: 'Gifts & Refunds', type: 'income', iconName: 'Gift', color: '#7C3AED', isDefault: true },
];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  userName: 'Tunde',
  currencyCode: 'NGN',
  currencySymbol: '₦',
  theme: 'light',
  dateFormat: 'DD MMM YYYY',
  notificationsEnabled: true,
  budgetAlertThresholdPct: 80,
  monthlyStartDay: 1,
  defaultAccountId: 'acc-opay',
  hideBalances: false,
  appLockEnabled: false,
  biometricLockEnabled: false,
  onboardingCompleted: false,
  monthlyIncomeEstimateKobo: 485000 * 100,
};

const naira = (amount: number) => Math.round(amount * 100);

function isoDaysAgo(ref: Date, daysAgo: number, time = '10:30'): string {
  const d = new Date(ref);
  d.setDate(d.getDate() - daysAgo);
  return `${toDateOnlyISO(d)}T${time}:00`;
}

function isoDaysFromNow(ref: Date, daysAhead: number): string {
  const d = new Date(ref);
  d.setDate(d.getDate() + daysAhead);
  return toDateOnlyISO(d);
}

function isoMonthDay(monthKey: string, day: number, time = '09:15'): string {
  const dd = String(Math.min(28, Math.max(1, day))).padStart(2, '0');
  return `${monthKey}-${dd}T${time}:00`;
}

export async function seedInitialData(
  db: DatabaseConnection,
  includeDemoLedger = false
): Promise<void> {
  const now = new Date();
  const nowISO = now.toISOString();

  // 1. Seed Categories if empty
  const catCountRes = await db.execute('SELECT COUNT(*) as count FROM categories');
  if (catCountRes.rows[0]?.count === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await db.execute(
        `INSERT INTO categories (id, name, type, icon_name, color, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [cat.id, cat.name, cat.type, cat.iconName, cat.color, nowISO, nowISO]
      );
    }
  }

  // 2. Seed Settings if empty
  const settingsCountRes = await db.execute('SELECT COUNT(*) as count FROM app_settings');
  if (settingsCountRes.rows[0]?.count === 0) {
    for (const [key, val] of Object.entries(DEFAULT_APP_SETTINGS)) {
      await db.execute('INSERT INTO app_settings (key, value) VALUES (?, ?)', [
        key,
        JSON.stringify(val),
      ]);
    }
  }

  // 3. Seed Demo Data if requested
  if (includeDemoLedger) {
    const accCountRes = await db.execute('SELECT COUNT(*) as count FROM accounts');
    if (accCountRes.rows[0]?.count === 0) {
      await seedDemoLedger(db);
    }
  }
}

export async function seedDemoLedger(db: DatabaseConnection): Promise<void> {
  const now = new Date();
  const currMonth = getCurrentMonthKey(now);
  const prevMonth = shiftMonthKey(currMonth, -1);
  const twoMonthsAgo = shiftMonthKey(currMonth, -2);
  const threeMonthsAgo = shiftMonthKey(currMonth, -3);

  await db.transaction(async (tx) => {
    // Accounts
    const accounts = [
      { id: 'acc-gtb', name: 'GTBank Savings', institution: 'GTBank', type: 'bank', bal: naira(315000), color: '#C2410C' },
      { id: 'acc-opay', name: 'OPay Wallet', institution: 'OPay', type: 'mobile_money', bal: naira(64500), color: '#087F5B' },
      { id: 'acc-uba', name: 'UBA Current', institution: 'UBA', type: 'bank', bal: naira(192000), color: '#B91C1C' },
      { id: 'acc-cash', name: 'Cash on Hand', institution: 'Cash', type: 'cash', bal: naira(28500), color: '#101828' },
      { id: 'acc-palmpay', name: 'PalmPay', institution: 'PalmPay', type: 'mobile_money', bal: naira(39000), color: '#7C3AED' },
    ];

    for (const a of accounts) {
      await tx.execute(
        `INSERT OR REPLACE INTO accounts (id, name, institution, type, opening_balance_kobo, color, archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [a.id, a.name, a.institution, a.type, a.bal, a.color, isoMonthDay(threeMonthsAgo, 1), isoMonthDay(threeMonthsAgo, 1)]
      );
    }

    // Transactions
    const txs = [
      { id: 'tx-101', type: 'expense', amount: naira(14800), cat: 'cat-food', acc: 'acc-opay', dest: null, date: isoDaysAgo(now, 0, '13:20'), title: 'Bokku Mart Groceries', notes: 'Weekly rice, eggs, tomatoes, and cooking oil' },
      { id: 'tx-102', type: 'expense', amount: naira(4600), cat: 'cat-transport', acc: 'acc-opay', dest: null, date: isoDaysAgo(now, 0, '08:45'), title: 'Bolt Ride — Lekki to VI', notes: 'Morning client meeting commute' },
      { id: 'tx-103', type: 'income', amount: naira(135000), cat: 'cat-freelance', acc: 'acc-gtb', dest: null, date: isoDaysAgo(now, 1, '16:10'), title: 'Product Design Milestone', notes: 'Fintech onboarding audit invoice #019' },
      { id: 'tx-104', type: 'expense', amount: naira(18500), cat: 'cat-power', acc: 'acc-uba', dest: null, date: isoDaysAgo(now, 1, '11:05'), title: 'EKEDC Prepaid Meter Token', notes: 'Band A token recharge (92.4 kWh)' },
      { id: 'tx-105', type: 'transfer', amount: naira(60000), cat: null, acc: 'acc-gtb', dest: 'acc-opay', date: isoDaysAgo(now, 2, '09:30'), title: 'Top up OPay Weekly Spend', notes: 'Weekly pocket wallet allocation' },
      { id: 'tx-106', type: 'expense', amount: naira(11000), cat: 'cat-data', acc: 'acc-palmpay', dest: null, date: isoDaysAgo(now, 2, '18:40'), title: 'MTN 5G Broadband Renewal', notes: 'Monthly home router plan' },
      { id: 'tx-107', type: 'expense', amount: naira(8500), cat: 'cat-health', acc: 'acc-cash', dest: null, date: isoDaysAgo(now, 3, '15:15'), title: 'MedPlus Pharmacy', notes: 'Multivitamins & malaria test kit' },
      { id: 'tx-108', type: 'expense', amount: naira(22400), cat: 'cat-food', acc: 'acc-opay', dest: null, date: isoDaysAgo(now, 4, '19:50'), title: 'The Place Restaurant', notes: 'Dinner with friends in Ikeja GRA' },
      { id: 'tx-109', type: 'expense', amount: naira(36000), cat: 'cat-transport', acc: 'acc-uba', dest: null, date: isoDaysAgo(now, 5, '07:55'), title: 'TotalEnergies Fuel Fill-up', notes: 'Full tank petrol for the week' },
      { id: 'tx-110', type: 'expense', amount: naira(25000), cat: 'cat-family', acc: 'acc-gtb', dest: null, date: isoDaysAgo(now, 6, '12:00'), title: 'Mom Monthly Upkeep', notes: null },
      { id: 'tx-111', type: 'income', amount: naira(485000), cat: 'cat-salary', acc: 'acc-gtb', dest: null, date: isoMonthDay(currMonth, 1, '08:05'), title: 'November Salary Credit', notes: 'Net monthly salary' },
      { id: 'tx-112', type: 'expense', amount: naira(19500), cat: 'cat-shopping', acc: 'acc-opay', dest: null, date: isoMonthDay(currMonth, 3, '14:25'), title: 'Jumia Office Essentials', notes: 'USB-C hub & laptop stand' },
      { id: 'tx-113', type: 'expense', amount: naira(9200), cat: 'cat-leisure', acc: 'acc-palmpay', dest: null, date: isoMonthDay(currMonth, 6, '20:10'), title: 'Filmhouse IMAX Tickets', notes: null },
      { id: 'tx-114', type: 'expense', amount: naira(15000), cat: 'cat-food', acc: 'acc-cash', dest: null, date: isoMonthDay(currMonth, 8, '12:40'), title: 'Mile 12 Fresh Market Run', notes: null },
      { id: 'tx-115', type: 'expense', amount: naira(12500), cat: 'cat-transport', acc: 'acc-opay', dest: null, date: isoMonthDay(currMonth, 9, '17:20'), title: 'Uber & Cowry Card Top-up', notes: null },
      // Previous month
      { id: 'tx-201', type: 'income', amount: naira(485000), cat: 'cat-salary', acc: 'acc-gtb', dest: null, date: isoMonthDay(prevMonth, 1, '08:15'), title: 'October Salary Credit', notes: null },
      { id: 'tx-202', type: 'income', amount: naira(80000), cat: 'cat-freelance', acc: 'acc-uba', dest: null, date: isoMonthDay(prevMonth, 18, '16:00'), title: 'UI Wireframe Advisory', notes: null },
      { id: 'tx-203', type: 'expense', amount: naira(64000), cat: 'cat-food', acc: 'acc-opay', dest: null, date: isoMonthDay(prevMonth, 12, '14:00'), title: 'Monthly Supermarket Stock-up', notes: null },
      { id: 'tx-204', type: 'expense', amount: naira(48000), cat: 'cat-transport', acc: 'acc-uba', dest: null, date: isoMonthDay(prevMonth, 15, '09:00'), title: 'Fuel & Ride-Hailing', notes: null },
      { id: 'tx-205', type: 'expense', amount: naira(32000), cat: 'cat-power', acc: 'acc-uba', dest: null, date: isoMonthDay(prevMonth, 20, '10:30'), title: 'Generator Fuel & Units', notes: null },
      { id: 'tx-206', type: 'expense', amount: naira(45000), cat: 'cat-shopping', acc: 'acc-gtb', dest: null, date: isoMonthDay(prevMonth, 24, '15:45'), title: 'Work Sneakers & Shirts', notes: null },
      // Two months ago
      { id: 'tx-301', type: 'income', amount: naira(465000), cat: 'cat-salary', acc: 'acc-gtb', dest: null, date: isoMonthDay(twoMonthsAgo, 1, '08:10'), title: 'Monthly Salary Credit', notes: null },
      { id: 'tx-302', type: 'expense', amount: naira(198000), cat: 'cat-food', acc: 'acc-opay', dest: null, date: isoMonthDay(twoMonthsAgo, 14, '13:00'), title: 'Groceries, Power & Commute', notes: null },
      // Three months ago
      { id: 'tx-401', type: 'income', amount: naira(440000), cat: 'cat-salary', acc: 'acc-gtb', dest: null, date: isoMonthDay(threeMonthsAgo, 1, '08:10'), title: 'Monthly Salary Credit', notes: null },
      { id: 'tx-402', type: 'expense', amount: naira(175000), cat: 'cat-rent', acc: 'acc-gtb', dest: null, date: isoMonthDay(threeMonthsAgo, 5, '11:00'), title: 'Service Charge & Maintenance', notes: null },
    ];

    for (const t of txs) {
      await tx.execute(
        `INSERT OR REPLACE INTO transactions (id, type, amount_kobo, category_id, account_id, destination_account_id, date_iso, title, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.type, t.amount, t.cat, t.acc, t.dest, t.date, t.title, t.notes, t.date, t.date]
      );
    }

    // Budgets
    await tx.execute(
      `INSERT OR REPLACE INTO budgets (month_key, total_budget_kobo, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      [currMonth, naira(280000), now.toISOString(), now.toISOString()]
    );

    const allocations = [
      { id: 'alloc-food', cat: 'cat-food', mode: 'fixed', amount: naira(75000), pct: null },
      { id: 'alloc-transport', cat: 'cat-transport', mode: 'fixed', amount: naira(60000), pct: null },
      { id: 'alloc-power', cat: 'cat-power', mode: 'fixed', amount: naira(30000), pct: null },
      { id: 'alloc-data', cat: 'cat-data', mode: 'fixed', amount: naira(15000), pct: null },
      { id: 'alloc-family', cat: 'cat-family', mode: 'fixed', amount: naira(30000), pct: null },
      { id: 'alloc-shopping', cat: 'cat-shopping', mode: 'percent', amount: naira(28000), pct: 10 },
      { id: 'alloc-leisure', cat: 'cat-leisure', mode: 'fixed', amount: naira(15000), pct: null },
    ];

    for (const a of allocations) {
      await tx.execute(
        `INSERT OR REPLACE INTO budget_allocations (id, month_key, category_id, mode, amount_kobo, percent_value, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.id, currMonth, a.cat, a.mode, a.amount, a.pct, now.toISOString(), now.toISOString()]
      );
    }

    // Goals
    const goals = [
      {
        id: 'goal-emergency',
        name: 'Emergency Fund (6 Months)',
        target: naira(1500000),
        saved: naira(1140000),
        date: isoDaysFromNow(now, 140),
        icon: 'ShieldCheck',
        color: '#087F5B',
        entries: [
          { id: 'gc-1', amt: naira(850000), d: isoMonthDay(twoMonthsAgo, 2), note: 'Opening reserve' },
          { id: 'gc-2', amt: naira(145000), d: isoMonthDay(prevMonth, 4), note: 'October auto-save' },
          { id: 'gc-3', amt: naira(145000), d: isoMonthDay(currMonth, 2), note: 'November salary allocation' },
        ],
      },
      {
        id: 'goal-rent',
        name: 'Annual Apartment Rent',
        target: naira(1800000),
        saved: naira(960000),
        date: isoDaysFromNow(now, 185),
        icon: 'Home',
        color: '#7C3AED',
        entries: [
          { id: 'gc-4', amt: naira(800000), d: isoMonthDay(prevMonth, 1), note: 'Rent sinking fund' },
          { id: 'gc-5', amt: naira(160000), d: isoMonthDay(currMonth, 3), note: 'Monthly rent portion' },
        ],
      },
      {
        id: 'goal-laptop',
        name: 'MacBook Pro M4 Upgrade',
        target: naira(2400000),
        saved: naira(820000),
        date: isoDaysFromNow(now, 210),
        icon: 'Laptop',
        color: '#2563EB',
        entries: [
          { id: 'gc-6', amt: naira(620000), d: isoMonthDay(prevMonth, 19), note: 'Freelance proceeds' },
          { id: 'gc-7', amt: naira(200000), d: isoMonthDay(currMonth, 5), note: 'Design sprint bonus' },
        ],
      },
    ];

    for (const g of goals) {
      await tx.execute(
        `INSERT OR REPLACE INTO savings_goals (id, name, target_amount_kobo, saved_amount_kobo, target_date_iso, icon_name, color, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        [g.id, g.name, g.target, g.saved, g.date, g.icon, g.color, isoMonthDay(threeMonthsAgo, 1), now.toISOString()]
      );

      for (const e of g.entries) {
        await tx.execute(
          `INSERT OR REPLACE INTO savings_goal_entries (id, goal_id, amount_kobo, date_iso, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [e.id, g.id, e.amt, e.d, e.note, e.d]
        );
      }
    }

    // Recurring
    const recurring = [
      { id: 'rec-salary', title: 'Monthly Salary Credit', type: 'income', amt: naira(485000), cat: 'cat-salary', acc: 'acc-gtb', freq: 'monthly', start: isoMonthDay(threeMonthsAgo, 1).slice(0, 10), next: isoDaysFromNow(now, 15), notes: 'Employer payroll deposit' },
      { id: 'rec-internet', title: 'Spectranet / MTN Fibre Plan', type: 'expense', amt: naira(18500), cat: 'cat-data', acc: 'acc-opay', freq: 'monthly', start: isoMonthDay(twoMonthsAgo, 16).slice(0, 10), next: toDateOnlyISO(now), notes: 'Unlimited monthly data plan' },
      { id: 'rec-power', title: 'Estate Power & Security Levy', type: 'expense', amt: naira(15000), cat: 'cat-power', acc: 'acc-uba', freq: 'monthly', start: isoMonthDay(twoMonthsAgo, 20).slice(0, 10), next: isoDaysFromNow(now, 4), notes: 'Monthly estate service fee' },
      { id: 'rec-rent', title: 'Annual Rent Renewal', type: 'expense', amt: naira(1800000), cat: 'cat-rent', acc: 'acc-gtb', freq: 'yearly', start: isoMonthDay(threeMonthsAgo, 1).slice(0, 10), next: isoDaysFromNow(now, 185), notes: null },
    ];

    for (const r of recurring) {
      await tx.execute(
        `INSERT OR REPLACE INTO recurring_transactions (id, title, type, amount_kobo, category_id, account_id, frequency, start_date_iso, next_due_date_iso, status, auto_record, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, ?, ?)`,
        [r.id, r.title, r.type, r.amt, r.cat, r.acc, r.freq, r.start, r.next, r.notes, now.toISOString(), now.toISOString()]
      );
    }
  });
}
