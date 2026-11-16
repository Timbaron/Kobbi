import React, { useRef, useState } from 'react';
import {
  CalendarClock,
  ChevronRight,
  Download,
  EyeOff,
  Fingerprint,
  Lock,
  Moon,
  Palette,
  Plus,
  RotateCcw,
  Sun,
  Tag,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import { KobbiAppIcon, KobbiMark, KobbiWordmark } from '../components/brand/KobbiLogo';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomSheet } from '../components/ui/BottomSheet';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { useFinance } from '../store/FinanceContext';
import { CategoryColors } from '../theme/tokens';
import { AppSettings, DateFormatOption, SecondaryScreen } from '../types/finance';
import { toDateOnlyISO } from '../utils/date';

interface SettingsScreenProps {
  onBack: () => void;
  onOpenSecondary: (screen: SecondaryScreen) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onOpenSecondary,
}) => {
  const {
    state,
    updateSettings,
    addCategory,
    deleteCategory,
    exportJsonBackup,
    importJsonBackup,
    resetDemoData,
    replayOnboarding,
    showToast,
  } = useFinance();

  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [newCatColor, setNewCatColor] = useState<string>(CategoryColors[0]);

  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [pasteJson, setPasteJson] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [brandKitOpen, setBrandKitOpen] = useState(false);

  const handleExportBackup = () => {
    const json = exportJsonBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kobbi-backup-${toDateOnlyISO(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Kobbi JSON backup exported');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const res = importJsonBackup(content);
      if (!res.ok) {
        setImportError(res.error || 'Import failed.');
      } else {
        setImportSheetOpen(false);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    const res = importJsonBackup(pasteJson);
    if (!res.ok) {
      setImportError(res.error || 'Invalid JSON.');
    } else {
      setPasteJson('');
      setImportSheetOpen(false);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory({
      name: newCatName.trim(),
      type: newCatType,
      iconName: newCatType === 'income' ? 'Briefcase' : 'Tag',
      color: newCatColor,
    });
    setNewCatName('');
  };

  return (
    <div className="flex flex-col min-h-full kb-screen-enter">
      <AppHeader title="Settings" subtitle="Preferences, privacy & backups" showBack onBack={onBack} />

      <div className="px-4 pt-3 pb-12 space-y-5">
        {/* General Section */}
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            General
          </h2>
          <div className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] divide-y divide-[#E4E7EC]/60 dark:divide-[#2B3952]/70">
            {/* Display Name */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                First Name
              </span>
              <input
                type="text"
                value={state.settings.userName}
                onChange={(e) => updateSettings({ userName: e.target.value })}
                aria-label="First name"
                className="w-36 text-right bg-transparent text-sm font-semibold text-slate-900 dark:text-white focus:outline-none border-b border-transparent focus:border-[#087F5B]"
              />
            </div>

            {/* Currency */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Currency
              </span>
              <select
                value={state.settings.currencyCode}
                onChange={(e) => {
                  const code = e.target.value as AppSettings['currencyCode'];
                  const sym = code === 'USD' ? '$' : code === 'GBP' ? '£' : '₦';
                  updateSettings({ currencyCode: code, currencySymbol: sym });
                }}
                aria-label="Currency"
                className="min-h-[36px] rounded-lg bg-slate-100 dark:bg-[#101828] px-2.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            {/* Theme */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Appearance
              </span>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#101828]">
                <button
                  type="button"
                  onClick={() => updateSettings({ theme: 'light' })}
                  className={`min-h-[32px] px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                    state.settings.theme === 'light'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  <Sun size={13} />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings({ theme: 'dark' })}
                  className={`min-h-[32px] px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                    state.settings.theme === 'dark'
                      ? 'bg-[#182235] text-white shadow-sm'
                      : 'text-[#667085]'
                  }`}
                >
                  <Moon size={13} />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {/* Date Format */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Date Format
              </span>
              <select
                value={state.settings.dateFormat}
                onChange={(e) =>
                  updateSettings({ dateFormat: e.target.value as DateFormatOption })
                }
                aria-label="Date format"
                className="min-h-[36px] rounded-lg bg-slate-100 dark:bg-[#101828] px-2.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="DD MMM YYYY">16 Nov 2026</option>
                <option value="DD/MM/YYYY">16/11/2026</option>
                <option value="YYYY-MM-DD">2026-11-16</option>
              </select>
            </div>

            {/* Local Reminders Toggle */}
            <label className="p-3.5 flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Local Reminders
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Show budget threshold & scheduled bill badges
                </p>
              </div>
              <input
                type="checkbox"
                checked={state.settings.notificationsEnabled}
                onChange={(e) => updateSettings({ notificationsEnabled: e.target.checked })}
                className="w-5 h-5 accent-[#087F5B]"
              />
            </label>
          </div>
        </section>

        {/* Financial Preferences */}
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            Financial Preferences
          </h2>
          <div className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] divide-y divide-[#E4E7EC]/60 dark:divide-[#2B3952]/70">
            <button
              type="button"
              onClick={() => onOpenSecondary('accounts')}
              className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-2.5">
                <Wallet size={17} className="text-[#087F5B] dark:text-[#34D399]" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Manage Accounts & Wallets
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onOpenSecondary('recurring')}
              className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-2.5">
                <CalendarClock size={17} className="text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Recurring Schedules
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => setCategoriesOpen(true)}
              className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-2.5">
                <Tag size={17} className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Manage Categories ({state.categories.length})
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <div className="p-3.5 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Default Account
              </span>
              <select
                value={state.settings.defaultAccountId}
                onChange={(e) => updateSettings({ defaultAccountId: e.target.value })}
                aria-label="Default account"
                className="min-h-[36px] max-w-[160px] rounded-lg bg-slate-100 dark:bg-[#101828] px-2.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                {state.accounts
                  .filter((a) => !a.archived)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="p-3.5 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Budget Alert Threshold
              </span>
              <select
                value={state.settings.budgetAlertThresholdPct}
                onChange={(e) =>
                  updateSettings({ budgetAlertThresholdPct: Number(e.target.value) })
                }
                aria-label="Budget alert threshold"
                className="min-h-[36px] rounded-lg bg-slate-100 dark:bg-[#101828] px-2.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value={70}>70%</option>
                <option value={80}>80%</option>
                <option value={90}>90%</option>
              </select>
            </div>

            <div className="p-3.5 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Monthly Start Day
              </span>
              <select
                value={state.settings.monthlyStartDay}
                onChange={(e) => updateSettings({ monthlyStartDay: Number(e.target.value) })}
                aria-label="Monthly start day"
                className="min-h-[36px] rounded-lg bg-slate-100 dark:bg-[#101828] px-2.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                {[1, 5, 15, 25, 28].map((d) => (
                  <option key={d} value={d}>
                    Day {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Privacy & Security */}
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            Privacy & Security
          </h2>
          <div className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] divide-y divide-[#E4E7EC]/60 dark:divide-[#2B3952]/70">
            <label className="p-3.5 flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <EyeOff size={17} className="text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Hide Sensitive Balances
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mask Naira figures across screens
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={state.settings.hideBalances}
                onChange={(e) => updateSettings({ hideBalances: e.target.checked })}
                className="w-5 h-5 accent-[#087F5B]"
              />
            </label>

            <label className="p-3.5 flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Lock size={17} className="text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    App PIN Lock (Native UI Preview)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Prototype toggle — enforced in React Native CLI build
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={state.settings.appLockEnabled}
                onChange={(e) => {
                  updateSettings({ appLockEnabled: e.target.checked });
                  showToast('App Lock UI preference updated', 'info');
                }}
                className="w-5 h-5 accent-[#087F5B]"
              />
            </label>

            <label className="p-3.5 flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Fingerprint size={17} className="text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Biometric Unlock (Native UI Preview)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Face ID / Fingerprint placeholder for mobile app
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={state.settings.biometricLockEnabled}
                onChange={(e) => {
                  updateSettings({ biometricLockEnabled: e.target.checked });
                  showToast('Biometric lock UI preference updated', 'info');
                }}
                className="w-5 h-5 accent-[#087F5B]"
              />
            </label>
          </div>
        </section>

        {/* Data Management */}
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            Data Management & Prototype
          </h2>
          <div className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] divide-y divide-[#E4E7EC]/60 dark:divide-[#2B3952]/70">
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-2.5">
                <Download size={17} className="text-[#087F5B] dark:text-[#34D399]" />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Export JSON Backup
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Save local copy of accounts, budgets & transactions
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                setImportError('');
                setImportSheetOpen(true);
              }}
              className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-2.5">
                <Upload size={17} className="text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Import & Restore Backup
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Restore from a previously exported JSON file
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <button
              type="button"
              onClick={replayOnboarding}
              className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Replay First-Time Onboarding
              </span>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              className="w-full p-3.5 flex items-center justify-between gap-3 text-left text-[#DC5C5C] dark:text-[#F07171] hover:bg-[#DC5C5C]/10"
            >
              <div className="flex items-center gap-2.5">
                <RotateCcw size={17} />
                <span className="text-sm font-semibold">Reset Demo Data</span>
              </div>
            </button>
          </div>
        </section>

        {/* About Kobbi & Brand Identity */}
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-bold text-[#667085] dark:text-[#98A2B3]">
            About Kobbi
          </h2>
          <div className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <KobbiAppIcon size={44} tone="white-on-emerald" />
                <div>
                  <KobbiWordmark
                    size="sm"
                    showIcon={false}
                    variant={state.settings.theme === 'dark' ? 'dark' : 'light'}
                  />
                  <p className="text-xs font-medium text-[#087F5B] dark:text-[#DDF5E6] mt-0.5">
                    Every kobo counts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBrandKitOpen(true)}
                className="min-h-[38px] px-3 rounded-xl bg-[#DDF5E6] dark:bg-[#087F5B]/25 text-[#087F5B] dark:text-[#DDF5E6] text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Palette size={13} />
                <span>Brand Kit</span>
              </button>
            </div>
            <p className="text-xs text-[#667085] dark:text-[#98A2B3] leading-relaxed">
              Your money. Your clarity. Your control. Built as a calm, offline-first personal finance companion stored locally on your device.
            </p>
          </div>
        </section>
      </div>

      {/* Manage Categories Sheet */}
      <BottomSheet
        isOpen={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        title="Manage Categories"
        subtitle="Add custom categories or remove unused ones"
      >
        <div className="space-y-4">
          <form onSubmit={handleAddCategory} className="space-y-2.5 rounded-2xl bg-slate-50 dark:bg-[#101828] p-3.5 border border-slate-200 dark:border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="New category name..."
                className="flex-1 min-h-[42px] rounded-xl border border-[#E4E7EC] dark:border-[#2B3952] bg-white dark:bg-[#182235] px-3 text-sm text-[#101828] dark:text-white"
              />
              <select
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value as 'expense' | 'income')}
                className="min-h-[42px] rounded-xl border border-[#E4E7EC] dark:border-[#2B3952] bg-white dark:bg-[#182235] px-2.5 text-xs font-semibold text-[#101828] dark:text-white"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {CategoryColors.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCatColor(c)}
                    className={`w-6 h-6 rounded-full ${
                      newCatColor === c ? 'ring-2 ring-offset-1 ring-[#087F5B]' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                type="submit"
                className="min-h-[38px] px-3.5 rounded-xl bg-[#087F5B] text-white text-xs font-bold inline-flex items-center gap-1"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>
          </form>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {state.categories.map((cat) => (
              <div key={cat.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${cat.color}1A`, color: cat.color }}
                  >
                    <CategoryIcon name={cat.iconName} size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {cat.name}
                    </p>
                    <p className="text-[10.5px] text-slate-500 capitalize">{cat.type}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const res = deleteCategory(cat.id);
                    if (!res.ok && res.error) showToast(res.error, 'error');
                  }}
                  aria-label={`Delete ${cat.name}`}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-[#667085] hover:text-[#DC5C5C] dark:hover:text-[#F07171]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* Import JSON Sheet */}
      <BottomSheet
        isOpen={importSheetOpen}
        onClose={() => setImportSheetOpen(false)}
        title="Restore JSON Backup"
        subtitle="Upload a Kobbi .json backup or paste contents below"
      >
        <div className="space-y-4">
          {importError && (
            <div className="rounded-xl bg-[#DC5C5C]/12 px-3.5 py-2.5 text-xs font-semibold text-[#DC5C5C] dark:text-[#F07171]">
              {importError}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[48px] rounded-xl border border-dashed border-[#E4E7EC] dark:border-[#2B3952] text-xs font-bold text-[#101828] dark:text-[#F8FAFC] flex items-center justify-center gap-2 hover:bg-[#F8FAFC] dark:hover:bg-[#222E44]"
          >
            <Upload size={16} />
            <span>Choose Backup File (.json)</span>
          </button>

          <div>
            <label className="block text-xs font-semibold text-[#667085] dark:text-[#CBD5E1] mb-1.5">
              Or paste backup JSON
            </label>
            <textarea
              rows={4}
              value={pasteJson}
              onChange={(e) => setPasteJson(e.target.value)}
              placeholder='{"version": 1, "data": ...}'
              className="w-full rounded-xl border border-[#E4E7EC] dark:border-[#2B3952] bg-[#F8FAFC] dark:bg-[#101828] p-3 text-xs font-mono text-[#101828] dark:text-white"
            />
          </div>

          <button
            type="button"
            onClick={handlePasteImport}
            disabled={!pasteJson.trim()}
            className="w-full min-h-[46px] rounded-xl bg-[#087F5B] disabled:opacity-40 text-white text-xs font-bold"
          >
            Restore from Pasted JSON
          </button>
        </div>
      </BottomSheet>

      {/* Kobbi Brand Identity & Logo Variations Sheet */}
      <BottomSheet
        isOpen={brandKitOpen}
        onClose={() => setBrandKitOpen(false)}
        title="Kobbi Brand Identity"
        subtitle="Official wordmark, lowercase k monogram & app icons"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-[#F8FAFC] border border-[#E4E7EC] p-4 flex flex-col items-center justify-center gap-2">
              <KobbiWordmark variant="light" size="md" />
              <span className="text-[11px] font-medium text-[#667085]">Light Wordmark</span>
            </div>
            <div className="rounded-2xl bg-[#101828] border border-[#2B3952] p-4 flex flex-col items-center justify-center gap-2">
              <KobbiWordmark variant="dark" size="md" />
              <span className="text-[11px] font-medium text-[#98A2B3]">Dark Wordmark</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E4E7EC] dark:border-[#2B3952] p-4 space-y-3">
            <p className="text-xs font-bold text-[#101828] dark:text-[#F8FAFC]">
              Standalone Monogram & App Icon Scales
            </p>
            <div className="flex items-center justify-around py-2">
              <div className="flex flex-col items-center gap-1.5">
                <KobbiMark size={32} variant={state.settings.theme === 'dark' ? 'dark' : 'light'} />
                <span className="text-[10.5px] text-[#667085] dark:text-[#98A2B3]">Primary k</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-[#101828] dark:text-[#F8FAFC]">
                <KobbiMark size={32} variant="monochrome" />
                <span className="text-[10.5px] text-[#667085] dark:text-[#98A2B3]">Mono k</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <KobbiAppIcon size={48} tone="white-on-emerald" />
                <span className="text-[10.5px] text-[#667085] dark:text-[#98A2B3]">48px Icon</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <KobbiAppIcon size={56} tone="mint-on-emerald" />
                <span className="text-[10.5px] text-[#667085] dark:text-[#98A2B3]">Mint Icon</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#DDF5E6]/60 dark:bg-[#087F5B]/20 border border-[#087F5B]/20 p-3.5 text-center">
            <p className="font-display text-sm font-bold text-[#087F5B] dark:text-[#DDF5E6]">
              Every kobo counts.
            </p>
            <p className="mt-0.5 text-xs text-[#101828] dark:text-[#CBD5E1]">
              Your money. Your clarity. Your control.
            </p>
          </div>
        </div>
      </BottomSheet>

      <ConfirmationDialog
        isOpen={resetConfirmOpen}
        title="Reset Demo Data?"
        message="This will restore all accounts, transactions, budgets, goals, and schedules back to the original Nigerian Naira sample dataset."
        confirmLabel="Reset Data"
        destructive
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          resetDemoData();
          setResetConfirmOpen(false);
        }}
      />
    </div>
  );
};
