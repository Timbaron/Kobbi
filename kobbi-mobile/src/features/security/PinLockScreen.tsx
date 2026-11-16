import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { Delete, Fingerprint, Lock, ShieldCheck } from 'lucide-react-native';
import { KobbiAppIcon, KobbiWordmark } from '../../components/brand/KobbiLogo';
import { useTheme } from '../../theme/ThemeContext';
import { DesignTokens } from '../../theme/tokens';

export type PinLockMode = 'unlock' | 'create' | 'confirm' | 'verify';

interface PinLockScreenProps {
  mode?: PinLockMode;
  userName?: string;
  onSuccess: (pin: string) => void;
  onCancel?: () => void;
  onVerifyPin?: (pin: string) => Promise<boolean>;
  onForgotPin?: () => void;
  biometricAvailable?: boolean;
  onBiometricPress?: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  mode = 'unlock',
  userName = 'Tunde',
  onSuccess,
  onCancel,
  onVerifyPin,
  onForgotPin,
  biometricAvailable = true,
  onBiometricPress,
}) => {
  const { colors, isDark } = useTheme();

  const [enteredPin, setEnteredPin] = useState<string>('');
  const [createdPin, setCreatedPin] = useState<string>('');
  const [step, setStep] = useState<'enter' | 'confirm'>(mode === 'create' ? 'enter' : 'enter');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const PIN_LENGTH = 4;

  const handleKeyPress = async (digit: string) => {
    if (enteredPin.length >= PIN_LENGTH || isVerifying) return;
    setErrorMessage('');

    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);

    if (nextPin.length === PIN_LENGTH) {
      if (mode === 'create') {
        if (step === 'enter') {
          setCreatedPin(nextPin);
          setEnteredPin('');
          setStep('confirm');
        } else {
          // Confirm step
          if (nextPin === createdPin) {
            onSuccess(nextPin);
          } else {
            Vibration.vibrate(400);
            setErrorMessage('PINs do not match. Try again.');
            setEnteredPin('');
            setCreatedPin('');
            setStep('enter');
          }
        }
      } else if (mode === 'unlock' || mode === 'verify') {
        if (onVerifyPin) {
          setIsVerifying(true);
          const valid = await onVerifyPin(nextPin);
          setIsVerifying(false);
          if (valid) {
            onSuccess(nextPin);
          } else {
            Vibration.vibrate(400);
            setErrorMessage('Incorrect PIN. Please try again.');
            setEnteredPin('');
          }
        } else {
          onSuccess(nextPin);
        }
      } else {
        onSuccess(nextPin);
      }
    }
  };

  const handleDelete = () => {
    if (enteredPin.length > 0) {
      setEnteredPin(enteredPin.slice(0, -1));
      setErrorMessage('');
    }
  };

  const getTitle = () => {
    if (mode === 'create') {
      return step === 'enter' ? 'Create a 4-Digit PIN' : 'Confirm your 4-Digit PIN';
    }
    if (mode === 'verify') {
      return 'Enter Current PIN';
    }
    return `Welcome back, ${userName}`;
  };

  const getSubtitle = () => {
    if (mode === 'create') {
      return step === 'enter'
        ? 'Protect your local Nigerian Naira finances'
        : 'Re-enter your PIN to confirm';
    }
    if (mode === 'verify') {
      return 'Verify identity to change security settings';
    }
    return 'Enter your 4-digit PIN to unlock Kobbi';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topSection}>
        <View style={styles.logoWrap}>
          <KobbiAppIcon size={52} tone="white-on-emerald" />
          <View style={styles.brandWordmark}>
            <KobbiWordmark size="sm" variant={isDark ? 'dark' : 'light'} />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>{getTitle()}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{getSubtitle()}</Text>

        {/* Pin Dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, idx) => {
            const isFilled = idx < enteredPin.length;
            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  {
                    borderColor: isFilled ? colors.primary : colors.border,
                    backgroundColor: isFilled ? colors.primary : 'transparent',
                  },
                ]}
              />
            );
          })}
        </View>

        {errorMessage ? (
          <Text style={[styles.errorText, { color: colors.semantic.expense }]}>
            {errorMessage}
          </Text>
        ) : null}
      </View>

      {/* Numeric Keypad */}
      <View style={styles.keypad}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ].map((row, rIdx) => (
          <View key={rIdx} style={styles.keypadRow}>
            {row.map((digit) => (
              <TouchableOpacity
                key={digit}
                onPress={() => handleKeyPress(digit)}
                activeOpacity={0.65}
                style={[
                  styles.keyButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Text style={[styles.keyText, { color: colors.textPrimary }]}>
                  {digit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Bottom Keypad Row: Biometric / Cancel, 0, Backspace */}
        <View style={styles.keypadRow}>
          {onBiometricPress && biometricAvailable ? (
            <TouchableOpacity
              onPress={onBiometricPress}
              activeOpacity={0.65}
              style={[
                styles.keyButton,
                {
                  backgroundColor: isDark ? colors.surfaceSubtle : '#DDF5E6',
                  borderColor: 'transparent',
                },
              ]}
            >
              <Fingerprint size={26} color={colors.primary} />
            </TouchableOpacity>
          ) : onCancel ? (
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.65}
              style={[styles.keyButton, { backgroundColor: 'transparent' }]}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.keyButtonPlaceholder} />
          )}

          <TouchableOpacity
            onPress={() => handleKeyPress('0')}
            activeOpacity={0.65}
            style={[
              styles.keyButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.keyText, { color: colors.textPrimary }]}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            activeOpacity={0.65}
            style={[styles.keyButton, { backgroundColor: 'transparent' }]}
          >
            <Delete size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer / Forgot PIN */}
      {onForgotPin && (
        <TouchableOpacity
          onPress={onForgotPin}
          style={styles.forgotButton}
        >
          <Text style={[styles.forgotText, { color: colors.primary }]}>
            Forgot PIN?
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: DesignTokens.spacing.xl,
    paddingTop: DesignTokens.spacing.xxl + 20,
    paddingBottom: DesignTokens.spacing.xxl,
  },
  topSection: {
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: DesignTokens.spacing.lg,
  },
  brandWordmark: {
    marginTop: DesignTokens.spacing.xs,
  },
  title: {
    fontSize: DesignTokens.typography.sizes.title,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: DesignTokens.typography.sizes.caption,
    marginTop: 4,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: DesignTokens.spacing.md,
    marginTop: DesignTokens.spacing.xl,
    marginBottom: DesignTokens.spacing.sm,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorText: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '600',
    marginTop: DesignTokens.spacing.xs,
  },
  keypad: {
    gap: DesignTokens.spacing.md,
    maxWidth: 320,
    alignSelf: 'center',
    width: '100%',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyButtonPlaceholder: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
  },
  cancelText: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '600',
  },
  forgotButton: {
    alignSelf: 'center',
    paddingVertical: DesignTokens.spacing.sm,
  },
  forgotText: {
    fontSize: DesignTokens.typography.sizes.caption,
    fontWeight: '700',
  },
});
