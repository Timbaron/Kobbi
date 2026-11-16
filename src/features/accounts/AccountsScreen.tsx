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
  ArrowLeftRight,
  Pencil,
  Plus,
  Wallet,
} from 'lucide-react-native';
import { DesignTokens, AccountColors } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Account, AccountType, Transaction, TransactionType } from '../../types/finance';
import { DatabaseManager } from '../../database';
import { AccountCard } from '../../components/finance/AccountCard';
import { TransactionItem } from '../../components/finance/TransactionItem';
import { AppHeader } from '../../components/common/AppHeader';
import { Button } from '../../components/common/Button';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { EmptyState } from '../../components/common/EmptyState';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { formatNaira } from '../../utils/money';

interface AccountsScreenProps {
  onBack: () => void;
  onOpenTransactionForm: (
    type: TransactionType,
    editing?: Transaction,
    defaultSourceAccountId?: string
  ) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const INSTITUTION_PRESETS: Array<{ name: string; type: AccountType; color: string }> = [
  { name: 'GTBank', type: 'bank', color: '#C2410C' },
  { name: 'OPay', type: 'mobile_money', color: '#087F5B' },
  { name: 'Access Bank', type: 'bank', color: '#0369A1' },
  { name: 'UBA', type: 'bank', color: '#B91C1C' },
  { name: 'PalmPay', type: 'mobile_money', color: '#7C3AED' },
  { name: 'Cash', type: 'cash', color: '#101828' },
];

export const AccountsScreen: React.FC<AccountsScreenProps> = ({
  onBack,
  onOpenTransactionForm,
  onShowToast,
}) => {
  const { colors, isDark } = useTheme();
  const db = DatabaseManager.getInstance();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [showArchived, setShowArchived] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [archiveConfirmAccount, setArchiveConfirmAccount] = useState<Account | null>(null);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('GTBank');
  const [type, setType] = useState<AccountType>('bank');
  const [openingKobo, setOpeningKobo] = useState(0);
  const [color, setColor] = useState<string>(AccountColors[0]);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    const accList = await db.repos.accounts.getAll(true);
    setAccounts(accList);

    const balances: Record<string, number> = {};
    for (const acc of accList) {
      balances[acc.id] = await db.repos.accounts.getBalanceKobo(acc.id);
    }
    setAccountBalances(balances);

    const txList = await db.repos.transactions.getAll();
    setTransactions(txList);

    const catList = await db.repos.categories.getAll();
    setCategories(catList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.archived),
    [accounts]
  );
  const archivedAccounts = useMemo(
    () => accounts.filter((a) => a.archived),
    [accounts]
  );

  const totalBalanceKobo = useMemo(() => {
    return activeAccounts.reduce((sum, acc) => sum + (accountBalances[acc.id] || 0), 0);
  }, [activeAccounts, accountBalances]);

  const selectedAccountTx = useMemo(() => {
    if (!selectedAccount) return [];
    return transactions.filter(
      (t) => t.accountId === selectedAccount.id || t.destinationAccountId === selectedAccount.id
    );
  }, [selectedAccount, transactions]);

  const openCreateForm = () => {
    setEditingAccount(null);
    setName('');
    setInstitution('OPay');
    setType('mobile_money');
    setOpeningKobo(0);
    setColor('#087F5B');
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setInstitution(acc.institution);
    setType(acc.type);
    setOpeningKobo(acc.openingBalanceKobo);
    setColor(acc.color || AccountColors[0]);
    setFormError('');
    setFormOpen(true);
  };

  const handleSaveAccount = async () => {
    if (!name.trim()) {
      setFormError('Please enter an account name.');
      return;
    }

    try {
      if (editingAccount) {
        await db.repos.accounts.update(editingAccount.id, {
          name: name.trim(),
          institution: institution.trim(),
          type,
          openingBalanceKobo: openingKobo,
          color,
        });
        onShowToast('Account updated');
      } else {
        await db.repos.accounts.create({
          name: name.trim(),
          institution: institution.trim(),
          type,
          openingBalanceKobo: openingKobo,
          color,
        });
        onShowToast(`${name.trim()} account created`);
      }
      setFormOpen(false);
      await loadData();
    } catch (e: any) {
      setFormError(e.message || 'Error saving account.');
    }
  };

