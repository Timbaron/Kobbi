import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import {
  Briefcase,
  Car,
  Film,
  Gift,
  HeartPulse,
  Home,
  Laptop,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Target,
  Users,
  Utensils,
  Wallet,
  Wifi,
  Zap,
} from 'lucide-react-native';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  Utensils,
  Car,
  Zap,
  Wifi,
  Home,
  HeartPulse,
  ShoppingBag,
  Film,
  Users,
  Briefcase,
  Laptop,
  Store,
  Gift,
  ShieldCheck,
  Tag,
  Wallet,
  Plane,
  Target,
};

interface CategoryIconProps {
  iconName: string;
  color?: string;
  backgroundColor?: string;
  size?: number;
  iconSize?: number;
  style?: ViewStyle;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  iconName,
  color = '#FFFFFF',
  backgroundColor,
  size = 40,
  iconSize = 20,
  style,
}) => {
  const IconComponent = ICON_MAP[iconName] || Tag;

  const resolvedBg = backgroundColor || 'transparent';

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.32),
          backgroundColor: resolvedBg,
        },
        style,
      ]}
    >
      <IconComponent size={iconSize} color={color} strokeWidth={2.2} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
