import React, { useMemo, useState } from 'react';
import { AlertCircle, Info, Pencil, PieChart, Plus } from 'lucide-react';
import { BudgetProgressCard } from '../components/finance/BudgetProgressCard';
import { CategorySelector } from '../components/finance/CategorySelector';
import { DateRangeSelector } from '../components/finance/DateRangeSelector';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomSheet } from '../components/ui/BottomSheet';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { EmptyState } from '../components/ui/EmptyState';
import { useFinance } from '../store/FinanceContext';
import { CategoryBudgetProgress, getBudgetSummary } from '../utils/calculations';
import { formatMonthLabel, getCurrentMonthKey } from '../utils/date';
import { formatNaira, percentageOfKobo } from '../utils/money';

interface BudgetsScreenProps {
  onOpenSettings: () => void;
}

export const BudgetsScreen: React.FC<BudgetsScreenProps> = ({ onOpenSettings }) => {
  const {
    state,
    setMonthlyBudgetTotal,
    upsertBudgetAllocation,
    deleteBudgetAllocation,
  } = useFinance();

  const [monthKey, setMonthKey] = useState<string>(getCurrentMonthKey());
  const [totalSheetOpen, setTotalSheetOpen] = useState(false);
  const [totalInputKobo, setTotalInputKobo] = useState<number>(0);

  const [allocSheetOpen, setAllocSheetOpen] = useState(false);
  const [editingAllocId, setEditingAllocId] = useState<string | undefined>(undefined);
  const [allocCategoryId, setAllocCategoryId] = useState<string>('');
  const [allocMode, setAllocMode] = useState<'fixed' | 'percent'>('fixed');
  const [allocAmountKobo, setAllocAmountKobo] = useState<number>(0);
  const [allocPercent, setAllocPercent] = useState<string>('15');
  const [allocError, setAllocError] = useState<string>('');

  const [deleteTarget, setDeleteTarget] = useState<CategoryBudgetProgress | null>(null);

  const expenseCategories = useMemo(
    () => state.categories.filter((c) => c.type === 'expense'),
    [state.categories]
  );

  const budgetSummary = useMemo(
    () => getBudgetSummary(state.budgets[monthKey], state.transactions, state.categories, monthKey),
    [state.budgets, state.transactions, state.categories, monthKey]
  );

  const openTotalEditor = () => {
    setTotalInputKobo(budgetSummary.totalBudgetKobo || 250000 * 100);
    setTotalSheetOpen(true);
  };

  const openNewAllocation = () => {
    const usedIds = new Set(budgetSummary.categories.map((c) => c.categoryId));
    const firstUnused = expenseCategories.find((c) => !usedIds.has(c.id)) || expenseCategories[0];
    setEditingAllocId(undefined);
    setAllocCategoryId(firstUnused?.id || '');
    setAllocMode('fixed');
    setAllocAmountKobo(Math.min(25000 * 100, Math.max(0, budgetSummary.unallocatedKobo)));
    setAllocPercent('10');
    setAllocError('');
    setAllocSheetOpen(true);
  };

  const openEditAllocation = (item: CategoryBudgetProgress) => {
    setEditingAllocId(item.allocationId);
    setAllocCategoryId(item.categoryId);
    setAllocMode(item.mode);
    setAllocAmountKobo(item.allocatedKobo);
    setAllocPercent(item.percentValue !== undefined ? String(item.percentValue) : '15');
    setAllocError('');
    setAllocSheetOpen(true);
  };

  const handleSaveTotal = (e: React.FormEvent) => {
    e.preventDefault();
    setMonthlyBudgetTotal(monthKey, totalInputKobo);
    setTotalSheetOpen(false);
  };

  const handleSaveAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    const pctNum = Math.max(0, Math.min(100, parseFloat(allocPercent) || 0));
    if (allocMode === 'percent' && pctNum <= 0) {
      setAllocError('Enter a percentage greater than 0%.');
      return;
    }

    const res = upsertBudgetAllocation(monthKey, {
      id: editingAllocId,
      categoryId: allocCategoryId,
      mode: allocMode,
      amountKobo:
        allocMode === 'percent'
          ? percentageOfKobo(budgetSummary.totalBudgetKobo, pctNum)
          : allocAmountKobo,
      percentValue: allocMode === 'percent' ? pctNum : undefined,
    });

    if (!res.ok) {
      setAllocError(res.error || 'Invalid allocation.');
      return;
    }
    setAllocSheetOpen(false);
  };

  const alreadyAllocatedCategoryIds = useMemo(() => {
    if (editingAllocId) return [];
    return budgetSummary.categories.map((c) => c.categoryId);
  }, [budgetSummary.categories, editingAllocId]);

  const sym = state.settings.currencySymbol;
  const masked = state.settings.hideBalances;

  return (
    <div className="flex flex-col min-h-full kb-screen-enter">
      <AppHeader
        title="Monthly Budgets"
        subtitle="Give every kobo a purpose"
        onOpenSettings={onOpenSettings}
        rightAction={
          budgetSummary.hasBudget ? (
            <button
              type="button"
              onClick={openNewAllocation}
              aria-label="Add category allocation"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#087F5B] dark:text-[#DDF5E6] hover:bg-[#E4E7EC]/60 dark:hover:bg-[#182235] transition-colors"
            >
              <Plus size={22} />
            </button>
          ) : undefined
        }
      />

      <div className="px-4 pt-3 pb-24 space-y-4">
        <DateRangeSelector monthKey={monthKey} onChangeMonth={setMonthKey} />

        {!budgetSummary.hasBudget ? (
          <EmptyState
            icon={<PieChart size={22} />}
            title={`No budget for ${formatMonthLabel(monthKey, true)}`}
            description="Set a monthly spending limit and allocate amounts across categories so every kobo has a purpose."
            actionLabel="Create Monthly Budget"
            onAction={openTotalEditor}
          />
        ) : (
          <>
            {/* Budget Summary Hero Card */}
            <section className="rounded-[22px] bg-[#101828] dark:bg-[#182235] text-white p-5 border border-[#1E293B] dark:border-[#2B3952]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-300">
                    Total {formatMonthLabel(monthKey, false)} Budget
                  </p>
                  <p className="mt-1 font-display text-[26px] font-extrabold tabular-nums">
                    {formatNaira(budgetSummary.totalBudgetKobo, {
                      symbol: sym,
                      masked,
                      hideDecimalsIfWhole: true,
                    })}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openTotalEditor}
                  className="min-h-[40px] px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors"
                >
                  <Pencil size={13} />
                  <span>Edit Total</span>
                </button>
              </div>

              {/* Overall progress track */}
              <div className="mt-3.5 h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, budgetSummary.percentUsed)}%`,
                    backgroundColor: budgetSummary.isOverBudget
                      ? '#FB7185'
                      : budgetSummary.percentUsed >= 80
                      ? '#FBBF24'
                      : '#10B981',
                  }}
                />
              </div>

              {/* 4 Key Metrics */}
              <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                <div>
                  <p className="text-slate-400">Total Spent</p>
                  <p className="mt-0.5 font-display font-bold tabular-nums text-white">
                    {formatNaira(budgetSummary.totalSpentKobo, {
                      symbol: sym,
                      masked,
                      hideDecimalsIfWhole: true,
                    })}{' '}
                    <span className="text-slate-400 font-normal">({budgetSummary.percentUsed}%)</span>
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Remaining Budget</p>
                  <p
                    className={`mt-0.5 font-display font-bold tabular-nums ${
                      budgetSummary.remainingBudgetKobo < 0 ? 'text-[#F07171]' : 'text-[#22C55E]'
                    }`}
                  >
                    {formatNaira(budgetSummary.remainingBudgetKobo, {
                      symbol: sym,
                      masked,
                      hideDecimalsIfWhole: true,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Allocated to Categories</p>
                  <p className="mt-0.5 font-display font-bold tabular-nums text-white">
                    {formatNaira(budgetSummary.totalAllocatedKobo, {
                      symbol: sym,
                      masked,
                      hideDecimalsIfWhole: true,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Unallocated</p>
                  <p
                    className={`mt-0.5 font-display font-bold tabular-nums ${
                      budgetSummary.unallocatedKobo < 0 ? 'text-amber-400' : 'text-slate-200'
                    }`}
                  >
                    {formatNaira(budgetSummary.unallocatedKobo, {
                      symbol: sym,
                      masked,
                      hideDecimalsIfWhole: true,
                    })}
                  </p>
                </div>
              </div>
            </section>

            {/* Over-allocation notice if total budget was lowered below sum of allocations */}
            {budgetSummary.unallocatedKobo < 0 && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>
                  Your category allocations exceed your total budget by{' '}
                  <strong className="tabular-nums">
                    {formatNaira(Math.abs(budgetSummary.unallocatedKobo), {
                      symbol: sym,
                      hideDecimalsIfWhole: true,
                    })}
                  </strong>
                  . Increase your total budget or trim a category limit.
                </p>
              </div>
            )}

            {/* Financial clarity note */}
            <div className="flex items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
              <Info size={14} className="shrink-0 text-[#087F5B] dark:text-[#34D399]" />
              <span>Allocations plan your limits without creating cash transactions.</span>
            </div>

            {/* Category Allocations Header */}
            <div className="flex items-center justify-between pt-1">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Category Allocations ({budgetSummary.categories.length})
              </h2>
              <button
                type="button"
                onClick={openNewAllocation}
                className="min-h-[38px] px-3 rounded-xl bg-[#DDF5E6] dark:bg-[#087F5B]/25 text-[#087F5B] dark:text-[#DDF5E6] text-xs font-bold inline-flex items-center gap-1"
              >
                <Plus size={14} />
                <span>Allocate</span>
              </button>
            </div>

            {budgetSummary.categories.length === 0 ? (
              <EmptyState
                icon={<Plus size={20} />}
                title="No categories allocated yet"
                description="Split your monthly budget into spending categories to spot overspending early."
                actionLabel="Add Category Limit"
                onAction={openNewAllocation}
              />
            ) : (
              <div className="space-y-3">
                {budgetSummary.categories.map((item) => (
                  <BudgetProgressCard
                    key={item.allocationId}
                    item={item}
                    currencySymbol={sym}
                    hideBalances={masked}
                    onEdit={() => openEditAllocation(item)}
                    onDelete={() => setDeleteTarget(item)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Total Monthly Budget Sheet */}
      <BottomSheet
        isOpen={totalSheetOpen}
        onClose={() => setTotalSheetOpen(false)}
        title={`Set ${formatMonthLabel(monthKey, true)} Budget`}
        subtitle="Total planned spending ceiling for this month"
        footer={
          <button
            type="submit"
            form="total-budget-form"
            className="w-full min-h-[48px] rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white font-display text-sm font-bold"
          >
            Save Monthly Budget
          </button>
        }
      >
        <form id="total-budget-form" onSubmit={handleSaveTotal} className="space-y-4">
          <CurrencyInput
            id="budget-total-input"
            label="Total Monthly Budget"
            valueKobo={totalInputKobo}
            onChangeKobo={setTotalInputKobo}
            currencySymbol={sym}
            quickPresets={[150000, 250000, 350000, 500000]}
            helperText="Percentage-based category allocations will recalculate automatically."
          />
        </form>
      </BottomSheet>

      {/* Add / Edit Category Allocation Sheet */}
      <BottomSheet
        isOpen={allocSheetOpen}
        onClose={() => setAllocSheetOpen(false)}
        title={editingAllocId ? 'Edit Category Allocation' : 'Allocate Category Budget'}
        subtitle={`Unallocated remaining: ${formatNaira(Math.max(0, budgetSummary.unallocatedKobo), {
          symbol: sym,
          hideDecimalsIfWhole: true,
        })}`}
        footer={
          <button
            type="submit"
            form="alloc-form"
            className="w-full min-h-[48px] rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white font-display text-sm font-bold"
          >
            Save Allocation
          </button>
        }
      >
        <form id="alloc-form" onSubmit={handleSaveAllocation} className="space-y-4">
          {allocError && (
            <div
              role="alert"
              className="rounded-xl bg-[#DC5C5C]/10 dark:bg-[#DC5C5C]/15 border border-[#DC5C5C]/30 px-3.5 py-2.5 text-xs font-semibold text-[#DC5C5C] dark:text-[#F07171]"
            >
              {allocError}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Expense Category
            </p>
            <CategorySelector
              categories={expenseCategories}
              selectedCategoryId={allocCategoryId}
              onSelect={setAllocCategoryId}
              disabledIds={alreadyAllocatedCategoryIds}
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Allocation Method
            </p>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#101828]">
              <button
                type="button"
                onClick={() => {
                  setAllocMode('fixed');
                  setAllocError('');
                }}
                className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
                  allocMode === 'fixed'
                    ? 'bg-white dark:bg-[#182235] text-[#101828] dark:text-white shadow-sm'
                    : 'text-[#667085] dark:text-[#98A2B3]'
                }`}
              >
                Fixed Amount ({sym})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAllocMode('percent');
                  setAllocError('');
                }}
                className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
                  allocMode === 'percent'
                    ? 'bg-white dark:bg-[#182235] text-[#101828] dark:text-white shadow-sm'
                    : 'text-[#667085] dark:text-[#98A2B3]'
                }`}
              >
                Percentage (%)
              </button>
            </div>
          </div>

          {allocMode === 'fixed' ? (
            <CurrencyInput
              id="alloc-amount"
              label="Allocated Limit"
              valueKobo={allocAmountKobo}
              onChangeKobo={(k) => {
                setAllocAmountKobo(k);
                if (allocError) setAllocError('');
              }}
              currencySymbol={sym}
              quickPresets={[15000, 30000, 50000, 75000]}
            />
          ) : (
            <div>
              <label
                htmlFor="alloc-pct"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Percentage of Monthly Budget
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3.5 min-h-[52px]">
                <input
                  id="alloc-pct"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={allocPercent}
                  onChange={(e) => {
                    setAllocPercent(e.target.value);
                    if (allocError) setAllocError('');
                  }}
                  className="w-full bg-transparent font-display text-xl font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none"
                />
                <span className="font-display text-lg font-bold text-slate-500">%</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Equals{' '}
                {formatNaira(
                  percentageOfKobo(budgetSummary.totalBudgetKobo, parseFloat(allocPercent) || 0),
                  { symbol: sym, hideDecimalsIfWhole: true }
                )}{' '}
                of your {formatMonthLabel(monthKey, false)} budget.
              </p>
            </div>
          )}
        </form>
      </BottomSheet>

      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        title="Remove Allocation?"
        message={`Remove the ${deleteTarget?.categoryName || ''} budget limit for ${formatMonthLabel(monthKey, true)}? Existing expense transactions will remain untouched.`}
        confirmLabel="Remove"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteBudgetAllocation(monthKey, deleteTarget.allocationId);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
