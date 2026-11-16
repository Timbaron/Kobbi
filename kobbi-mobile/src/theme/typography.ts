import { Platform, StyleSheet, TextStyle } from 'react-native';
import { DesignTokens } from './tokens';

const fontBase = Platform.select({
  ios: 'Plus Jakarta Sans',
  android: 'PlusJakartaSans-Regular',
  default: 'System',
});

const fontBold = Platform.select({
  ios: 'Plus Jakarta Sans',
  android: 'PlusJakartaSans-Bold',
  default: 'System',
});

export const Typography = StyleSheet.create({
  heroAmount: {
    fontFamily: fontBold,
    fontSize: DesignTokens.typography.sizes.heroAmount,
    lineHeight: DesignTokens.typography.lineHeights.heroAmount,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  } as TextStyle,

  title: {
    fontFamily: fontBold,
    fontSize: DesignTokens.typography.sizes.title,
    lineHeight: DesignTokens.typography.lineHeights.title,
    fontWeight: '700',
    letterSpacing: -0.3,
  } as TextStyle,

  section: {
    fontFamily: fontBold,
    fontSize: DesignTokens.typography.sizes.section,
    lineHeight: DesignTokens.typography.lineHeights.section,
    fontWeight: '700',
  } as TextStyle,

  body: {
    fontFamily: fontBase,
    fontSize: DesignTokens.typography.sizes.body,
    lineHeight: DesignTokens.typography.lineHeights.body,
    fontWeight: '400',
  } as TextStyle,

  bodyMedium: {
    fontFamily: fontBase,
    fontSize: DesignTokens.typography.sizes.body,
    lineHeight: DesignTokens.typography.lineHeights.body,
    fontWeight: '500',
  } as TextStyle,

  bodyBold: {
    fontFamily: fontBold,
    fontSize: DesignTokens.typography.sizes.body,
    lineHeight: DesignTokens.typography.lineHeights.body,
    fontWeight: '600',
  } as TextStyle,

  caption: {
    fontFamily: fontBase,
    fontSize: DesignTokens.typography.sizes.caption,
    lineHeight: DesignTokens.typography.lineHeights.caption,
    fontWeight: '500',
  } as TextStyle,

  captionBold: {
    fontFamily: fontBold,
    fontSize: DesignTokens.typography.sizes.caption,
    lineHeight: DesignTokens.typography.lineHeights.caption,
    fontWeight: '600',
  } as TextStyle,

  micro: {
    fontFamily: fontBase,
    fontSize: DesignTokens.typography.sizes.micro,
    lineHeight: DesignTokens.typography.lineHeights.micro,
    fontWeight: '500',
  } as TextStyle,

  tabular: {
    fontVariant: ['tabular-nums'],
  } as TextStyle,
});
