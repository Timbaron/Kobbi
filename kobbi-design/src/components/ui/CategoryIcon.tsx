import React from 'react';
import {
  ArrowLeftRight,
  Banknote,
  Briefcase,
  Building2,
  Car,
  Film,
  Gift,
  HeartPulse,
  Home,
  Laptop,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Tag,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
  Wifi,
  Zap,
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  size?: number;
  className?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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
  Plane,
  TrendingUp,
  Banknote,
  Building2,
  Smartphone,
  Wallet,
  ArrowLeftRight,
  Tag,
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, size = 18, className = '' }) => {
  const Icon = ICON_MAP[name] || Tag;
  return <Icon size={size} className={className} />;
};
