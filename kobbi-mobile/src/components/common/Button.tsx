import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const { colors, isDark } = useTheme();

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    let backgroundColor: string = colors.primary;
    let borderColor: string = 'transparent';
    let borderWidth = 0;

    switch (variant) {
      case 'primary':
        backgroundColor = pressed ? colors.primaryHover : colors.primary;
        break;
      case 'secondary':
        backgroundColor = isDark ? colors.surfaceSubtle : colors.mintTint;
        break;
      case 'danger':
        backgroundColor = pressed ? '#B91C1C' : colors.semantic.expense;
        break;
      case 'outline':
        backgroundColor = 'transparent';
        borderColor = isDark ? colors.border : colors.border;
        borderWidth = 1;
        break;
      case 'ghost':
        backgroundColor = pressed ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)') : 'transparent';
        break;
    }

    const minHeight =
      size === 'sm' ? 36 : size === 'lg' ? 52 : DesignTokens.touchTargets.primaryButtonHeight;
    const paddingHorizontal = size === 'sm' ? 12 : size === 'lg' ? 24 : 16;
    const borderRadius = size === 'sm' ? DesignTokens.radii.md : DesignTokens.radii.lg;

    return {
      minHeight,
      paddingHorizontal,
      borderRadius,
      backgroundColor,
      borderColor,
      borderWidth,
      opacity: disabled ? 0.5 : 1,
      transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    };
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
        return colors.primary;
      case 'outline':
      case 'ghost':
        return colors.textPrimary;
    }
  };

  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [getContainerStyle(pressed), style]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize,
              },
              textStyle,
            ]}
          >
            {label}
          </Text>
          {rightIcon && <View style={styles.icon}>{rightIcon}</View>}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
