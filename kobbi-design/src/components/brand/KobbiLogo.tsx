import React from 'react';

export type KobbiLogoVariant = 'light' | 'dark' | 'monochrome';

interface KobbiMarkProps {
  size?: number;
  variant?: KobbiLogoVariant;
  className?: string;
}

/**
 * Standalone geometric lowercase "k" monogram.
 * Precision-crafted SVG path designed for clarity from 16px to 512px.
 */
export const KobbiMark: React.FC<KobbiMarkProps> = ({
  size = 28,
  variant = 'light',
  className = '',
}) => {
  const strokeFill =
    variant === 'monochrome'
      ? 'currentColor'
      : variant === 'dark'
      ? '#F8FAFC'
      : '#087F5B';

  const dotFill =
    variant === 'monochrome'
      ? 'currentColor'
      : variant === 'dark'
      ? '#DDF5E6'
      : '#101828';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12.5 8.5C12.5 7.12 13.62 6 15 6H18.2C19.58 6 20.7 7.12 20.7 8.5V23.4L30.2 14.1C31.18 13.14 32.75 13.17 33.7 14.16L35.3 15.84C36.22 16.81 36.2 18.34 35.25 19.28L26.75 27.6L36.05 38.45C37.02 39.58 36.89 41.29 35.75 42.26C35.25 42.69 34.61 42.92 33.95 42.92H30.8C29.94 42.92 29.12 42.53 28.58 41.86L20.7 32.05V40.42C20.7 41.8 19.58 42.92 18.2 42.92H15C13.62 42.92 12.5 41.8 12.5 40.42V8.5Z"
        fill={strokeFill}
      />
      <circle cx="38.2" cy="39.5" r="3" fill={dotFill} />
    </svg>
  );
};

interface KobbiAppIconProps {
  size?: number;
  tone?: 'white-on-emerald' | 'mint-on-emerald' | 'monochrome';
  className?: string;
}

/**
 * Rounded-square mobile app icon (48px, 96px, 192px, 512px ready).
 */
export const KobbiAppIcon: React.FC<KobbiAppIconProps> = ({
  size = 44,
  tone = 'white-on-emerald',
  className = '',
}) => {
  const bg = tone === 'monochrome' ? '#101828' : '#087F5B';
  const kColor = tone === 'mint-on-emerald' ? '#DDF5E6' : '#FFFFFF';
  const dotColor = tone === 'monochrome' ? '#98A2B3' : '#DDF5E6';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Kobbi app icon"
      className={className}
    >
      <rect width="96" height="96" rx="24" fill={bg} />
      <path
        d="M31 23C31 20.7909 32.7909 19 35 19H39.5C41.7091 19 43.5 20.7909 43.5 23V47.2L59.4 31.8C60.95 30.3 63.42 30.34 64.92 31.89L67.4 34.46C68.86 35.97 68.83 38.37 67.34 39.84L53.6 53.3L68.4 70.6C69.92 72.37 69.71 75.04 67.94 76.56C67.15 77.24 66.14 77.6 65.1 77.6H60.2C58.85 77.6 57.56 76.99 56.7 75.95L43.5 59.8V73.6C43.5 75.81 41.71 77.6 39.5 77.6H35C32.79 77.6 31 75.81 31 73.6V23Z"
        fill={kColor}
      />
      <circle cx="71.5" cy="72.5" r="4.5" fill={dotColor} />
    </svg>
  );
};

interface KobbiWordmarkProps {
  variant?: KobbiLogoVariant;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Primary stylized "kobbi." wordmark lockup with geometric "k" icon.
 */
export const KobbiWordmark: React.FC<KobbiWordmarkProps> = ({
  variant = 'light',
  showIcon = true,
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 40 : 30;
  const textSize =
    size === 'sm'
      ? 'text-[17px]'
      : size === 'lg'
      ? 'text-[30px]'
      : 'text-[21px]';

  const wordColor =
    variant === 'monochrome'
      ? 'text-current'
      : variant === 'dark'
      ? 'text-[#F8FAFC]'
      : 'text-[#101828]';

  const periodColor =
    variant === 'monochrome'
      ? 'text-current opacity-80'
      : variant === 'dark'
      ? 'text-[#DDF5E6]'
      : 'text-[#087F5B]';

  return (
    <span className={`inline-flex items-center gap-2 select-none ${className}`}>
      {showIcon && (
        <KobbiAppIcon
          size={iconSize}
          tone={variant === 'monochrome' ? 'monochrome' : 'white-on-emerald'}
        />
      )}
      <span
        className={`font-display font-extrabold tracking-[-0.035em] leading-none ${textSize} ${wordColor}`}
      >
        kobbi
        <span className={periodColor}>.</span>
      </span>
    </span>
  );
};
