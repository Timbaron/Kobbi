import React from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Home,
  PieChart,
  Target,
} from 'lucide-react';
import { PrimaryTab } from '../../types/finance';

interface BottomNavigationProps {
  activeTab: PrimaryTab;
  onSelectTab: (tab: PrimaryTab) => void;
}

const TABS: Array<{
  id: PrimaryTab;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}> = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'transactions', label: 'Transactions', Icon: ArrowLeftRight },
  { id: 'budgets', label: 'Budgets', Icon: PieChart },
  { id: 'goals', label: 'Goals', Icon: Target },
  { id: 'insights', label: 'Insights', Icon: BarChart3 },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <nav
      aria-label="Kobbi primary navigation"
      className="sticky bottom-0 z-30 bg-white/95 dark:bg-[#182235]/95 backdrop-blur-md border-t border-[#E4E7EC] dark:border-[#2B3952] pb-safe shrink-0"
    >
      <div className="grid grid-cols-5 h-[62px] items-center">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors px-1 active:scale-[0.95] ${
                isActive
                  ? 'text-[#087F5B] dark:text-[#DDF5E6]'
                  : 'text-[#667085] dark:text-[#98A2B3] hover:text-[#101828] dark:hover:text-[#F8FAFC]'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              <span
                className={`text-[10.5px] leading-none tracking-tight whitespace-nowrap ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
