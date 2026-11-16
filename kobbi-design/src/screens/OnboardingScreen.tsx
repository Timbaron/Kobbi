import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  PieChart,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { KobbiAppIcon, KobbiWordmark } from '../components/brand/KobbiLogo';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { useFinance } from '../store/FinanceContext';
import { AppSettings } from '../types/finance';
import { formatNaira } from '../utils/money';

const CURRENCIES: Array<{
  code: AppSettings['currencyCode'];
  symbol: string;
  label: string;
}> = [
  { code: 'NGN', symbol: '₦', label: 'Nigerian Naira (NGN)' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (GBP)' },
];

export const OnboardingScreen: React.FC = () => {
  const { state, completeOnboarding } = useFinance();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);

  const [userName, setUserName] = useState<string>(state.settings.userName || 'Tunde');
  const [currencyCode, setCurrencyCode] = useState<AppSettings['currencyCode']>('NGN');
  const [currencySymbol, setCurrencySymbol] = useState<string>('₦');
  const [startingBalanceKobo, setStartingBalanceKobo] = useState<number>(315000 * 100);
  const [monthlyIncomeKobo, setMonthlyIncomeKobo] = useState<number>(485000 * 100);
  const [initialBudgetKobo, setInitialBudgetKobo] = useState<number>(280000 * 100);

  const handleFinish = () => {
    completeOnboarding({
      userName,
      currencyCode,
      currencySymbol,
      startingBalanceKobo,
      monthlyIncomeKobo,
      initialBudgetKobo,
    });
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#101828] text-[#101828] dark:text-[#F8FAFC] p-6 overflow-y-auto mobile-scroll kb-fade-in">
      {/* Top Step Indicator */}
      <div className="flex items-center justify-between pt-2">
        <KobbiWordmark
          size="sm"
          variant={state.settings.theme === 'dark' ? 'dark' : 'light'}
        />

        <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of 4`}>
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                idx === step
                  ? 'w-6 bg-[#087F5B]'
                  : idx < step
                  ? 'w-2.5 bg-[#087F5B]/50'
                  : 'w-2.5 bg-[#E4E7EC] dark:bg-[#2B3952]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="my-auto py-6 kb-screen-enter" key={step}>
        {step === 0 && (
          <div className="space-y-5">
            <div className="rounded-[24px] bg-[#101828] dark:bg-[#182235] text-white p-6 border border-[#1E293B] dark:border-[#2B3952] relative overflow-hidden">
              <div
                aria-hidden="true"
                className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-[#087F5B]/35 blur-2xl"
              />
              <div className="relative z-10">
                <div className="mb-4 inline-flex rounded-[16px] shadow-lg shadow-[#087F5B]/25">
                  <KobbiAppIcon size={52} tone="white-on-emerald" />
                </div>
                <p className="font-display text-[28px] font-extrabold tracking-[-0.035em] leading-none text-white">
                  kobbi<span className="text-[#DDF5E6]">.</span>
                </p>
                <h1 className="mt-2 font-display text-xl font-bold tracking-tight text-[#DDF5E6]">
                  Every kobo counts.
                </h1>
                <p className="mt-2.5 text-sm text-[#CBD5E1] leading-relaxed">
                  Understand your money, manage your spending, and build better financial habits — all in one place.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952]">
                <div className="w-9 h-9 rounded-xl bg-[#DDF5E6] dark:bg-[#087F5B]/25 text-[#087F5B] dark:text-[#DDF5E6] flex items-center justify-center shrink-0">
                  <Lock size={18} />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-[#101828] dark:text-[#F8FAFC]">
                    Your finances. Your device. Your control.
                  </h2>
                  <p className="mt-0.5 text-xs text-[#667085] dark:text-[#98A2B3] leading-relaxed">
                    Offline-first and private. No registration, no bank logins, and no cloud tracking.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952]">
                <div className="w-9 h-9 rounded-xl bg-[#DDF5E6] dark:bg-[#087F5B]/25 text-[#087F5B] dark:text-[#DDF5E6] flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-[#101828] dark:text-[#F8FAFC]">
                    Built for Naira & Kobo Precision
                  </h2>
                  <p className="mt-0.5 text-xs text-[#667085] dark:text-[#98A2B3] leading-relaxed">
                    Exact integer kobo math ensures transfers never inflate expenses and budgets remain clear.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#101828] dark:text-[#F8FAFC]">
                Set up your wallet
              </h1>
              <p className="mt-1.5 text-sm text-[#667085] dark:text-[#98A2B3]">
                Personalize your name, default currency, and starting balance.
              </p>
            </div>

            <div>
              <label
                htmlFor="onboard-name"
                className="block text-xs font-semibold text-[#667085] dark:text-[#CBD5E1] mb-1.5"
              >
                First Name
              </label>
              <input
                id="onboard-name"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your first name"
                className="w-full min-h-[48px] rounded-xl border border-[#E4E7EC] dark:border-[#2B3952] bg-white dark:bg-[#182235] px-3.5 text-sm font-medium text-[#101828] dark:text-[#F8FAFC] focus:outline-none focus:border-[#087F5B]"
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-[#667085] dark:text-[#CBD5E1] mb-1.5">
                Primary Currency
              </p>
              <div className="space-y-2">
                {CURRENCIES.map((cur) => {
                  const selected = cur.code === currencyCode;
                  return (
                    <button
                      key={cur.code}
                      type="button"
                      onClick={() => {
                        setCurrencyCode(cur.code);
                        setCurrencySymbol(cur.symbol);
                      }}
                      className={`w-full min-h-[48px] px-4 rounded-xl border flex items-center justify-between text-left transition-colors ${
                        selected
                          ? 'border-[#087F5B] bg-[#DDF5E6] dark:bg-[#087F5B]/25 text-[#087F5B] dark:text-[#DDF5E6]'
                          : 'border-[#E4E7EC] dark:border-[#2B3952] bg-white dark:bg-[#182235] text-[#101828] dark:text-[#F8FAFC]'
                      }`}
                    >
                      <span className="text-sm font-semibold">{cur.label}</span>
                      <span className="font-display text-base font-bold">{cur.symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <CurrencyInput
              id="onboard-balance"
              label="Primary Account Opening Balance (GTBank)"
              valueKobo={startingBalanceKobo}
              onChangeKobo={setStartingBalanceKobo}
              currencySymbol={currencySymbol}
              helperText="You can add OPay, UBA, PalmPay, and Cash accounts anytime."
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#101828] dark:text-[#F8FAFC]">
                Monthly plan (optional)
              </h1>
              <p className="mt-1.5 text-sm text-[#667085] dark:text-[#98A2B3]">
                Set an optional monthly income reference and spending cap to power your budget meter.
              </p>
            </div>

            <CurrencyInput
              id="onboard-income"
              label="Estimated Monthly Income (optional)"
              valueKobo={monthlyIncomeKobo}
              onChangeKobo={setMonthlyIncomeKobo}
              currencySymbol={currencySymbol}
              quickPresets={[150000, 300000, 485000, 750000]}
            />

            <CurrencyInput
              id="onboard-budget"
              label="Target Monthly Spending Budget"
              valueKobo={initialBudgetKobo}
              onChangeKobo={setInitialBudgetKobo}
              currencySymbol={currencySymbol}
              quickPresets={[100000, 200000, 280000, 400000]}
              helperText="Budgeting sets a spending guide—it never deducts cash from your accounts."
            />

            <div className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DDF5E6] dark:bg-[#087F5B]/25 text-[#087F5B] dark:text-[#DDF5E6] flex items-center justify-center shrink-0">
                <PieChart size={18} />
              </div>
              <p className="text-xs text-[#667085] dark:text-[#CBD5E1] leading-relaxed">
                Sample Nigerian accounts and categories are ready so you can explore Kobbi immediately.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 rounded-3xl bg-[#DDF5E6] dark:bg-[#087F5B]/25 text-[#087F5B] dark:text-[#DDF5E6] flex items-center justify-center mx-auto">
              <CheckCircle2 size={34} />
            </div>

            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#101828] dark:text-[#F8FAFC]">
                Welcome to Kobbi, {userName.trim() || 'there'}
              </h1>
              <p className="mt-2 text-sm text-[#667085] dark:text-[#98A2B3] max-w-[280px] mx-auto leading-relaxed">
                Your money. Your clarity. Your control. Every kobo is ready to be tracked locally on your device.
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#182235] border border-[#E4E7EC] dark:border-[#2B3952] p-4 text-left space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#667085] dark:text-[#98A2B3]">Default Currency</span>
                <span className="font-bold text-[#101828] dark:text-[#F8FAFC]">
                  {currencyCode} ({currencySymbol})
                </span>
              </div>
              <div className="h-px bg-[#F2F4F7] dark:bg-[#2B3952]" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#667085] dark:text-[#98A2B3]">Opening Balance</span>
                <span className="font-bold tabular-nums text-[#101828] dark:text-[#F8FAFC]">
                  {formatNaira(startingBalanceKobo, { symbol: currencySymbol, hideDecimalsIfWhole: true })}
                </span>
              </div>
              <div className="h-px bg-[#F2F4F7] dark:bg-[#2B3952]" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#667085] dark:text-[#98A2B3]">Monthly Budget</span>
                <span className="font-bold tabular-nums text-[#087F5B] dark:text-[#DDF5E6]">
                  {formatNaira(initialBudgetKobo, { symbol: currencySymbol, hideDecimalsIfWhole: true })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="space-y-2.5 pb-safe">
        {step === 0 && (
          <>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full min-h-[48px] rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white font-display text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>Get Started</span>
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              onClick={() =>
                completeOnboarding({
                  userName: 'Tunde',
                  currencyCode: 'NGN',
                  currencySymbol: '₦',
                  skipToDemo: true,
                })
              }
              className="w-full min-h-[44px] rounded-xl text-xs font-semibold text-[#667085] dark:text-[#98A2B3] hover:bg-[#E4E7EC]/60 dark:hover:bg-[#182235] transition-colors"
            >
              Skip setup & explore sample Naira ledger
            </button>
          </>
        )}

        {(step === 1 || step === 2) && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2 | 3) : 0))}
              className="min-h-[48px] px-5 rounded-xl border border-[#E4E7EC] dark:border-[#2B3952] text-sm font-semibold text-[#101828] dark:text-[#F8FAFC] hover:bg-white dark:hover:bg-[#182235] transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep((s) => ((s + 1) as 0 | 1 | 2 | 3))}
              className="flex-1 min-h-[48px] rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white font-display text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>{step === 2 ? 'Continue' : 'Next'}</span>
              <ArrowRight size={17} />
            </button>
          </div>
        )}

        {step === 2 && (
          <button
            type="button"
            onClick={() => setStep(3)}
            className="w-full min-h-[40px] text-xs font-semibold text-[#667085] dark:text-[#98A2B3] hover:text-[#101828] dark:hover:text-white"
          >
            Skip this optional step
          </button>
        )}

        {step === 3 && (
          <button
            type="button"
            onClick={handleFinish}
            className="w-full min-h-[48px] rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white font-display text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Sparkles size={17} />
            <span>Open Kobbi Dashboard</span>
          </button>
        )}
      </div>
    </div>
  );
};
