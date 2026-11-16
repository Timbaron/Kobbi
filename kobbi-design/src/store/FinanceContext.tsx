import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createSeedFinanceState } from '../data/seedData';
import {
  Account,
  AppSettings,
  BudgetAllocation,
  Category,
  FinanceState,
  MonthlyBudget,
  RecurringTransaction,
  SavingsGoal,
  Transaction,
} from '../types/finance';
import { addFrequencyToDate, getCurrentMonthKey, toDateOnlyISO } from '../utils/date';
import { percentageOfKobo, sanitizeIntegerKobo } from '../utils/money';

const STORAGE_KEY = 'kolo_finance_prototype_v1';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface FinanceContextValue {
  state: FinanceState;
  toast: ToastMessage | null;
  showToast: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: () => void;

  // Onboarding
  completeOnboarding: (payload: {
    userName: string;
    currencyCode: AppSettings['currencyCode'];
    currencySymbol: string;
    startingBalanceKobo?: number;
    monthlyIncomeKobo?: number;
    initialBudgetKobo?: number;
    skipToDemo?: boolean;
  }) => void;
  replayOnboarding: () => void;

  // Transactions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAtISO'>) => { ok: boolean; error?: string };
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id' | 'createdAtISO'>>) => { ok: boolean; error?: string };
  deleteTransaction: (id: string) => void;

  // Accounts
  addAccount: (acc: Omit<Account, 'id' | 'createdAtISO' | 'archived'>) => void;
  updateAccount: (id: string, patch: Partial<Omit<Account, 'id' | 'createdAtISO'>>) => void;
  toggleArchiveAccount: (id: string) => void;

  // Budgets
  setMonthlyBudgetTotal: (monthKey: string, totalBudgetKobo: number) => void;
  upsertBudgetAllocation: (
    monthKey: string,
    allocation: Omit<BudgetAllocation, 'id'> & { id?: string }
  ) => { ok: boolean; error?: string };
  deleteBudgetAllocation: (monthKey: string, allocationId: string) => void;

  // Savings Goals
  addGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAtISO' | 'contributions' | 'savedAmountKobo' | 'status'>) => void;
  updateGoal: (id: string, patch: Partial<Pick<SavingsGoal, 'name' | 'targetAmountKobo' | 'targetDateISO' | 'iconName' | 'color'>>) => void;
  contributeToGoal: (goalId: string, amountKobo: number, note?: string) => { ok: boolean; error?: string };
  setGoalStatus: (goalId: string, status: SavingsGoal['status']) => void;
  deleteGoal: (goalId: string) => void;

  // Recurring Transactions
  addRecurring: (rec: Omit<RecurringTransaction, 'id'>) => void;
  updateRecurring: (id: string, patch: Partial<Omit<RecurringTransaction, 'id'>>) => void;
  toggleRecurringStatus: (id: string) => void;
  recordRecurringOccurrence: (id: string) => { ok: boolean; error?: string };
  deleteRecurring: (id: string) => void;

  // Categories & Settings
  addCategory: (cat: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => { ok: boolean; error?: string };
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Data Management
  exportJsonBackup: () => string;
  importJsonBackup: (rawJson: string) => { ok: boolean; error?: string };
  resetDemoData: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadInitialState(): FinanceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FinanceState;
      if (parsed && Array.isArray(parsed.accounts) && Array.isArray(parsed.transactions) && parsed.settings) {
        return parsed;
      }
    }
  } catch {
    // Fallback cleanly to seed data
  }
  return createSeedFinanceState(false);
}

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<FinanceState>(loadInitialState);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const lastTxSignatureRef = useRef<{ sig: string; ts: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors in private mode
    }
  }, [state]);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ id: generateId('toast'), type, message });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const completeOnboarding: FinanceContextValue['completeOnboarding'] = useCallback(
    (payload) => {
      if (payload.skipToDemo) {
        setState((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            onboardingCompleted: true,
          },
        }));
        showToast('Welcome to Kobbi! Sample ledger loaded.', 'info');
        return;
      }

      const currMonth = getCurrentMonthKey();
      setState((prev) => {
        const nextAccounts = prev.accounts.map((acc, idx) => {
          if (idx === 0 && payload.startingBalanceKobo !== undefined) {
            return {
              ...acc,
              openingBalanceKobo: sanitizeIntegerKobo(payload.startingBalanceKobo),
            };
          }
          return acc;
        });

        const nextBudgets = { ...prev.budgets };
        if (payload.initialBudgetKobo && payload.initialBudgetKobo > 0) {
          const existing = nextBudgets[currMonth];
          const newTotal = sanitizeIntegerKobo(payload.initialBudgetKobo);
          nextBudgets[currMonth] = existing
            ? {
                ...existing,
                totalBudgetKobo: newTotal,
                allocations: existing.allocations.map((a) =>
                  a.mode === 'percent' && a.percentValue !== undefined
                    ? { ...a, amountKobo: percentageOfKobo(newTotal, a.percentValue) }
                    : a
                ),
              }
            : {
                monthKey: currMonth,
                totalBudgetKobo: newTotal,
                allocations: [],
              };
        }

        return {
          ...prev,
          accounts: nextAccounts,
          budgets: nextBudgets,
          settings: {
            ...prev.settings,
            userName: payload.userName.trim() || prev.settings.userName,
            currencyCode: payload.currencyCode,
            currencySymbol: payload.currencySymbol,
            monthlyIncomeEstimateKobo:
              payload.monthlyIncomeKobo !== undefined
                ? sanitizeIntegerKobo(payload.monthlyIncomeKobo)
                : prev.settings.monthlyIncomeEstimateKobo,
            onboardingCompleted: true,
          },
        };
      });
      showToast('Kobbi is ready. Your money, your clarity.');
    },
    [showToast]
  );

  const replayOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, onboardingCompleted: false },
    }));
  }, []);

  const addTransaction: FinanceContextValue['addTransaction'] = useCallback(
    (tx) => {
      const amountKobo = sanitizeIntegerKobo(tx.amountKobo);
      if (amountKobo <= 0) {
        return { ok: false, error: 'Amount must be greater than zero.' };
      }
      if (tx.type === 'transfer' && tx.accountId === tx.destinationAccountId) {
        return { ok: false, error: 'Source and destination accounts must be different.' };
      }
      if (tx.type !== 'transfer' && !tx.categoryId) {
        return { ok: false, error: 'Please select a category.' };
      }
      if (!tx.title.trim()) {
        return { ok: false, error: 'Please enter a short description.' };
      }

      // Duplicate submission guard within 1.5s
      const sig = `${tx.type}|${amountKobo}|${tx.accountId}|${tx.destinationAccountId || ''}|${tx.title.trim()}|${tx.dateISO}`;
      const nowMs = Date.now();
      if (lastTxSignatureRef.current && lastTxSignatureRef.current.sig === sig && nowMs - lastTxSignatureRef.current.ts < 1500) {
        return { ok: false, error: 'Duplicate transaction prevented.' };
      }
      lastTxSignatureRef.current = { sig, ts: nowMs };

      const newTx: Transaction = {
        ...tx,
        id: generateId('tx'),
        amountKobo,
        title: tx.title.trim(),
        notes: tx.notes?.trim() || undefined,
        categoryId: tx.type === 'transfer' ? undefined : tx.categoryId,
        destinationAccountId: tx.type === 'transfer' ? tx.destinationAccountId : undefined,
        createdAtISO: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        transactions: [newTx, ...prev.transactions],
      }));

      showToast(
        tx.type === 'transfer'
          ? 'Transfer recorded between accounts'
          : tx.type === 'income'
          ? 'Income recorded'
          : 'Expense recorded'
      );
      return { ok: true };
    },
    [showToast]
  );

  const updateTransaction: FinanceContextValue['updateTransaction'] = useCallback(
    (id, patch) => {
      if (patch.amountKobo !== undefined && sanitizeIntegerKobo(patch.amountKobo) <= 0) {
        return { ok: false, error: 'Amount must be greater than zero.' };
      }
      const nextType = patch.type;
      if (nextType === 'transfer' && patch.accountId && patch.accountId === patch.destinationAccountId) {
        return { ok: false, error: 'Source and destination accounts must be different.' };
      }

      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) => {
          if (t.id !== id) return t;
          const mergedType = patch.type ?? t.type;
          return {
            ...t,
            ...patch,
            amountKobo: patch.amountKobo !== undefined ? sanitizeIntegerKobo(patch.amountKobo) : t.amountKobo,
            title: patch.title !== undefined ? patch.title.trim() : t.title,
            categoryId: mergedType === 'transfer' ? undefined : patch.categoryId ?? t.categoryId,
            destinationAccountId:
              mergedType === 'transfer' ? patch.destinationAccountId ?? t.destinationAccountId : undefined,
          };
        }),
      }));
      showToast('Transaction updated');
      return { ok: true };
    },
    [showToast]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== id),
      }));
      showToast('Transaction deleted', 'info');
    },
    [showToast]
  );

  const addAccount: FinanceContextValue['addAccount'] = useCallback(
    (acc) => {
      const newAcc: Account = {
        ...acc,
        id: generateId('acc'),
        openingBalanceKobo: sanitizeIntegerKobo(acc.openingBalanceKobo),
        archived: false,
        createdAtISO: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        accounts: [...prev.accounts, newAcc],
      }));
      showToast(`${acc.name} account added`);
    },
    [showToast]
  );

  const updateAccount: FinanceContextValue['updateAccount'] = useCallback(
    (id, patch) => {
      setState((prev) => ({
        ...prev,
        accounts: prev.accounts.map((a) =>
          a.id === id
            ? {
                ...a,
                ...patch,
                openingBalanceKobo:
                  patch.openingBalanceKobo !== undefined
                    ? sanitizeIntegerKobo(patch.openingBalanceKobo)
                    : a.openingBalanceKobo,
              }
            : a
        ),
      }));
      showToast('Account updated');
    },
    [showToast]
  );

  const toggleArchiveAccount = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.accounts.find((a) => a.id === id);
        if (!target) return prev;
        const nextArchived = !target.archived;
        showToast(nextArchived ? `${target.name} archived` : `${target.name} restored`, 'info');
        return {
          ...prev,
          accounts: prev.accounts.map((a) => (a.id === id ? { ...a, archived: nextArchived } : a)),
        };
      });
    },
    [showToast]
  );

  const setMonthlyBudgetTotal = useCallback(
    (monthKey: string, totalBudgetKobo: number) => {
      const safeTotal = Math.max(0, sanitizeIntegerKobo(totalBudgetKobo));
      setState((prev) => {
        const existing: MonthlyBudget = prev.budgets[monthKey] || {
          monthKey,
          totalBudgetKobo: 0,
          allocations: [],
        };
        const updatedAllocations = existing.allocations.map((alloc) =>
          alloc.mode === 'percent' && alloc.percentValue !== undefined
            ? { ...alloc, amountKobo: percentageOfKobo(safeTotal, alloc.percentValue) }
            : alloc
        );
        return {
          ...prev,
          budgets: {
            ...prev.budgets,
            [monthKey]: {
              ...existing,
              totalBudgetKobo: safeTotal,
              allocations: updatedAllocations,
            },
          },
        };
      });
      showToast('Monthly budget updated');
    },
    [showToast]
  );

  const upsertBudgetAllocation: FinanceContextValue['upsertBudgetAllocation'] = useCallback(
    (monthKey, allocation) => {
      const existingBudget = state.budgets[monthKey];
      if (!existingBudget || existingBudget.totalBudgetKobo <= 0) {
        return { ok: false, error: 'Set a total monthly budget before allocating categories.' };
      }

      const resolvedKobo =
        allocation.mode === 'percent' && allocation.percentValue !== undefined
          ? percentageOfKobo(existingBudget.totalBudgetKobo, allocation.percentValue)
          : sanitizeIntegerKobo(allocation.amountKobo);

      if (resolvedKobo <= 0) {
        return { ok: false, error: 'Allocation must be greater than zero.' };
      }

      const otherAllocatedKobo = existingBudget.allocations
        .filter((a) => a.id !== allocation.id && a.categoryId !== allocation.categoryId)
        .reduce((sum, a) => sum + a.amountKobo, 0);

      if (otherAllocatedKobo + resolvedKobo > existingBudget.totalBudgetKobo) {
        const available = Math.max(0, existingBudget.totalBudgetKobo - otherAllocatedKobo);
        return {
          ok: false,
          error: `Exceeds unallocated budget. Only ${state.settings.currencySymbol}${(available / 100).toLocaleString('en-NG')} available.`,
        };
      }

      setState((prev) => {
        const budget = prev.budgets[monthKey];
        if (!budget) return prev;
        const matchIdx = budget.allocations.findIndex(
          (a) => (allocation.id && a.id === allocation.id) || a.categoryId === allocation.categoryId
        );
        const nextAlloc: BudgetAllocation = {
          id: allocation.id || (matchIdx >= 0 ? budget.allocations[matchIdx].id : generateId('alloc')),
          categoryId: allocation.categoryId,
          mode: allocation.mode,
          amountKobo: resolvedKobo,
          percentValue: allocation.mode === 'percent' ? allocation.percentValue : undefined,
        };
        const nextAllocations =
          matchIdx >= 0
            ? budget.allocations.map((a, idx) => (idx === matchIdx ? nextAlloc : a))
            : [...budget.allocations, nextAlloc];

        return {
          ...prev,
          budgets: {
            ...prev.budgets,
            [monthKey]: {
              ...budget,
              allocations: nextAllocations,
            },
          },
        };
      });

      showToast('Your budget is ready. Every kobo now has a purpose.');
      return { ok: true };
    },
    [state.budgets, state.settings.currencySymbol, showToast]
  );

  const deleteBudgetAllocation = useCallback(
    (monthKey: string, allocationId: string) => {
      setState((prev) => {
        const budget = prev.budgets[monthKey];
        if (!budget) return prev;
        return {
          ...prev,
          budgets: {
            ...prev.budgets,
            [monthKey]: {
              ...budget,
              allocations: budget.allocations.filter((a) => a.id !== allocationId),
            },
          },
        };
      });
      showToast('Allocation removed', 'info');
    },
    [showToast]
  );

  const addGoal: FinanceContextValue['addGoal'] = useCallback(
    (goal) => {
      const newGoal: SavingsGoal = {
        ...goal,
        id: generateId('goal'),
        targetAmountKobo: sanitizeIntegerKobo(goal.targetAmountKobo),
        savedAmountKobo: 0,
        status: 'active',
        contributions: [],
        createdAtISO: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        goals: [newGoal, ...prev.goals],
      }));
      showToast(`Savings goal "${goal.name}" created`);
    },
    [showToast]
  );

  const updateGoal: FinanceContextValue['updateGoal'] = useCallback(
    (id, patch) => {
      setState((prev) => ({
        ...prev,
        goals: prev.goals.map((g) =>
          g.id === id
            ? {
                ...g,
                ...patch,
                targetAmountKobo:
                  patch.targetAmountKobo !== undefined
                    ? sanitizeIntegerKobo(patch.targetAmountKobo)
                    : g.targetAmountKobo,
              }
            : g
        ),
      }));
      showToast('Goal updated');
    },
    [showToast]
  );

  const contributeToGoal: FinanceContextValue['contributeToGoal'] = useCallback(
    (goalId, amountKobo, note) => {
      const safeAmount = sanitizeIntegerKobo(amountKobo);
      if (safeAmount <= 0) {
        return { ok: false, error: 'Contribution must be greater than zero.' };
      }
      setState((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => {
          if (g.id !== goalId) return g;
          const nextSaved = g.savedAmountKobo + safeAmount;
          const nextStatus = nextSaved >= g.targetAmountKobo ? 'completed' : g.status;
          return {
            ...g,
            savedAmountKobo: nextSaved,
            status: nextStatus,
            contributions: [
              {
                id: generateId('gc'),
                amountKobo: safeAmount,
                dateISO: toDateOnlyISO(new Date()),
                note: note?.trim() || undefined,
              },
              ...g.contributions,
            ],
          };
        }),
      }));
      showToast('Contribution added to goal tracker');
      return { ok: true };
    },
    [showToast]
  );

  const setGoalStatus = useCallback(
    (goalId: string, status: SavingsGoal['status']) => {
      setState((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => (g.id === goalId ? { ...g, status } : g)),
      }));
      showToast(`Goal marked as ${status}`, 'info');
    },
    [showToast]
  );

  const deleteGoal = useCallback(
    (goalId: string) => {
      setState((prev) => ({
        ...prev,
        goals: prev.goals.filter((g) => g.id !== goalId),
      }));
      showToast('Goal deleted', 'info');
    },
    [showToast]
  );

  const addRecurring: FinanceContextValue['addRecurring'] = useCallback(
    (rec) => {
      const newRec: RecurringTransaction = {
        ...rec,
        id: generateId('rec'),
        amountKobo: sanitizeIntegerKobo(rec.amountKobo),
      };
      setState((prev) => ({
        ...prev,
        recurring: [newRec, ...prev.recurring],
      }));
      showToast('Recurring schedule added');
    },
    [showToast]
  );

  const updateRecurring: FinanceContextValue['updateRecurring'] = useCallback(
    (id, patch) => {
      setState((prev) => ({
        ...prev,
        recurring: prev.recurring.map((r) =>
          r.id === id
            ? {
                ...r,
                ...patch,
                amountKobo:
                  patch.amountKobo !== undefined ? sanitizeIntegerKobo(patch.amountKobo) : r.amountKobo,
              }
            : r
        ),
      }));
      showToast('Schedule updated');
    },
    [showToast]
  );

  const toggleRecurringStatus = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.recurring.find((r) => r.id === id);
        if (!target) return prev;
        const nextStatus = target.status === 'active' ? 'paused' : 'active';
        showToast(nextStatus === 'paused' ? 'Schedule paused' : 'Schedule resumed', 'info');
        return {
          ...prev,
          recurring: prev.recurring.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)),
        };
      });
    },
    [showToast]
  );

  const recordRecurringOccurrence: FinanceContextValue['recordRecurringOccurrence'] = useCallback(
    (id) => {
      const target = state.recurring.find((r) => r.id === id);
      if (!target) return { ok: false, error: 'Schedule not found.' };

      const todayStr = toDateOnlyISO(new Date());
      // Prevent accidental duplicate recording for the same due cycle
      const alreadyRecorded = state.transactions.some(
        (t) => t.recurringSourceId === target.id && t.dateISO.slice(0, 10) === target.nextDueDateISO
      );
      if (alreadyRecorded) {
        return { ok: false, error: 'This occurrence has already been recorded.' };
      }

      const nowTime = new Date().toTimeString().slice(0, 5);
      const txDateISO = `${todayStr}T${nowTime}`;
      const nextDue = addFrequencyToDate(target.nextDueDateISO, target.frequency);

      const newTx: Transaction = {
        id: generateId('tx'),
        type: target.type,
        amountKobo: target.amountKobo,
        categoryId: target.categoryId,
        accountId: target.accountId,
        dateISO: txDateISO,
        title: target.title,
        notes: target.notes ? `${target.notes} (Scheduled)` : 'Recorded from recurring schedule',
        createdAtISO: new Date().toISOString(),
        recurringSourceId: target.id,
      };

      setState((prev) => ({
        ...prev,
        transactions: [newTx, ...prev.transactions],
        recurring: prev.recurring.map((r) =>
          r.id === id
            ? {
                ...r,
                lastRecordedDateISO: todayStr,
                nextDueDateISO: nextDue,
              }
            : r
        ),
      }));

      showToast(`"${target.title}" recorded to ledger`);
      return { ok: true };
    },
    [state.recurring, state.transactions, showToast]
  );

  const deleteRecurring = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        recurring: prev.recurring.filter((r) => r.id !== id),
      }));
      showToast('Recurring schedule removed', 'info');
    },
    [showToast]
  );

  const addCategory: FinanceContextValue['addCategory'] = useCallback(
    (cat) => {
      const newCat: Category = {
        ...cat,
        id: generateId('cat'),
      };
      setState((prev) => ({
        ...prev,
        categories: [...prev.categories, newCat],
      }));
      showToast(`Category "${cat.name}" added`);
    },
    [showToast]
  );

  const deleteCategory: FinanceContextValue['deleteCategory'] = useCallback(
    (id) => {
      const inUse = state.transactions.some((t) => t.categoryId === id);
      if (inUse) {
        return { ok: false, error: 'Category is used by existing transactions.' };
      }
      setState((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
      }));
      showToast('Category deleted', 'info');
      return { ok: true };
    },
    [state.transactions, showToast]
  );

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, []);

  const exportJsonBackup = useCallback(() => {
    return JSON.stringify(
      {
        app: 'Kobbi Personal Finance Prototype',
        exportedAt: new Date().toISOString(),
        version: 1,
        data: state,
      },
      null,
      2
    );
  }, [state]);

  const importJsonBackup: FinanceContextValue['importJsonBackup'] = useCallback(
    (rawJson) => {
      try {
        const parsed = JSON.parse(rawJson);
        const candidate = parsed?.data ? parsed.data : parsed;
        if (
          !candidate ||
          !Array.isArray(candidate.accounts) ||
          !Array.isArray(candidate.transactions) ||
          !candidate.settings
        ) {
          return { ok: false, error: 'Invalid backup file structure.' };
        }
        setState(candidate as FinanceState);
        showToast('Backup restored successfully');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Could not parse JSON backup file.' };
      }
    },
    [showToast]
  );

  const resetDemoData = useCallback(() => {
    const fresh = createSeedFinanceState(true);
    setState((prev) => ({
      ...fresh,
      settings: {
        ...fresh.settings,
        theme: prev.settings.theme,
      },
    }));
    showToast('Demo data restored to defaults', 'info');
  }, [showToast]);

  const value = useMemo<FinanceContextValue>(
    () => ({
      state,
      toast,
      showToast,
      dismissToast,
      completeOnboarding,
      replayOnboarding,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addAccount,
      updateAccount,
      toggleArchiveAccount,
      setMonthlyBudgetTotal,
      upsertBudgetAllocation,
      deleteBudgetAllocation,
      addGoal,
      updateGoal,
      contributeToGoal,
      setGoalStatus,
      deleteGoal,
      addRecurring,
      updateRecurring,
      toggleRecurringStatus,
      recordRecurringOccurrence,
      deleteRecurring,
      addCategory,
      deleteCategory,
      updateSettings,
      exportJsonBackup,
      importJsonBackup,
      resetDemoData,
    }),
    [
      state,
      toast,
      showToast,
      dismissToast,
      completeOnboarding,
      replayOnboarding,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addAccount,
      updateAccount,
      toggleArchiveAccount,
      setMonthlyBudgetTotal,
      upsertBudgetAllocation,
      deleteBudgetAllocation,
      addGoal,
      updateGoal,
      contributeToGoal,
      setGoalStatus,
      deleteGoal,
      addRecurring,
      updateRecurring,
      toggleRecurringStatus,
      recordRecurringOccurrence,
      deleteRecurring,
      addCategory,
      deleteCategory,
      updateSettings,
      exportJsonBackup,
      importJsonBackup,
      resetDemoData,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider');
  return ctx;
}
