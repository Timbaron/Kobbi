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
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Pencil,
  Plus,
  Target,
  Trash2,
} from 'lucide-react-native';
import { DesignTokens, CategoryColors } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { GoalStatus, SavingsGoal } from '../../types/finance';
import { DatabaseManager } from '../../database';
import { AppHeader } from '../../components/common/AppHeader';
import { Button } from '../../components/common/Button';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { EmptyState } from '../../components/common/EmptyState';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { GoalCard } from '../../components/finance/GoalCard';
import { formatDate, toDateOnlyISO } from '../../utils/date';
import { computePercent, formatNaira } from '../../utils/money';

interface GoalsScreenProps {
  onOpenSettings: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const GOAL_ICONS = ['ShieldCheck', 'Home', 'Laptop', 'Plane', 'Briefcase', 'Gift', 'Car'];

export const GoalsScreen: React.FC<GoalsScreenProps> = ({
  onOpenSettings,
  onShowToast,
}) => {
  const { colors, isDark } = useTheme();
  const db = DatabaseManager.getInstance();

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [statusFilter, setStatusFilter] = useState<GoalStatus>('active');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Contribution Sheet
  const [contribGoal, setContribGoal] = useState<SavingsGoal | null>(null);
  const [contribKobo, setContribKobo] = useState(0);
  const [contribNote, setContribNote] = useState('');
  const [contribError, setContribError] = useState('');

  // Create / Edit Goal Sheet
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalName, setGoalName] = useState('');
  const [targetKobo, setTargetKobo] = useState(0);
  const [targetDate, setTargetDate] = useState('');
  const [goalIcon, setGoalIcon] = useState('ShieldCheck');
  const [goalColor, setGoalColor] = useState<string>(CategoryColors[0]);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null);

  const loadData = async () => {
    const list = await db.repos.goals.getAll();
    setGoals(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredGoals = useMemo(
    () => goals.filter((g) => g.status === statusFilter),
    [goals, statusFilter]
  );

  const selectedGoal = useMemo(
    () => goals.find((g) => g.id === selectedGoalId) || null,
    [goals, selectedGoalId]
  );

  const totalSavedActive = useMemo(
    () =>
      goals
        .filter((g) => g.status !== 'archived')
        .reduce((sum, g) => sum + g.savedAmountKobo, 0),
    [goals]
  );

  const totalTargetActive = useMemo(
    () =>
      goals
        .filter((g) => g.status !== 'archived')
        .reduce((sum, g) => sum + g.targetAmountKobo, 0),
    [goals]
  );

  const overallPercent = computePercent(totalSavedActive, totalTargetActive);

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

  const handleSaveGoal = async () => {
    if (!goalName.trim()) {
      setFormError('Please enter a goal name.');
      return;
    }
    if (targetKobo <= 0) {
      setFormError('Target amount must be greater than zero.');
      return;
    }

    try {
      if (editingGoal) {
        await db.repos.goals.update(editingGoal.id, {
          name: goalName.trim(),
          targetAmountKobo: targetKobo,
          targetDateISO: targetDate,
          iconName: goalIcon,
          color: goalColor,
        });
        onShowToast('Goal updated');
      } else {
        await db.repos.goals.create({
          name: goalName.trim(),
          targetAmountKobo: targetKobo,
          targetDateISO: targetDate,
          iconName: goalIcon,
          color: goalColor,
        });
        onShowToast(`Goal "${goalName.trim()}" created`);
      }
      setGoalFormOpen(false);
      await loadData();
    } catch (e: any) {
      setFormError(e.message || 'Error saving goal.');
    }
  };

  const handleAddContribution = async () => {
    if (!contribGoal) return;
    if (contribKobo <= 0) {
      setContribError('Enter an amount greater than zero.');
      return;
    }

    try {
      await db.repos.goals.addContribution(contribGoal.id, contribKobo, contribNote);
      onShowToast('Contribution added to savings goal');
      setContribGoal(null);
      setContribKobo(0);
      setContribNote('');
      setContribError('');
      await loadData();
    } catch (e: any) {
      setContribError(e.message || 'Error recording contribution.');
    }
  };

  const handleToggleStatus = async (goal: SavingsGoal) => {
    const nextStatus: GoalStatus = goal.status === 'completed' ? 'active' : 'completed';
    await db.repos.goals.setStatus(goal.id, nextStatus);
    onShowToast(`Goal marked as ${nextStatus}`, 'info');
    await loadData();
  };

  const handleToggleArchive = async (goal: SavingsGoal) => {
    const nextStatus: GoalStatus = goal.status === 'archived' ? 'active' : 'archived';
    await db.repos.goals.setStatus(goal.id, nextStatus);
    onShowToast(nextStatus === 'archived' ? 'Goal archived' : 'Goal restored', 'info');
    if (selectedGoalId === goal.id) {
      setSelectedGoalId(null);
    }
    await loadData();
  };

  const handleDeleteGoal = async () => {
    if (!deleteTarget) return;
    await db.repos.goals.delete(deleteTarget.id);
    onShowToast('Goal deleted', 'info');
    setDeleteTarget(null);
    if (selectedGoalId === deleteTarget.id) {
      setSelectedGoalId(null);
    }
    await loadData();
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Savings Goals"
        subtitle={`${goals.filter((g) => g.status === 'active').length} active targets`}
        onOpenSettings={onOpenSettings}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Total Overview Card */}
        <View
          style={[
            styles.overviewCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.overviewTopRow}>
            <View>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>
                Total Saved Towards Goals
              </Text>
              <Text style={[styles.overviewAmount, { color: colors.textPrimary }]}>
                {formatNaira(totalSavedActive, { hideDecimalsIfWhole: true })}
              </Text>
              <Text style={[styles.overviewSubtext, { color: colors.textSecondary }]}>
                of {formatNaira(totalTargetActive, { hideDecimalsIfWhole: true })} total targets ({overallPercent}%)
              </Text>
            </View>

            <Button
              label="New Goal"
              onPress={openCreateGoal}
              size="sm"
              leftIcon={<Plus size={15} color="#FFFFFF" />}
            />
          </View>
        </View>

        {/* Status Filter Chips */}
        <View
          style={[
            styles.filterTabsContainer,
            { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
          ]}
        >
          {(['active', 'completed', 'archived'] as GoalStatus[]).map((st) => (
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
                {goals.filter((g) => g.status === st).length})
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Goals List */}
        {filteredGoals.length === 0 ? (
          <EmptyState
            icon={<Target size={24} color={colors.primary} />}
            title={`No ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Goals`}
            description={
              statusFilter === 'active'
                ? 'Create a savings target for an emergency fund, rent, tech upgrades, or business.'
                : `No goals are currently ${statusFilter}.`
            }
            actionLabel={statusFilter === 'active' ? 'Create First Goal' : undefined}
            onAction={statusFilter === 'active' ? openCreateGoal : undefined}
          />
        ) : (
          <View style={styles.goalsList}>
            {filteredGoals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onPress={() => setSelectedGoalId(g.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Goal Detail Bottom Sheet */}
      <BottomSheet
        isOpen={Boolean(selectedGoal)}
        onClose={() => setSelectedGoalId(null)}
        title={selectedGoal?.name || 'Goal Details'}
        subtitle={`Target date: ${selectedGoal ? formatDate(selectedGoal.targetDateISO) : ''}`}
      >
        {selectedGoal && (
          <View style={styles.sheetInner}>
            {/* Amount Banner */}
            <View
              style={[
                styles.detailBanner,
                {
                  backgroundColor: isDark ? colors.surfaceSubtle : colors.mintTint,
                },
              ]}
            >
              <Text style={[styles.detailBannerLabel, { color: colors.textSecondary }]}>
                Saved so far
              </Text>
              <Text style={[styles.detailBannerAmount, { color: colors.primary }]}>
                {formatNaira(selectedGoal.savedAmountKobo, { hideDecimalsIfWhole: true })}
              </Text>
              <Text style={[styles.detailBannerSubtext, { color: colors.textSecondary }]}>
                {computePercent(selectedGoal.savedAmountKobo, selectedGoal.targetAmountKobo)}% of{' '}
                {formatNaira(selectedGoal.targetAmountKobo, { hideDecimalsIfWhole: true })} target
              </Text>
            </View>

            {/* Actions Row */}
            <View style={styles.detailActionsRow}>
              <Button
                label="Add Savings"
                onPress={() => {
                  const target = selectedGoal;
                  setSelectedGoalId(null);
                  setContribGoal(target);
                  setContribKobo(0);
                  setContribNote('');
                  setContribError('');
                }}
                size="sm"
                leftIcon={<Plus size={15} color="#FFFFFF" />}
                style={{ flex: 1 }}
              />
              <Button
                label="Edit"
                onPress={() => {
                  const target = selectedGoal;
                  setSelectedGoalId(null);
                  openEditGoal(target);
                }}
                variant="outline"
                size="sm"
                leftIcon={<Pencil size={15} color={colors.textPrimary} />}
                style={{ flex: 1 }}
              />
              <Button
                label={selectedGoal.status === 'completed' ? 'Reopen' : 'Done'}
                onPress={() => handleToggleStatus(selectedGoal)}
                variant="outline"
                size="sm"
                leftIcon={<CheckCircle2 size={15} color={colors.primary} />}
                style={{ flex: 1 }}
              />
              <Button
                label={selectedGoal.status === 'archived' ? 'Restore' : 'Archive'}
                onPress={() => handleToggleArchive(selectedGoal)}
                variant="outline"
                size="sm"
                leftIcon={
                  selectedGoal.status === 'archived' ? (
                    <ArchiveRestore size={15} color={colors.primary} />
                  ) : (
                    <Archive size={15} color={colors.semantic.expense} />
                  )
                }
                style={{ flex: 1 }}
              />
            </View>

            {/* Contributions History */}
            <Text style={[styles.detailHistoryTitle, { color: colors.textPrimary }]}>
              Contribution Ledger ({selectedGoal.contributions.length})
            </Text>

            {selectedGoal.contributions.length === 0 ? (
              <Text style={[styles.emptyHistoryText, { color: colors.textMuted }]}>
                No contributions recorded yet. Tap "+ Add Savings" to track your first deposit.
              </Text>
            ) : (
              <View style={styles.contributionsList}>
                {selectedGoal.contributions.map((entry) => (
                  <View
                    key={entry.id}
                    style={[
                      styles.contribItem,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <View>
                      <Text style={[styles.contribAmount, { color: colors.textPrimary }]}>
                        +{formatNaira(entry.amountKobo, { hideDecimalsIfWhole: true })}
                      </Text>
                      {entry.note ? (
                        <Text style={[styles.contribNote, { color: colors.textSecondary }]}>
                          {entry.note}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.contribDate, { color: colors.textMuted }]}>
                      {formatDate(entry.dateISO)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Delete Goal Button */}
            <Pressable
              onPress={() => {
                setDeleteTarget(selectedGoal);
              }}
              style={styles.deleteGoalBtn}
            >
              <Trash2 size={15} color={colors.semantic.expense} />
              <Text style={[styles.deleteGoalText, { color: colors.semantic.expense }]}>
                Delete this goal
              </Text>
            </Pressable>
          </View>
        )}
      </BottomSheet>

      {/* Add Contribution Sheet */}
      <BottomSheet
        isOpen={Boolean(contribGoal)}
        onClose={() => setContribGoal(null)}
        title={`Add Savings to "${contribGoal?.name}"`}
        subtitle="Track progress without affecting cash balance"
      >
        <View style={styles.sheetInner}>
          <CurrencyInput
            label="Contribution Amount"
            valueKobo={contribKobo}
            onChangeKobo={setContribKobo}
            quickPresets={[10000, 25000, 50000, 100000]}
          />

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
              Note (Optional)
            </Text>
            <TextInput
              value={contribNote}
              onChangeText={setContribNote}
              placeholder="e.g. October savings transfer, project bonus"
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

          {contribError ? (
            <Text style={[styles.errorText, { color: colors.semantic.expense }]}>
              {contribError}
            </Text>
          ) : null}

          <Button
            label="Save Contribution"
            onPress={handleAddContribution}
            size="lg"
            style={{ marginTop: 12 }}
          />
        </View>
      </BottomSheet>

      {/* Create / Edit Goal Sheet */}
      <BottomSheet
        isOpen={goalFormOpen}
        onClose={() => setGoalFormOpen(false)}
        title={editingGoal ? 'Edit Goal' : 'Create Savings Goal'}
        subtitle="Set clear milestones for your future"
      >
        <View style={styles.sheetInner}>
          {/* Goal Name */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
              Goal Name
            </Text>
            <TextInput
              value={goalName}
              onChangeText={setGoalName}
              placeholder="e.g. Emergency Fund, Laptop Upgrade"
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

          {/* Target Amount */}
          <CurrencyInput
            label="Target Amount"
            valueKobo={targetKobo}
            onChangeKobo={setTargetKobo}
            quickPresets={[250000, 500000, 1000000, 2500000]}
          />

          {/* Target Date */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
              Target Date (YYYY-MM-DD)
            </Text>
            <TextInput
              value={targetDate}
              onChangeText={setTargetDate}
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

          {/* Icon Picker */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
              Goal Icon
            </Text>
            <View style={styles.iconsPickerRow}>
              {GOAL_ICONS.map((ic) => (
                <Pressable
                  key={ic}
                  onPress={() => setGoalIcon(ic)}
                  style={[
                    styles.iconPickerChip,
                    {
                      backgroundColor:
                        goalIcon === ic
                          ? (isDark ? 'rgba(8, 127, 91, 0.25)' : colors.mintTint)
                          : (isDark ? colors.surfaceSubtle : '#F1F5F9'),
                      borderColor: goalIcon === ic ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                >
                  <CategoryIcon
                    iconName={ic}
                    color={goalIcon === ic ? colors.primary : colors.textSecondary}
                    size={32}
                    iconSize={16}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Color Palette */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
              Goal Color
            </Text>
            <View style={styles.colorPaletteRow}>
              {CategoryColors.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setGoalColor(c)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    goalColor === c && styles.colorCircleSelected,
                  ]}
                />
              ))}
            </View>
          </View>

          {formError ? (
            <Text style={[styles.errorText, { color: colors.semantic.expense }]}>
              {formError}
            </Text>
          ) : null}

          <Button
            label={editingGoal ? 'Update Goal' : 'Create Goal'}
            onPress={handleSaveGoal}
            size="lg"
            style={{ marginTop: 12 }}
          />
        </View>
      </BottomSheet>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={Boolean(deleteTarget)}
        title="Delete Savings Goal"
        message={`Are you sure you want to delete "${deleteTarget?.name}" and all its saved progress history?`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={handleDeleteGoal}
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
  overviewCard: {
    padding: DesignTokens.spacing.lg,
    borderRadius: DesignTokens.radii.xl,
    borderWidth: 1,
    marginBottom: DesignTokens.spacing.lg,
  },
  overviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  overviewAmount: {
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  overviewSubtext: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
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
  goalsList: {
    gap: 4,
  },
  sheetInner: {
    paddingBottom: 24,
  },
  detailBanner: {
    padding: 16,
    borderRadius: DesignTokens.radii.xl,
    alignItems: 'center',
    marginBottom: 16,
  },
  detailBannerLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailBannerAmount: {
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
    marginVertical: 4,
  },
  detailBannerSubtext: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailActionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  detailHistoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyHistoryText: {
    fontSize: 12,
    lineHeight: 18,
    paddingVertical: 10,
  },
  contributionsList: {
    gap: 8,
    marginBottom: 16,
  },
  contribItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
  },
  contribAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  contribNote: {
    fontSize: 11,
    marginTop: 2,
  },
  contribDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  deleteGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 10,
  },
  deleteGoalText: {
    fontSize: 13,
    fontWeight: '600',
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
  iconsPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconPickerChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPaletteRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
});
