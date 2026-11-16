# Kobbi Design System & React Native CLI Migration Architecture

## 1. Official Brand Identity
- **Application Name**: Kobbi (`kobbi.`)
- **Primary Tagline**: Every kobo counts.
- **Supporting Statement**: Your money. Your clarity. Your control.
- **Logo Suite (`src/components/brand/KobbiLogo.tsx`)**: Geometric lowercase `k` vector monogram, `kobbi.` wordmark (light, dark, monochrome), rounded-square mobile app icon (`48px`–`512px`), and launch splash screen.

## 2. Visual Tokens (`src/theme/tokens.ts` & `src/index.css`)
- **Primary**: Emerald Green `#087F5B` (`#066649` pressed), Midnight Navy `#101828`, Mint Green `#DDF5E6`, Cloud White `#F8FAFC`
- **Supporting Semantic**:
  - Income / Success: `#16A34A` (dark mode `#22C55E`)
  - Expense / Danger: `#DC5C5C` (dark mode `#F07171`)
  - Warning: `#F59E0B` (dark mode `#FBBF24`)
  - Light Surface: `#FFFFFF`, Border `#E4E7EC`, Primary Text `#101828`, Secondary Text `#667085`
  - Dark Surface: `#182235`, Elevated `#222E44`, Border `#2B3952`, Primary Text `#F8FAFC`, Secondary Text `#98A2B3`
- **Typography**: `Plus Jakarta Sans` primary font across headings, balances (`tabular-nums`), labels, and body copy.
- **Touch Ergonomics**: Minimum `44x44px` hitboxes, `48px` primary buttons, `54px` header + `62px` bottom navigation (`<= 15%` viewport height), reduced-motion safe animations.

## 3. React Native CLI Portability Boundaries
- `src/types/finance.ts`: Pure TypeScript data contracts.
- `src/utils/money.ts`: Integer-kobo arithmetic (`100 kobo = ₦1`), zero floating-point math.
- `src/utils/date.ts` & `src/utils/calculations.ts`: Pure framework-independent domain logic ready to copy verbatim into a React Native CLI codebase.
- `src/store/FinanceContext.tsx`: Preserves existing localStorage key (`kolo_finance_prototype_v1`) for seamless backward-compatible persistence; maps directly to `@react-native-async-storage/async-storage` or `react-native-mmkv`.
