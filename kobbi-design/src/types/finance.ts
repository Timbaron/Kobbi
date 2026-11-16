export type TransactionType = 'income' | 'expense' | 'transfer';

export type AccountType = 'cash' | 'bank' | 'mobile_money' | 'other';

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export type DateFormatOption = 'DD MMM YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

export type ThemeMode = 'light' | 'dark';

export type PrimaryTab = 'home' | 'transactions' | 'budgets' | 'goals' | 'insights';

export type SecondaryScreen = 'accounts' | 'recurring' | 'settings' | null;

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  openingBalanceKobo: number;
  color: string;
  archived: boolean;
  createdAtISO: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  iconName: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amountKobo: number;
  categoryId?: string;
  accountId: string;
  destinationAccountId?: string;
  dateISO: string; // Full ISO timestamp or YYYY-MM-DDTHH:mm
  title: string;
  notes?: string;
  createdAtISO: string;
  recurringSourceId?: string;
}

export interface BudgetAllocation {
  id: string;
  categoryId: string;
  mode: 'fixed' | 'percent';
  amountKobo: number; // Always resolved in integer kobo
  percentValue?: number; // 0 - 100 integer/decimal stored safely as basis points or number <= 100
}

export interface MonthlyBudget {
  monthKey: string; // YYYY-MM
  totalBudgetKobo: number;
  allocations: BudgetAllocation[];
}

export interface GoalContribution {
  id: string;
  amountKobo: number;
  dateISO: string;
  note?: string;
}

export type GoalStatus = 'active' | 'completed' | 'archived';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmountKobo: number;
  savedAmountKobo: number;
  targetDateISO: string; // YYYY-MM-DD
  iconName: string;
  color: string;
  status: GoalStatus;
  contributions: GoalContribution[];
  createdAtISO: string;
}

export interface RecurringTransaction {
  id: string;
  title: string;
  type: 'income' | 'expense';
  amountKobo: number;
  categoryId: string;
  accountId: string;
  frequency: RecurrenceFrequency;
  startDateISO: string; // YYYY-MM-DD
  endDateISO?: string; // YYYY-MM-DD
  nextDueDateISO: string; // YYYY-MM-DD
  status: 'active' | 'paused';
  autoRecord: boolean;
  notes?: string;
  lastRecordedDateISO?: string;
}

export interface AppSettings {
  userName: string;
  currencyCode: 'NGN' | 'USD' | 'GBP';
  currencySymbol: string;
  theme: ThemeMode;
  dateFormat: DateFormatOption;
  notificationsEnabled: boolean;
  budgetAlertThresholdPct: number;
  monthlyStartDay: number;
  defaultAccountId: string;
  hideBalances: boolean;
  appLockEnabled: boolean;
  biometricLockEnabled: boolean;
  onboardingCompleted: boolean;
  monthlyIncomeEstimateKobo?: number;
}

export interface FinanceState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Record<string, MonthlyBudget>; // keyed by YYYY-MM
  goals: SavingsGoal[];
  recurring: RecurringTransaction[];
  settings: AppSettings;
}
