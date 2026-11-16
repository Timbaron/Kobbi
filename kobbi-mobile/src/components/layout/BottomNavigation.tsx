import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeftRight,
  BarChart2,
  Home,
  PieChart,
  Target,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { DesignTokens } from '../../theme/tokens';
import { PrimaryTab } from '../../types/finance';

interface BottomNavigationProps {
  activeTab: PrimaryTab;
  onSelectTab: (tab: PrimaryTab) => void;
}

const TABS: Array<{
  id: PrimaryTab;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}> = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'transactions', label: 'Transactions', Icon: ArrowLeftRight },
  { id: 'budgets', label: 'Budgets', Icon: PieChart },
  { id: 'goals', label: 'Goals', Icon: Target },
  { id: 'insights', label: 'Insights', Icon: BarChart2 },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.navContainer,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}
    >
      <View style={styles.tabsRow}>
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          const activeColor = colors.primary;
          const inactiveColor = colors.textSecondary;

          return (
            <TouchableOpacity
              key={id}
              onPress={() => onSelectTab(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${label} tab`}
              activeOpacity={0.7}
              style={styles.tabButton}
            >
              <Icon
                size={22}
                color={isActive ? activeColor : inactiveColor}
                strokeWidth={isActive ? 2.4 : 1.8}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? activeColor : inactiveColor,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    borderTopWidth: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    height: 58,
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10.5,
    letterSpacing: -0.2,
  },
});
