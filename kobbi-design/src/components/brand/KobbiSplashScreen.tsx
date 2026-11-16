import React from 'react';
import { KobbiAppIcon } from './KobbiLogo';

interface KobbiSplashScreenProps {
  onDismiss?: () => void;
}

export const KobbiSplashScreen: React.FC<KobbiSplashScreenProps> = ({ onDismiss }) => {
  return (
    <div
      className="absolute inset-0 z-[80] flex flex-col items-center justify-between bg-[#101828] text-[#F8FAFC] p-8 kb-fade-in"
      role="status"
      aria-label="Loading Kobbi"
      onClick={onDismiss}
    >
      <div />

      <div className="flex flex-col items-center text-center">
        <div className="shadow-2xl shadow-[#087F5B]/30 rounded-[24px]">
          <KobbiAppIcon size={84} tone="white-on-emerald" />
        </div>
        <p className="mt-5 font-display text-[32px] font-extrabold tracking-[-0.035em] leading-none text-[#F8FAFC]">
          kobbi<span className="text-[#DDF5E6]">.</span>
        </p>
        <p className="mt-2 text-sm font-medium text-[#DDF5E6]/90">
          Every kobo counts.
        </p>
      </div>

      <p className="text-[11px] font-medium tracking-wide text-[#98A2B3]">
        Your money. Your clarity. Your control.
      </p>
    </div>
  );
};
