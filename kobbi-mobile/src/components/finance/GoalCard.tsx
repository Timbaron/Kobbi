import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { SavingsGoal } from '../../types/finance';
import { CategoryIcon } from '../ui/CategoryIcon';
import { formatDate } from '../../utils/date';
import { computePercent, formatNaira } from '../../utils/money';

interface GoalCardProps {
  goal: SavingsGoal;
  currencySymbol?: string;
  hideBalances?: boolean;
  onPress?: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  currencySymbol = '₦',
  hideBalances = false,
  onPress,
}) => {
  const { colors, isDark } = useTheme();

  const percent = computePercent(goal.savedAmountKobo, goal.targetAmountKobo);
  const barWidth = Math.min(100, Math.max(0, percent));
  const isCompleted = goal.status === 'completed' || percent >= 100;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${goal.name} goal, ${percent}% funded`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isCompleted
            ? (isDark ? 'rgba(22, 163, 74, 0.4)' : 'rgba(22, 163, 74, 0.3)')
            : colors.border,
        },
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <CategoryIcon
            iconName={goal.iconName}
            color="#FFFFFF"
            backgroundColor={goal.color}
            size={38}
            iconSize={19}
          />
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={[styles.name, { color: colors.textPrimary }]}
            >
              {goal.name}
            </Text>
            <Text style={[styles.targetDate, { color: colors.textMuted }]}>
              Target: {formatDate(goal.targetDateISO)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.percentPill,
            {
              backgroundColor: isCompleted
                ? (isDark ? 'rgba(22, 163, 74, 0.25)' : colors.mintTint)
                : (isDark ? colors.surfaceSubtle : '#F1F5F9'),
            },
          ]}
        >
          {isCompleted && (
            <CheckCircle2 size={13} color={isDark ? colors.semantic.incomeBright : colors.primary} />
          )}
          <Text
            style={[
              styles.percentText,
              {
                color: isCompleted
                  ? (isDark ? colors.semantic.incomeBright : colors.primary)
                  : colors.textPrimary,
              },
            ]}
          >
            {percent}%
          </Text>
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
              backgroundColor: isCompleted ? colors.semantic.income : goal.color || colors.primary,
            },
          ]}
        />
      </View>

      {/* Bottom Numbers Row */}
      <View style={styles.bottomRow}>
        <Text style={[styles.savedAmount, { color: colors.textPrimary }]}>
          {formatNaira(goal.savedAmountKobo, {
            symbol: currencySymbol,
            masked: hideBalances,
            hideDecimalsIfWhole: true,
          })}{' '}
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textSecondary }}>
            saved of{' '}
            {formatNaira(goal.targetAmountKobo, {
              symbol: currencySymbol,
              masked: hideBalances,
              hideDecimalsIfWhole: true,
            })}
          </Text>
        </Text>

        <Text
          style={[
            styles.remainingAmount,
            { color: isCompleted ? colors.primary : colors.textSecondary },
          ]}
        >
          {isCompleted
            ? 'Target Met!'
            : `${formatNaira(Math.max(0, goal.targetAmountKobo - goal.savedAmountKobo), {
                symbol: currencySymbol,
                hideDecimalsIfWhole: true,
              })} left`}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: DesignTokens.radii.xl,
    borderWidth: 1,
    marginBottom: 12,
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
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  targetDate: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  percentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: DesignTokens.radii.full,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
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
  savedAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  remainingAmount: {
    fontSize: 11,
    fontWeight: '600',
  },
});
