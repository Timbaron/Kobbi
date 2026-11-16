import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  accessibilityLabel?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 'md',
  onPress,
  accessibilityLabel,
}) => {
  const { colors, isDark } = useTheme();

  const paddingVal =
    padding === 'none'
      ? 0
      : padding === 'sm'
      ? DesignTokens.spacing.sm
      : padding === 'lg'
      ? DesignTokens.spacing.lg
      : DesignTokens.spacing.md;

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: DesignTokens.radii.xl,
    padding: paddingVal,
    shadowColor: isDark ? '#000000' : colors.midnightNavy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.35 : 0.05,
    shadowRadius: 6,
    elevation: isDark ? 3 : 1,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          cardStyle,
          pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};
