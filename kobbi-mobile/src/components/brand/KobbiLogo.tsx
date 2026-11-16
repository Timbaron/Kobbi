import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type KobbiLogoVariant = 'light' | 'dark' | 'monochrome';

interface KobbiMarkProps {
  size?: number;
  variant?: KobbiLogoVariant;
  style?: ViewStyle;
}

/**
 * Standalone geometric lowercase "k" monogram.
 */
export const KobbiMark: React.FC<KobbiMarkProps> = ({
  size = 28,
  variant = 'light',
  style,
}) => {
  const strokeFill =
    variant === 'monochrome'
      ? '#FFFFFF'
      : variant === 'dark'
      ? '#F8FAFC'
      : '#087F5B';

  const dotFill =
    variant === 'monochrome'
      ? '#CBD5E1'
      : variant === 'dark'
      ? '#DDF5E6'
      : '#101828';

  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Path
          d="M12.5 8.5C12.5 7.12 13.62 6 15 6H18.2C19.58 6 20.7 7.12 20.7 8.5V23.4L30.2 14.1C31.18 13.14 32.75 13.17 33.7 14.16L35.3 15.84C36.22 16.81 36.2 18.34 35.25 19.28L26.75 27.6L36.05 38.45C37.02 39.58 36.89 41.29 35.75 42.26C35.25 42.69 34.61 42.92 33.95 42.92H30.8C29.94 42.92 29.12 42.53 28.58 41.86L20.7 32.05V40.42C20.7 41.8 19.58 42.92 18.2 42.92H15C13.62 42.92 12.5 41.8 12.5 40.42V8.5Z"
          fill={strokeFill}
        />
        <Circle cx="38.2" cy="39.5" r="3" fill={dotFill} />
      </Svg>
    </View>
  );
};

interface KobbiAppIconProps {
  size?: number;
  tone?: 'white-on-emerald' | 'mint-on-emerald' | 'monochrome';
  style?: ViewStyle;
}

/**
 * Rounded-square mobile app icon (48px, 96px, 192px, 512px ready).
 */
export const KobbiAppIcon: React.FC<KobbiAppIconProps> = ({
  size = 44,
  tone = 'white-on-emerald',
  style,
}) => {
  const bg = tone === 'monochrome' ? '#101828' : '#087F5B';
  const kColor = tone === 'mint-on-emerald' ? '#DDF5E6' : '#FFFFFF';
  const dotColor = tone === 'monochrome' ? '#98A2B3' : '#DDF5E6';

  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <Rect width="96" height="96" rx="24" fill={bg} />
        <Path
          d="M31 23C31 20.7909 32.7909 19 35 19H39.5C41.7091 19 43.5 20.7909 43.5 23V47.2L59.4 31.8C60.95 30.3 63.42 30.34 64.92 31.89L67.4 34.46C68.86 35.97 68.83 38.37 67.34 39.84L53.6 53.3L68.4 70.6C69.92 72.37 69.71 75.04 67.94 76.56C67.15 77.24 66.14 77.6 65.1 77.6H60.2C58.85 77.6 57.56 76.99 56.7 75.95L43.5 59.8V73.6C43.5 75.81 41.71 77.6 39.5 77.6H35C32.79 77.6 31 75.81 31 73.6V23Z"
          fill={kColor}
        />
        <Circle cx="71.5" cy="72.5" r="4.5" fill={dotColor} />
      </Svg>
    </View>
  );
};

interface KobbiWordmarkProps {
  variant?: KobbiLogoVariant;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

/**
 * Primary stylized "kobbi." wordmark lockup with geometric "k" icon.
 */
export const KobbiWordmark: React.FC<KobbiWordmarkProps> = ({
  variant = 'light',
  showIcon = true,
  size = 'md',
  style,
}) => {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 40 : 30;
  const fontSize = size === 'sm' ? 17 : size === 'lg' ? 30 : 21;

  const wordColor =
    variant === 'monochrome'
      ? '#FFFFFF'
      : variant === 'dark'
      ? '#F8FAFC'
      : '#101828';

  const periodColor =
    variant === 'monochrome'
      ? 'rgba(255, 255, 255, 0.8)'
      : variant === 'dark'
      ? '#DDF5E6'
      : '#087F5B';

  return (
    <View style={[styles.wordmarkContainer, style]}>
      {showIcon && (
        <KobbiAppIcon
          size={iconSize}
          tone={variant === 'monochrome' ? 'monochrome' : 'white-on-emerald'}
        />
      )}
      <Text style={[styles.wordmarkText, { fontSize, color: wordColor }]}>
        kobbi
        <Text style={{ color: periodColor }}>.</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wordmarkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmarkText: {
    fontWeight: '800',
    letterSpacing: -0.8,
  },
});
