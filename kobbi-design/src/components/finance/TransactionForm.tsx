import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react';
import { useFinance } from '../../store/FinanceContext';
import { Transaction, TransactionType } from '../../types/finance';
import { toDateOnlyISO, toLocalDateTimeInput } from '../../utils/date';
import { BottomSheet } from '../ui/BottomSheet';
import { CurrencyInput } from '../ui/CurrencyInput';
import { CategorySelector } from './CategorySelector';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
  defaultSourceAccountId?: string;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  onClose,
  initialType = 'expense',
  editingTransaction = null,
  defaultSourceAccountId,
}) => {
  const { state, addTransaction, updateTransaction } = useFinance();
  const activeAccounts = state.accounts.filter((a) => !a.archived);

  const [type, setType] = useState<TransactionType>(initialType);
  const [amountKobo, setAmountKobo] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [dateTime, setDateTime] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountKobo(editingTransaction.amountKobo);
      setCategoryId(editingTransaction.categoryId || '');
      setAccountId(editingTransaction.accountId);
      setDestinationAccountId(
        editingTransaction.destinationAccountId ||
          activeAccounts.find((a) => a.id !== editingTransaction.accountId)?.id ||
          ''
      );
      setDateTime(toLocalDateTimeInput(editingTransaction.dateISO));
      setTitle(editingTransaction.title);
      setNotes(editingTransaction.notes || '');
      return;
    }

    const fallbackAcc =
      defaultSourceAccountId ||
      state.settings.defaultAccountId ||
      activeAccounts[0]?.id ||
      '';
    const secondAcc = activeAccounts.find((a) => a.id !== fallbackAcc)?.id || '';
    const defaultCat = state.categories.find(
      (c) => c.type === (initialType === 'income' ? 'income' : 'expense')
    )?.id || '';

    const now = new Date();
    const nowLocal = `${toDateOnlyISO(now)}T${now.toTimeString().slice(0, 5)}`;

    setType(initialType);
    setAmountKobo(0);
    setCategoryId(defaultCat);
    setAccountId(fallbackAcc);
    setDestinationAccountId(secondAcc);
    setDateTime(nowLocal);
    setTitle('');
    setNotes('');
  }, [isOpen, editingTransaction, initialType, defaultSourceAccountId]);

  const filteredCategories = state.categories.filter(
    (c) => c.type === (type === 'income' ? 'income' : 'expense')
  );

  const handleTypeSwitch = (nextType: TransactionType) => {
    setType(nextType);
    setError('');
    if (nextType !== 'transfer') {
      const matching = state.categories.filter((c) => c.type === nextType);
      if (!matching.some((c) => c.id === categoryId)) {
        setCategoryId(matching[0]?.id || '');
      }
    } else if (destinationAccountId === accountId || !destinationAccountId) {
      setDestinationAccountId(activeAccounts.find((a) => a.id !== accountId)?.id || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountKobo <= 0) {
      setError('Please enter an amount greater than zero.');
      return;
    }
    if (!accountId) {
      setError('Please select an account.');
      return;
    }
    if (type === 'transfer') {
      if (!destinationAccountId) {
        setError('Please select a destination account.');
        return;
      }
      if (accountId === destinationAccountId) {
        setError('Source and destination accounts cannot be the same.');
        return;
      }
    } else if (!categoryId) {
      setError('Please choose a category.');
      return;
    }

    const effectiveTitle =
      title.trim() ||
      (type === 'transfer'
        ? `Transfer to ${activeAccounts.find((a) => a.id === destinationAccountId)?.name || 'Account'}`
        : state.categories.find((c) => c.id === categoryId)?.name || 'Transaction');

    const payload = {
      type,
      amountKobo,
      categoryId: type === 'transfer' ? undefined : categoryId,
      accountId,
      destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
      dateISO: dateTime || `${toDateOnlyISO(new Date())}T12:00`,
      title: effectiveTitle,
      notes: notes.trim() || undefined,
    };

    const res = editingTransaction
      ? updateTransaction(editingTransaction.id, payload)
      : addTransaction(payload);

    if (!res.ok) {
      setError(res.error || 'Could not save transaction.');
      return;
    }
    onClose();
  };

  const typeTabs: Array<{
    id: TransactionType;
    label: string;
    Icon: React.ComponentType<{ size?: number }>;
  }> = [
    { id: 'expense', label: 'Expense', Icon: ArrowUpRight },
    { id: 'income', label: 'Income', Icon: ArrowDownLeft },
    { id: 'transfer', label: 'Transfer', Icon: ArrowLeftRight },
  ];

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingTransaction ? 'Edit Transaction' : 'Record Transaction'}
      subtitle={
        type === 'transfer'
          ? 'Internal transfer — does not affect income or expenses'
          : 'Updates account balance and monthly cash flow'
      }
      footer={
        <button
          type="submit"
          form="transaction-form"
          className="w-full min-h-[48px] rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white font-display text-sm font-bold transition-colors active:scale-[0.99]"
        >
          {editingTransaction ? 'Save Changes' : `Save ${type === 'income' ? 'Income' : type === 'transfer' ? 'Transfer' : 'Expense'}`}
        </button>
      }
    >
      <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Segmented Type Selector */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#101828]">
          {typeTabs.map(({ id, label, Icon }) => {
            const active = type === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTypeSwitch(id)}
                className={`min-h-[40px] rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-colors ${
                  active
                    ? 'bg-white dark:bg-[#182235] text-[#101828] dark:text-white shadow-sm'
                    : 'text-[#667085] dark:text-[#98A2B3] hover:text-[#101828] dark:hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="rounded-xl bg-[#DC5C5C]/10 dark:bg-[#DC5C5C]/15 border border-[#DC5C5C]/30 px-3.5 py-2.5 text-xs font-semibold text-[#DC5C5C] dark:text-[#F07171]"
          >
            {error}
          </div>
        )}

        {/* Amount */}
        <CurrencyInput
          id="tx-amount"
          label="Amount"
          valueKobo={amountKobo}
          onChangeKobo={(k) => {
            setAmountKobo(k);
            if (error) setError('');
          }}
          currencySymbol={state.settings.currencySymbol}
          quickPresets={[2000, 5000, 15000, 50000]}
        />

        {/* Title / Description */}
        <div>
          <label
            htmlFor="tx-title"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
          >
            Description
          </label>
          <input
            id="tx-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === 'transfer'
                ? 'e.g. Top up OPay weekly wallet'
                : type === 'income'
                ? 'e.g. Client invoice or salary'
                : 'e.g. Shoprite groceries, Bolt ride'
            }
            className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#087F5B]"
          />
        </div>

        {/* Account Selector (or Source + Destination for Transfer) */}
        <div className={type === 'transfer' ? 'grid grid-cols-2 gap-3' : ''}>
          <div>
            <label
              htmlFor="tx-account"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
            >
              {type === 'transfer' ? 'From Account' : 'Account'}
            </label>
            <select
              id="tx-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#087F5B]"
            >
              {activeAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {type === 'transfer' && (
            <div>
              <label
                htmlFor="tx-dest-account"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
              >
                To Account
              </label>
              <select
                id="tx-dest-account"
                value={destinationAccountId}
                onChange={(e) => setDestinationAccountId(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#087F5B]"
              >
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id} disabled={acc.id === accountId}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Category Grid for Income / Expense */}
        {type !== 'transfer' && (
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Category
            </p>
            <CategorySelector
              categories={filteredCategories}
              selectedCategoryId={categoryId}
              onSelect={setCategoryId}
            />
          </div>
        )}

        {/* Date & Time */}
        <div>
          <label
            htmlFor="tx-datetime"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
          >
            Date & Time
          </label>
          <input
            id="tx-datetime"
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#087F5B]"
          />
        </div>

        {/* Optional Notes */}
        <div>
          <label
            htmlFor="tx-notes"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
          >
            Notes (optional)
          </label>
          <textarea
            id="tx-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Receipt reference, recipient, or context..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#087F5B]"
          />
        </div>
      </form>
    </BottomSheet>
  );
};
