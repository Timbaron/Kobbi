import React, { useEffect, useState } from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { DatabaseManager } from './src/database';
import { DEFAULT_APP_SETTINGS } from './src/database/seeds/defaultData';
import { BottomNavigation } from './src/components/layout/BottomNavigation';
import { KobbiSplashScreen } from './src/components/brand/KobbiSplashScreen';
import { ToastBanner, ToastMessage } from './src/components/common/ToastBanner';
import { TransactionForm } from './src/components/finance/TransactionForm';

import { HomeScreen } from './src/features/dashboard/HomeScreen';
import { TransactionsScreen } from './src/features/transactions/TransactionsScreen';
import { BudgetsScreen } from './src/features/budgets/BudgetsScreen';
import { GoalsScreen } from './src/features/savings/GoalsScreen';
import { InsightsScreen } from './src/features/insights/InsightsScreen';
import { AccountsScreen } from './src/features/accounts/AccountsScreen';
import { RecurringScreen } from './src/features/recurring/RecurringScreen';
import { SettingsScreen } from './src/features/settings/SettingsScreen';
import { OnboardingScreen } from './src/features/onboarding/OnboardingScreen';
import { PinLockScreen } from './src/features/security/PinLockScreen';
import { SecurityService } from './src/services/security/SecurityService';

import {
  AppSettings,
  PrimaryTab,
  SecondaryScreen,
  Transaction,
  TransactionType,
} from './src/types/finance';

