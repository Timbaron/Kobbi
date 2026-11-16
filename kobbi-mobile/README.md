# Kobbi (kobbi.) — Genuine React Native Mobile Application

> **Every kobo counts.**  
> *"Your money. Your clarity. Your control."*

**Kobbi** is a production-ready, offline-first personal finance application for Android and iOS, built with **React Native CLI (TypeScript strict mode)**. It delivers a calm, private financial management experience tailored specifically for the Nigerian Naira (NGN) financial landscape.

---

## 🏛️ Core Principles & Architecture

1. **Genuine Native Architecture**:
   - Built exclusively with React Native CLI (TypeScript 5+).
   - **Zero WebView wrappers**: 100% native views, custom SVG charts (`react-native-svg`), and platform-optimized interactions.
   - Centralized design system (`src/theme/tokens.ts`) with official Kobbi palette: Primary Emerald (`#087F5B`), Midnight Navy (`#101828`), Mint Green (`#DDF5E6`), Light Cloud (`#F8FAFC`), and semantic accents.

2. **Strict Integer-Kobo Arithmetic**:
   - Zero JavaScript floating-point arithmetic for money.
   - All monetary amounts stored, transferred, and calculated strictly as integer minor units (`100 kobo = ₦1.00`).
   - Transfers between accounts never inflate expense metrics.
   - Percentage budget allocations use basis-point calculations to eliminate fractional kobo leakage.

3. **100% Offline-First SQLite Ledger**:
   - SQLite is the authoritative source of truth (`src/database/`).
   - Versioned migrations (`001_initial_schema.ts`) with foreign keys, checks, and cascade rules.
   - Dual-driver database abstraction (`@op-engineering/op-sqlite` on native iOS/Android, `better-sqlite3` in Jest testing).
   - No remote backend (no Laravel, Firebase, Supabase, or cloud DBs). Zero telemetry or tracking.

4. **Cryptographic Security & Authenticated Backups**:
   - App PIN Lock hashed using **PBKDF2-HMAC-SHA256** (50,000 iterations + 16-byte random salt).
   - Encrypted JSON backups use **AES-256-GCM** with PBKDF2 key derivation (100,000 iterations).
   - Exports RFC 4180 compliant CSV files with full escaping for Excel and Google Sheets.

---

## 📱 Features Implemented

| Feature | Description |
|---|---|
| **Dashboard (`HomeScreen`)** | Midnight Navy balance card, eye toggle to mask sensitive balances, monthly cash flow chips, quick action buttons, accounts carousel, monthly budget meter, 7-day cash flow bar chart, rule-based financial insights carousel, recent transactions list, and reminders bottom sheet. |
| **Accounts Management (`AccountsScreen`)** | Manage GTBank, Access Bank, OPay, PalmPay, Cash, and custom wallets. Real-time ledger-calculated balances, opening balance preservation, account archiving, transfer shortcut, and edit sheet. |
| **Transaction Management (`TransactionsScreen`)** | Full ledger with Expense, Income, and Transfer support. Instant search, multi-filter chips (type, account, category, date), date grouping with net daily flow, duplicate protection, and transaction details sheet. |
| **Monthly Budgets (`BudgetsScreen`)** | Total budget card with overall spending meter, category allocations with fixed and percentage modes, unallocated balance validation, and over-budget deficit alerts. |
| **Savings Goals (`GoalsScreen`)** | Active, completed, and archived goals. Target amounts, contribution logs, custom icon and color selectors, and progress percentage badges. |
| **Recurring Schedules (`RecurringScreen`)** | Automated recurring income and bill schedules (daily, weekly, biweekly, monthly, yearly). Upcoming occurrence preview, smart month-end clamping (Jan 31 -> Feb 28), and atomic ledger recording. |
| **Financial Insights (`InsightsScreen`)** | Period switcher (Weekly, Monthly, Yearly), interactive Cash Flow chart (Bar vs Line modes), Spending by Category donut chart with legend, Month-over-Month spend comparison, and statement export sheet. |
| **Security & App Lock (`PinLockScreen`)** | 4-digit PIN lock screen, PBKDF2 hash verification, haptic vibration on incorrect entry, and biometric unlock shortcut. |
| **Settings & Preferences (`SettingsScreen`)** | Name, Currency (NGN, USD, GBP), Theme (Light/Dark), Date formats, Category management with custom colors, Default account selection, Backup export/import, and Brand Kit modal. |
| **First-Launch Onboarding (`OnboardingScreen`)** | 4-step wizard matching prototype: Welcome hero card, wallet setup, optional monthly income & spending cap, and summary confirmation. |