  const handleConfirmToggleArchive = async () => {
    if (!archiveConfirmAccount) return;
    const nextArchived = await db.repos.accounts.toggleArchive(archiveConfirmAccount.id);
    onShowToast(
      nextArchived
        ? `${archiveConfirmAccount.name} archived`
        : `${archiveConfirmAccount.name} restored`,
      'info'
    );
    setArchiveConfirmAccount(null);
    if (selectedAccount?.id === archiveConfirmAccount.id) {
      setSelectedAccount(null);
    }
    await loadData();
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Accounts & Wallets"
        subtitle={`${activeAccounts.length} active wallets`}
        showBack
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Available Balance Banner */}
        <View
          style={[
            styles.totalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.totalRow}>
            <View>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                Total Available Balance
              </Text>
              <Text style={[styles.totalAmount, { color: colors.textPrimary }]}>
                {formatNaira(totalBalanceKobo, { hideDecimalsIfWhole: true })}
              </Text>
            </View>

            <Button
              label="Add Wallet"
              onPress={openCreateForm}
              size="sm"
              leftIcon={<Plus size={16} color="#FFFFFF" />}
            />
          </View>
        </View>

        {/* Active Accounts Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Active Accounts ({activeAccounts.length})
          </Text>
        </View>

        {activeAccounts.length === 0 ? (
          <EmptyState
            icon={<Wallet size={24} color={colors.primary} />}
            title="No Accounts"
            description="Add your bank accounts, cash, or mobile wallets to start tracking."
            actionLabel="Add First Account"
            onAction={openCreateForm}
          />
        ) : (
          <View style={styles.accountsGrid}>
            {activeAccounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                balanceKobo={accountBalances[acc.id] || 0}
                onClick={() => setSelectedAccount(acc)}
              />
            ))}
          </View>
        )}

        {/* Archived Accounts Section */}
        {archivedAccounts.length > 0 && (
          <View style={styles.archivedContainer}>
            <Pressable
              onPress={() => setShowArchived((prev) => !prev)}
              style={styles.archivedToggle}
            >
              <Text style={[styles.archivedToggleText, { color: colors.textSecondary }]}>
                {showArchived ? 'Hide' : 'Show'} Archived Accounts ({archivedAccounts.length})
              </Text>
            </Pressable>

            {showArchived && (
              <View style={styles.accountsGrid}>
                {archivedAccounts.map((acc) => (
                  <View key={acc.id} style={{ opacity: 0.75 }}>
                    <AccountCard
                      account={acc}
                      balanceKobo={accountBalances[acc.id] || 0}
                      onClick={() => setSelectedAccount(acc)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Account Detail Bottom Sheet */}
      <BottomSheet
        isOpen={Boolean(selectedAccount)}
        onClose={() => setSelectedAccount(null)}
        title={selectedAccount?.name || 'Account'}
        subtitle={selectedAccount?.institution || selectedAccount?.type}
      >
        {selectedAccount && (
          <View style={styles.sheetInner}>
            {/* Balance Overview */}
            <View
              style={[
                styles.detailBalanceBox,
                {
                  backgroundColor: isDark ? colors.surfaceSubtle : colors.mintTint,
                },
              ]}
            >
              <Text style={[styles.detailBalanceLabel, { color: colors.textSecondary }]}>
                Current Balance
              </Text>
              <Text
                style={[
                  styles.detailBalanceValue,
                  {
                    color:
                      (accountBalances[selectedAccount.id] || 0) < 0
                        ? colors.semantic.expense
                        : colors.primary,
                  },
                ]}
              >
                {formatNaira(accountBalances[selectedAccount.id] || 0, {
                  hideDecimalsIfWhole: true,
                })}
              </Text>
              <Text style={[styles.detailOpeningText, { color: colors.textSecondary }]}>
                Opening Balance: {formatNaira(selectedAccount.openingBalanceKobo, { hideDecimalsIfWhole: true })}
              </Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.detailActionsRow}>
              <Button
                label="Transfer"
                onPress={() => {
                  const targetId = selectedAccount.id;
                  setSelectedAccount(null);
                  onOpenTransactionForm('transfer', undefined, targetId);
                }}
                variant="outline"
                size="sm"
                leftIcon={<ArrowLeftRight size={15} color={colors.textPrimary} />}
                style={styles.detailActionButton}
              />
              <Button
                label="Edit"
                onPress={() => {
                  const target = selectedAccount;
                  setSelectedAccount(null);
                  openEditForm(target);
                }}
                variant="outline"
                size="sm"
                leftIcon={<Pencil size={15} color={colors.textPrimary} />}
                style={styles.detailActionButton}
              />
              <Button
                label={selectedAccount.archived ? 'Restore' : 'Archive'}
                onPress={() => {
                  setArchiveConfirmAccount(selectedAccount);
                }}
                variant="outline"
                size="sm"
                leftIcon={
                  selectedAccount.archived ? (
                    <ArchiveRestore size={15} color={colors.primary} />
                  ) : (
                    <Archive size={15} color={colors.semantic.expense} />
                  )
                }
                style={styles.detailActionButton}
              />
            </View>

            {/* Transactions Header */}
            <Text style={[styles.detailSectionTitle, { color: colors.textPrimary }]}>
              Account History ({selectedAccountTx.length})
            </Text>

            {selectedAccountTx.length === 0 ? (
              <EmptyState
                title="No Transactions"
                description="No transactions have been recorded for this wallet yet."
              />
            ) : (
              <View style={styles.txList}>
                {selectedAccountTx.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    category={categories.find((c) => c.id === tx.categoryId)}
                    account={accounts.find((a) => a.id === tx.accountId)}
                    destinationAccount={accounts.find((a) => a.id === tx.destinationAccountId)}
                    onPress={() => {
                      setSelectedAccount(null);
                      onOpenTransactionForm(tx.type, tx);
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </BottomSheet>

      {/* Create / Edit Account Sheet */}
      <BottomSheet
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingAccount ? 'Edit Account' : 'Add New Account'}
        subtitle="Manage your manual wallets & banks"
      >
        <View style={styles.formContainer}>
          {/* Quick Preset Buttons */}
          {!editingAccount && (
            <View style={styles.presetsSection}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Quick Bank / Wallet Presets
              </Text>
              <View style={styles.presetButtonsRow}>
                {INSTITUTION_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.name}
                    onPress={() => {
                      setName(preset.name);
                      setInstitution(preset.name);
                      setType(preset.type);
                      setColor(preset.color);
                    }}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor:
                          institution === preset.name
                            ? (isDark ? 'rgba(8, 127, 91, 0.25)' : colors.mintTint)
                            : (isDark ? colors.surfaceSubtle : '#F1F5F9'),
                        borderColor: institution === preset.name ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: institution === preset.name ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {preset.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Account Name Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Account Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. GTBank Salary, OPay Pocket"
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

          {/* Account Type */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Account Type
            </Text>
            <View style={styles.typeSelectorRow}>
              {(['bank', 'mobile_money', 'cash', 'other'] as AccountType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    styles.typeOption,
                    {
                      backgroundColor:
                        type === t
                          ? (isDark ? 'rgba(8, 127, 91, 0.25)' : colors.mintTint)
                          : (isDark ? colors.surfaceSubtle : '#F1F5F9'),
                      borderColor: type === t ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      { color: type === t ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {t === 'mobile_money' ? 'Mobile' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Opening Balance */}
          <CurrencyInput
            label="Opening Balance"
            valueKobo={openingKobo}
            onChangeKobo={setOpeningKobo}
            quickPresets={[10000, 25000, 50000, 100000]}
            helperText="Initial funds when starting tracking in Kobbi."
          />

          {/* Color Palette */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Card Accent Color
            </Text>
            <View style={styles.colorPaletteRow}>
              {AccountColors.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    color === c && styles.colorCircleSelected,
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
            label={editingAccount ? 'Save Changes' : 'Create Account'}
            onPress={handleSaveAccount}
            size="lg"
            style={{ marginTop: 12 }}
          />
        </View>
      </BottomSheet>

      {/* Archive Confirmation Modal */}
      <ConfirmationModal
        visible={Boolean(archiveConfirmAccount)}
        title={archiveConfirmAccount?.archived ? 'Restore Account' : 'Archive Account'}
        message={
          archiveConfirmAccount?.archived
            ? `Do you want to restore "${archiveConfirmAccount.name}" to your active accounts?`
            : `Archiving "${archiveConfirmAccount?.name}" hides it from active pickers while preserving all historical transaction reports.`
        }
        confirmLabel={archiveConfirmAccount?.archived ? 'Restore' : 'Archive'}
        isDestructive={!archiveConfirmAccount?.archived}
        onConfirm={handleConfirmToggleArchive}
        onCancel={() => setArchiveConfirmAccount(null)}
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
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  sectionHeader: {
    marginBottom: DesignTokens.spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  accountsGrid: {
    gap: 12,
  },
  archivedContainer: {
    marginTop: DesignTokens.spacing.xl,
  },
  archivedToggle: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  archivedToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sheetInner: {
    paddingBottom: 20,
  },
  detailBalanceBox: {
    padding: 16,
    borderRadius: DesignTokens.radii.lg,
    alignItems: 'center',
    marginBottom: 16,
  },
  detailBalanceLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailBalanceValue: {
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
    marginVertical: 4,
  },
  detailOpeningText: {
    fontSize: 11,
    fontWeight: '500',
  },
  detailActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  detailActionButton: {
    flex: 1,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  txList: {
    gap: 6,
  },
  formContainer: {
    paddingBottom: 24,
  },
  presetsSection: {
    marginBottom: 14,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
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
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorPaletteRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
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
    marginBottom: 10,
  },
});
