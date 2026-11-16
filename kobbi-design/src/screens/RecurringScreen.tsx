import React, { useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  Info,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { CategorySelector } from '../components/finance/CategorySelector';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomSheet } from '../components/ui/BottomSheet';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { EmptyState } from '../components/ui/EmptyState';
import { useFinance } from '../store/FinanceContext';
import { RecurrenceFrequency, RecurringTransaction } from '../types/finance';
import { getUpcomingOccurrences } from '../utils/calculations';
import { daysBetween, formatDate, toDateOnlyISO } from '../utils/date';
import { formatNaira } from '../utils/money';

interface RecurringScreenProps {
  onBack: () => void;
}

export const RecurringScreen: React.FC<RecurringScreenProps> = ({ onBack }) => {
  const {
    state,
    addRecurring,
    updateRecurring,
    toggleRecurringStatus,
    recordRecurringOccurrence,
    deleteRecurring,
  } = useFinance();

  const [selectedItem, setSelectedItem] = useState<RecurringTransaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTransaction | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amountKobo, setAmountKobo] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [startDateISO, setStartDateISO] = useState(toDateOnlyISO(new Date()));
  const [endDateISO, setEndDateISO] = useState('');
  const [autoRecord, setAutoRecord] = useState(false);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const activeAccounts = useMemo(
    () => state.accounts.filter((a) => !a.archived),
    [state.accounts]
  );

  const openCreate = () => {
    setEditingItem(null);
    setTitle('');
    setType('expense');
    setAmountKobo(0);
    setCategoryId(state.categories.find((c) => c.type === 'expense')?.id || '');
    setAccountId(state.settings.defaultAccountId || activeAccounts[0]?.id || '');
    setFrequency('monthly');
    setStartDateISO(toDateOnlyISO(new Date()));
    setEndDateISO('');
    setAutoRecord(false);
    setNotes('');
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (item: RecurringTransaction) => {
    setEditingItem(item);
    setTitle(item.title);
    setType(item.type);
    setAmountKobo(item.amountKobo);
    setCategoryId(item.categoryId);
    setAccountId(item.accountId);
    setFrequency(item.frequency);
    setStartDateISO(item.startDateISO);
    setEndDateISO(item.endDateISO || '');
    setAutoRecord(item.autoRecord);
    setNotes(item.notes || '');
    setFormError('');
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter a title.');
      return;
    }
    if (amountKobo <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }
    if (!categoryId || !accountId) {
      setFormError('Please choose both a category and an account.');
      return;
    }

    const payload: Omit<RecurringTransaction, 'id'> = {
      title: title.trim(),
      type,
      amountKobo,
      categoryId,
      accountId,
      frequency,
      startDateISO,
      endDateISO: endDateISO || undefined,
      nextDueDateISO: editingItem ? editingItem.nextDueDateISO : startDateISO,
      status: editingItem ? editingItem.status : 'active',
      autoRecord,
      notes: notes.trim() || undefined,
      lastRecordedDateISO: editingItem?.lastRecordedDateISO,
    };

    if (editingItem) {
      updateRecurring(editingItem.id, payload);
    } else {
      addRecurring(payload);
    }
    setFormOpen(false);
  };

  const todayISO = toDateOnlyISO(new Date());
  const sym = state.settings.currencySymbol;
  const masked = state.settings.hideBalances;

  return (
    <div className="flex flex-col min-h-full kb-screen-enter">
      <AppHeader
        title="Recurring Schedules"
        subtitle="Planned bills & regular income"
        showBack
        onBack={onBack}
        rightAction={
          <button
            type="button"
            onClick={openCreate}
            aria-label="Add recurring transaction"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#087F5B] dark:text-[#DDF5E6] hover:bg-[#E4E7EC]/60 dark:hover:bg-[#182235] transition-colors"
          >
            <Plus size={22} />
          </button>
        }
      />

      <div className="px-4 pt-3 pb-12 space-y-4">
        <div className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-3.5 flex items-start gap-2.5 text-xs text-[#667085] dark:text-[#CBD5E1]">
          <Info size={16} className="shrink-0 mt-0.5 text-[#087F5B] dark:text-[#34D399]" />
          <p className="leading-relaxed">
            Scheduled items do not automatically deduct money on their due date. Tap{' '}
            <strong>Record Now</strong> when a payment happens to add it to your ledger.
          </p>
        </div>

        {state.recurring.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={22} />}
            title="No recurring schedules"
            description="Track monthly salary, rent, internet subscriptions, or power bills in one place."
            actionLabel="Add Schedule"
            onAction={openCreate}
          />
        ) : (
          <div className="space-y-3">
            {state.recurring.map((rec) => {
              const cat = state.categories.find((c) => c.id === rec.categoryId);
              const acc = state.accounts.find((a) => a.id === rec.accountId);
              const delta = daysBetween(todayISO, rec.nextDueDateISO);
              const dueText =
                rec.status === 'paused'
                  ? 'Paused'
                  : delta < 0
                  ? `${Math.abs(delta)}d overdue`
                  : delta === 0
                  ? 'Due today'
                  : `Due in ${delta}d`;

              return (
                <div
                  key={rec.id}
                  className={`rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-4 ${
                    rec.status === 'paused' ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedItem(rec)}
                      className="flex items-center gap-3 min-w-0 text-left flex-1"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${cat?.color || '#64748B'}1A`,
                          color: cat?.color || '#64748B',
                        }}
                      >
                        <CategoryIcon name={cat?.iconName || 'CalendarClock'} size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                          {rec.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate capitalize">
                          {rec.frequency} · {acc?.name || 'Account'} ·{' '}
                          <span
                            className={
                              rec.status === 'active' && delta <= 0
                                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                : ''
                            }
                          >
                            {dueText}
                          </span>
                        </p>
                      </div>
                    </button>

                    <p
                      className={`font-display text-sm font-bold tabular-nums shrink-0 ${
                        rec.type === 'income'
                          ? 'text-[#087F5B] dark:text-[#34D399]'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatNaira(rec.type === 'income' ? rec.amountKobo : -rec.amountKobo, {
                        symbol: sym,
                        showSign: true,
                        masked,
                        hideDecimalsIfWhole: true,
                      })}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Next: {formatDate(rec.nextDueDateISO, state.settings.dateFormat)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleRecurringStatus(rec.id)}
                        className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1"
                      >
                        {rec.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
                        <span>{rec.status === 'active' ? 'Pause' : 'Resume'}</span>
                      </button>

                      {rec.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => recordRecurringOccurrence(rec.id)}
                          className="min-h-[36px] px-3 rounded-lg bg-[#087F5B] hover:bg-[#066649] text-white text-xs font-bold inline-flex items-center gap-1"
                        >
                          <Check size={13} />
                          <span>Record Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recurring Details Sheet */}
      <BottomSheet
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title || 'Schedule'}
        subtitle={selectedItem ? `Repeats ${selectedItem.frequency}` : undefined}
        footer={
          selectedItem && (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const item = selectedItem;
                  setSelectedItem(null);
                  openEdit(item);
                }}
                className="min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1.5"
              >
                <Pencil size={15} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(selectedItem)}
                className="min-h-[46px] rounded-xl bg-[#DC5C5C]/10 dark:bg-[#DC5C5C]/15 text-sm font-bold text-[#DC5C5C] dark:text-[#F07171] flex items-center justify-center gap-1.5"
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            </div>
          )
        }
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 dark:bg-[#101828] border border-slate-200/80 dark:border-slate-700/80 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatNaira(selectedItem.amountKobo, { symbol: sym, masked })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Start Date</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatDate(selectedItem.startDateISO, state.settings.dateFormat)}
                </span>
              </div>
              {selectedItem.lastRecordedDateISO && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Recorded</span>
                  <span className="font-semibold text-[#087F5B] dark:text-[#34D399]">
                    {formatDate(selectedItem.lastRecordedDateISO, state.settings.dateFormat)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Auto-Record Setting</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedItem.autoRecord ? 'Enabled (opt-in)' : 'Manual confirmation'}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                Upcoming Scheduled Dates (Preview)
              </h3>
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 divide-y divide-slate-100 dark:divide-slate-800">
                {getUpcomingOccurrences(selectedItem, 4).map((d, i) => (
                  <div key={d} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">
                      {i === 0 ? 'Next Occurrence' : `Occurrence ${i + 1}`}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatDate(d, state.settings.dateFormat)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Add / Edit Recurring Form */}
      <BottomSheet
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingItem ? 'Edit Recurring Schedule' : 'Add Recurring Schedule'}
        footer={
          <button
            type="submit"
            form="recurring-form"
            className="w-full min-h-[48px] rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white font-display text-sm font-bold"
          >
            {editingItem ? 'Save Schedule' : 'Create Schedule'}
          </button>
        }
      >
        <form id="recurring-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-[#DC5C5C]/10 dark:bg-[#DC5C5C]/15 px-3.5 py-2.5 text-xs font-semibold text-[#DC5C5C] dark:text-[#F07171]">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F8FAFC] dark:bg-[#101828]">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  const firstCat = state.categories.find((c) => c.type === t);
                  if (firstCat) setCategoryId(firstCat.id);
                }}
                className={`min-h-[40px] rounded-lg text-xs font-bold capitalize ${
                  type === t
                    ? 'bg-white dark:bg-[#182235] text-[#101828] dark:text-white shadow-sm'
                    : 'text-[#667085]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label
              htmlFor="rec-title"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
            >
              Title
            </label>
            <input
              id="rec-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Monthly Salary, Internet Plan, Rent"
              className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3.5 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <CurrencyInput
            id="rec-amount"
            label="Amount"
            valueKobo={amountKobo}
            onChangeKobo={setAmountKobo}
            currencySymbol={sym}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="rec-freq"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Frequency
              </label>
              <select
                id="rec-freq"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3 text-sm text-slate-900 dark:text-white"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 Weeks</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="rec-account"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Account
              </label>
              <select
                id="rec-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3 text-sm text-slate-900 dark:text-white"
              >
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="rec-start"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Start Date
              </label>
              <input
                id="rec-start"
                type="date"
                value={startDateISO}
                onChange={(e) => setStartDateISO(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="rec-end"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
              >
                End Date (optional)
              </label>
              <input
                id="rec-end"
                type="date"
                value={endDateISO}
                onChange={(e) => setEndDateISO(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Category
            </p>
            <CategorySelector
              categories={state.categories.filter((c) => c.type === type)}
              selectedCategoryId={categoryId}
              onSelect={setCategoryId}
            />
          </div>

          <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#101828] border border-slate-200 dark:border-slate-700 cursor-pointer">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Auto-record preference
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Keep off to always confirm before deducting money
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoRecord}
              onChange={(e) => setAutoRecord(e.target.checked)}
              className="w-5 h-5 accent-[#087F5B]"
            />
          </label>
        </form>
      </BottomSheet>

      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Recurring Schedule?"
        message={`Delete "${deleteTarget?.title || ''}"? Previously recorded ledger transactions will not be affected.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteRecurring(deleteTarget.id);
            setDeleteTarget(null);
            setSelectedItem(null);
          }
        }}
      />
    </div>
  );
};
