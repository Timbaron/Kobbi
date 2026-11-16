import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CalendarClock,
  Check,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Account, Category, RecurrenceFrequency, RecurringTransaction } from '../../types/finance';
import { DatabaseManager } from '../../database';
import { AppHeader } from '../../components/common/AppHeader';
import { Button } from '../../components/common/Button';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { EmptyState } from '../../components/common/EmptyState';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { CategorySelector } from '../../components/finance/CategorySelector';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { getUpcomingOccurrences } from '../../utils/calculations';
import { daysBetween, formatDate, toDateOnlyISO } from '../../utils/date';
import { formatNaira } from '../../utils/money';

interface RecurringScreenProps {
  onBack: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const RecurringScreen: React.FC<RecurringScreenProps> = ({
  onBack,
  onShowToast,
}) => {
  const { colors, isDark } = useTheme();
  const db = DatabaseManager.getInstance();

  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [statusFilter, setStatusFilter] = useState<'active' | 'paused'>('active');
  const [selectedItem, setSelectedItem] = useState<RecurringTransaction | null>(null);

  // Create / Edit Form Sheet
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);
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

  const [deleteTarget, setDeleteTarget] = useState<RecurringTransaction | null>(null);

  const loadData = async () => {
    const list = await db.repos.recurring.getAll();
    setRecurring(list);
    const catList = await db.repos.categories.getAll();
    setCategories(catList);
    const accList = await db.repos.accounts.getAll(false);
    setAccounts(accList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(
    () => recurring.filter((r) => r.status === statusFilter),
    [recurring, statusFilter]
  );

  const openCreate = () => {
    setEditingItem(null);
    setTitle('');
    setType('expense');
    setAmountKobo(0);
    setCategoryId(categories.find((c) => c.type === 'expense')?.id || '');
    setAccountId(accounts[0]?.id || '');
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

  const handleSave = async () => {
    if (!title.trim()) {
      setFormError('Please enter a schedule title.');
      return;
    }
    if (amountKobo <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }
    if (!categoryId) {
      setFormError('Please select a category.');
      return;
    }
    if (!accountId) {
      setFormError('Please select an account.');
      return;
    }

    try {
      if (editingItem) {
        await db.repos.recurring.update(editingItem.id, {
          title: title.trim(),
          type,
          amountKobo,
          categoryId,
          accountId,
          frequency,
          startDateISO,
          endDateISO: endDateISO.trim() || undefined,
          autoRecord,
          notes: notes.trim() || undefined,
        });
        onShowToast('Schedule updated');
      } else {
        await db.repos.recurring.create({
          title: title.trim(),
          type,
          amountKobo,
          categoryId,
          accountId,
          frequency,
          startDateISO,
          endDateISO: endDateISO.trim() || undefined,
          nextDueDateISO: startDateISO,
          status: 'active',
          autoRecord,
          notes: notes.trim() || undefined,
        });
        onShowToast(`Schedule "${title.trim()}" created`);
      }
      setFormOpen(false);
      await loadData();
    } catch (e: any) {
      setFormError(e.message || 'Error saving recurring schedule.');
    }
  };

  const handleRecordNow = async (item: RecurringTransaction) => {
    const res = await db.repos.recurring.recordOccurrence(item.id);
    if (!res.ok) {
      onShowToast(res.error || 'Failed to record occurrence.', 'error');
      return;
    }
    onShowToast(`"${item.title}" recorded to ledger`);
    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
    }
    await loadData();
  };

  const handleToggleStatus = async (item: RecurringTransaction) => {
    const next = await db.repos.recurring.toggleStatus(item.id);
    onShowToast(next === 'paused' ? 'Schedule paused' : 'Schedule resumed', 'info');
    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
    }
    await loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await db.repos.recurring.delete(deleteTarget.id);
    onShowToast('Schedule removed', 'info');
    setDeleteTarget(null);
    if (selectedItem?.id === deleteTarget.id) {
      setSelectedItem(null);
    }
    await loadData();
  };

  const todayStr = toDateOnlyISO(new Date());

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Recurring & Subscriptions"
        subtitle={`${recurring.filter((r) => r.status === 'active').length} active schedules`}
        showBack
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Card */}
        <View
          style={[
            styles.headerCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.headerTopRow}>
            <View>
              <Text style={[styles.headerCardLabel, { color: colors.textSecondary }]}>
                Scheduled Commitments
              </Text>
              <Text style={[styles.headerCardTitle, { color: colors.textPrimary }]}>
                Never miss a bill
              </Text>
              <Text style={[styles.headerCardSubtext, { color: colors.textSecondary }]}>
                Kobbi tracks recurring salaries, rent, and subscriptions with reminder notices.
              </Text>
            </View>

            <Button
              label="Add Schedule"
              onPress={openCreate}
              size="sm"
              leftIcon={<Plus size={15} color="#FFFFFF" />}
            />
          </View>
        </View>

        {/* Status Filters Tabs */}
        <View
          style={[
            styles.filterTabsContainer,
            { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
          ]}
        >
          {(['active', 'paused'] as const).map((st) => (
            <Pressable
              key={st}
              onPress={() => setStatusFilter(st)}
              style={[
                styles.filterTab,
                statusFilter === st && {
                  backgroundColor: colors.surface,
                  shadowColor: '#000000',
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  {
                    color: statusFilter === st ? colors.primary : colors.textSecondary,
                    fontWeight: statusFilter === st ? '700' : '500',
                  },
                ]}
              >
                {st.charAt(0).toUpperCase() + st.slice(1)} (
                {recurring.filter((r) => r.status === st).length})
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Schedules List */}
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={24} color={colors.primary} />}
            title={`No ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Schedules`}
            description={
              statusFilter === 'active'
                ? 'Create a schedule for monthly salary, fibre internet, electricity tokens, or rent.'
                : 'No schedules are currently paused.'
            }
            actionLabel={statusFilter === 'active' ? 'Add Schedule' : undefined}
            onAction={statusFilter === 'active' ? openCreate : undefined}
          />
        ) : (
          <View style={styles.list}>
            {filteredItems.map((item) => {
              const cat = categories.find((c) => c.id === item.categoryId);
              const acc = accounts.find((a) => a.id === item.accountId);
              const delta = daysBetween(todayStr, item.nextDueDateISO);
              const isDueTodayOrOverdue = delta <= 0;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedItem(item)}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isDueTodayOrOverdue
                        ? (isDark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.3)')
                        : colors.border,
                    },
                  ]}
                >
                  <View style={styles.itemTopRow}>
                    <View style={styles.itemLeft}>
                      <CategoryIcon
                        iconName={cat?.iconName || 'Tag'}
                        color="#FFFFFF"
                        backgroundColor={cat?.color || colors.primary}
                        size={38}
                        iconSize={19}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          numberOfLines={1}
                          style={[styles.itemTitle, { color: colors.textPrimary }]}
                        >
                          {item.title}
                        </Text>
                        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                          {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)} · {acc?.name || 'Account'}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.itemAmount,
                        {
                          color:
                            item.type === 'income'
                              ? (isDark ? colors.semantic.incomeBright : colors.semantic.income)
                              : colors.textPrimary,
                        },
                      ]}
                    >
                      {item.type === 'income' ? '+' : ''}
                      {formatNaira(item.amountKobo, { hideDecimalsIfWhole: true })}
                    </Text>
                  </View>

