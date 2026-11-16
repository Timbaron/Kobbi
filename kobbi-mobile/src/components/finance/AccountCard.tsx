import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Landmark, Smartphone, Wallet } from 'lucide-react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Account, AccountType } from '../../types/finance';
import { formatNaira } from '../../utils/money';

interface AccountCardProps {
  account: Account;
  balanceKobo: number;
  currencySymbol?: string;
  hideBalances?: boolean;
  compact?: boolean;
  onClick?: () => void;
  style?: ViewStyle;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  balanceKobo,
  currencySymbol = '₦',
  hideBalances = false,
  compact = false,
  onClick,
  style,
}) => {
  const { colors, isDark } = useTheme();

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'bank':
        return <Landmark size={14} color="#FFFFFF" />;
      case 'mobile_money':
        return <Smartphone size={14} color="#FFFFFF" />;
      case 'cash':
      default:
        return <Wallet size={14} color="#FFFFFF" />;
    }
  };

  const formattedBalance = formatNaira(balanceKobo, {
    symbol: currencySymbol,
    masked: hideBalances,
    hideDecimalsIfWhole: true,
  });

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: DesignTokens.radii.xl,
    padding: compact ? 12 : 16,
    width: compact ? 165 : '100%',
    shadowColor: isDark ? '#000000' : colors.midnightNavy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: 6,
    elevation: 2,
  };

  const content = (
    <View style={styles.inner}>
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: account.color || colors.primary },
          ]}
        >
          {getAccountIcon(account.type)}
        </View>

        <View style={styles.badge}>
          <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
            {account.institution || account.type}
          </Text>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <Text
          numberOfLines={1}
          style={[
            styles.name,
            { color: colors.textPrimary, fontSize: compact ? 13 : 15 },
          ]}
        >
          {account.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            styles.balance,
            {
              color: balanceKobo < 0 ? colors.semantic.expense : colors.textPrimary,
              fontSize: compact ? 15 : 18,
            },
          ]}
        >
          {formattedBalance}
        </Text>
      </View>
    </View>
  );

  if (onClick) {
    return (
      <Pressable
        onPress={onClick}
        accessibilityRole="button"
        accessibilityLabel={`${account.name} account details`}
        style={({ pressed }) => [
          cardStyle,
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{content}</View>;
};

const styles = StyleSheet.create({
  inner: {
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bottomSection: {
    gap: 3,
  },
  name: {
    fontWeight: '600',
  },
  balance: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
});
