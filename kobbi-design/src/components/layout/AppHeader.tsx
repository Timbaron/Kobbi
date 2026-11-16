import React from 'react';
import { ArrowLeft, Bell, Settings } from 'lucide-react';
import { KobbiMark } from '../brand/KobbiLogo';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showBrandMark?: boolean;
  onBack?: () => void;
  alertCount?: number;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  showBrandMark = false,
  onBack,
  alertCount = 0,
  onOpenNotifications,
  onOpenSettings,
  rightAction,
}) => {
  return (
    <header className="sticky top-0 z-30 h-[54px] px-4 flex items-center justify-between gap-2 bg-[#F8FAFC]/92 dark:bg-[#101828]/92 backdrop-blur-md border-b border-[#E4E7EC] dark:border-[#2B3952]/80 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {showBack && onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-full text-[#101828] dark:text-[#F8FAFC] hover:bg-[#E4E7EC]/60 dark:hover:bg-[#182235] transition-colors shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        {!showBack && showBrandMark && (
          <div className="w-8 h-8 rounded-xl bg-[#DDF5E6] dark:bg-[#087F5B]/25 flex items-center justify-center shrink-0">
            <KobbiMark size={20} variant="light" className="dark:hidden" />
            <KobbiMark size={20} variant="dark" className="hidden dark:block" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-[17px] font-bold tracking-tight text-[#101828] dark:text-[#F8FAFC] truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] font-medium text-[#667085] dark:text-[#98A2B3] truncate leading-tight mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {rightAction}
        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label={`Kobbi reminders (${alertCount})`}
            className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#667085] dark:text-[#CBD5E1] hover:bg-[#E4E7EC]/60 dark:hover:bg-[#182235] transition-colors"
          >
            <Bell size={20} />
            {alertCount > 0 && (
              <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#087F5B] text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>
        )}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open Kobbi settings"
            className="min-h-[44px] min-w-[44px] -mr-1.5 flex items-center justify-center rounded-full text-[#667085] dark:text-[#CBD5E1] hover:bg-[#E4E7EC]/60 dark:hover:bg-[#182235] transition-colors"
          >
            <Settings size={20} />
          </button>
        )}
      </div>
    </header>
  );
};
