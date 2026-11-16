import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {icon && (
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9',
            },
          ]}
        >
          {icon}
        </View>
      )}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>

      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actionsContainer}>
          {actionLabel && onAction && (
            <Button label={actionLabel} onPress={onAction} size="md" />
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              label={secondaryActionLabel}
              onPress={onSecondaryAction}
              variant="outline"
              size="md"
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: DesignTokens.spacing.section,
    paddingHorizontal: DesignTokens.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DesignTokens.spacing.md,
  },
  title: {
    fontSize: DesignTokens.typography.sizes.section,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: DesignTokens.spacing.xs,
  },
  description: {
    fontSize: DesignTokens.typography.sizes.body,
    lineHeight: DesignTokens.typography.lineHeights.body,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: DesignTokens.spacing.lg,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});
