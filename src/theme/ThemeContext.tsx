import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { DesignTokens, ThemeColors } from './tokens';
import { ThemeMode } from '../types/finance';

interface ThemeContextValue {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialTheme?: ThemeMode;
}> = ({ children, initialTheme }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    initialTheme || (systemScheme === 'dark' ? 'dark' : 'light')
  );

  const isDark = themeMode === 'dark';

  const colors = useMemo<ThemeColors>(() => {
    const palette = isDark ? DesignTokens.colors.dark : DesignTokens.colors.light;
    return {
      ...palette,
      isDark,
      primary: DesignTokens.colors.primary,
      primaryHover: DesignTokens.colors.primaryHover,
      midnightNavy: DesignTokens.colors.midnightNavy,
      mintGreen: DesignTokens.colors.mintGreen,
      cloudWhite: DesignTokens.colors.cloudWhite,
      semantic: DesignTokens.colors.semantic,
    };
  }, [isDark]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      colors,
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
