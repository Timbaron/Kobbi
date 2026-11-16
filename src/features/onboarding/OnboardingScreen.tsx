import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  PieChart,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import { KobbiAppIcon, KobbiWordmark } from '../../components/brand/KobbiLogo';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DatabaseManager } from '../../database';
import { useTheme } from '../../theme/ThemeContext';
import { DesignTokens } from '../../theme/tokens';
import { AppSettings } from '../../types/finance';
import { formatNaira } from '../../utils/money';
import { getCurrentMonthKey } from '../../utils/date';

const CURRENCIES: Array<{
  code: AppSettings['currencyCode'];
  symbol: string;
  label: string;
}> = [
  { code: 'NGN', symbol: '₦', label: 'Nigerian Naira (NGN)' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (GBP)' },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { colors, isDark } = useTheme();
  const db = DatabaseManager.getInstance();

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [userName, setUserName] = useState<string>('');
  const [currencyCode, setCurrencyCode] = useState<AppSettings['currencyCode']>('NGN');
  const [currencySymbol, setCurrencySymbol] = useState<string>('₦');
  const [startingBalanceKobo, setStartingBalanceKobo] = useState<number>(0);
  const [monthlyIncomeKobo, setMonthlyIncomeKobo] = useState<number>(0);
  const [initialBudgetKobo, setInitialBudgetKobo] = useState<number>(0);

  const handleFinish = async () => {
    try {
      const trimmedName = userName.trim() || 'User';

      // 1. Create primary wallet if no accounts exist
      let primaryAccId = '';
      const accounts = await db.repos.accounts.getAll(false);
      if (accounts.length === 0) {
        const newAcc = await db.repos.accounts.create({
          name: 'Main Wallet',
          institution: 'Cash / Bank',
          type: 'bank',
          openingBalanceKobo: startingBalanceKobo,
          color: '#087F5B',
        });
        primaryAccId = newAcc.id;
      } else {
        primaryAccId = accounts[0].id;
        if (startingBalanceKobo > 0) {
          await db.repos.accounts.update(primaryAccId, {
            openingBalanceKobo: startingBalanceKobo,
          });
        }
      }

      // 2. Save personalized settings
      await db.repos.settings.updateSettings({
        userName: trimmedName,
        currencyCode,
        currencySymbol,
        defaultAccountId: primaryAccId,
        monthlyIncomeEstimateKobo: monthlyIncomeKobo,
        onboardingCompleted: true,
      });

      // 3. Set initial monthly budget if configured
      if (initialBudgetKobo > 0) {
        const currMonthKey = getCurrentMonthKey();
        await db.repos.budgets.setTotalBudget(currMonthKey, initialBudgetKobo);
      }

      onComplete();
    } catch {
      onComplete();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Top Header & Step Indicator */}
      <View style={styles.topHeader}>
        <KobbiWordmark size="sm" variant={isDark ? 'dark' : 'light'} />

        <View style={styles.stepsIndicator}>
          {[0, 1, 2, 3].map((idx) => (
            <View
              key={idx}
              style={[
                styles.stepDot,
                idx === step
                  ? [styles.stepDotActive, { backgroundColor: colors.primary }]
                  : idx < step
                  ? [styles.stepDotPassed, { backgroundColor: isDark ? colors.primary : '#087F5B99' }]
                  : [styles.stepDotInactive, { backgroundColor: colors.borderSubtle }],
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <View style={styles.stepContainer}>
            {/* Midnight Navy Hero Card */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: '#101828',
                  borderColor: '#1E293B',
                },
              ]}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroAppIconBox}>
                  <KobbiAppIcon size={52} tone="white-on-emerald" />
                </View>
                <Text style={styles.heroBrandText}>
                  kobbi<Text style={{ color: '#DDF5E6' }}>.</Text>
                </Text>
                <Text style={styles.heroTagline}>
                  Every kobo counts.
                </Text>
                <Text style={styles.heroDescription}>
                  Understand your money, manage your spending, and build better financial habits — all in one place.
                </Text>
              </View>
            </View>

            {/* Privacy & Precision Cards */}
            <View style={styles.featureCards}>
              <View
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconBox,
                    { backgroundColor: isDark ? 'rgba(8, 127, 91, 0.25)' : '#DDF5E6' },
                  ]}
                >
                  <Lock size={18} color={colors.primary} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                    Your finances. Your device. Your control.
                  </Text>
                  <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                    Offline-first and private. No registration, no bank logins, and no cloud tracking.
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconBox,
                    { backgroundColor: isDark ? 'rgba(8, 127, 91, 0.25)' : '#DDF5E6' },
                  ]}
                >
                  <ShieldCheck size={18} color={colors.primary} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                    Built for Naira & Kobo Precision
                  </Text>
                  <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                    Exact integer kobo math ensures transfers never inflate expenses and budgets remain clear.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContainer}>
            <View>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                Set up your wallet
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                Personalize your name, default currency, and starting balance.
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                First Name
              </Text>
              <TextInput
                value={userName}
                onChangeText={setUserName}
                placeholder="Your first name"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Primary Currency
              </Text>
              <View style={styles.currencyOptions}>
                {CURRENCIES.map((cur) => {
                  const isSelected = cur.code === currencyCode;
                  return (
                    <TouchableOpacity
                      key={cur.code}
                      onPress={() => {
                        setCurrencyCode(cur.code);
                        setCurrencySymbol(cur.symbol);
                      }}
                      style={[
                        styles.currencyOptionCard,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(8, 127, 91, 0.25)'
                              : '#DDF5E6'
                            : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.currencyOptionLabel,
                          {
                            color: isSelected ? colors.primary : colors.textPrimary,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {cur.label}
                      </Text>
                      <Text
                        style={[
                          styles.currencyOptionSymbol,
                          {
                            color: isSelected ? colors.primary : colors.textPrimary,
                          },
                        ]}
                      >
                        {cur.symbol}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <CurrencyInput
              label="Primary Account Opening Balance (GTBank)"
              valueKobo={startingBalanceKobo}
              onChangeKobo={setStartingBalanceKobo}
              currencySymbol={currencySymbol}
              helperText="You can add OPay, UBA, PalmPay, and Cash accounts anytime."
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <View>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                Monthly plan (optional)
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                Set an optional monthly income reference and spending cap to power your budget meter.
              </Text>
            </View>

            <CurrencyInput
              label="Estimated Monthly Income (optional)"
              valueKobo={monthlyIncomeKobo}
              onChangeKobo={setMonthlyIncomeKobo}
              currencySymbol={currencySymbol}
              quickPresets={[150000, 300000, 485000, 750000]}
            />

            <CurrencyInput
              label="Target Monthly Spending Budget"
              valueKobo={initialBudgetKobo}
              onChangeKobo={setInitialBudgetKobo}
              currencySymbol={currencySymbol}
              quickPresets={[100000, 200000, 280000, 400000]}
              helperText="Budgeting sets a spending guide—it never deducts cash from your accounts."
            />

            <View
              style={[
                styles.featureCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View
                style={[
                  styles.featureIconBox,
                  { backgroundColor: isDark ? 'rgba(8, 127, 91, 0.25)' : '#DDF5E6' },
                ]}
              >
                <PieChart size={18} color={colors.primary} />
              </View>
              <Text style={[styles.featureDesc, { color: colors.textSecondary, flex: 1 }]}>
                Sample Nigerian accounts and categories are ready so you can explore Kobbi immediately.
              </Text>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={[styles.stepContainer, { alignItems: 'center' }]}>
            <View
              style={[
                styles.successIconBox,
                { backgroundColor: isDark ? 'rgba(8, 127, 91, 0.25)' : '#DDF5E6' },
              ]}
            >
              <CheckCircle2 size={36} color={colors.primary} />
            </View>

            <View style={{ alignItems: 'center', marginTop: DesignTokens.spacing.md }}>
              <Text style={[styles.stepTitle, { color: colors.textPrimary, textAlign: 'center' }]}>
                Welcome to Kobbi, {userName.trim() || 'there'}
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary, textAlign: 'center', maxWidth: 280 }]}>
                Your money. Your clarity. Your control. Every kobo is ready to be tracked locally on your device.
              </Text>
            </View>

            <View
              style={[
                styles.recapCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={styles.recapRow}>
                <Text style={[styles.recapLabel, { color: colors.textSecondary }]}>
                  Default Currency
                </Text>
                <Text style={[styles.recapValue, { color: colors.textPrimary }]}>
                  {currencyCode} ({currencySymbol})
                </Text>
              </View>

              <View style={[styles.recapDivider, { backgroundColor: colors.borderSubtle }]} />

              <View style={styles.recapRow}>
                <Text style={[styles.recapLabel, { color: colors.textSecondary }]}>
                  Opening Balance
                </Text>
                <Text style={[styles.recapValue, { color: colors.textPrimary }]}>
                  {formatNaira(startingBalanceKobo, { symbol: currencySymbol, hideDecimalsIfWhole: true })}
                </Text>
              </View>

              <View style={[styles.recapDivider, { backgroundColor: colors.borderSubtle }]} />

              <View style={styles.recapRow}>
                <Text style={[styles.recapLabel, { color: colors.textSecondary }]}>
                  Monthly Budget
                </Text>
                <Text style={[styles.recapValue, { color: colors.primary }]}>
                  {formatNaira(initialBudgetKobo, { symbol: currencySymbol, hideDecimalsIfWhole: true })}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {step === 0 && (
          <View style={styles.actionGroup}>
            <TouchableOpacity
              onPress={() => setStep(1)}
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <ArrowRight size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {(step === 1 || step === 2) && (
          <View style={styles.multiActionGroup}>
            <View style={styles.dualButtonsRow}>
              <TouchableOpacity
                onPress={() => setStep((s) => ((s - 1) as 0 | 1 | 2 | 3))}
                style={[
                  styles.backButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setStep((s) => ((s + 1) as 0 | 1 | 2 | 3))}
                style={[styles.continueButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.primaryButtonText}>{step === 2 ? 'Continue' : 'Next'}</Text>
                <ArrowRight size={17} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {step === 2 && (
              <TouchableOpacity
                onPress={() => setStep(3)}
                style={styles.skipStepButton}
              >
                <Text style={[styles.skipStepButtonText, { color: colors.textSecondary }]}>
                  Skip this optional step
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {step === 3 && (
          <TouchableOpacity
            onPress={() => handleFinish()}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Sparkles size={17} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Open Kobbi Dashboard</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingTop: DesignTokens.spacing.sm,
    paddingBottom: DesignTokens.spacing.lg,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: DesignTokens.spacing.sm,
  },
  stepsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    height: 6,
    borderRadius: 3,
  },
  stepDotActive: {
    width: 24,
  },
  stepDotPassed: {
    width: 10,
  },
  stepDotInactive: {
    width: 10,
  },
  scrollContent: {
    paddingVertical: DesignTokens.spacing.md,
    flexGrow: 1,
    justifyContent: 'center',
  },
  stepContainer: {
    gap: DesignTokens.spacing.lg,
  },
  heroCard: {
    borderRadius: DesignTokens.radii.sheet,
    borderWidth: 1,
    padding: DesignTokens.spacing.lg,
    overflow: 'hidden',
  },
  heroContent: {
    gap: DesignTokens.spacing.xs,
  },
  heroAppIconBox: {
    marginBottom: DesignTokens.spacing.sm,
  },
  heroBrandText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroTagline: {
    fontSize: DesignTokens.typography.sizes.section,
    fontWeight: '700',
    color: '#DDF5E6',
  },
  heroDescription: {
    fontSize: DesignTokens.typography.sizes.caption,
    color: '#CBD5E1',
    lineHeight: 20,
    marginTop: 4,
  },
  featureCards: {
    gap: DesignTokens.spacing.sm,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: DesignTokens.spacing.md,
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
    gap: DesignTokens.spacing.sm,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: DesignTokens.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  stepTitle: {
    fontSize: DesignTokens.typography.sizes.title,
    fontWeight: '800',
  },
  stepSubtitle: {
    fontSize: DesignTokens.typography.sizes.caption,
    marginTop: 4,
    lineHeight: 18,
  },
  formGroup: {
    gap: DesignTokens.spacing.xs,
  },
  fieldLabel: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '600',
  },
  textInput: {
    minHeight: DesignTokens.touchTargets.primaryButtonHeight,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
    paddingHorizontal: DesignTokens.spacing.md,
    fontSize: DesignTokens.typography.sizes.body,
    fontWeight: '500',
  },
  currencyOptions: {
    gap: DesignTokens.spacing.xs,
  },
  currencyOptionCard: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DesignTokens.spacing.md,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
  },
  currencyOptionLabel: {
    fontSize: DesignTokens.typography.sizes.body,
  },
  currencyOptionSymbol: {
    fontSize: DesignTokens.typography.sizes.section,
    fontWeight: '700',
  },
  successIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: DesignTokens.spacing.md,
  },
  recapCard: {
    width: '100%',
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
    padding: DesignTokens.spacing.md,
    gap: DesignTokens.spacing.sm,
    marginTop: DesignTokens.spacing.sm,
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  recapLabel: {
    fontSize: DesignTokens.typography.sizes.caption,
  },
  recapValue: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
  },
  recapDivider: {
    height: StyleSheet.hairlineWidth,
  },
  bottomActions: {
    paddingTop: DesignTokens.spacing.sm,
  },
  actionGroup: {
    gap: DesignTokens.spacing.xs,
  },
  multiActionGroup: {
    gap: DesignTokens.spacing.xs,
  },
  dualButtonsRow: {
    flexDirection: 'row',
    gap: DesignTokens.spacing.sm,
  },
  backButton: {
    minHeight: DesignTokens.touchTargets.primaryButtonHeight,
    paddingHorizontal: DesignTokens.spacing.lg,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: DesignTokens.typography.sizes.body,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    minHeight: DesignTokens.touchTargets.primaryButtonHeight,
    borderRadius: DesignTokens.radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DesignTokens.spacing.xs,
  },
  skipStepButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipStepButtonText: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: DesignTokens.touchTargets.primaryButtonHeight,
    borderRadius: DesignTokens.radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DesignTokens.spacing.xs,
  },
  primaryButtonText: {
    fontSize: DesignTokens.typography.sizes.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