function KobbiMainApp() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const db = DatabaseManager.getInstance();

  const [dbReady, setDbReady] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<PrimaryTab>('home');
  const [secondaryScreen, setSecondaryScreen] = useState<SecondaryScreen>(null);

  // Global Transaction Bottom Sheet state
  const [txFormOpen, setTxFormOpen] = useState<boolean>(false);
  const [txInitialType, setTxInitialType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txDefaultSourceAccountId, setTxDefaultSourceAccountId] = useState<string | undefined>(undefined);

  // Toast state
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({
      id: String(Date.now()),
      message,
      type,
    });
  };

  // Bootstrap SQLite Database and Settings
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        await db.initialize(false);
        const currentSettings = await db.repos.settings.getSettings();
        if (mounted) {
          setSettings(currentSettings);
          setDbReady(true);

          if (currentSettings.appLockEnabled) {
            setIsLocked(true);
          }
        }
      } catch (err: any) {
        if (mounted) {
          // Safeguard: fallback to default settings so user is never locked out
          setSettings(DEFAULT_APP_SETTINGS);
          setDbReady(true);
        }
      } finally {
        if (mounted) {
          setShowSplash(false);
        }
      }
    }

    bootstrap();

    // Splash auto dismiss timeout fallback safeguard
    const splashTimer = setTimeout(() => {
      if (mounted) {
        setShowSplash(false);
      }
    }, 1500);

    return () => {
      mounted = false;
      clearTimeout(splashTimer);
    };
  }, []);

  const openTransactionForm = (
    type: TransactionType = 'expense',
    editing?: Transaction,
    defaultSourceAccountId?: string
  ) => {
    setTxInitialType(type);
    setEditingTx(editing || null);
    setTxDefaultSourceAccountId(defaultSourceAccountId);
    setTxFormOpen(true);
  };

  const handleSelectTab = (tab: PrimaryTab) => {
    setSecondaryScreen(null);
    setActiveTab(tab);
  };

  const handleUnlockPin = async (enteredPin: string) => {
    const valid = await SecurityService.validateStoredPin(db.db, enteredPin);
    if (valid) {
      setIsLocked(false);
      showToast('Welcome back to Kobbi', 'success');
      return true;
    }
    return false;
  };

  // 1. Splash Screen & Initializing state
  if (showSplash || !dbReady || !settings) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: '#101828' }}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <StatusBar barStyle="light-content" />
        <KobbiSplashScreen
          onDismiss={() => {
            if (!settings) {
              setSettings(DEFAULT_APP_SETTINGS);
            }
            setDbReady(true);
            setShowSplash(false);
          }}
        />
      </SafeAreaView>
    );
  }

  // 3. First-Launch Onboarding
  if (!settings.onboardingCompleted) {
    return (
      <SafeAreaView
        style={[styles.root, { backgroundColor: colors.background }]}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
        <OnboardingScreen
          onComplete={async () => {
            const reloaded = await db.repos.settings.getSettings();
            setSettings(reloaded);
            showToast('Kobbi initialized. Welcome!', 'success');
          }}
        />
      </SafeAreaView>
    );
  }

  // 4. App Lock (PIN screen guard)
  if (isLocked) {
    return (
      <SafeAreaView
        style={[styles.root, { backgroundColor: colors.background }]}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
        <PinLockScreen
          mode="unlock"
          userName={settings.userName}
          onSuccess={() => setIsLocked(false)}
          onVerifyPin={handleUnlockPin}
          onBiometricPress={() => {
            setIsLocked(false);
            showToast('Biometric unlock verified', 'success');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.surface }]}
      edges={secondaryScreen !== null ? ['top', 'bottom', 'left', 'right'] : ['top', 'left', 'right']}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      {/* Main Content Area */}
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        {secondaryScreen === 'accounts' && (
          <AccountsScreen
            onBack={() => setSecondaryScreen(null)}
            onOpenTransactionForm={openTransactionForm}
            onShowToast={showToast}
          />
        )}

        {secondaryScreen === 'recurring' && (
          <RecurringScreen
            onBack={() => setSecondaryScreen(null)}
            onShowToast={showToast}
          />
        )}

        {secondaryScreen === 'settings' && (
          <SettingsScreen
            onBack={() => setSecondaryScreen(null)}
            onOpenSecondary={(s) => setSecondaryScreen(s)}
            onReplayOnboarding={() => {
              setSettings((prev) => (prev ? { ...prev, onboardingCompleted: false } : null));
            }}
            onShowToast={showToast}
          />
        )}

        {secondaryScreen === null && (
          <>
            {activeTab === 'home' && (
              <HomeScreen
                onNavigateTab={handleSelectTab}
                onOpenSecondary={(s) => setSecondaryScreen(s)}
                onOpenTransactionForm={openTransactionForm}
                onShowToast={showToast}
              />
            )}
            {activeTab === 'transactions' && (
              <TransactionsScreen
                onOpenTransactionForm={openTransactionForm}
                onOpenSettings={() => setSecondaryScreen('settings')}
                onShowToast={showToast}
              />
            )}
            {activeTab === 'budgets' && (
              <BudgetsScreen
                onOpenSettings={() => setSecondaryScreen('settings')}
                onShowToast={showToast}
              />
            )}
            {activeTab === 'goals' && (
              <GoalsScreen
                onOpenSettings={() => setSecondaryScreen('settings')}
                onShowToast={showToast}
              />
            )}
            {activeTab === 'insights' && (
              <InsightsScreen
                onOpenSettings={() => setSecondaryScreen('settings')}
                onNavigateTab={handleSelectTab}
                onOpenSecondary={(s) => setSecondaryScreen(s)}
                onShowToast={showToast}
              />
            )}
          </>
        )}
      </View>

      {/* Floating Action Button (+) for Home and Transactions tabs */}
      {secondaryScreen === null && (activeTab === 'home' || activeTab === 'transactions') && (
        <TouchableOpacity
          onPress={() => openTransactionForm('expense')}
          accessibilityRole="button"
          accessibilityLabel="Add new Kobbi transaction"
          activeOpacity={0.88}
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              bottom: Math.max(insets.bottom, 6) + 68,
            },
          ]}
        >
          <Plus size={26} color="#FFFFFF" strokeWidth={2.6} />
        </TouchableOpacity>
      )}

      {/* Bottom Tab Bar (shown when no secondary screen is active) */}
      {secondaryScreen === null && (
        <BottomNavigation activeTab={activeTab} onSelectTab={handleSelectTab} />
      )}

      {/* Global Transaction Bottom Sheet */}
      <TransactionForm
        isOpen={txFormOpen}
        onClose={() => setTxFormOpen(false)}
        initialType={txInitialType}
        editingTransaction={editingTx}
        defaultSourceAccountId={txDefaultSourceAccountId}
        onSaved={() => {
          setTxFormOpen(false);
          showToast(
            editingTx
              ? 'Transaction updated'
              : `${txInitialType.charAt(0).toUpperCase() + txInitialType.slice(1)} recorded`,
            'success'
          );
        }}
        onShowToast={showToast}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <KobbiMainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#087F5B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 40,
  },
});
