import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Calendar,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { TransactionItem } from '../components/finance/TransactionItem';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomSheet } from '../components/ui/BottomSheet';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { useFinance } from '../store/FinanceContext';
import { Transaction, TransactionType } from '../types/finance';
import {
  daysBetween,
  formatDate,
  formatGroupDateHeader,
  formatTime,
  getCurrentMonthKey,
  getMonthKey,
  shiftMonthKey,
  toDateOnlyISO,
} from '../utils/date';
import { formatNaira } from '../utils/money';

interface TransactionsScreenProps {
  onOpenTransactionForm: (type: TransactionType, editing?: Transaction) => void;
  onOpenSettings: () => void;
}

type DateFilterOption = 'all' | 'this_month' | 'last_month' | 'last_7_days';

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  onOpenTransactionForm,
  onOpenSettings,
}) => {
  const { state, deleteTransaction } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const currMonth = getCurrentMonthKey();
  const prevMonth = shiftMonthKey(currMonth, -1);
  const todayISO = toDateOnlyISO(new Date());

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...state.transactions]
      .filter((tx) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (
          accountFilter !== 'all' &&
          tx.accountId !== accountFilter &&
          tx.destinationAccountId !== accountFilter
        ) {
          return false;
        }
        if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;

        if (dateFilter === 'this_month' && getMonthKey(tx.dateISO) !== currMonth) return false;
        if (dateFilter === 'last_month' && getMonthKey(tx.dateISO) !== prevMonth) return false;
        if (dateFilter === 'last_7_days') {
          const diff = daysBetween(tx.dateISO.slice(0, 10), todayISO);
          if (diff < 0 || diff > 7) return false;
        }

        if (q) {
          const catName =
            state.categories.find((c) => c.id === tx.categoryId)?.name.toLowerCase() || '';
          const accName =
            state.accounts.find((a) => a.id === tx.accountId)?.name.toLowerCase() || '';
          const matches =
            tx.title.toLowerCase().includes(q) ||
            (tx.notes || '').toLowerCase().includes(q) ||
            catName.includes(q) ||
            accName.includes(q);
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  }, [
    state.transactions,
    state.categories,
    state.accounts,
    searchQuery,
    typeFilter,
    accountFilter,
    categoryFilter,
    dateFilter,
    currMonth,
    prevMonth,
    todayISO,
  ]);

  const groupedByDate = useMemo(() => {
    const groups: Array<{ dateKey: string; label: string; items: Transaction[]; netDayKobo: number }> = [];
    const map = new Map<string, Transaction[]>();

    for (const tx of filteredTransactions) {
      const dateKey = tx.dateISO.slice(0, 10);
      const list = map.get(dateKey) || [];
      list.push(tx);
      map.set(dateKey, list);
    }

    for (const [dateKey, items] of map.entries()) {
      let netDayKobo = 0;
      for (const tx of items) {
        if (tx.type === 'income') netDayKobo += tx.amountKobo;
        else if (tx.type === 'expense') netDayKobo -= tx.amountKobo;
      }
      groups.push({
        dateKey,
        label: formatGroupDateHeader(dateKey, state.settings.dateFormat),
        items,
        netDayKobo,
      });
    }

    return groups;
  }, [filteredTransactions, state.settings.dateFormat]);

  const activeFilterCount =
    (accountFilter !== 'all' ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (dateFilter !== 'all' ? 1 : 0);

  const selectedCategory = selectedTx
    ? state.categories.find((c) => c.id === selectedTx.categoryId)
    : undefined;
  const selectedAccount = selectedTx
    ? state.accounts.find((a) => a.id === selectedTx.accountId)
    : undefined;
  const selectedDestAccount = selectedTx
    ? state.accounts.find((a) => a.id === selectedTx.destinationAccountId)
    : undefined;

  return (
    <div className="flex flex-col min-h-full kb-screen-enter">
      <AppHeader
        title="Transactions"
        subtitle={`${filteredTransactions.length} entries`}
        onOpenSettings={onOpenSettings}
        rightAction={
          <button
            type="button"
            onClick={() => onOpenTransactionForm('expense')}
            aria-label="Add transaction to Kobbi"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#087F5B] dark:text-[#DDF5E6] hover:bg-[#E4E7EC]/60 dark:hover:bg-[#182235] transition-colors"
          >
            <Plus size={22} />
          </button>
        }
      />

      <div className="px-4 pt-3 pb-24 space-y-3.5">
        {/* Search & Filter Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] px-3 min-h-[44px]">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchant, note, category..."
              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Toggle filters"
            className={`relative min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'border-[#087F5B] bg-[#DDF5E6] dark:bg-[#087F5B]/25 text-[#087F5B] dark:text-[#DDF5E6]'
                : 'border-[#E4E7EC] dark:border-[#2B3952] bg-white dark:bg-[#182235] text-[#667085] dark:text-[#CBD5E1]'
            }`}
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#087F5B] text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Type Segmented Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#E4E7EC]/75 dark:bg-[#182235]">
          {(['all', 'expense', 'income', 'transfer'] as const).map((t) => {
            const active = typeFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`min-h-[36px] rounded-lg text-xs font-semibold capitalize transition-colors ${
                  active
                    ? 'bg-white dark:bg-[#101828] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Expandable Advanced Filters */}
        {showFilters && (
          <div className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Account
                </label>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-2.5 text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="all">All Accounts</option>
                  {state.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-2.5 text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="all">All Categories</option>
                  {state.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Date Range
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_month', label: 'Last Month' },
                  { id: 'last_7_days', label: '7 Days' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDateFilter(opt.id as DateFilterOption)}
                    className={`min-h-[36px] rounded-lg text-[11px] font-semibold px-1.5 border transition-colors ${
                      dateFilter === opt.id
                        ? 'border-[#087F5B] bg-[#ECFDF5] dark:bg-[#087F5B]/20 text-[#087F5B] dark:text-[#34D399]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAccountFilter('all');
                  setCategoryFilter('all');
                  setDateFilter('all');
                }}
                className="text-xs font-semibold text-[#DC5C5C] dark:text-[#F07171]"
              >
                Reset filters
              </button>
            )}
          </div>
        )}

        {/* Grouped Transaction List */}
        {groupedByDate.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight size={22} />}
            title={
              state.transactions.length === 0
                ? 'No transactions yet'
                : 'No matching transactions'
            }
            description={
              state.transactions.length === 0
                ? 'No transactions yet. Start tracking where your money goes.'
                : 'Try adjusting your search or filter selections, or record a new transaction.'
            }
            actionLabel="Add Transaction"
            onAction={() => onOpenTransactionForm('expense')}
          />
        ) : (
          <div className="space-y-4">
            {groupedByDate.map((group) => (
              <div key={group.dateKey}>
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>{group.label}</span>
                  </span>
                  {group.netDayKobo !== 0 && (
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        group.netDayKobo > 0
                          ? 'text-[#087F5B] dark:text-[#34D399]'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {formatNaira(group.netDayKobo, {
                        symbol: state.settings.currencySymbol,
                        showSign: true,
                        masked: state.settings.hideBalances,
                        hideDecimalsIfWhole: true,
                      })}
                    </span>
                  )}
                </div>

                <div className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] divide-y divide-[#E4E7EC]/60 dark:divide-[#2B3952]/70 overflow-hidden">
                  {group.items.map((tx) => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      category={state.categories.find((c) => c.id === tx.categoryId)}
                      account={state.accounts.find((a) => a.id === tx.accountId)}
                      destinationAccount={state.accounts.find(
                        (a) => a.id === tx.destinationAccountId
                      )}
                      currencySymbol={state.settings.currencySymbol}
                      dateFormat={state.settings.dateFormat}
                      hideBalances={state.settings.hideBalances}
                      onClick={() => setSelectedTx(tx)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Detail Sheet */}
      <BottomSheet
        isOpen={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        title="Transaction Details"
        footer={
          selectedTx && (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const tx = selectedTx;
                  setSelectedTx(null);
                  onOpenTransactionForm(tx.type, tx);
                }}
                className="min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Pencil size={15} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(selectedTx)}
                className="min-h-[46px] rounded-xl bg-[#DC5C5C]/10 dark:bg-[#DC5C5C]/15 text-[#DC5C5C] dark:text-[#F07171] text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#DC5C5C]/15 dark:hover:bg-[#DC5C5C]/25"
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            </div>
          )
        }
      >
        {selectedTx && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center py-2">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{
                  backgroundColor:
                    selectedTx.type === 'transfer'
                      ? '#2563EB1A'
                      : `${selectedCategory?.color || '#64748B'}1A`,
                  color:
                    selectedTx.type === 'transfer'
                      ? '#2563EB'
                      : selectedCategory?.color || '#64748B',
                }}
              >
                {selectedTx.type === 'transfer' ? (
                  <ArrowLeftRight size={24} />
                ) : (
                  <CategoryIcon name={selectedCategory?.iconName || 'Tag'} size={24} />
                )}
              </div>

              <p className="font-display text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                {formatNaira(
                  selectedTx.type === 'expense' ? -selectedTx.amountKobo : selectedTx.amountKobo,
                  {
                    symbol: state.settings.currencySymbol,
                    showSign: selectedTx.type !== 'transfer',
                    masked: state.settings.hideBalances,
                  }
                )}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {selectedTx.title}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-[#101828] border border-slate-200/80 dark:border-slate-700/80 divide-y divide-slate-200/70 dark:divide-slate-800 px-4">
              <div className="py-3 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Type</span>
                <span className="font-semibold capitalize text-slate-900 dark:text-white">
                  {selectedTx.type}
                </span>
              </div>
              {selectedTx.type !== 'transfer' && (
                <div className="py-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Category</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedCategory?.name || 'Uncategorized'}
                  </span>
                </div>
              )}
              <div className="py-3 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {selectedTx.type === 'transfer' ? 'From Account' : 'Account'}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedAccount?.name || 'Unknown'}
                </span>
              </div>
              {selectedTx.type === 'transfer' && (
                <div className="py-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">To Account</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedDestAccount?.name || 'Unknown'}
                  </span>
                </div>
              )}
              <div className="py-3 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Date & Time</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatDate(selectedTx.dateISO, state.settings.dateFormat)}
                  {formatTime(selectedTx.dateISO) ? ` · ${formatTime(selectedTx.dateISO)}` : ''}
                </span>
              </div>
              {selectedTx.notes && (
                <div className="py-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Notes</span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                    {selectedTx.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Transaction?"
        message={`This will permanently remove "${deleteTarget?.title || ''}" and reverse its effect on account balances and budgets.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteTransaction(deleteTarget.id);
            setDeleteTarget(null);
            setSelectedTx(null);
          }
        }}
      />
    </div>
  );
};