---

## 🛠️ Project Structure

```text
kobbi-mobile/
├── App.tsx                      # Root application shell & navigation dispatcher
├── src/
│   ├── app/                     # App bootstrap and navigation
│   ├── components/
│   │   ├── brand/               # KobbiLogo, KobbiMark, KobbiAppIcon, KobbiSplashScreen
│   │   ├── common/              # AppHeader, Button, Card, Badge, EmptyState, ToastBanner, ConfirmationModal
│   │   ├── finance/             # BalanceCard, AccountCard, TransactionItem, TransactionForm, FinancialChart, GoalCard, SummaryCard, DateRangeSelector
│   │   ├── layout/              # BottomNavigation
│   │   └── ui/                  # BottomSheet, CategoryIcon, CurrencyInput
│   ├── database/
│   │   ├── connection/          # DatabaseConnection interface (op-sqlite + better-sqlite3)
│   │   ├── migrations/          # Versioned migration runner and 001_initial_schema
│   │   ├── repositories/        # AccountRepo, CategoryRepo, TransactionRepo, BudgetRepo, GoalRepo, RecurringRepo, SettingsRepo
│   │   └── seeds/               # Approved Nigerian sample ledger dataset
│   ├── features/
│   │   ├── accounts/            # AccountsScreen
│   │   ├── budgets/             # BudgetsScreen
│   │   ├── dashboard/           # HomeScreen
│   │   ├── insights/            # InsightsScreen
│   │   ├── onboarding/          # OnboardingScreen
│   │   ├── recurring/           # RecurringScreen
│   │   ├── savings/             # GoalsScreen
│   │   ├── security/            # PinLockScreen
│   │   ├── settings/            # SettingsScreen
│   │   └── transactions/        # TransactionsScreen
│   ├── services/
│   │   ├── backup/              # BackupService (AES-256-GCM + PBKDF2)
│   │   ├── export/              # CsvExportService (RFC 4180 CSV generation & sharing)
│   │   └── security/            # SecurityService (PBKDF2 PIN hashing & verification)
│   ├── theme/                   # DesignTokens & ThemeContext (Light & Dark mode)
│   ├── types/                   # Domain entities and finance interfaces
│   └── utils/                   # Integer kobo money math, date utilities, UUID generator, financial calculations
└── __tests__/                   # 9 comprehensive Jest test suites (41 tests)
```

---

## 🧪 Automated Testing Suite

The application includes 100% offline unit and integration tests covering financial precision, constraints, database rollbacks, migrations, encryption, and high-volume performance.

Run all tests:
```bash
npm test -- --watchman=false
```

### Test Coverage Highlights:
- `__tests__/calculations.test.ts`: 10,000 transaction performance, leap year date clamping (Feb 29 -> Feb 28), month-end rollouts, basis-point budget allocation math.
- `__tests__/backup.test.ts`: JSON backup creation, AES-256-GCM encryption with password, decryption failure on wrong password, atomic SQLite restoration.
- `__tests__/security.test.ts`: PBKDF2 PIN hashing with 16-byte cryptographic salt, verification, and database state updates.
- `__tests__/accounts.test.ts`: Balance calculations from transaction ledger, transfer deduction, opening balance immutability, account archiving.
- `__tests__/transactions.test.ts`: Transaction creation, balance recalculation, transfer double-entry, filtering, pagination.
- `__tests__/budgets.test.ts`: Budget allocation creation, percentage recalculation on total change, over-budget detection.
- `__tests__/goals.test.ts`: Savings goals contributions, status transitions, target date tracking.
- `__tests__/database.test.ts`: Schema migration integrity, foreign key enforcement, transaction rollbacks.
- `__tests__/App.test.tsx`: Root component rendering, providers, and bootstrap shell.

---

## 🚀 Running on Android and iOS

### Prerequisites
- Node.js >= 20.19.0
- Android Studio / Android SDK (for Android)
- Xcode & CocoaPods (for iOS on macOS)

### 1. Install Dependencies
```bash
npm install
```

### 2. iOS Setup (macOS only)
```bash
cd ios && pod install && cd ..
npm run ios
```

### 3. Android Setup
Ensure an Android emulator or device is running:
```bash
npm run android
```

---

## 🔒 Security & Privacy Notice
Kobbi stores all financial information directly on the user's device in local SQLite storage. Kobbi does not transmit data over the network, does not connect to external bank accounts, and does not maintain remote user databases.
