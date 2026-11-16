import React, { useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowLeftRight,
  Info,
  Pencil,
  Plus,
  Wallet,
} from 'lucide-react';
import { AccountCard } from '../components/finance/AccountCard';
import { TransactionItem } from '../components/finance/TransactionItem';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomSheet } from '../components/ui/BottomSheet';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { EmptyState } from '../components/ui/EmptyState';
import { useFinance } from '../store/FinanceContext';
import { AccountColors } from '../theme/tokens';
import { Account, AccountType, Transaction, TransactionType } from '../types/finance';
import { getAccountBalanceKobo, getTotalBalanceKobo } from '../utils/calculations';
import { formatNaira } from '../utils/money';

interface AccountsScreenProps {
  onBack: () => void;
  onOpenTransactionForm: (
    type: TransactionType,
    editing?: Transaction,
    defaultSourceAccountId?: string
  ) => void;
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
}) => {
  const { state, addAccount, updateAccount, toggleArchiveAccount } = useFinance();

  const [showArchived, setShowArchived] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [archiveConfirmAccount, setArchiveConfirmAccount] = useState<Account | null>(null);

  // Create / Edit Account form
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('GTBank');
  const [type, setType] = useState<AccountType>('bank');
  const [openingKobo, setOpeningKobo] = useState(0);
  const [color, setColor] = useState<string>(AccountColors[0]);
  const [formError, setFormError] = useState('');

  const activeAccounts = useMemo(
    () => state.accounts.filter((a) => !a.archived),
    [state.accounts]
  );
  const archivedAccounts = useMemo(
    () => state.accounts.filter((a) => a.archived),
    [state.accounts]
  );
  const totalBalanceKobo = useMemo(
    () => getTotalBalanceKobo(state.accounts, state.transactions),
    [state.accounts, state.transactions]
  );

  const selectedAccountTx = useMemo(() => {
    if (!selectedAccount) return [];
    return state.transactions
      .filter(
        (t) => t.accountId === selectedAccount.id || t.destinationAccountId === selectedAccount.id
      )
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  }, [selectedAccount, state.transactions]);

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
    setColor(acc.color);
    setFormError('');
    setFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter an account name.');
      return;
    }
    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name: name.trim(),
        institution: institution.trim() || 'Other',
        type,
        openingBalanceKobo: openingKobo,
        color,
      });
      if (selectedAccount?.id === editingAccount.id) {
        setSelectedAccount({
          ...editingAccount,
          name: name.trim(),
          institution: institution.trim() || 'Other',
          type,
          openingBalanceKobo: openingKobo,
          color,
        });
      }
    } else {
      addAccount({
        name: name.trim(),
        institution: institution.trim() || 'Other',
        type,
        openingBalanceKobo: openingKobo,
        color,
      });
    }
    setFormOpen(false);
  };

  const sym = state.settings.currencySymbol;
  const masked = state.settings.hideBalances;

  return (
    <div className="flex flex-col min-h-full kb-screen-enter">
      <AppHeader
        title="Accounts & Wallets"
        subtitle={`${activeAccounts.length} active wallets`}
        showBack
        onBack={onBack}
        rightAction={
          <button
            type="button"
            onClick={openCreateForm}
            aria-label="Add account"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#087F5B] dark:text-[#DDF5E6] hover:bg-[#E4E7EC]/60 dark:hover:bg-[#182235] transition-colors"
          >
            <Plus size={22} />
          </button>
        }
      />

      <div className="px-4 pt-3 pb-10 space-y-4">
        {/* Net Balance Card */}
        <section className="rounded-[22px] bg-[#101828] dark:bg-[#182235] text-white p-5 border border-[#1E293B] dark:border-[#2B3952]">
          <p className="text-xs text-slate-300">Combined Active Balances</p>
          <p className="mt-1 font-display text-[26px] font-extrabold tabular-nums">
            {formatNaira(totalBalanceKobo, { symbol: sym, masked })}
          </p>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenTransactionForm('transfer')}
              className="flex-1 min-h-[44px] rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeftRight size={15} />
              <span>Transfer Between Accounts</span>
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              className="min-h-[44px] px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus size={15} />
              <span>New</span>
            </button>
          </div>
        </section>

        <div className="flex items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
          <Info size={14} className="shrink-0 text-[#087F5B] dark:text-[#34D399]" />
          <span>
            Manually tracked balances calculated from opening balances and recorded transactions.
          </span>
        </div>

        {/* Active Accounts List */}
        {activeAccounts.length === 0 ? (
          <EmptyState
            icon={<Wallet size={22} />}
            title="No active accounts"
            description="Create a wallet for Cash, GTBank, OPay, UBA, or PalmPay to track your balances."
            actionLabel="Create Account"
            onAction={openCreateForm}
          />
        ) : (
          <div className="space-y-2.5">
            {activeAccounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                balanceKobo={getAccountBalanceKobo(acc, state.transactions)}
                currencySymbol={sym}
                hideBalances={masked}
                onClick={() => setSelectedAccount(acc)}
              />
            ))}
          </div>
        )}

        {/* Archived Accounts */}
        {archivedAccounts.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              {showArchived ? 'Hide' : 'Show'} archived accounts ({archivedAccounts.length})
            </button>

            {showArchived && (
              <div className="mt-2.5 space-y-2.5 opacity-80">
                {archivedAccounts.map((acc) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    balanceKobo={getAccountBalanceKobo(acc, state.transactions)}
                    currencySymbol={sym}
                    hideBalances={masked}
                    onClick={() => setSelectedAccount(acc)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Account Detail Drawer */}
      <BottomSheet
        isOpen={Boolean(selectedAccount)}
        onClose={() => setSelectedAccount(null)}
        title={selectedAccount?.name || 'Account'}
        subtitle={selectedAccount ? `${selectedAccount.institution} · ${selectedAccount.type.replace('_', ' ')}` : ''}
        footer={
          selectedAccount && (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  const acc = selectedAccount;
                  setSelectedAccount(null);
                  onOpenTransactionForm('transfer', undefined, acc.id);
                }}
                className="min-h-[44px] rounded-xl bg-[#087F5B] text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <ArrowLeftRight size={14} />
                <span>Transfer</span>
              </button>
              <button
                type="button"
                onClick={() => openEditForm(selectedAccount)}
                className="min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5"
              >
                <Pencil size={14} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedAccount.archived) {
                    toggleArchiveAccount(selectedAccount.id);
                    setSelectedAccount(null);
                  } else {
                    setArchiveConfirmAccount(selectedAccount);
                  }
                }}
                className="min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5"
              >
                {selectedAccount.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                <span>{selectedAccount.archived ? 'Restore' : 'Archive'}</span>
              </button>
            </div>
          )
        }
      >
        {selectedAccount && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 dark:bg-[#101828] border border-slate-200/80 dark:border-slate-700/80 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Current Balance</p>
                <p className="font-display text-xl font-extrabold tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {formatNaira(getAccountBalanceKobo(selectedAccount, state.transactions), {
                    symbol: sym,
                    masked,
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">Opening Balance</p>
                <p className="font-display text-sm font-bold tabular-nums text-slate-700 dark:text-slate-300 mt-0.5">
                  {formatNaira(selectedAccount.openingBalanceKobo, {
                    symbol: sym,
                    masked,
                  })}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                Account Activity ({selectedAccountTx.length})
              </h3>
              {selectedAccountTx.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                  No transactions recorded for this account yet.
                </p>
              ) : (
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                  {selectedAccountTx.map((tx) => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      category={state.categories.find((c) => c.id === tx.categoryId)}
                      account={state.accounts.find((a) => a.id === tx.accountId)}
                      destinationAccount={state.accounts.find(
                        (a) => a.id === tx.destinationAccountId
                      )}
                      currencySymbol={sym}
                      dateFormat={state.settings.dateFormat}
                      hideBalances={masked}
                      showDateInMeta
                      onClick={() => {
                        setSelectedAccount(null);
                        onOpenTransactionForm(tx.type, tx);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Create / Edit Account Sheet */}
      <BottomSheet
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingAccount ? 'Edit Account' : 'Add Account'}
        subtitle="Track a bank account, mobile wallet, or cash"
        footer={
          <button
            type="submit"
            form="account-form"
            className="w-full min-h-[48px] rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white font-display text-sm font-bold"
          >
            {editingAccount ? 'Save Account' : 'Create Account'}
          </button>
        }
      >
        <form id="account-form" onSubmit={handleSubmitForm} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-[#DC5C5C]/10 dark:bg-[#DC5C5C]/15 px-3.5 py-2.5 text-xs font-semibold text-[#DC5C5C] dark:text-[#F07171]">
              {formError}
            </div>
          )}

          {!editingAccount && (
            <div>
              <p className="text-xs font-semibold text-[#667085] dark:text-[#CBD5E1] mb-2">
                Quick Institution Presets
              </p>
              <div className="flex flex-wrap gap-1.5">
                {INSTITUTION_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setInstitution(preset.name);
                      setType(preset.type);
                      setColor(preset.color);
                      if (!name.trim()) {
                        setName(
                          preset.type === 'cash'
                            ? 'Cash on Hand'
                            : preset.type === 'mobile_money'
                            ? `${preset.name} Wallet`
                            : `${preset.name} Account`
                        );
                      }
                    }}
                    className={`min-h-[36px] px-3 rounded-lg border text-xs font-semibold transition-colors ${
                      institution === preset.name
                        ? 'border-[#087F5B] bg-[#DDF5E6] dark:bg-[#087F5B]/25 text-[#087F5B] dark:text-[#DDF5E6]'
                        : 'border-[#E4E7EC] dark:border-[#2B3952] text-[#667085] dark:text-[#CBD5E1]'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="acc-name"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
            >
              Account Label
            </label>
            <input
              id="acc-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Access Bank Salary, OPay Wallet"
              className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#087F5B]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="acc-institution"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Institution
              </label>
              <input
                id="acc-institution"
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="GTBank, OPay, Cash..."
                className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#087F5B]"
              />
            </div>

            <div>
              <label
                htmlFor="acc-type"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Account Type
              </label>
              <select
                id="acc-type"
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101828] px-3 text-sm text-slate-900 dark:text-white"
              >
                <option value="bank">Bank Account</option>
                <option value="mobile_money">Mobile Wallet</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <CurrencyInput
            id="acc-opening"
            label="Opening Balance"
            valueKobo={openingKobo}
            onChangeKobo={setOpeningKobo}
            currencySymbol={sym}
            helperText="Separate from monthly income—represents starting funds."
          />

          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Card Color
            </p>
            <div className="flex items-center gap-2.5">
              {AccountColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Select color ${c}`}
                  className={`w-9 h-9 rounded-full transition-transform ${
                    color === c ? 'ring-2 ring-offset-2 ring-[#087F5B] scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </form>
      </BottomSheet>

      <ConfirmationDialog
        isOpen={Boolean(archiveConfirmAccount)}
        title="Archive Account?"
        message={`Archiving "${archiveConfirmAccount?.name || ''}" removes it from your active total balance and transaction pickers. You can restore it anytime.`}
        confirmLabel="Archive"
        onCancel={() => setArchiveConfirmAccount(null)}
        onConfirm={() => {
          if (archiveConfirmAccount) {
            toggleArchiveAccount(archiveConfirmAccount.id);
            setArchiveConfirmAccount(null);
            setSelectedAccount(null);
          }
        }}
      />
    </div>
  );
};
