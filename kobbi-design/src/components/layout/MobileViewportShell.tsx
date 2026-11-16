import React, { useState } from 'react';
import { Moon, Smartphone, Sun } from 'lucide-react';
import { ThemeMode } from '../../types/finance';
import { KobbiWordmark } from '../brand/KobbiLogo';

interface MobileViewportShellProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  children: React.ReactNode;
}

export const MobileViewportShell: React.FC<MobileViewportShellProps> = ({
  theme,
  onToggleTheme,
  children,
}) => {
  const [showDeviceFrame, setShowDeviceFrame] = useState(true);
  const [viewportWidth, setViewportWidth] = useState<375 | 412>(412);

  const activeWidth = viewportWidth;

  return (
    <div className="min-h-[100dvh] w-full bg-[#F1F5F9] dark:bg-[#0B1120] sm:flex sm:flex-col sm:items-center sm:justify-center sm:py-4 sm:px-4 transition-colors duration-200">
      {/* Desktop-only Prototype Studio Bar */}
      <div className="no-print hidden sm:flex items-center justify-between gap-6 w-full max-w-[540px] mb-3 px-2">
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <KobbiWordmark size="sm" variant={theme === 'dark' ? 'dark' : 'light'} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#E4E7EC] dark:bg-[#182235] text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setViewportWidth(375)}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                activeWidth === 375
                  ? 'bg-white dark:bg-[#222E44] text-[#101828] dark:text-[#F8FAFC] shadow-sm'
                  : 'text-[#667085] dark:text-[#98A2B3]'
              }`}
            >
              375px
            </button>
            <button
              type="button"
              onClick={() => setViewportWidth(412)}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                activeWidth === 412
                  ? 'bg-white dark:bg-[#222E44] text-[#101828] dark:text-[#F8FAFC] shadow-sm'
                  : 'text-[#667085] dark:text-[#98A2B3]'
              }`}
            >
              412px
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowDeviceFrame((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
              showDeviceFrame
                ? 'border-[#087F5B]/30 bg-[#DDF5E6] dark:bg-[#087F5B]/20 text-[#087F5B] dark:text-[#DDF5E6]'
                : 'border-[#E4E7EC] dark:border-[#2B3952] bg-white dark:bg-[#182235] text-[#667085] dark:text-[#CBD5E1]'
            }`}
          >
            <Smartphone size={13} />
            <span>Frame</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle light or dark theme"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      {/* Mobile App Viewport Container */}
      <div
        className={`relative w-full h-[100dvh] sm:h-[min(836px,calc(100dvh-76px))] flex flex-col overflow-hidden transition-all duration-200 ${
          activeWidth === 375 ? 'sm:max-w-[375px]' : 'sm:max-w-[412px]'
        } ${
          showDeviceFrame
            ? 'sm:rounded-[42px] sm:border-[10px] sm:border-slate-900 dark:sm:border-slate-800 sm:shadow-[0_24px_64px_-12px_rgba(15,23,42,0.35)]'
            : 'sm:rounded-[24px] sm:border sm:border-slate-200 dark:sm:border-slate-700 sm:shadow-xl'
        } bg-[#F8FAFC] dark:bg-[#101828]`}
      >
        {/* Subtle Phone Status Bar Notch when Device Frame is active on desktop */}
        {showDeviceFrame && (
          <div className="no-print hidden sm:flex items-center justify-between px-6 pt-2.5 pb-1 bg-[#F8FAFC] dark:bg-[#101828] text-[11px] font-bold text-slate-800 dark:text-slate-200 shrink-0 select-none">
            <span className="tabular-nums">9:41</span>
            <div className="w-20 h-4 rounded-full bg-slate-900 dark:bg-black" />
            <span className="text-[10px] tracking-tight">5G · 100%</span>
          </div>
        )}

        {/* Inner Mobile Screen Area */}
        <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
