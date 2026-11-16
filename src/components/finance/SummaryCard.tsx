import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { formatNaira } from '../../utils/money';

interface SummaryCardProps {
  label: string;
  amountKobo: number;
  subtitle?: string;
  currencySymbol?: string;
  hideBalances?: boolean;
  tone?: 'income' | 'expense' | 'neutral';
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  amountKobo,
  subtitle,
  currencySymbol = '₦',
  hideBalances = false,
  tone = 'neutral',
}) => {
  const { colors, isDark } = useTheme();

  const getValueColor = () => {
    switch (tone) {
      case 'income':
        return isDark ? colors.semantic.incomeBright : colors.semantic.income;
      case 'expense':
        return isDark ? colors.semantic.expenseBright : colors.semantic.expense;
      case 'neutral':
      default:
        return colors.textPrimary;
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[
          styles.amount,
          {
            color: getValueColor(),
          },
        ]}
      >
        {tone === 'income' ? '+' : tone === 'expense' ? '-' : ''}
        {formatNaira(amountKobo, {
          symbol: currencySymbol,
          masked: hideBalances,
          hideDecimalsIfWhole: true,
          compact: true,
        })}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: DesignTokens.radii.xl,
    borderWidth: 1,
    flex: 1,
    minWidth: 100,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
