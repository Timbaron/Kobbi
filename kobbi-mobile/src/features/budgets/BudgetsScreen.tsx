import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AlertCircle, Pencil, PieChart, Plus } from 'lucide-react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { BudgetAllocation, Category, MonthlyBudget, Transaction } from '../../types/finance';
import { DatabaseManager } from '../../database';
import { AppHeader } from '../../components/common/AppHeader';
import { Button } from '../../components/common/Button';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { EmptyState } from '../../components/common/EmptyState';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { CategorySelector } from '../../components/finance/CategorySelector';
import { DateRangeSelector } from '../../components/finance/DateRangeSelector';
import { BudgetProgressCard } from '../../components/finance/BudgetProgressCard';
import {
  CategoryBudgetProgress,
  getBudgetSummary,
} from '../../utils/calculations';
import { getCurrentMonthKey } from '../../utils/date';
import { formatNaira, percentageOfKobo, sanitizeIntegerKobo } from '../../utils/money';

interface BudgetsScreenProps {
  onOpenSettings: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BudgetsScreen: React.FC<BudgetsScreenProps> = ({
  onOpenSettings,
  onShowToast,
}) => {
  const { colors, isDark } = useTheme();
  const db = DatabaseManager.getInstance();

  const [monthKey, setMonthKey] = useState<string>(getCurrentMonthKey());
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Total Budget Editor Sheet
  const [totalSheetOpen, setTotalSheetOpen] = useState(false);
  const [totalInputKobo, setTotalInputKobo] = useState<number>(0);

  // Category Allocation Editor Sheet
  const [allocSheetOpen, setAllocSheetOpen] = useState(false);
  const [editingAllocId, setEditingAllocId] = useState<string | undefined>(undefined);
  const [allocCategoryId, setAllocCategoryId] = useState<string>('');
  const [allocMode, setAllocMode] = useState<'fixed' | 'percent'>('fixed');
  const [allocAmountKobo, setAllocAmountKobo] = useState<number>(0);
  const [allocPercent, setAllocPercent] = useState<string>('15');
  const [allocError, setAllocError] = useState<string>('');

  const [deleteTarget, setDeleteTarget] = useState<CategoryBudgetProgress | null>(null);

  const loadData = async () => {
    const b = await db.repos.budgets.getMonthlyBudget(monthKey);
    setBudget(b);
    const txList = await db.repos.transactions.getAll({ monthKey });
    setTransactions(txList);
    const catList = await db.repos.categories.getAll();
    setCategories(catList);
  };

  useEffect(() => {
    loadData();
  }, [monthKey]);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  const budgetSummary = useMemo(
    () => getBudgetSummary(budget || undefined, transactions, categories, monthKey),
    [budget, transactions, categories, monthKey]
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

  const handleSaveTotal = async () => {
    await db.repos.budgets.setTotalBudget(monthKey, totalInputKobo);
    onShowToast('Monthly budget updated');
    setTotalSheetOpen(false);
    await loadData();
  };

  const handleSaveAllocation = async () => {
    const pctNum = Math.max(0, Math.min(100, parseFloat(allocPercent) || 0));
    if (allocMode === 'percent' && pctNum <= 0) {
      setAllocError('Enter a percentage greater than 0%.');
      return;
    }

    try {
      await db.repos.budgets.upsertAllocation(monthKey, {
        id: editingAllocId,
        categoryId: allocCategoryId,
        mode: allocMode,
        amountKobo:
          allocMode === 'percent'
            ? percentageOfKobo(budgetSummary.totalBudgetKobo, pctNum)
            : allocAmountKobo,
        percentValue: allocMode === 'percent' ? pctNum : undefined,
      });

      onShowToast('Category allocation saved');
      setAllocSheetOpen(false);
      await loadData();
    } catch (e: any) {
      setAllocError(e.message || 'Invalid allocation.');
    }
  };

  const handleDeleteAllocation = async () => {
    if (!deleteTarget) return;
    await db.repos.budgets.deleteAllocation(deleteTarget.allocationId);
    onShowToast('Allocation removed', 'info');
    setDeleteTarget(null);
    await loadData();
  };

  const overallBarPct = Math.min(100, Math.max(0, budgetSummary.percentUsed));
  const overallBarColor = budgetSummary.isOverBudget
    ? colors.semantic.expense
    : budgetSummary.percentUsed >= 80
    ? colors.semantic.warning
    : colors.primary;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Budgets & Planning"
        subtitle="Manage category limits"
        onOpenSettings={onOpenSettings}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Month Selector */}
        <DateRangeSelector monthKey={monthKey} onChangeMonth={setMonthKey} />

        {/* Total Budget Card */}
        <View
          style={[
            styles.totalCard,
            {
              backgroundColor: colors.surface,
              borderColor: budgetSummary.isOverBudget
                ? (isDark ? 'rgba(220, 92, 92, 0.4)' : 'rgba(220, 92, 92, 0.3)')
                : colors.border,
            },
          ]}
        >
          <View style={styles.totalTopRow}>
            <View>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                Total Spending Budget
              </Text>
              <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
                {formatNaira(budgetSummary.totalBudgetKobo, { hideDecimalsIfWhole: true })}
              </Text>
            </View>

            <Button
              label={budgetSummary.hasBudget ? 'Edit Budget' : 'Set Budget'}
              onPress={openTotalEditor}
              variant="outline"
              size="sm"
              leftIcon={<Pencil size={14} color={colors.textPrimary} />}
            />
          </View>

          {budgetSummary.hasBudget ? (
            <View style={styles.budgetStatsContainer}>
              {/* Progress Bar */}
              <View
                style={[
                  styles.overallBarBg,
                  { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
                ]}
              >
                <View
                  style={[
                    styles.overallBarFill,
                    {
                      width: `${overallBarPct}%`,
                      backgroundColor: overallBarColor,
                    },
                  ]}
                />
              </View>

              <View style={styles.statsRow}>
                <View>
                  <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                    Spent this month
                  </Text>
                  <Text style={[styles.statMainText, { color: colors.textPrimary }]}>
                    {formatNaira(budgetSummary.totalSpentKobo, { hideDecimalsIfWhole: true })}
                    <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary }}>
                      {' '}({budgetSummary.percentUsed}%)
                    </Text>
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                    {budgetSummary.remainingBudgetKobo >= 0 ? 'Remaining' : 'Over budget'}
                  </Text>
                  <Text
                    style={[
                      styles.statMainText,
                      {
                        color:
                          budgetSummary.remainingBudgetKobo >= 0
                            ? colors.primary
                            : colors.semantic.expense,
                      },
                    ]}
                  >
                    {formatNaira(Math.abs(budgetSummary.remainingBudgetKobo), {
                      hideDecimalsIfWhole: true,
                    })}
                  </Text>
                </View>
              </View>

              {/* Unallocated Pill */}
              <View
                style={[
                  styles.unallocatedPill,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9',
                  },
                ]}
              >
                <Text style={[styles.unallocatedText, { color: colors.textSecondary }]}>
                  Allocated: {formatNaira(budgetSummary.totalAllocatedKobo, { hideDecimalsIfWhole: true })}{' '}
                  · Unallocated: {formatNaira(budgetSummary.unallocatedKobo, { hideDecimalsIfWhole: true })}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noBudgetNote}>
              <Text style={[styles.noBudgetText, { color: colors.textSecondary }]}>
                You have not set a total budget for this month. Setting a monthly limit lets you plan category spending.
              </Text>
            </View>
          )}
        </View>

        {/* Category Allocations Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Category Allocations ({budgetSummary.categories.length})
          </Text>

          {budgetSummary.hasBudget && (
            <Button
              label="Allocate"
              onPress={openNewAllocation}
              size="sm"
              leftIcon={<Plus size={15} color="#FFFFFF" />}
            />
          )}
        </View>

        {budgetSummary.categories.length === 0 ? (
          <EmptyState
            icon={<PieChart size={24} color={colors.primary} />}
            title="No Categories Allocated"
            description="Allocate monthly amounts to categories like Food, Transport, and Power to track your habits."
            actionLabel={budgetSummary.hasBudget ? 'Add Category Allocation' : 'Set Total Budget First'}
            onAction={budgetSummary.hasBudget ? openNewAllocation : openTotalEditor}
          />
        ) : (
          <View style={styles.allocationsList}>
            {budgetSummary.categories.map((item) => (
              <BudgetProgressCard
                key={item.allocationId}
                progress={item}
                onEdit={() => openEditAllocation(item)}
                onDelete={() => setDeleteTarget(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Total Budget Edit Bottom Sheet */}
      <BottomSheet
        isOpen={totalSheetOpen}
        onClose={() => setTotalSheetOpen(false)}
        title="Set Total Monthly Budget"
        subtitle="Spending ceiling for all categories"
      >
        <View style={styles.sheetInner}>
          <CurrencyInput
            label="Target Monthly Budget"
            valueKobo={totalInputKobo}
            onChangeKobo={setTotalInputKobo}
            quickPresets={[150000, 250000, 350000, 500000]}
            helperText="Budgeting plans your spending. It never moves money or creates expenses."
          />

          <Button
            label="Save Budget"
            onPress={handleSaveTotal}
            size="lg"
            style={{ marginTop: 12 }}
          />
        </View>
      </BottomSheet>

      {/* Category Allocation Bottom Sheet */}
      <BottomSheet
        isOpen={allocSheetOpen}
        onClose={() => setAllocSheetOpen(false)}
        title={editingAllocId ? 'Edit Allocation' : 'Allocate Category'}
        subtitle={`Available to allocate: ${formatNaira(budgetSummary.unallocatedKobo, { hideDecimalsIfWhole: true })}`}
      >
        <View style={styles.sheetInner}>
          {/* Mode Switcher */}
          <View
            style={[
              styles.modeSwitcher,
              { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
            ]}
          >
            <Pressable
              onPress={() => setAllocMode('fixed')}
              style={[
                styles.modeTab,
                allocMode === 'fixed' && {
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
                  styles.modeTabText,
                  {
                    color: allocMode === 'fixed' ? colors.primary : colors.textSecondary,
                    fontWeight: allocMode === 'fixed' ? '700' : '500',
                  },
                ]}
              >
                Fixed Amount (₦)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setAllocMode('percent')}
              style={[
                styles.modeTab,
                allocMode === 'percent' && {
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
                  styles.modeTabText,
                  {
                    color: allocMode === 'percent' ? colors.primary : colors.textSecondary,
                    fontWeight: allocMode === 'percent' ? '700' : '500',
                  },
                ]}
              >
                Percentage (%)
              </Text>
            </Pressable>
          </View>

          {/* Category Selector */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
              Select Expense Category
            </Text>
            <CategorySelector
              categories={expenseCategories}
              selectedCategoryId={allocCategoryId}
              onSelectCategory={setAllocCategoryId}
            />
          </View>

          {/* Mode Input */}
          {allocMode === 'fixed' ? (
            <CurrencyInput
              label="Allocated Amount"
              valueKobo={allocAmountKobo}
              onChangeKobo={setAllocAmountKobo}
              quickPresets={[15000, 30000, 50000, 75000]}
            />
          ) : (
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                Percentage of Budget (%)
              </Text>
              <TextInput
                value={allocPercent}
                onChangeText={setAllocPercent}
                keyboardType="numeric"
                placeholder="e.g. 25"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.percentInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
              />
              <Text style={[styles.helperText, { color: colors.textMuted }]}>
                Resolves to ~{formatNaira(
                  percentageOfKobo(
                    budgetSummary.totalBudgetKobo,
                    parseFloat(allocPercent) || 0
                  ),
                  { hideDecimalsIfWhole: true }
                )}
              </Text>
            </View>
          )}

          {allocError ? (
            <Text style={[styles.errorText, { color: colors.semantic.expense }]}>
              {allocError}
            </Text>
          ) : null}

          <Button
            label={editingAllocId ? 'Update Allocation' : 'Save Allocation'}
            onPress={handleSaveAllocation}
            size="lg"
            style={{ marginTop: 12 }}
          />
        </View>
      </BottomSheet>

      {/* Delete Allocation Confirmation Modal */}
      <ConfirmationModal
        visible={Boolean(deleteTarget)}
        title="Remove Allocation"
        message={`Do you want to remove the ${deleteTarget?.categoryName} budget allocation? Past transactions in this category will not be deleted.`}
        confirmLabel="Remove"
        isDestructive
        onConfirm={handleDeleteAllocation}
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
  totalCard: {
    padding: DesignTokens.spacing.lg,
    borderRadius: DesignTokens.radii.xl,
    borderWidth: 1,
    marginBottom: DesignTokens.spacing.lg,
  },
  totalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  budgetStatsContainer: {
    marginTop: 16,
  },
  overallBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  overallBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statSubText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statMainText: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  unallocatedPill: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: DesignTokens.radii.md,
    alignItems: 'center',
  },
  unallocatedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  noBudgetNote: {
    marginTop: 12,
  },
  noBudgetText: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DesignTokens.spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  allocationsList: {
    gap: 10,
  },
  sheetInner: {
    paddingBottom: 24,
  },
  modeSwitcher: {
    flexDirection: 'row',
    borderRadius: DesignTokens.radii.lg,
    padding: 3,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: DesignTokens.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabText: {
    fontSize: 13,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  percentInput: {
    height: 48,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 11,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
});
