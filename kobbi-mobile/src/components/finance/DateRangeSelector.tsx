import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { formatMonthLabel, shiftMonthKey } from '../../utils/date';

interface DateRangeSelectorProps {
  monthKey: string;
  onChangeMonth: (newMonthKey: string) => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  monthKey,
  onChangeMonth,
}) => {
  const { colors, isDark } = useTheme();

  const handlePrev = () => {
    onChangeMonth(shiftMonthKey(monthKey, -1));
  };

  const handleNext = () => {
    onChangeMonth(shiftMonthKey(monthKey, 1));
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Pressable
        onPress={handlePrev}
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        style={({ pressed }) => [
          styles.arrowBtn,
          { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
          pressed && { opacity: 0.7 },
        ]}
      >
        <ChevronLeft size={18} color={colors.textPrimary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {formatMonthLabel(monthKey, true)}
      </Text>

      <Pressable
        onPress={handleNext}
        accessibilityRole="button"
        accessibilityLabel="Next month"
        style={({ pressed }) => [
          styles.arrowBtn,
          { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' },
          pressed && { opacity: 0.7 },
        ]}
      >
        <ChevronRight size={18} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1,
    marginBottom: DesignTokens.spacing.md,
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
