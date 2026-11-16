import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeftRight } from 'lucide-react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Account, Category, Transaction } from '../../types/finance';
import { CategoryIcon } from '../ui/CategoryIcon';
import { formatTime } from '../../utils/date';
import { formatNaira } from '../../utils/money';

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  destinationAccount?: Account;
  currencySymbol?: string;
  hideBalances?: boolean;
  onPress?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  category,
  account,
  destinationAccount,
  currencySymbol = '₦',
  hideBalances = false,
  onPress,
}) => {
  const { colors, isDark } = useTheme();

  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const isExpense = transaction.type === 'expense';

  const amountColor = isIncome
    ? (isDark ? colors.semantic.incomeBright : colors.semantic.income)
    : isExpense
    ? (isDark ? colors.semantic.expenseBright : colors.semantic.expense)
    : (isDark ? colors.semantic.transferBright : colors.semantic.transfer);

  const amountSign = isIncome ? '+' : isExpense ? '-' : '';

  const formattedAmount = `${amountSign}${formatNaira(transaction.amountKobo, {
    symbol: currencySymbol,
    masked: hideBalances,
    hideDecimalsIfWhole: true,
  })}`;

  const renderIcon = () => {
    if (isTransfer) {
      return (
        <View
          style={[
            styles.transferIconWrapper,
            {
              backgroundColor: isDark
                ? 'rgba(37, 99, 235, 0.2)'
                : 'rgba(37, 99, 235, 0.1)',
            },
          ]}
        >
          <ArrowLeftRight
            size={18}
            color={isDark ? colors.semantic.transferBright : colors.semantic.transfer}
          />
        </View>
      );
    }

    return (
      <CategoryIcon
        iconName={category?.iconName || 'Tag'}
        color="#FFFFFF"
        backgroundColor={category?.color || colors.primary}
        size={40}
        iconSize={18}
      />
    );
  };

  const subtitle = isTransfer
    ? `${account?.name || 'Account'} → ${destinationAccount?.name || 'Account'}`
    : `${category?.name || 'Uncategorized'} · ${account?.name || 'Account'}`;

  const timeStr = formatTime(transaction.dateISO);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${transaction.title}, ${formattedAmount}`}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
        },
        pressed && { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC' },
      ]}
    >
      <View style={styles.left}>
        {renderIcon()}
        <View style={styles.textContainer}>
          <Text
            numberOfLines={1}
            style={[styles.title, { color: colors.textPrimary }]}
          >
            {transaction.title}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text
          numberOfLines={1}
          style={[styles.amount, { color: amountColor }]}
        >
          {formattedAmount}
        </Text>
        {timeStr ? (
          <Text style={[styles.time, { color: colors.textMuted }]}>
            {timeStr}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: DesignTokens.touchTargets.rowMinHeight,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  transferIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  time: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
