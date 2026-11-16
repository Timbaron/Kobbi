import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { CategoryBudgetProgress } from '../../utils/calculations';
import { CategoryIcon } from '../ui/CategoryIcon';
import { formatNaira } from '../../utils/money';

interface BudgetProgressCardProps {
  progress: CategoryBudgetProgress;
  currencySymbol?: string;
  hideBalances?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const BudgetProgressCard: React.FC<BudgetProgressCardProps> = ({
  progress,
  currencySymbol = '₦',
  hideBalances = false,
  onEdit,
  onDelete,
}) => {
  const { colors, isDark } = useTheme();

  const barWidth = Math.min(100, Math.max(0, progress.percentUsed));

  const barColor = progress.isOverspent
    ? colors.semantic.expense
    : progress.percentUsed >= 80
    ? colors.semantic.warning
    : colors.primary;

  const statusTextColor = progress.isOverspent
    ? (isDark ? colors.semantic.expenseBright : colors.semantic.expense)
    : progress.percentUsed >= 80
    ? (isDark ? colors.semantic.warningBright : '#D97706')
    : (isDark ? colors.mintGreen : colors.primary);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: progress.isOverspent
            ? (isDark ? 'rgba(220, 92, 92, 0.4)' : 'rgba(220, 92, 92, 0.3)')
            : colors.border,
        },
      ]}
    >
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <CategoryIcon
            iconName={progress.iconName}
            color="#FFFFFF"
            backgroundColor={progress.color}
            size={36}
            iconSize={18}
          />
          <View>
            <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
              {progress.categoryName}
            </Text>
            <Text style={[styles.modeBadge, { color: colors.textMuted }]}>
              {progress.mode === 'percent'
                ? `${progress.percentValue}% of budget`
                : 'Fixed allocation'}
            </Text>
          </View>
        </View>

        <View style={styles.actionsGroup}>
          <View
            style={[
              styles.percentPill,
              {
                backgroundColor: progress.isOverspent
                  ? (isDark ? 'rgba(220, 92, 92, 0.2)' : 'rgba(220, 92, 92, 0.12)')
                  : (isDark ? colors.surfaceSubtle : '#F1F5F9'),
              },
            ]}
          >
            {progress.isOverspent && (
              <AlertTriangle size={12} color={colors.semantic.expense} />
            )}
            <Text style={[styles.percentText, { color: statusTextColor }]}>
              {progress.percentUsed}%
            </Text>
          </View>

          {onEdit && (
            <Pressable
              onPress={onEdit}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${progress.categoryName} allocation`}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Pencil size={14} color={colors.textSecondary} />
            </Pressable>
          )}

          {onDelete && (
            <Pressable
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${progress.categoryName} allocation`}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Trash2 size={14} color={colors.semantic.expense} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      <View
        style={[
          styles.progressBarBg,
          { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
        ]}
      >
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${barWidth}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>

      {/* Bottom Numbers Row */}
      <View style={styles.bottomRow}>
        <Text style={[styles.spentText, { color: colors.textPrimary }]}>
          {formatNaira(progress.spentKobo, {
            symbol: currencySymbol,
            masked: hideBalances,
            hideDecimalsIfWhole: true,
          })}{' '}
          <Text style={{ color: colors.textSecondary, fontWeight: '400', fontSize: 11 }}>
            of{' '}
            {formatNaira(progress.allocatedKobo, {
              symbol: currencySymbol,
              masked: hideBalances,
              hideDecimalsIfWhole: true,
            })}
          </Text>
        </Text>

        <Text style={[styles.remainingText, { color: statusTextColor }]}>
          {progress.remainingKobo >= 0
            ? `${formatNaira(progress.remainingKobo, { symbol: currencySymbol, hideDecimalsIfWhole: true })} left`
            : `${formatNaira(Math.abs(progress.remainingKobo), { symbol: currencySymbol, hideDecimalsIfWhole: true })} over`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: DesignTokens.radii.xl,
    borderWidth: 1,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
  },
  modeBadge: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  percentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spentText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  remainingText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
