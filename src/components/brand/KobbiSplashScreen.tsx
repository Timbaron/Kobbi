import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KobbiAppIcon } from './KobbiLogo';
import { DesignTokens } from '../../theme/tokens';

interface KobbiSplashScreenProps {
  onDismiss?: () => void;
}

export const KobbiSplashScreen: React.FC<KobbiSplashScreenProps> = ({ onDismiss }) => {
  return (
    <SafeAreaView
      style={styles.splashContainer}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <Pressable
        onPress={onDismiss}
        style={styles.pressableArea}
        accessibilityRole="button"
        accessibilityLabel="Kobbi Splash Screen"
      >
        <View />

        <View style={styles.centerWrap}>
          <View style={styles.iconShadowBox}>
            <KobbiAppIcon size={84} tone="white-on-emerald" />
          </View>
          <Text style={styles.wordmark}>
            kobbi<Text style={styles.mintDot}>.</Text>
          </Text>
          <Text style={styles.tagline}>Every kobo counts.</Text>
          <ActivityIndicator size="small" color="#087F5B" style={styles.loader} />
        </View>

        <Text style={styles.statement}>
          Your money. Your clarity. Your control.
        </Text>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    backgroundColor: '#101828',
  },
  pressableArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: DesignTokens.spacing.xl,
    paddingHorizontal: DesignTokens.spacing.xl,
  },
  centerWrap: {
    alignItems: 'center',
  },
  loader: {
    marginTop: DesignTokens.spacing.lg,
  },
  iconShadowBox: {
    shadowColor: '#087F5B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  wordmark: {
    marginTop: DesignTokens.spacing.lg,
    fontSize: 34,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.8,
  },
  mintDot: {
    color: '#DDF5E6',
  },
  tagline: {
    marginTop: DesignTokens.spacing.xs,
    fontSize: DesignTokens.typography.sizes.section,
    fontWeight: '600',
    color: '#DDF5E6',
  },
  statement: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '500',
    color: '#98A2B3',
    letterSpacing: 0.2,
  },
});
