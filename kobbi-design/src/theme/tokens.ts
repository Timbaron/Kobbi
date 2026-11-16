/**
 * Kobbi Design System Tokens
 * --------------------------
 * Official brand palette and typographic tokens designed for direct portability
 * to React Native CLI StyleSheet / ThemeProvider.
 */

export const DesignTokens = {
  brand: {
    name: 'Kobbi',
    wordmark: 'kobbi.',
    tagline: 'Every kobo counts.',
    statement: 'Your money. Your clarity. Your control.',
    category: 'Personal Finance, Budgeting & Expense Tracking',
  },
  colors: {
    primary: '#087F5B',
    primaryHover: '#066649',
    midnightNavy: '#101828',
    mintGreen: '#DDF5E6',
    cloudWhite: '#F8FAFC',

    light: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceSubtle: '#F1F5F9',
      border: '#E4E7EC',
      borderSubtle: '#F2F4F7',
      textPrimary: '#101828',
      textSecondary: '#667085',
      textMuted: '#667085',
      mintTint: '#DDF5E6',
    },

    dark: {
      background: '#101828',
      surface: '#182235',
      surfaceSubtle: '#222E44',
      border: '#2B3952',
      borderSubtle: '#1D2939',
      textPrimary: '#F8FAFC',
      textSecondary: '#CBD5E1',
      textMuted: '#98A2B3',
      emeraldAccent: '#10B981',
      mintTint: 'rgba(221, 245, 230, 0.14)',
    },

    semantic: {
      income: '#16A34A',
      incomeBright: '#22C55E',
      expense: '#DC5C5C',
      expenseBright: '#F07171',
      warning: '#F59E0B',
      warningBright: '#FBBF24',
      transfer: '#2563EB',
      transferBright: '#60A5FA',
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    section: 28,
  },

  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    sheet: 28,
    full: 9999,
  },

  typography: {
    primaryFont: 'Plus Jakarta Sans',
    displayFont: 'Plus Jakarta Sans',
    bodyFont: 'Plus Jakarta Sans',
    monoFont: 'JetBrains Mono',
    sizes: {
      heroAmount: 30,
      title: 20,
      section: 16,
      body: 14,
      caption: 12,
      micro: 11,
    },
  },

  touchTargets: {
    minSize: 44,
    primaryButtonHeight: 48,
    rowMinHeight: 58,
  },
} as const;

export const CategoryColors = [
  '#087F5B',
  '#16A34A',
  '#2563EB',
  '#F59E0B',
  '#DC5C5C',
  '#7C3AED',
  '#0D9488',
  '#EA580C',
  '#4F46E5',
  '#0284C7',
] as const;

export const AccountColors = [
  '#087F5B',
  '#101828',
  '#DC5C5C',
  '#7C3AED',
  '#0369A1',
  '#D97706',
] as const;
