import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Calendar,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Account, Category, Transaction, TransactionType } from '../../types/finance';
import { DatabaseManager } from '../../database';
import { AppHeader } from '../../components/common/AppHeader';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { EmptyState } from '../../components/common/EmptyState';
import { TransactionItem } from '../../components/finance/TransactionItem';
import { BottomSheet } from '../../components/ui/BottomSheet';
import {
  daysBetween,
  formatDate,
  formatGroupDateHeader,
  formatTime,
  getCurrentMonthKey,
  getMonthKey,
  shiftMonthKey,
  toDateOnlyISO,
} from '../../utils/date';
import { formatNaira } from '../../utils/money';

interface TransactionsScreenProps {
  onOpenTransactionForm: (type: TransactionType, editing?: Transaction) => void;
  onOpenSettings: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type DateFilterOption = 'all' | 'this_month' | 'last_month' | 'last_7_days';

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  onOpenTransactionForm,
  onOpenSettings,
  onShowToast,
}) => {
  const { colors, isDark } = useTheme();
  const db = DatabaseManager.getInstance();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

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

  const loadData = async () => {
    const txList = await db.repos.transactions.getAll();
    setTransactions(txList);
    const catList = await db.repos.categories.getAll();
    setCategories(catList);
    const accList = await db.repos.accounts.getAll(true);
    setAccounts(accList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
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
        const catName = categories.find((c) => c.id === tx.categoryId)?.name.toLowerCase() || '';
        const accName = accounts.find((a) => a.id === tx.accountId)?.name.toLowerCase() || '';
        const matches =
          tx.title.toLowerCase().includes(q) ||
          (tx.notes || '').toLowerCase().includes(q) ||
          catName.includes(q) ||
          accName.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [
    transactions,
    categories,
    accounts,
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
    const map = new Map<string, Transaction[]>();
    for (const tx of filteredTransactions) {
      const dateKey = tx.dateISO.slice(0, 10);
      const list = map.get(dateKey) || [];
      list.push(tx);
      map.set(dateKey, list);
    }

    const groups: Array<{
      dateKey: string;
      label: string;
      items: Transaction[];
      netDayKobo: number;
    }> = [];

    for (const [dateKey, items] of map.entries()) {
      let netDayKobo = 0;
      for (const item of items) {
        if (item.type === 'income') netDayKobo += item.amountKobo;
        else if (item.type === 'expense') netDayKobo -= item.amountKobo;
      }
      groups.push({
        dateKey,
        label: formatGroupDateHeader(dateKey, 'DD MMM YYYY'),
        items,
        netDayKobo,
      });
    }

    return groups.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredTransactions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await db.repos.transactions.delete(deleteTarget.id);
    onShowToast('Transaction deleted', 'info');
    setDeleteTarget(null);
    if (selectedTx?.id === deleteTarget.id) {
      setSelectedTx(null);
    }
    await loadData();
  };

  const activeFiltersCount =
    (typeFilter !== 'all' ? 1 : 0) +
    (accountFilter !== 'all' ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (dateFilter !== 'all' ? 1 : 0);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Transactions"
        subtitle={`${filteredTransactions.length} entries`}
        onOpenSettings={onOpenSettings}
      />

      <View style={styles.headerControls}>
        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search transactions, notes, categories..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Filter Toggle Button */}
        <Pressable
          onPress={() => setShowFilters((prev) => !prev)}
          style={[
            styles.filterToggleBtn,
            {
              backgroundColor: showFilters || activeFiltersCount > 0
                ? (isDark ? 'rgba(8, 127, 91, 0.25)' : colors.mintTint)
                : colors.surface,
              borderColor: showFilters || activeFiltersCount > 0
                ? colors.primary
                : colors.border,
            },
          ]}
        >
          <SlidersHorizontal
            size={16}
            color={
              showFilters || activeFiltersCount > 0
                ? colors.primary
                : colors.textSecondary
            }
          />
          {activeFiltersCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Expandable Filter Chips */}
      {showFilters && (
        <View
          style={[
            styles.filtersDrawer,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.borderSubtle,
            },
          ]}
        >
          {/* Type Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
            {(['all', 'expense', 'income', 'transfer'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTypeFilter(t)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      typeFilter === t
                        ? colors.primary
                        : (isDark ? colors.surfaceSubtle : '#F1F5F9'),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: typeFilter === t ? '#FFFFFF' : colors.textSecondary,
                      fontWeight: typeFilter === t ? '700' : '500',
                    },
                  ]}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Date Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'last_7_days', label: 'Last 7 Days' },
            ].map((df) => (
              <Pressable
                key={df.id}
                onPress={() => setDateFilter(df.id as DateFilterOption)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      dateFilter === df.id
                        ? colors.primary
                        : (isDark ? colors.surfaceSubtle : '#F1F5F9'),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: dateFilter === df.id ? '#FFFFFF' : colors.textSecondary,
                      fontWeight: dateFilter === df.id ? '700' : '500',
                    },
                  ]}
                >
                  {df.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Reset Filters CTA if active */}
          {activeFiltersCount > 0 && (
            <Pressable
              onPress={() => {
                setTypeFilter('all');
                setAccountFilter('all');
                setCategoryFilter('all');
                setDateFilter('all');
                setSearchQuery('');
              }}
              style={styles.clearAllBtn}
            >
              <Text style={[styles.clearAllText, { color: colors.semantic.expense }]}>
                Reset all filters
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Main Grouped List */}
      <FlatList
        data={groupedByDate}
        keyExtractor={(item) => item.dateKey}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Transactions Found"
            description="No transactions match your current search or filter criteria."
            actionLabel="Add Transaction"
            onAction={() => onOpenTransactionForm('expense')}
          />
        }
        renderItem={({ item: group }) => (
          <View style={styles.groupContainer}>
            {/* Date Group Header */}
            <View style={styles.groupHeader}>
              <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                {group.label}
              </Text>
              {group.netDayKobo !== 0 && (
                <Text
                  style={[
                    styles.groupNet,
                    {
                      color:
                        group.netDayKobo > 0
                          ? (isDark ? colors.semantic.incomeBright : colors.semantic.income)
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {group.netDayKobo > 0 ? '+' : ''}
                  {formatNaira(group.netDayKobo, { hideDecimalsIfWhole: true })}
                </Text>
              )}
            </View>

            {/* Transactions in Date Group */}
            {group.items.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                category={categories.find((c) => c.id === tx.categoryId)}
                account={accounts.find((a) => a.id === tx.accountId)}
                destinationAccount={accounts.find((a) => a.id === tx.destinationAccountId)}
                onPress={() => setSelectedTx(tx)}
              />
            ))}
          </View>
        )}
      />

      {/* Transaction Detail Bottom Sheet */}
      <BottomSheet
        isOpen={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        title={selectedTx?.title || 'Transaction Details'}
        subtitle={selectedTx?.dateISO ? formatDate(selectedTx.dateISO) : ''}
      >
        {selectedTx && (
          <View style={styles.detailContainer}>
            {/* Detail Amount Card */}
            <View
              style={[
                styles.detailAmountCard,
                {
                  backgroundColor:
                    selectedTx.type === 'income'
                      ? (isDark ? 'rgba(22, 163, 74, 0.2)' : colors.mintTint)
                      : selectedTx.type === 'expense'
                      ? (isDark ? 'rgba(220, 92, 92, 0.2)' : 'rgba(220, 92, 92, 0.1)')
                      : (isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.1)'),
                },
              ]}
            >
              <Text style={[styles.detailAmountLabel, { color: colors.textSecondary }]}>
                {selectedTx.type.toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.detailAmountValue,
                  {
                    color:
                      selectedTx.type === 'income'
                        ? (isDark ? colors.semantic.incomeBright : colors.semantic.income)
                        : selectedTx.type === 'expense'
                        ? (isDark ? colors.semantic.expenseBright : colors.semantic.expense)
                        : (isDark ? colors.semantic.transferBright : colors.semantic.transfer),
                  },
                ]}
              >
                {selectedTx.type === 'income' ? '+' : selectedTx.type === 'expense' ? '-' : ''}
                {formatNaira(selectedTx.amountKobo, { hideDecimalsIfWhole: true })}
              </Text>
            </View>

            {/* Info Rows */}
            <View style={styles.detailRowsContainer}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailRowLabel, { color: colors.textSecondary }]}>
                  Account
                </Text>
                <Text style={[styles.detailRowValue, { color: colors.textPrimary }]}>
                  {accounts.find((a) => a.id === selectedTx.accountId)?.name || 'Account'}
                  {selectedTx.type === 'transfer'
                    ? ` → ${accounts.find((a) => a.id === selectedTx.destinationAccountId)?.name || 'Account'}`
                    : ''}
                </Text>
              </View>

              {selectedTx.type !== 'transfer' && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailRowLabel, { color: colors.textSecondary }]}>
                    Category
                  </Text>
                  <Text style={[styles.detailRowValue, { color: colors.textPrimary }]}>
                    {categories.find((c) => c.id === selectedTx.categoryId)?.name || 'Uncategorized'}
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={[styles.detailRowLabel, { color: colors.textSecondary }]}>
                  Date & Time
                </Text>
                <Text style={[styles.detailRowValue, { color: colors.textPrimary }]}>
                  {formatDate(selectedTx.dateISO)} · {formatTime(selectedTx.dateISO)}
                </Text>
              </View>

              {selectedTx.notes ? (
                <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                  <Text style={[styles.detailRowLabel, { color: colors.textSecondary }]}>
                    Notes
                  </Text>
                  <Text
                    style={[
                      styles.detailRowValue,
                      { color: colors.textPrimary, flex: 1, textAlign: 'right' },
                    ]}
                  >
                    {selectedTx.notes}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Action Buttons */}
            <View style={styles.detailActionsRow}>
              <Button
                label="Edit"
                onPress={() => {
                  const target = selectedTx;
                  setSelectedTx(null);
                  onOpenTransactionForm(target.type, target);
                }}
                variant="outline"
                size="md"
                leftIcon={<Pencil size={16} color={colors.textPrimary} />}
                style={{ flex: 1 }}
              />
              <Button
                label="Delete"
                onPress={() => {
                  setDeleteTarget(selectedTx);
                }}
                variant="danger"
                size="md"
                leftIcon={<Trash2 size={16} color="#FFFFFF" />}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </BottomSheet>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={Boolean(deleteTarget)}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will reverse its effect on your wallet balance.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Floating Add Button */}
      <Pressable
        onPress={() => onOpenTransactionForm('expense')}
        accessibilityRole="button"
        accessibilityLabel="Add new transaction"
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingVertical: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  filterToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  filtersDrawer: {
    paddingVertical: 10,
    paddingHorizontal: DesignTokens.spacing.lg,
    borderBottomWidth: 1,
    gap: 8,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: DesignTokens.radii.full,
  },
  filterChipText: {
    fontSize: 12,
  },
  clearAllBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingBottom: 90,
  },
  groupContainer: {
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupNet: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  detailContainer: {
    paddingBottom: 24,
  },
  detailAmountCard: {
    padding: 16,
    borderRadius: DesignTokens.radii.xl,
    alignItems: 'center',
    marginBottom: 20,
  },
  detailAmountLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  detailAmountValue: {
    fontSize: 30,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
    marginTop: 4,
  },
  detailRowsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailRowLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailRowValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#087F5B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
