import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
  Sun,
  Tag,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react-native';
import { AppHeader } from '../../components/common/AppHeader';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { KobbiAppIcon, KobbiMark, KobbiWordmark } from '../../components/brand/KobbiLogo';
import { PinLockScreen } from '../security/PinLockScreen';
import { DatabaseManager } from '../../database';
import { useTheme } from '../../theme/ThemeContext';
import { DesignTokens, CategoryColors } from '../../theme/tokens';
import {
  Account,
  AppSettings,
  Category,
  DateFormatOption,
  SecondaryScreen,
} from '../../types/finance';
import { BackupService } from '../../services/backup/BackupService';
import { CsvExportService } from '../../services/export/CsvExportService';
import { SecurityService } from '../../services/security/SecurityService';
import { seedInitialData } from '../../database/seeds/defaultData';
import { toDateOnlyISO } from '../../utils/date';

interface SettingsScreenProps {
  onBack: () => void;
  onOpenSecondary: (screen: SecondaryScreen) => void;
  onReplayOnboarding?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onOpenSecondary,
  onReplayOnboarding,
  onShowToast,
}) => {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const db = DatabaseManager.getInstance();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Category management sheet
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [newCatColor, setNewCatColor] = useState<string>(CategoryColors[0]);

  // Export Sheet
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');

  // Import Sheet
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [pasteJson, setPasteJson] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importError, setImportError] = useState('');

  // Brand Kit Sheet
  const [brandKitOpen, setBrandKitOpen] = useState(false);

  // PIN Setup / Verify Modal
  const [pinModalMode, setPinModalMode] = useState<'create' | 'verify' | null>(null);

  const loadData = async () => {
    try {
      const [setRes, accRes, catRes] = await Promise.all([
        db.repos.settings.getSettings(),
        db.repos.accounts.getAll(false),
        db.repos.categories.getAll(),
      ]);
      setSettings(setRes);
      setAccounts(accRes);
      setCategories(catRes);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateSetting = async (key: keyof AppSettings, value: any) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await db.repos.settings.updateSettings({ [key]: value });
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const created = await db.repos.categories.create({
        name: newCatName.trim(),
        type: newCatType,
        iconName: newCatType === 'income' ? 'Briefcase' : 'Tag',
        color: newCatColor,
      });
      setCategories((prev) => [...prev, created]);
      setNewCatName('');
      onShowToast?.(`Category "${created.name}" created`, 'success');
    } catch (err: any) {
      onShowToast?.(err.message || 'Failed to add category', 'error');
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    try {
      await db.repos.categories.delete(catId);
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      onShowToast?.(`Category "${catName}" removed`, 'info');
    } catch (err: any) {
      onShowToast?.(err.message || 'Failed to delete category', 'error');
    }
  };

  const handleExportBackup = async () => {
    try {
      const backup = await BackupService.createBackup(db.db);
      const jsonString = await BackupService.encryptBackup(backup, exportPassword || undefined);
      const filename = `kobbi-backup-${toDateOnlyISO(new Date())}.json`;

      await CsvExportService.shareCsv(jsonString, filename, 'Kobbi JSON Backup');
      setExportSheetOpen(false);
      setExportPassword('');
      onShowToast?.('Kobbi JSON backup ready to save', 'success');
    } catch {
      onShowToast?.('Failed to export backup', 'error');
    }
  };

  const handleImportBackup = async () => {
    if (!pasteJson.trim()) return;
    setImportError('');
    try {
      const backup = await BackupService.decryptBackup(pasteJson, importPassword || undefined);
      const res = await BackupService.restoreBackup(db.db, backup);

      if (!res.success) {
        setImportError(res.error || 'Failed to restore database.');
        return;
      }

      await loadData();
      setImportSheetOpen(false);
      setPasteJson('');
      setImportPassword('');
      onShowToast?.('Backup successfully restored!', 'success');
    } catch (err: any) {
      setImportError(err.message || 'Invalid or corrupted backup JSON.');
    }
  };

  const handlePinSuccess = async (pin: string) => {
    if (pinModalMode === 'create') {
      await SecurityService.setPin(db.db, pin);
      handleUpdateSetting('appLockEnabled', true);
      setPinModalMode(null);
      onShowToast?.('App PIN Lock enabled', 'success');
    } else if (pinModalMode === 'verify') {
      await SecurityService.removePin(db.db);
      handleUpdateSetting('appLockEnabled', false);
      setPinModalMode(null);
      onShowToast?.('App PIN Lock removed', 'info');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Settings"
        subtitle="Preferences, privacy & backups"
        showBack
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* General Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            General
          </Text>
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            {/* Display Name */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                First Name
              </Text>
              <TextInput
                value={settings?.userName || ''}
                onChangeText={(val) => handleUpdateSetting('userName', val)}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                style={[styles.textInputRight, { color: colors.textPrimary }]}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            {/* Currency */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                Currency
              </Text>
              <View style={styles.currencyPills}>
                {(['NGN', 'USD', 'GBP'] as const).map((code) => {
                  const isSelected = (settings?.currencyCode || 'NGN') === code;
                  const sym = code === 'USD' ? '$' : code === 'GBP' ? '£' : '₦';
                  return (
                    <TouchableOpacity
                      key={code}
                      onPress={() => {
                        handleUpdateSetting('currencyCode', code);
                        handleUpdateSetting('currencySymbol', sym);
                      }}
                      style={[
                        styles.currencyPill,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(8, 127, 91, 0.3)'
                              : '#DDF5E6'
                            : isDark
                            ? colors.surfaceSubtle
                            : '#F1F5F9',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.currencyPillText,
                          {
                            color: isSelected ? colors.primary : colors.textSecondary,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {code} ({sym})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            {/* Appearance Light / Dark */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                Appearance
              </Text>
              <View style={[styles.themeToggle, { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' }]}>
                <TouchableOpacity
                  onPress={() => {
                    setThemeMode('light');
                    handleUpdateSetting('theme', 'light');
                  }}
                  style={[
                    styles.themeButton,
                    themeMode === 'light' && {
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Sun size={14} color={themeMode === 'light' ? colors.primary : colors.textSecondary} />
                  <Text
                    style={[
                      styles.themeButtonText,
                      {
                        color: themeMode === 'light' ? colors.textPrimary : colors.textSecondary,
                        fontWeight: themeMode === 'light' ? '700' : '600',
                      },
                    ]}
                  >
                    Light
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setThemeMode('dark');
                    handleUpdateSetting('theme', 'dark');
                  }}
                  style={[
                    styles.themeButton,
                    themeMode === 'dark' && {
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Moon size={14} color={themeMode === 'dark' ? colors.primary : colors.textSecondary} />
                  <Text
                    style={[
                      styles.themeButtonText,
                      {
                        color: themeMode === 'dark' ? colors.textPrimary : colors.textSecondary,
                        fontWeight: themeMode === 'dark' ? '700' : '600',
                      },
                    ]}
                  >
                    Dark
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            {/* Date Format */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                Date Format
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const options: DateFormatOption[] = ['DD MMM YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
                  const currIdx = options.indexOf(settings?.dateFormat || 'DD MMM YYYY');
                  const nextOpt = options[(currIdx + 1) % options.length];
                  handleUpdateSetting('dateFormat', nextOpt);
                }}
                style={[
                  styles.selectButton,
                  { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
                ]}
              >
                <Text style={[styles.selectButtonText, { color: colors.textPrimary }]}>
                  {settings?.dateFormat || 'DD MMM YYYY'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            {/* Local Reminders Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                  Local Reminders
                </Text>
                <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                  Show budget threshold & scheduled bill alerts
                </Text>
              </View>
              <Switch
                value={settings?.notificationsEnabled || false}
                onValueChange={(val) => handleUpdateSetting('notificationsEnabled', val)}
                trackColor={{ false: '#D1D5DB', true: colors.primary }}
              />
            </View>
          </View>
        </View>

        {/* Financial Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            Financial Preferences
          </Text>
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => onOpenSecondary('accounts')}
              style={styles.settingRowPressable}
            >
              <View style={styles.rowLeftIcon}>
                <Wallet size={18} color={colors.primary} />
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                  Manage Accounts & Wallets
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            <TouchableOpacity
              onPress={() => onOpenSecondary('recurring')}
              style={styles.settingRowPressable}
            >
              <View style={styles.rowLeftIcon}>
                <CalendarClock size={18} color={colors.semantic.warning} />
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                  Recurring Schedules
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            <TouchableOpacity
              onPress={() => setCategoriesOpen(true)}
              style={styles.settingRowPressable}
            >
              <View style={styles.rowLeftIcon}>
                <Tag size={18} color="#3B82F6" />
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                  Manage Categories ({categories.length})
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            {/* Default Account */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                Default Account
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (accounts.length === 0) return;
                  const currIdx = accounts.findIndex((a) => a.id === settings?.defaultAccountId);
                  const nextAcc = accounts[(currIdx + 1) % accounts.length];
                  handleUpdateSetting('defaultAccountId', nextAcc.id);
                }}
                style={[
                  styles.selectButton,
                  { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
                ]}
              >
                <Text style={[styles.selectButtonText, { color: colors.textPrimary }]}>
                  {accounts.find((a) => a.id === settings?.defaultAccountId)?.name || 'Select'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            {/* Budget Alert Threshold */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                Budget Alert Threshold
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const opts = [70, 80, 90];
                  const currIdx = opts.indexOf(settings?.budgetAlertThresholdPct || 80);
                  const nextVal = opts[(currIdx + 1) % opts.length];
                  handleUpdateSetting('budgetAlertThresholdPct', nextVal);
                }}
                style={[
                  styles.selectButton,
                  { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
                ]}
              >
                <Text style={[styles.selectButtonText, { color: colors.textPrimary }]}>
                  {settings?.budgetAlertThresholdPct || 80}%
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Privacy & Security Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            Privacy & Security
          </Text>
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            {/* Hide Sensitive Balances */}
            <View style={styles.settingRow}>
              <View style={styles.rowLeftIcon}>
                <EyeOff size={18} color={colors.textSecondary} />
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    Hide Sensitive Balances
                  </Text>
                  <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                    Mask Naira figures across screens
                  </Text>
                </View>
              </View>
              <Switch
                value={settings?.hideBalances || false}
                onValueChange={(val) => handleUpdateSetting('hideBalances', val)}
                trackColor={{ false: '#D1D5DB', true: colors.primary }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            {/* App PIN Lock */}
            <View style={styles.settingRow}>
              <View style={styles.rowLeftIcon}>
                <Lock size={18} color={colors.textSecondary} />
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    App PIN Lock
                  </Text>
                  <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                    Require 4-digit PIN upon app open
                  </Text>
                </View>
              </View>
              <Switch
                value={settings?.appLockEnabled || false}
                onValueChange={(val) => {
                  if (val) {
                    setPinModalMode('create');
                  } else {
                    setPinModalMode('verify');
                  }
                }}
                trackColor={{ false: '#D1D5DB', true: colors.primary }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            {/* Biometric Unlock */}
            <View style={styles.settingRow}>
              <View style={styles.rowLeftIcon}>
                <Fingerprint size={18} color={colors.textSecondary} />
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    Biometric Unlock
                  </Text>
                  <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                    Face ID / Fingerprint fast login
                  </Text>
                </View>
              </View>
              <Switch
                value={settings?.biometricLockEnabled || false}
                onValueChange={(val) => handleUpdateSetting('biometricLockEnabled', val)}
                trackColor={{ false: '#D1D5DB', true: colors.primary }}
              />
            </View>
          </View>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            Data Management
          </Text>
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setExportSheetOpen(true)}
              style={styles.settingRowPressable}
            >
              <View style={styles.rowLeftIcon}>
                <Download size={18} color={colors.primary} />
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    Export JSON Backup
                  </Text>
                  <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                    Save local encrypted or plain JSON backup
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            <TouchableOpacity
              onPress={() => {
                setImportError('');
                setImportSheetOpen(true);
              }}
              style={styles.settingRowPressable}
            >
              <View style={styles.rowLeftIcon}>
                <Upload size={18} color="#3B82F6" />
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    Import & Restore Backup
                  </Text>
                  <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                    Restore from an exported Kobbi backup
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {onReplayOnboarding && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
                <TouchableOpacity
                  onPress={onReplayOnboarding}
                  style={styles.settingRowPressable}
                >
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    Replay First-Time Onboarding
                  </Text>
                  <ChevronRight size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* About Kobbi & Brand Identity */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            About Kobbi
          </Text>
          <View
            style={[
              styles.aboutCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.aboutHeader}>
              <View style={styles.aboutBrandWrap}>
                <KobbiAppIcon size={44} tone="white-on-emerald" />
                <View style={styles.aboutTextWrap}>
                  <KobbiWordmark size="sm" showIcon={false} variant={isDark ? 'dark' : 'light'} />
                  <Text style={[styles.aboutTagline, { color: colors.primary }]}>
                    Every kobo counts.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setBrandKitOpen(true)}
                style={[
                  styles.brandKitButton,
                  { backgroundColor: isDark ? 'rgba(8, 127, 91, 0.25)' : '#DDF5E6' },
                ]}
              >
                <Palette size={13} color={colors.primary} />
                <Text style={[styles.brandKitButtonText, { color: colors.primary }]}>
                  Brand Kit
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.aboutDescription, { color: colors.textSecondary }]}>
              Your money. Your clarity. Your control. Built as a calm, offline-first personal finance companion stored locally on your device.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Categories BottomSheet */}
      <BottomSheet
        isOpen={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        title="Manage Categories"
        subtitle="Add custom categories or delete unused ones"
      >
        <View style={styles.categorySheetContent}>
          {/* Add Category Form */}
          <View
            style={[
              styles.addCategoryBox,
              {
                backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC',
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.catInputRow}>
              <TextInput
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="Category name..."
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.catTextInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                  },
                ]}
              />

              <TouchableOpacity
                onPress={() => setNewCatType((t) => (t === 'expense' ? 'income' : 'expense'))}
                style={[
                  styles.catTypeToggle,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Text style={[styles.catTypeText, { color: colors.textPrimary }]}>
                  {newCatType === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.catColorRow}>
              <View style={styles.colorCircles}>
                {CategoryColors.slice(0, 6).map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setNewCatColor(c)}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      newCatColor === c && styles.colorCircleSelected,
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity
                onPress={handleAddCategory}
                style={[styles.addCatButton, { backgroundColor: colors.primary }]}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.addCatButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Existing Categories List */}
          <View
            style={[
              styles.categoryList,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            {categories.map((cat, idx) => (
              <View
                key={cat.id}
                style={[
                  styles.catRowItem,
                  idx < categories.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.borderSubtle,
                  },
                ]}
              >
                <View style={styles.catItemLeft}>
                  <View
                    style={[
                      styles.catIconCircle,
                      { backgroundColor: `${cat.color}20` },
                    ]}
                  >
                    <CategoryIcon iconName={cat.iconName} size={15} color={cat.color} />
                  </View>
                  <View>
                    <Text style={[styles.catItemName, { color: colors.textPrimary }]}>
                      {cat.name}
                    </Text>
                    <Text style={[styles.catItemType, { color: colors.textSecondary }]}>
                      {cat.type}
                    </Text>
                  </View>
                </View>

                {!cat.isDefault && (
                  <TouchableOpacity
                    onPress={() => handleDeleteCategory(cat.id, cat.name)}
                    style={styles.catDeleteButton}
                  >
                    <Trash2 size={16} color={colors.semantic.expense} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      </BottomSheet>

      {/* Export Backup BottomSheet */}
      <BottomSheet
        isOpen={exportSheetOpen}
        onClose={() => setExportSheetOpen(false)}
        title="Export JSON Backup"
        subtitle="Export encrypted or plain backup to files or share sheet"
      >
        <View style={styles.backupSheetContent}>
          <Text style={[styles.sheetInstruction, { color: colors.textSecondary }]}>
            Optionally enter a password to encrypt this backup with AES-256-GCM. Leave blank for unencrypted JSON.
          </Text>

          <TextInput
            value={exportPassword}
            onChangeText={setExportPassword}
            placeholder="Password (optional)..."
            secureTextEntry
            placeholderTextColor={colors.textMuted}
            style={[
              styles.sheetInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                color: colors.textPrimary,
              },
            ]}
          />

          <TouchableOpacity
            onPress={handleExportBackup}
            style={[styles.primarySheetButton, { backgroundColor: colors.primary }]}
          >
            <Download size={16} color="#FFFFFF" />
            <Text style={styles.primarySheetButtonText}>
              {exportPassword.trim() ? 'Export Encrypted Backup' : 'Export Plain JSON Backup'}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Import Backup BottomSheet */}
      <BottomSheet
        isOpen={importSheetOpen}
        onClose={() => setImportSheetOpen(false)}
        title="Restore JSON Backup"
        subtitle="Paste backup contents below to restore"
      >
        <View style={styles.backupSheetContent}>
          {importError ? (
            <View style={[styles.errorBox, { backgroundColor: 'rgba(220, 92, 92, 0.12)' }]}>
              <Text style={[styles.errorBoxText, { color: colors.semantic.expense }]}>
                {importError}
              </Text>
            </View>
          ) : null}

          <TextInput
            value={pasteJson}
            onChangeText={setPasteJson}
            placeholder='Paste {"version": 1, ...} here'
            multiline
            numberOfLines={4}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.sheetTextArea,
              {
                backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC',
                borderColor: colors.borderSubtle,
                color: colors.textPrimary,
              },
            ]}
          />

          <TextInput
            value={importPassword}
            onChangeText={setImportPassword}
            placeholder="Password (if backup was encrypted)"
            secureTextEntry
            placeholderTextColor={colors.textMuted}
            style={[
              styles.sheetInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                color: colors.textPrimary,
              },
            ]}
          />

          <TouchableOpacity
            onPress={handleImportBackup}
            disabled={!pasteJson.trim()}
            style={[
              styles.primarySheetButton,
              { backgroundColor: colors.primary },
              !pasteJson.trim() && { opacity: 0.5 },
            ]}
          >
            <Upload size={16} color="#FFFFFF" />
            <Text style={styles.primarySheetButtonText}>Restore Database</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Brand Kit BottomSheet */}
      <BottomSheet
        isOpen={brandKitOpen}
        onClose={() => setBrandKitOpen(false)}
        title="Kobbi Brand Identity"
        subtitle="Official wordmark, monogram & app icons"
      >
        <View style={styles.brandKitContent}>
          <View style={styles.brandRow}>
            <View style={[styles.brandCardBox, { backgroundColor: '#F8FAFC', borderColor: '#E4E7EC' }]}>
              <KobbiWordmark variant="light" size="md" />
              <Text style={[styles.brandCaption, { color: '#667085' }]}>Light Wordmark</Text>
            </View>

            <View style={[styles.brandCardBox, { backgroundColor: '#101828', borderColor: '#2B3952' }]}>
              <KobbiWordmark variant="dark" size="md" />
              <Text style={[styles.brandCaption, { color: '#98A2B3' }]}>Dark Wordmark</Text>
            </View>
          </View>

          <View style={[styles.monogramCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.monogramTitle, { color: colors.textPrimary }]}>
              Standalone Monogram & App Icons
            </Text>
            <View style={styles.monogramIconsRow}>
              <View style={styles.monogramIconItem}>
                <KobbiMark size={32} variant={isDark ? 'dark' : 'light'} />
                <Text style={[styles.monogramLabel, { color: colors.textSecondary }]}>Primary k</Text>
              </View>

              <View style={styles.monogramIconItem}>
                <KobbiMark size={32} variant="monochrome" />
                <Text style={[styles.monogramLabel, { color: colors.textSecondary }]}>Mono k</Text>
              </View>

              <View style={styles.monogramIconItem}>
                <KobbiAppIcon size={44} tone="white-on-emerald" />
                <Text style={[styles.monogramLabel, { color: colors.textSecondary }]}>App Icon</Text>
              </View>

              <View style={styles.monogramIconItem}>
                <KobbiAppIcon size={44} tone="mint-on-emerald" />
                <Text style={[styles.monogramLabel, { color: colors.textSecondary }]}>Mint Icon</Text>
              </View>
            </View>
          </View>

          <View style={[styles.taglineBanner, { backgroundColor: isDark ? 'rgba(8, 127, 91, 0.2)' : '#DDF5E6' }]}>
            <Text style={[styles.taglineBold, { color: colors.primary }]}>
              Every kobo counts.
            </Text>
            <Text style={[styles.statementText, { color: colors.textPrimary }]}>
              Your money. Your clarity. Your control.
            </Text>
          </View>
        </View>
      </BottomSheet>

      {/* PIN Lock Setup / Verification Modal */}
      <Modal
        visible={pinModalMode !== null}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {pinModalMode && (
          <PinLockScreen
            mode={pinModalMode}
            userName={settings?.userName || 'Friend'}
            onSuccess={handlePinSuccess}
            onCancel={() => setPinModalMode(null)}
            onVerifyPin={async (pin) => {
              return SecurityService.validateStoredPin(db.db, pin);
            }}
          />
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: DesignTokens.spacing.md,
    paddingTop: DesignTokens.spacing.sm,
    paddingBottom: DesignTokens.spacing.xxl + 40,
    gap: DesignTokens.spacing.lg,
  },
  section: {
    gap: DesignTokens.spacing.xs,
  },
  sectionHeader: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: DesignTokens.spacing.md,
    minHeight: DesignTokens.touchTargets.rowMinHeight,
  },
  settingRowPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: DesignTokens.spacing.md,
    minHeight: DesignTokens.touchTargets.rowMinHeight,
  },
  rowLeftIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DesignTokens.spacing.sm,
    flex: 1,
  },
  settingTextWrap: {
    flex: 1,
  },
  settingLabel: {
    fontSize: DesignTokens.typography.sizes.body,
    fontWeight: '500',
  },
  settingSubtext: {
    fontSize: DesignTokens.typography.sizes.caption,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  textInputRight: {
    fontSize: DesignTokens.typography.sizes.body,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 120,
    padding: 0,
  },
  currencyPills: {
    flexDirection: 'row',
    gap: DesignTokens.spacing.xs,
  },
  currencyPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: DesignTokens.radii.sm,
  },
  currencyPillText: {
    fontSize: DesignTokens.typography.sizes.caption,
  },
  themeToggle: {
    flexDirection: 'row',
    borderRadius: DesignTokens.radii.sm,
    padding: 2,
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: DesignTokens.radii.sm,
  },
  themeButtonText: {
    fontSize: DesignTokens.typography.sizes.caption,
  },
  selectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: DesignTokens.radii.sm,
  },
  selectButtonText: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
  },
  aboutCard: {
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
    padding: DesignTokens.spacing.md,
    gap: DesignTokens.spacing.sm,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aboutBrandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DesignTokens.spacing.sm,
  },
  aboutTextWrap: {
    gap: 2,
  },
  aboutTagline: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '600',
  },
  brandKitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: DesignTokens.radii.md,
  },
  brandKitButtonText: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
  },
  aboutDescription: {
    fontSize: DesignTokens.typography.sizes.caption,
    lineHeight: 18,
  },
  categorySheetContent: {
    gap: DesignTokens.spacing.md,
  },
  addCategoryBox: {
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
    padding: DesignTokens.spacing.md,
    gap: DesignTokens.spacing.sm,
  },
  catInputRow: {
    flexDirection: 'row',
    gap: DesignTokens.spacing.xs,
  },
  catTextInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: DesignTokens.radii.sm,
    borderWidth: 1,
    paddingHorizontal: DesignTokens.spacing.sm,
    fontSize: DesignTokens.typography.sizes.body,
  },
  catTypeToggle: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: DesignTokens.radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catTypeText: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
  },
  catColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorCircles: {
    flexDirection: 'row',
    gap: 6,
  },
  colorCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#087F5B',
  },
  addCatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: DesignTokens.radii.sm,
  },
  addCatButtonText: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryList: {
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  catRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.sm,
  },
  catItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DesignTokens.spacing.sm,
  },
  catIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catItemName: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
  },
  catItemType: {
    fontSize: 10.5,
    textTransform: 'capitalize',
  },
  catDeleteButton: {
    padding: DesignTokens.spacing.xs,
  },
  backupSheetContent: {
    gap: DesignTokens.spacing.md,
  },
  sheetInstruction: {
    fontSize: DesignTokens.typography.sizes.caption,
    lineHeight: 18,
  },
  sheetInput: {
    minHeight: 46,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
    paddingHorizontal: DesignTokens.spacing.md,
    fontSize: DesignTokens.typography.sizes.body,
  },
  sheetTextArea: {
    minHeight: 100,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
    padding: DesignTokens.spacing.md,
    fontSize: DesignTokens.typography.sizes.caption,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlignVertical: 'top',
  },
  primarySheetButton: {
    minHeight: 48,
    borderRadius: DesignTokens.radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DesignTokens.spacing.xs,
  },
  primarySheetButtonText: {
    fontSize: DesignTokens.typography.sizes.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorBox: {
    padding: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.radii.sm,
  },
  errorBoxText: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '600',
  },
  brandKitContent: {
    gap: DesignTokens.spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    gap: DesignTokens.spacing.sm,
  },
  brandCardBox: {
    flex: 1,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
    padding: DesignTokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: DesignTokens.spacing.xs,
  },
  brandCaption: {
    fontSize: 11,
    fontWeight: '500',
  },
  monogramCard: {
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
    padding: DesignTokens.spacing.md,
    gap: DesignTokens.spacing.sm,
  },
  monogramTitle: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
  },
  monogramIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: DesignTokens.spacing.xs,
  },
  monogramIconItem: {
    alignItems: 'center',
    gap: 4,
  },
  monogramLabel: {
    fontSize: 10.5,
  },
  taglineBanner: {
    borderRadius: DesignTokens.radii.md,
    padding: DesignTokens.spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  taglineBold: {
    fontSize: DesignTokens.typography.sizes.section,
    fontWeight: '800',
  },
  statementText: {
    fontSize: DesignTokens.typography.sizes.caption,
  },
});
