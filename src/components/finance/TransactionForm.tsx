import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Account, Category, Transaction, TransactionType } from '../../types/finance';
import { DatabaseManager } from '../../database';
import { BottomSheet } from '../ui/BottomSheet';
import { CurrencyInput } from '../ui/CurrencyInput';
import { CategorySelector } from './CategorySelector';
import { Button } from '../common/Button';
import { toDateOnlyISO, toLocalDateTimeInput } from '../../utils/date';
import { sanitizeIntegerKobo } from '../../utils/money';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
  defaultSourceAccountId?: string;
  onSaved: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  onClose,
  initialType = 'expense',
  editingTransaction = null,
  defaultSourceAccountId,
  onSaved,
  onShowToast,
}) => {
  const { colors, isDark } = useTheme();
  const db = DatabaseManager.getInstance();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [type, setType] = useState<TransactionType>(initialType);
  const [amountKobo, setAmountKobo] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [dateTime, setDateTime] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  const lastSubmitRef = useRef<{ sig: string; ts: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadOptions = async () => {
      const accList = await db.repos.accounts.getAll(false);
      setAccounts(accList);
      const catList = await db.repos.categories.getAll();
      setCategories(catList);

      setError('');

      if (editingTransaction) {
        setType(editingTransaction.type);
        setAmountKobo(editingTransaction.amountKobo);
        setCategoryId(editingTransaction.categoryId || '');
        setAccountId(editingTransaction.accountId);
        setDestinationAccountId(
          editingTransaction.destinationAccountId ||
            accList.find((a) => a.id !== editingTransaction.accountId)?.id ||
            ''
        );
        setDateTime(toLocalDateTimeInput(editingTransaction.dateISO));
        setTitle(editingTransaction.title);
        setNotes(editingTransaction.notes || '');
        return;
      }

      const fallbackAcc =
        defaultSourceAccountId || accList[0]?.id || '';
      const secondAcc = accList.find((a) => a.id !== fallbackAcc)?.id || '';
      const defaultCat =
        catList.find((c) => c.type === (initialType === 'income' ? 'income' : 'expense'))?.id || '';

      const now = new Date();
      const nowLocal = `${toDateOnlyISO(now)}T${now.toTimeString().slice(0, 5)}`;

      setType(initialType);
      setAmountKobo(0);
      setCategoryId(defaultCat);
      setAccountId(fallbackAcc);
      setDestinationAccountId(secondAcc);
      setDateTime(nowLocal);
      setTitle('');
      setNotes('');
    };

    loadOptions();
  }, [isOpen, editingTransaction, initialType, defaultSourceAccountId]);

  const filteredCategories = categories.filter(
    (c) => c.type === (type === 'income' ? 'income' : 'expense')
  );

  const handleTypeSwitch = (nextType: TransactionType) => {
    setType(nextType);
    setError('');
    if (nextType !== 'transfer') {
      const matching = categories.filter((c) => c.type === nextType);
      if (!matching.some((c) => c.id === categoryId)) {
        setCategoryId(matching[0]?.id || '');
      }
    } else if (destinationAccountId === accountId || !destinationAccountId) {
      setDestinationAccountId(accounts.find((a) => a.id !== accountId)?.id || '');
    }
  };

  const handleSubmit = async () => {
    const safeAmount = sanitizeIntegerKobo(amountKobo);
    if (safeAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a description.');
      return;
    }
    if (type !== 'transfer' && !categoryId) {
      setError('Please choose a category.');
      return;
    }
    if (type === 'transfer' && accountId === destinationAccountId) {
      setError('Source and destination accounts must be different.');
      return;
    }

    // Duplicate submission guard within 1.5s
    const sig = `${type}|${safeAmount}|${accountId}|${destinationAccountId}|${title.trim()}|${dateTime}`;
    const nowMs = Date.now();
    if (lastSubmitRef.current && lastSubmitRef.current.sig === sig && nowMs - lastSubmitRef.current.ts < 1500) {
      setError('Duplicate transaction prevented.');
      return;
    }
    lastSubmitRef.current = { sig, ts: nowMs };

    try {
      if (editingTransaction) {
        await db.repos.transactions.update(editingTransaction.id, {
          type,
          amountKobo: safeAmount,
          categoryId: type === 'transfer' ? undefined : categoryId,
          accountId,
          destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
          dateISO: dateTime.length === 16 ? `${dateTime}:00` : dateTime,
          title: title.trim(),
          notes: notes.trim() || undefined,
        });
        onShowToast('Transaction updated');
      } else {
        await db.repos.transactions.create({
          type,
          amountKobo: safeAmount,
          categoryId: type === 'transfer' ? undefined : categoryId,
          accountId,
          destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
          dateISO: dateTime.length === 16 ? `${dateTime}:00` : dateTime,
          title: title.trim(),
          notes: notes.trim() || undefined,
        });
        onShowToast(
          type === 'transfer'
            ? 'Transfer recorded between accounts'
            : type === 'income'
            ? 'Income recorded'
            : 'Expense recorded'
        );
      }

      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Error saving transaction.');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingTransaction ? 'Edit Transaction' : 'Record Transaction'}
      subtitle="Track your cash flow accurately"
      maxHeightRatio={0.92}
    >
      <View style={styles.container}>
        {/* Type Selector Tabs */}
        <View
          style={[
            styles.typeTabsContainer,
            { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
          ]}
        >
          <Pressable
            onPress={() => handleTypeSwitch('expense')}
            style={[
              styles.typeTab,
              type === 'expense' && {
                backgroundColor: colors.surface,
                shadowColor: '#000000',
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              },
            ]}
          >
            <ArrowUpRight
              size={16}
              color={
                type === 'expense'
                  ? colors.semantic.expense
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.typeTabText,
                {
                  color:
                    type === 'expense'
                      ? (isDark ? colors.semantic.expenseBright : colors.semantic.expense)
                      : colors.textSecondary,
                  fontWeight: type === 'expense' ? '700' : '500',
                },
              ]}
            >
              Expense
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleTypeSwitch('income')}
            style={[
              styles.typeTab,
              type === 'income' && {
                backgroundColor: colors.surface,
                shadowColor: '#000000',
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              },
            ]}
          >
            <ArrowDownLeft
              size={16}
              color={
                type === 'income'
                  ? colors.semantic.income
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.typeTabText,
                {
                  color:
                    type === 'income'
                      ? (isDark ? colors.semantic.incomeBright : colors.semantic.income)
                      : colors.textSecondary,
                  fontWeight: type === 'income' ? '700' : '500',
                },
              ]}
            >
              Income
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleTypeSwitch('transfer')}
            style={[
              styles.typeTab,
              type === 'transfer' && {
                backgroundColor: colors.surface,
                shadowColor: '#000000',
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              },
            ]}
          >
            <ArrowLeftRight
              size={16}
              color={
                type === 'transfer'
                  ? colors.semantic.transfer
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.typeTabText,
                {
                  color:
                    type === 'transfer'
                      ? (isDark ? colors.semantic.transferBright : colors.semantic.transfer)
                      : colors.textSecondary,
                  fontWeight: type === 'transfer' ? '700' : '500',
                },
              ]}
            >
              Transfer
            </Text>
          </Pressable>
        </View>

        {/* Amount Input */}
        <CurrencyInput
          label="Amount"
          valueKobo={amountKobo}
          onChangeKobo={setAmountKobo}
          quickPresets={
            type === 'income'
              ? [50000, 100000, 250000, 485000]
              : [1500, 5000, 15000, 50000]
          }
        />

        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            Description
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={
              type === 'transfer'
                ? 'e.g. Weekly pocket top-up'
                : type === 'income'
                ? 'e.g. Freelance milestone'
                : 'e.g. Bokku supermarket run'
            }
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

        {/* Category Selector (Hidden for Transfers) */}
        {type !== 'transfer' && (
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Category
            </Text>
            <CategorySelector
              categories={filteredCategories}
              selectedCategoryId={categoryId}
              onSelectCategory={setCategoryId}
            />
          </View>
        )}

        {/* Source Account Picker */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            {type === 'transfer' ? 'From Wallet / Account' : 'Account'}
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
                  <View style={[styles.accDot, { backgroundColor: acc.color }]} />
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

        {/* Destination Account Picker (Transfers only) */}
        {type === 'transfer' && (
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              To Wallet / Account
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountChipsRow}>
              {accounts
                .filter((a) => a.id !== accountId)
                .map((acc) => {
                  const isSelected = acc.id === destinationAccountId;
                  return (
                    <Pressable
                      key={acc.id}
                      onPress={() => setDestinationAccountId(acc.id)}
                      style={[
                        styles.accountChip,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? 'rgba(37, 99, 235, 0.25)' : 'rgba(37, 99, 235, 0.1)')
                            : (isDark ? colors.surfaceSubtle : '#F8FAFC'),
                          borderColor: isSelected ? colors.semantic.transfer : colors.borderSubtle,
                        },
                      ]}
                    >
                      <View style={[styles.accDot, { backgroundColor: acc.color }]} />
                      <Text
                        style={[
                          styles.accountChipText,
                          {
                            color: isSelected ? colors.semantic.transfer : colors.textPrimary,
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
        )}

        {/* Date Time Picker Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            Date & Time (YYYY-MM-DDTHH:mm)
          </Text>
          <TextInput
            value={dateTime}
            onChangeText={setDateTime}
            placeholder="YYYY-MM-DDTHH:mm"
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

        {/* Notes Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            Notes (Optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional details..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
            style={[
              styles.textArea,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
          />
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: colors.semantic.expense }]}>
            {error}
          </Text>
        ) : null}

        <Button
          label={
            editingTransaction
              ? 'Update Transaction'
              : type === 'transfer'
              ? 'Record Transfer'
              : type === 'income'
              ? 'Add Income'
              : 'Add Expense'
          }
          onPress={handleSubmit}
          variant={type === 'income' ? 'secondary' : type === 'transfer' ? 'primary' : 'danger'}
          size="lg"
          style={{ marginTop: 8 }}
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  typeTabsContainer: {
    flexDirection: 'row',
    borderRadius: DesignTokens.radii.lg,
    padding: 3,
    marginBottom: DesignTokens.spacing.md,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: DesignTokens.radii.md,
  },
  typeTabText: {
    fontSize: 13,
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
  textArea: {
    minHeight: 64,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  accountChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
  },
  accDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
