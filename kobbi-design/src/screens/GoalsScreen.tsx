import React, { useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Info,
  Pencil,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import { GoalCard } from '../components/finance/GoalCard';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomSheet } from '../components/ui/BottomSheet';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { EmptyState } from '../components/ui/EmptyState';
import { useFinance } from '../store/FinanceContext';
import { CategoryColors } from '../theme/tokens';
import { GoalStatus, SavingsGoal } from '../types/finance';
import { formatDate, toDateOnlyISO } from '../utils/date';
import { computePercent, formatNaira } from '../utils/money';

interface GoalsScreenProps {
  onOpenSettings: () => void;
}

const GOAL_ICONS = ['ShieldCheck', 'Home', 'Laptop', 'Plane', 'Briefcase', 'Gift', 'Car'];

export const GoalsScreen: React.FC<GoalsScreenProps> = ({ onOpenSettings }) => {
  const {
    state,
    addGoal,
    updateGoal,
    contributeToGoal,
    setGoalStatus,
    deleteGoal,
  } = useFinance();

  const [statusFilter, setStatusFilter] = useState<GoalStatus>('active');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [contribGoal, setContribGoal] = useState<SavingsGoal | null>(null);
  const [contribKobo, setContribKobo] = useState(0);
  const [contribNote, setContribNote] = useState('');
  const [contribError, setContribError] = useState('');

  // Create / Edit Goal modal
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalName, setGoalName] = useState('');
  const [targetKobo, setTargetKobo] = useState(0);
  const [targetDate, setTargetDate] = useState('');
  const [goalIcon, setGoalIcon] = useState('ShieldCheck');
  const [goalColor, setGoalColor] = useState<string>(CategoryColors[0]);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null);

  const filteredGoals = useMemo(
    () => state.goals.filter((g) => g.status === statusFilter),
    [state.goals, statusFilter]
  );

  const selectedGoal = useMemo(
    () => state.goals.find((g) => g.id === selectedGoalId) || null,
    [state.goals, selectedGoalId]
  );

  const totalSavedAllActive = useMemo(
    () =>
      state.goals
        .filter((g) => g.status !== 'archived')
        .reduce((sum, g) => sum + g.savedAmountKobo, 0),
    [state.goals]
  );
  const totalTargetAllActive = useMemo(
    () =>
      state.goals
        .filter((g) => g.status !== 'archived')
        .reduce((sum, g) => sum + g.targetAmountKobo, 0),
    [state.goals]
  );

  const openCreateGoal = () => {
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 6);
    setEditingGoal(null);
    setGoalName('');
    setTargetKobo(500000 * 100);
    setTargetDate(toDateOnlyISO(defaultDate));
    setGoalIcon('ShieldCheck');
    setGoalColor(CategoryColors[0]);
    setFormError('');
    setGoalFormOpen(true);
  };

  const openEditGoal = (g: SavingsGoal) => {
    setEditingGoal(g);
    setGoalName(g.name);
    setTargetKobo(g.targetAmountKobo);
    setTargetDate(g.targetDateISO);
    setGoalIcon(g.iconName);
    setGoalColor(g.color);
    setFormError('');
    setGoalFormOpen(true);
  };

  const openContribute = (g: SavingsGoal) => {
    setContribGoal(g);
    setContribKobo(25000 * 100);
    setContribNote('');
    setContribError('');
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) {
      setFormError('Please enter a goal name.');
      return;
    }
    if (targetKobo <= 0) {
      setFormError('Target amount must be greater than zero.');
      return;
    }
    if (!targetDate) {
      setFormError('Please select a target date.');
      return;
    }

    if (editingGoal) {
      updateGoal(editingGoal.id, {
        name: goalName.trim(),
        targetAmountKobo: targetKobo,
        targetDateISO: targetDate,
        iconName: goalIcon,
        color: goalColor,
      });
    } else {
      addGoal({
        name: goalName.trim(),
        targetAmountKobo: targetKobo,
        targetDateISO: targetDate,
        iconName: goalIcon,
        color: goalColor,
      });
    }
    setGoalFormOpen(false);
  };

  const handleSubmitContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribGoal) return;
    const res = contributeToGoal(contribGoal.id, contribKobo, contribNote);
    if (!res.ok) {
      setContribError(res.error || 'Enter a valid contribution.');
      return;
    }
    setContribGoal(null);
  };

  const sym = state.settings.currencySymbol;
  const masked = state.settings.hideBalances;

  return (
    <div className="flex flex-col min-h-full kb-screen-enter">
      <AppHeader
        title="Savings Goals"
        subtitle="Track milestones without double-counting"
        onOpenSettings={onOpenSettings}
        rightAction={
          <button
            type="button"
            onClick={openCreateGoal}
            aria-label="New savings goal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#087F5B] dark:text-[#DDF5E6] hover:bg-[#E4E7EC]/60 dark:hover:bg-[#182235] transition-colors"
          >
            <Plus size={22} />
          </button>
        }
      />

      <div className="px-4 pt-3 pb-24 space-y-4">
        {/* Overall Goals Progress */}
        <section className="rounded-[22px] bg-[#101828] dark:bg-[#182235] text-white p-5 border border-[#1E293B] dark:border-[#2B3952]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-slate-300">Total Tracked Toward Goals</p>
              <p className="mt-1 font-display text-[26px] font-extrabold tabular-nums">
                {formatNaira(totalSavedAllActive, {
                  symbol: sym,
                  masked,
                  hideDecimalsIfWhole: true,
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Overall Target</p>
              <p className="mt-1 font-display text-sm font-bold tabular-nums text-[#34D399]">
                {computePercent(totalSavedAllActive, totalTargetAllActive)}%
              </p>
            </div>
          </div>

          <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#10B981] transition-all duration-300"
              style={{
                width: `${Math.min(100, computePercent(totalSavedAllActive, totalTargetAllActive))}%`,
              }}
            />
          </div>
        </section>

        {/* Financial Separation Notice */}
        <div className="flex items-start gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
          <Info size={14} className="shrink-0 mt-0.5 text-[#087F5B] dark:text-[#34D399]" />
          <span>
            Goal contributions track your milestones separately—they do not reduce your cash accounts or count as expenses.
          </span>
        </div>

        {/* Status Segmented Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#E4E7EC]/75 dark:bg-[#182235]">
          {(['active', 'completed', 'archived'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`min-h-[38px] rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-white dark:bg-[#101828] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Goals List */}
        {filteredGoals.length === 0 ? (
          <EmptyState
            icon={<Target size={22} />}
            title={`No ${statusFilter} goals`}
            description={
              statusFilter === 'active'
                ? 'Set a target for your Emergency Fund, Rent, New Laptop, or Vacation.'
                : `You have no ${statusFilter} savings goals yet.`
            }
            actionLabel={statusFilter === 'active' ? 'Create Savings Goal' : undefined}
            onAction={statusFilter === 'active' ? openCreateGoal : undefined}
          />
        ) : (
          <div className="space-y-3">
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                currencySymbol={sym}
                dateFormat={state.settings.dateFormat}
                hideBalances={masked}
                onContribute={() => openContribute(goal)}
                onSelect={() => setSelectedGoalId(goal.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Record Contribution Sheet */}
      <BottomSheet
        isOpen={Boolean(contribGoal)}
        onClose={() => setContribGoal(null)}
        title="Record Goal Contribution"
        subtitle={contribGoal?.name}
        footer={
          <button
            type="submit"
            form="goal-contrib-form"
            className="w-full min-h-[48px] rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white font-display text-sm font-bold"
          >
            Add Contribution
          </button>
        }
      >
        <form id="goal-contrib-form" onSubmit={handleSubmitContribution} className="space-y-4">
          {contribError && (
            <div className="rounded-xl bg-[#DC5C5C]/10 dark:bg-[#DC5C5C]/15 px-3.5 py-2.5 text-xs font-semibold text-[#DC5C5C] dark:text-[#F07171]">
              {contribError}
            </div>
          )}

          <CurrencyInput
            id="contrib-amount"
            label="Contribution Amount"
            valueKobo={contribKobo}
            onChangeKobo={(k) => {
              setContribKobo(k);
              if (contribError) setContribError('');
            }}
            currencySymbol={sym}
            quickPresets={[10000, 25000, 50000, 100000]}
            helperText="Does not double-count as a monthly expense."
          />

          <div>
            <label
              htmlFor="contrib-note"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
            >
              Note (optional)
            </label>
            <input
              id="contrib-note"
              type="text"
              value={contribNote}
              onChange={(e) => setContribNote(e.target.value)}
              placeholder="e.g. Salary set-aside or bonus"
              className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3.5 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </form>
      </BottomSheet>

      {/* Goal Detail Sheet */}
      <BottomSheet
        isOpen={Boolean(selectedGoal)}
        onClose={() => setSelectedGoalId(null)}
        title={selectedGoal?.name || 'Goal Details'}
        subtitle={
          selectedGoal
            ? `Target: ${formatDate(selectedGoal.targetDateISO, state.settings.dateFormat)}`
            : undefined
        }
        footer={
          selectedGoal && (
            <div className="grid grid-cols-3 gap-2">
              {selectedGoal.status === 'active' ? (
                <button
                  type="button"
                  onClick={() => {
                    setGoalStatus(selectedGoal.id, 'completed');
                    setSelectedGoalId(null);
                  }}
                  className="min-h-[44px] rounded-xl bg-[#087F5B] text-white text-xs font-bold flex items-center justify-center gap-1"
                >
                  <CheckCircle2 size={14} />
                  <span>Complete</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setGoalStatus(selectedGoal.id, 'active');
                    setSelectedGoalId(null);
                  }}
                  className="min-h-[44px] rounded-xl bg-[#087F5B] text-white text-xs font-bold flex items-center justify-center gap-1"
                >
                  <span>Reactivate</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const g = selectedGoal;
                  setSelectedGoalId(null);
                  openEditGoal(g);
                }}
                className="min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1"
              >
                <Pencil size={14} />
                <span>Edit</span>
              </button>

              {selectedGoal.status !== 'archived' ? (
                <button
                  type="button"
                  onClick={() => {
                    setGoalStatus(selectedGoal.id, 'archived');
                    setSelectedGoalId(null);
                  }}
                  className="min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1"
                >
                  <Archive size={14} />
                  <span>Archive</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selectedGoal)}
                  className="min-h-[44px] rounded-xl bg-[#DC5C5C]/10 dark:bg-[#DC5C5C]/15 text-xs font-bold text-[#DC5C5C] dark:text-[#F07171] flex items-center justify-center gap-1"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )
        }
      >
        {selectedGoal && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 dark:bg-[#101828] border border-slate-200/80 dark:border-slate-700/80 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Saved Progress</p>
                <p className="font-display text-lg font-extrabold tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {formatNaira(selectedGoal.savedAmountKobo, {
                    symbol: sym,
                    masked,
                    hideDecimalsIfWhole: true,
                  })}{' '}
                  <span className="text-xs font-medium text-slate-400">
                    of{' '}
                    {formatNaira(selectedGoal.targetAmountKobo, {
                      symbol: sym,
                      masked,
                      hideDecimalsIfWhole: true,
                    })}
                  </span>
                </p>
              </div>
              {selectedGoal.status === 'active' && (
                <button
                  type="button"
                  onClick={() => {
                    const g = selectedGoal;
                    setSelectedGoalId(null);
                    openContribute(g);
                  }}
                  className="min-h-[40px] px-3.5 rounded-xl bg-[#087F5B] text-white text-xs font-bold"
                >
                  + Contribute
                </button>
              )}
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                Contribution History ({selectedGoal.contributions.length})
              </h3>
              {selectedGoal.contributions.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                  No contributions recorded yet.
                </p>
              ) : (
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedGoal.contributions.map((c) => (
                    <div key={c.id} className="px-3.5 py-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {c.note || 'Goal contribution'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatDate(c.dateISO, state.settings.dateFormat)}
                        </p>
                      </div>
                      <span className="font-display text-xs font-bold tabular-nums text-[#087F5B] dark:text-[#34D399]">
                        +
                        {formatNaira(c.amountKobo, {
                          symbol: sym,
                          masked,
                          hideDecimalsIfWhole: true,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setDeleteTarget(selectedGoal)}
              className="w-full min-h-[42px] rounded-xl text-xs font-semibold text-[#DC5C5C] dark:text-[#F07171] hover:bg-[#DC5C5C]/10"
            >
              Delete Goal Permanently
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Create / Edit Goal Sheet */}
      <BottomSheet
        isOpen={goalFormOpen}
        onClose={() => setGoalFormOpen(false)}
        title={editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
        footer={
          <button
            type="submit"
            form="goal-form"
            className="w-full min-h-[48px] rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white font-display text-sm font-bold"
          >
            {editingGoal ? 'Save Changes' : 'Create Goal'}
          </button>
        }
      >
        <form id="goal-form" onSubmit={handleSaveGoal} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-[#DC5C5C]/10 dark:bg-[#DC5C5C]/15 px-3.5 py-2.5 text-xs font-semibold text-[#DC5C5C] dark:text-[#F07171]">
              {formError}
            </div>
          )}

          <div>
            <label
              htmlFor="goal-name"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
            >
              Goal Name
            </label>
            <input
              id="goal-name"
              type="text"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="e.g. Emergency Fund, New Laptop, Business Capital"
              className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3.5 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <CurrencyInput
            id="goal-target"
            label="Target Amount"
            valueKobo={targetKobo}
            onChangeKobo={setTargetKobo}
            currencySymbol={sym}
            quickPresets={[250000, 500000, 1000000, 2500000]}
          />

          <div>
            <label
              htmlFor="goal-date"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
            >
              Target Date
            </label>
            <input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3.5 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Icon & Color
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {GOAL_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setGoalIcon(ic)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                    goalIcon === ic
                      ? 'border-[#087F5B] bg-[#ECFDF5] dark:bg-[#087F5B]/20 text-[#087F5B] dark:text-[#34D399]'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <CategoryIcon name={ic} size={18} />
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {CategoryColors.slice(0, 7).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setGoalColor(c)}
                  className={`w-8 h-8 rounded-full ${
                    goalColor === c ? 'ring-2 ring-offset-2 ring-[#087F5B]' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </form>
      </BottomSheet>

      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Savings Goal?"
        message={`Permanently delete "${deleteTarget?.name || ''}" and its contribution log?`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteGoal(deleteTarget.id);
            setDeleteTarget(null);
            setSelectedGoalId(null);
          }
        }}
      />
    </div>
  );
};