                  <View style={styles.itemBottomRow}>
                    <Text
                      style={[
                        styles.dueText,
                        {
                          color: isDueTodayOrOverdue
                            ? (isDark ? colors.semantic.warningBright : '#D97706')
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      Next: {formatDate(item.nextDueDateISO)}{' '}
                      {delta < 0 ? `(${Math.abs(delta)}d overdue)` : delta === 0 ? '(Due today)' : `(in ${delta}d)`}
                    </Text>

                    <Button
                      label="Record Now"
                      onPress={() => handleRecordNow(item)}
                      variant={isDueTodayOrOverdue ? 'primary' : 'outline'}
                      size="sm"
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Schedule Detail Bottom Sheet */}
      <BottomSheet
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title || 'Schedule Details'}
        subtitle={selectedItem ? `${selectedItem.frequency} ${selectedItem.type}` : ''}
      >
        {selectedItem && (
          <View style={styles.sheetInner}>
            <View style={styles.detailAmountBox}>
              <Text style={[styles.detailAmountText, { color: colors.textPrimary }]}>
                {formatNaira(selectedItem.amountKobo, { hideDecimalsIfWhole: true })}
              </Text>
              <Text style={[styles.detailFreqText, { color: colors.textSecondary }]}>
                Charged to {accounts.find((a) => a.id === selectedItem.accountId)?.name || 'Account'}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.detailActionsRow}>
              <Button
                label="Record Now"
                onPress={() => handleRecordNow(selectedItem)}
                size="sm"
                leftIcon={<Check size={15} color="#FFFFFF" />}
                style={{ flex: 1 }}
              />
              <Button
                label={selectedItem.status === 'active' ? 'Pause' : 'Resume'}
                onPress={() => handleToggleStatus(selectedItem)}
                variant="outline"
                size="sm"
                leftIcon={
                  selectedItem.status === 'active' ? (
                    <Pause size={15} color={colors.textPrimary} />
                  ) : (
                    <Play size={15} color={colors.primary} />
                  )
                }
                style={{ flex: 1 }}
              />
              <Button
                label="Edit"
                onPress={() => {
                  const target = selectedItem;
                  setSelectedItem(null);
                  openEdit(target);
                }}
                variant="outline"
                size="sm"
                leftIcon={<Pencil size={15} color={colors.textPrimary} />}
                style={{ flex: 1 }}
              />
              <Button
                label="Delete"
                onPress={() => setDeleteTarget(selectedItem)}
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={15} color="#FFFFFF" />}
                style={{ flex: 1 }}
              />
            </View>

            {/* Upcoming Occurrences Preview */}
            <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
              Upcoming 4 Occurrences
            </Text>
            <View style={styles.occurrencesList}>
              {getUpcomingOccurrences(selectedItem, 4).map((dateStr, idx) => (
                <View
                  key={dateStr}
                  style={[
                    styles.occurrenceItem,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Text style={[styles.occurrenceNumber, { color: colors.textSecondary }]}>
                    #{idx + 1}
                  </Text>
                  <Text style={[styles.occurrenceDate, { color: colors.textPrimary }]}>
                    {formatDate(dateStr)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </BottomSheet>

      {/* Create / Edit Form Sheet */}
      <BottomSheet
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingItem ? 'Edit Recurring Schedule' : 'New Recurring Schedule'}
        subtitle="Automate reminder alerts and financial tracking"
      >
        <View style={styles.sheetInner}>
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
              Schedule Title
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Monthly Salary, Spectranet Fibre"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
            />
          </View>

          <CurrencyInput
            label="Amount"
            valueKobo={amountKobo}
            onChangeKobo={setAmountKobo}
            quickPresets={[15000, 30000, 100000, 485000]}
          />

          {/* Frequency Selector */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
              Frequency
            </Text>
            <View style={styles.freqRow}>
              {(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'] as RecurrenceFrequency[]).map(
                (f) => (
                  <Pressable
                    key={f}
                    onPress={() => setFrequency(f)}
                    style={[
                      styles.freqChip,
                      {
                        backgroundColor:
                          frequency === f
                            ? (isDark ? 'rgba(8, 127, 91, 0.25)' : colors.mintTint)
                            : (isDark ? colors.surfaceSubtle : '#F1F5F9'),
                        borderColor: frequency === f ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.freqChipText,
                        { color: frequency === f ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </View>

          {/* Category Selector */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
              Category
            </Text>
            <CategorySelector
              categories={categories.filter((c) => c.type === type)}
              selectedCategoryId={categoryId}
              onSelectCategory={setCategoryId}
            />
          </View>

          {/* Account Picker */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
              Account / Wallet
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountChipsRow}>
              {accounts.map((acc) => {
                const isSelected = acc.id === accountId;
                return (
                  <Pressable
                    key={acc.id}
                    onPress={() => setAccountId(acc.id)}
                    style={[
                      styles.accountChip,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(8, 127, 91, 0.25)' : colors.mintTint)
                          : (isDark ? colors.surfaceSubtle : '#F8FAFC'),
                        borderColor: isSelected ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.accountChipText,
                        {
                          color: isSelected ? colors.primary : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {acc.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Start Date */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
              Start Date (YYYY-MM-DD)
            </Text>
            <TextInput
              value={startDateISO}
              onChangeText={setStartDateISO}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
            />
          </View>

          {formError ? (
            <Text style={[styles.errorText, { color: colors.semantic.expense }]}>
              {formError}
            </Text>
          ) : null}

          <Button
            label={editingItem ? 'Save Changes' : 'Create Schedule'}
            onPress={handleSave}
            size="lg"
            style={{ marginTop: 12 }}
          />
        </View>
      </BottomSheet>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={Boolean(deleteTarget)}
        title="Delete Schedule"
        message={`Are you sure you want to delete the "${deleteTarget?.title}" recurring schedule? Past recorded transactions will not be deleted.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: DesignTokens.spacing.lg,
    paddingBottom: 40,
  },
  headerCard: {
    padding: DesignTokens.spacing.lg,
    borderRadius: DesignTokens.radii.xl,
    borderWidth: 1,
    marginBottom: DesignTokens.spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerCardSubtext: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 260,
  },
  filterTabsContainer: {
    flexDirection: 'row',
    borderRadius: DesignTokens.radii.lg,
    padding: 3,
    marginBottom: DesignTokens.spacing.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: DesignTokens.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabText: {
    fontSize: 12,
  },
  list: {
    gap: 12,
  },
  itemCard: {
    padding: 14,
    borderRadius: DesignTokens.radii.xl,
    borderWidth: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(100, 116, 139, 0.1)',
  },
  dueText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sheetInner: {
    paddingBottom: 24,
  },
  detailAmountBox: {
    padding: 16,
    borderRadius: DesignTokens.radii.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
    marginBottom: 16,
  },
  detailAmountText: {
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  detailFreqText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  detailActionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  occurrencesList: {
    gap: 6,
  },
  occurrenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
  },
  occurrenceNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  occurrenceDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    height: 48,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '500',
  },
  freqRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  freqChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
  },
  freqChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  accountChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accountChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
  },
  accountChipText: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
});
