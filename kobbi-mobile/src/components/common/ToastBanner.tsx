import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastBannerProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({ toast, onDismiss }) => {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const getToneColors = () => {
    switch (toast.type) {
      case 'error':
        return {
          bg: isDark ? '#2D1515' : '#FEF2F2',
          border: isDark ? '#5C2424' : '#FCA5A5',
          text: isDark ? '#FCA5A5' : '#B91C1C',
          icon: <AlertCircle size={18} color={isDark ? '#FCA5A5' : '#DC5C5C'} />,
        };
      case 'info':
        return {
          bg: isDark ? '#122033' : '#EFF6FF',
          border: isDark ? '#1E3A5F' : '#BFDBFE',
          text: isDark ? '#93C5FD' : '#1D4ED8',
          icon: <Info size={18} color={isDark ? '#93C5FD' : '#2563EB'} />,
        };
      case 'success':
      default:
        return {
          bg: isDark ? '#0D261C' : '#F0FDF4',
          border: isDark ? '#144D37' : '#BBF7D0',
          text: isDark ? '#86EFAC' : '#15803D',
          icon: <CheckCircle2 size={18} color={isDark ? '#86EFAC' : '#16A34A'} />,
        };
    }
  };

  const tone = getToneColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border,
        },
      ]}
    >
      <View style={styles.iconContainer}>{tone.icon}</View>
      <Text style={[styles.message, { color: tone.text }]} numberOfLines={2}>
        {toast.message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: DesignTokens.spacing.lg,
    right: DesignTokens.spacing.lg,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    gap: 10,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
