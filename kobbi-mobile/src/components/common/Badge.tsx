import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export type BadgeTone =
  | 'income'
  | 'expense'
  | 'warning'
  | 'transfer'
  | 'neutral'
  | 'primary';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  tone = 'neutral',
  size = 'md',
  style,
  textStyle,
}) => {
  const { colors, isDark } = useTheme();

  const getToneColors = (): { bg: string; text: string } => {
    switch (tone) {
      case 'income':
        return {
          bg: isDark ? 'rgba(22, 163, 74, 0.2)' : colors.mintTint,
          text: isDark ? colors.semantic.incomeBright : colors.semantic.income,
        };
      case 'expense':
        return {
          bg: isDark ? 'rgba(220, 92, 92, 0.2)' : 'rgba(220, 92, 92, 0.12)',
          text: isDark ? colors.semantic.expenseBright : colors.semantic.expense,
        };
      case 'warning':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)',
          text: isDark ? colors.semantic.warningBright : '#D97706',
        };
      case 'transfer':
        return {
          bg: isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.12)',
          text: isDark ? colors.semantic.transferBright : colors.semantic.transfer,
        };
      case 'primary':
        return {
          bg: isDark ? 'rgba(8, 127, 91, 0.25)' : colors.mintTint,
          text: isDark ? colors.mintGreen : colors.primary,
        };
      case 'neutral':
      default:
        return {
          bg: isDark ? colors.surfaceSubtle : '#F1F5F9',
          text: colors.textSecondary,
        };
    }
  };

  const { bg, text } = getToneColors();
  const paddingVertical = size === 'sm' ? 2 : 4;
  const paddingHorizontal = size === 'sm' ? 6 : 10;
  const fontSize = size === 'sm' ? 10 : 12;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingVertical,
          paddingHorizontal,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: text,
            fontSize,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: DesignTokens.radii.full,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
