import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Bell, Settings } from 'lucide-react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { KobbiMark } from '../brand/KobbiLogo';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBrandMark?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  alertCount?: number;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBrandMark = false,
  showBack = false,
  onBack,
  alertCount = 0,
  onOpenNotifications,
  onOpenSettings,
  rightAction,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.borderSubtle,
        },
      ]}
    >
      <View style={styles.leftContainer}>
        {showBack && onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>
        ) : showBrandMark ? (
          <KobbiMark size={32} variant={isDark ? 'dark' : 'light'} />
        ) : null}

        <View style={styles.titleWrapper}>
          <Text
            numberOfLines={1}
            style={[styles.title, { color: colors.textPrimary }]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={[styles.subtitle, { color: colors.textSecondary }]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rightContainer}>
        {rightAction}
        {onOpenNotifications && (
          <Pressable
            onPress={onOpenNotifications}
            accessibilityRole="button"
            accessibilityLabel="Notifications and reminders"
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Bell size={18} color={colors.textPrimary} />
            {alertCount > 0 && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.semantic.warning },
                ]}
              >
                <Text style={styles.badgeText}>
                  {alertCount > 9 ? '9+' : alertCount}
                </Text>
              </View>
            )}
          </Pressable>
        )}

        {onOpenSettings && (
          <Pressable
            onPress={onOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Settings size={18} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 60,
    paddingHorizontal: DesignTokens.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
