import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Category } from '../../types/finance';
import { CategoryIcon } from '../ui/CategoryIcon';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId?: string;
  onSelectCategory: (id: string) => void;
  onAddNewCategory?: () => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddNewCategory,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.grid}>
      {categories.map((cat) => {
        const isSelected = cat.id === selectedCategoryId;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelectCategory(cat.id)}
            accessibilityRole="button"
            accessibilityLabel={cat.name}
            style={[
              styles.item,
              {
                backgroundColor: isSelected
                  ? (isDark ? 'rgba(8, 127, 91, 0.25)' : colors.mintTint)
                  : (isDark ? colors.surfaceSubtle : '#F8FAFC'),
                borderColor: isSelected ? colors.primary : colors.borderSubtle,
              },
            ]}
          >
            <CategoryIcon
              iconName={cat.iconName}
              color="#FFFFFF"
              backgroundColor={cat.color}
              size={36}
              iconSize={18}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.name,
                {
                  color: isSelected ? colors.primary : colors.textPrimary,
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {cat.name}
            </Text>
          </Pressable>
        );
      })}

      {onAddNewCategory && (
        <Pressable
          onPress={onAddNewCategory}
          style={[
            styles.item,
            styles.addItem,
            {
              backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC',
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.addIconCircle,
              { backgroundColor: isDark ? '#2D3748' : '#E2E8F0' },
            ]}
          >
            <Text style={{ fontSize: 18, color: colors.textSecondary, fontWeight: '700' }}>
              +
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.textSecondary }]}>Custom</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  item: {
    width: '31%',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addItem: {
    borderStyle: 'dashed',
  },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 11,
    textAlign: 'center',
  },
});
