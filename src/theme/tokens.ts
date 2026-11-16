/**
 * Kobbi Design System Tokens
 * --------------------------
 * Official brand palette and typographic tokens for React Native.
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
      textMuted: '#98A2B3',
      mintTint: '#DDF5E6',
      cardShadow: 'rgba(16, 24, 40, 0.05)',
      emeraldAccent: '#087F5B',
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
      cardShadow: 'rgba(0, 0, 0, 0.3)',
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
    sizes: {
      heroAmount: 30,
      title: 20,
      section: 16,
      body: 14,
      caption: 12,
      micro: 11,
    },
    lineHeights: {
      heroAmount: 36,
      title: 26,
      section: 22,
      body: 20,
      caption: 16,
      micro: 14,
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

export interface ThemeColors {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceSubtle: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  mintTint: string;
  cardShadow: string;
  emeraldAccent?: string;
  primary: string;
  primaryHover: string;
  midnightNavy: string;
  mintGreen: string;
  cloudWhite: string;
  semantic: typeof DesignTokens.colors.semantic;
}
