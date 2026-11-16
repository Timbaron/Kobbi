import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { KobbiSplashScreen } from './components/brand/KobbiSplashScreen';
import { TransactionForm } from './components/finance/TransactionForm';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { MobileViewportShell } from './components/layout/MobileViewportShell';
import { ToastBanner } from './components/ui/ToastBanner';
import { AccountsScreen } from './screens/AccountsScreen';
import { BudgetsScreen } from './screens/BudgetsScreen';
import { GoalsScreen } from './screens/GoalsScreen';
import { HomeScreen } from './screens/HomeScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { RecurringScreen } from './screens/RecurringScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TransactionsScreen } from './screens/TransactionsScreen';
import { FinanceProvider, useFinance } from './store/FinanceContext';
import { PrimaryTab, SecondaryScreen, Transaction, TransactionType } from './types/finance';

const KobbiAppShell: React.FC = () => {
  const { state, updateSettings } = useFinance();

  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    return true;
  });

  const [activeTab, setActiveTab] = useState<PrimaryTab>('home');
  const [secondaryScreen, setSecondaryScreen] = useState<SecondaryScreen>(null);

  // Global Transaction Bottom Sheet state
  const [txFormOpen, setTxFormOpen] = useState(false);
  const [txInitialType, setTxInitialType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txDefaultSourceAccountId, setTxDefaultSourceAccountId] = useState<string | undefined>(
    undefined
  );

  // Brief branded launch splash
  useEffect(() => {
    if (!showSplash) return;
    const timer = window.setTimeout(() => setShowSplash(false), 750);
    return () => window.clearTimeout(timer);
  }, [showSplash]);

  // Sync Tailwind .dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.settings.theme]);

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

  const handleToggleTheme = () => {
    updateSettings({ theme: state.settings.theme === 'dark' ? 'light' : 'dark' });
  };

  const handleSelectTab = (tab: PrimaryTab) => {
    setSecondaryScreen(null);
    setActiveTab(tab);
  };

  return (
    <MobileViewportShell
      theme={state.settings.theme}
      onToggleTheme={handleToggleTheme}
    >
      {showSplash && <KobbiSplashScreen onDismiss={() => setShowSplash(false)} />}
      <ToastBanner />

      {!state.settings.onboardingCompleted ? (
        <OnboardingScreen />
      ) : (
        <>
          <main className="flex-1 overflow-y-auto mobile-scroll">
            {secondaryScreen === 'accounts' && (
              <AccountsScreen
                onBack={() => setSecondaryScreen(null)}
                onOpenTransactionForm={openTransactionForm}
              />
            )}

            {secondaryScreen === 'recurring' && (
              <RecurringScreen onBack={() => setSecondaryScreen(null)} />
            )}

            {secondaryScreen === 'settings' && (
              <SettingsScreen
                onBack={() => setSecondaryScreen(null)}
                onOpenSecondary={(s) => setSecondaryScreen(s)}
              />
            )}

            {secondaryScreen === null && (
              <>
                {activeTab === 'home' && (
                  <HomeScreen
                    onNavigateTab={handleSelectTab}
                    onOpenSecondary={(s) => setSecondaryScreen(s)}
                    onOpenTransactionForm={openTransactionForm}
                  />
                )}
                {activeTab === 'transactions' && (
                  <TransactionsScreen
                    onOpenTransactionForm={openTransactionForm}
                    onOpenSettings={() => setSecondaryScreen('settings')}
                  />
                )}
                {activeTab === 'budgets' && (
                  <BudgetsScreen onOpenSettings={() => setSecondaryScreen('settings')} />
                )}
                {activeTab === 'goals' && (
                  <GoalsScreen onOpenSettings={() => setSecondaryScreen('settings')} />
                )}
                {activeTab === 'insights' && (
                  <InsightsScreen
                    onOpenSettings={() => setSecondaryScreen('settings')}
                    onNavigateTab={handleSelectTab}
                    onOpenSecondary={(s) => setSecondaryScreen(s)}
                  />
                )}
              </>
            )}
          </main>

          {/* Prominent Floating Add Transaction CTA on primary tabs */}
          {secondaryScreen === null && (activeTab === 'home' || activeTab === 'transactions') && (
            <button
              type="button"
              onClick={() => openTransactionForm('expense')}
              aria-label="Add new Kobbi transaction"
              className="no-print absolute bottom-[78px] right-4 z-20 w-13 h-13 rounded-2xl bg-[#087F5B] hover:bg-[#066649] text-white shadow-lg shadow-[#087F5B]/30 flex items-center justify-center active:scale-95 transition-all"
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>
          )}

          {secondaryScreen === null && (
            <BottomNavigation activeTab={activeTab} onSelectTab={handleSelectTab} />
          )}

          <TransactionForm
            isOpen={txFormOpen}
            onClose={() => {
              setTxFormOpen(false);
              setEditingTx(null);
            }}
            initialType={txInitialType}
            editingTransaction={editingTx}
            defaultSourceAccountId={txDefaultSourceAccountId}
          />
        </>
      )}
    </MobileViewportShell>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <KobbiAppShell />
    </FinanceProvider>
  );
}
