import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { DesignTokens } from '../../theme/tokens';
import { formatNaira } from '../../utils/money';

interface BalanceCardProps {
  totalBalanceKobo: number;
  monthlyIncomeKobo: number;
  monthlyExpenseKobo: number;
  netCashFlowKobo: number;
  monthLabel?: string;
  currencySymbol?: string;
  hideBalances?: boolean;
  onToggleHide?: () => void;
  onOpenAccounts?: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  totalBalanceKobo,
  monthlyIncomeKobo,
  monthlyExpenseKobo,
  netCashFlowKobo,
  monthLabel,
  currencySymbol = '₦',
  hideBalances = false,
  onToggleHide,
  onOpenAccounts,
}) => {
  const isNetPositive = netCashFlowKobo >= 0;

  return (
    <View style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerLabel}>Total Available Balance</Text>
          {onToggleHide && (
            <Pressable
              onPress={onToggleHide}
              accessibilityRole="button"
              accessibilityLabel={hideBalances ? 'Show balances' : 'Hide balances'}
              style={styles.eyeBtn}
            >
              {hideBalances ? (
                <EyeOff size={16} color="#CBD5E1" />
              ) : (
                <Eye size={16} color="#CBD5E1" />
              )}
            </Pressable>
          )}
        </View>

        {onOpenAccounts && (
          <Pressable
            onPress={onOpenAccounts}
            accessibilityRole="button"
            accessibilityLabel="Manage wallets and accounts"
            style={({ pressed }) => [
              styles.accountsBadge,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.accountsBadgeText}>Wallets</Text>
            <ChevronRight size={13} color="#DDF5E6" />
          </Pressable>
        )}
      </View>

      {/* Hero Amount */}
      <Text style={styles.heroAmount}>
        {formatNaira(totalBalanceKobo, {
          symbol: currencySymbol,
          masked: hideBalances,
          hideDecimalsIfWhole: true,
        })}
      </Text>

      {/* Monthly Subtitle */}
      {monthLabel ? (
        <Text style={styles.monthSubtitle}>
          Cash Flow for {monthLabel}
        </Text>
      ) : null}

      {/* Stats Divider Line */}
      <View style={styles.divider} />

      {/* Bottom Flow Row */}
      <View style={styles.statsRow}>
        {/* Income */}
        <View style={styles.statCol}>
          <View style={styles.statLabelRow}>
            <View style={[styles.arrowCircle, { backgroundColor: 'rgba(22, 163, 74, 0.25)' }]}>
              <ArrowDownLeft size={11} color="#22C55E" />
            </View>
            <Text style={styles.statLabel}>Income</Text>
          </View>
          <Text style={[styles.statValue, { color: '#22C55E' }]}>
            {formatNaira(monthlyIncomeKobo, {
              symbol: currencySymbol,
              masked: hideBalances,
              hideDecimalsIfWhole: true,
              compact: true,
            })}
          </Text>
        </View>

        {/* Expenses */}
        <View style={styles.statCol}>
          <View style={styles.statLabelRow}>
            <View style={[styles.arrowCircle, { backgroundColor: 'rgba(220, 92, 92, 0.25)' }]}>
              <ArrowUpRight size={11} color="#F07171" />
            </View>
            <Text style={styles.statLabel}>Expenses</Text>
          </View>
          <Text style={[styles.statValue, { color: '#F07171' }]}>
            {formatNaira(monthlyExpenseKobo, {
              symbol: currencySymbol,
              masked: hideBalances,
              hideDecimalsIfWhole: true,
              compact: true,
            })}
          </Text>
        </View>

        {/* Net Flow */}
        <View style={[styles.statCol, { alignItems: 'flex-end' }]}>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>Net Flow</Text>
          </View>
          <Text
            style={[
              styles.statValue,
              { color: isNetPositive ? '#22C55E' : '#F07171' },
            ]}
          >
            {isNetPositive ? '+' : ''}
            {formatNaira(netCashFlowKobo, {
              symbol: currencySymbol,
              masked: hideBalances,
              hideDecimalsIfWhole: true,
              compact: true,
            })}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#101828',
    borderRadius: DesignTokens.radii.xxl,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: DesignTokens.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 2,
  },
  accountsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  accountsBadgeText: {
    color: '#DDF5E6',
    fontSize: 11,
    fontWeight: '600',
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
  },
  monthSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    gap: 3,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
