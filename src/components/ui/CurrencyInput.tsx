import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import {
  formatNaira,
  koboToEditableString,
  parseNairaInputToKobo,
} from '../../utils/money';

interface CurrencyInputProps {
  label: string;
  valueKobo: number;
  onChangeKobo: (kobo: number) => void;
  currencySymbol?: string;
  quickPresets?: number[]; // In integer Naira (e.g., 50000)
  helperText?: string;
  error?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  valueKobo,
  onChangeKobo,
  currencySymbol = '₦',
  quickPresets,
  helperText,
  error,
}) => {
  const { colors, isDark } = useTheme();
  const [textValue, setTextValue] = useState(() =>
    valueKobo > 0 ? koboToEditableString(valueKobo) : ''
  );

  useEffect(() => {
    const currentParsed = parseNairaInputToKobo(textValue);
    if (currentParsed !== valueKobo) {
      setTextValue(valueKobo > 0 ? koboToEditableString(valueKobo) : '');
    }
  }, [valueKobo]);

  const handleChangeText = (raw: string) => {
    const sanitized = raw.replace(/[^\d.]/g, '');
    setTextValue(sanitized);
    const parsedKobo = parseNairaInputToKobo(sanitized);
    onChangeKobo(parsedKobo);
  };

  const handleSelectPreset = (naira: number) => {
    const kobo = Math.round(naira * 100);
    setTextValue(String(naira));
    onChangeKobo(kobo);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.semantic.expense : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.symbol,
            { color: valueKobo > 0 ? colors.primary : colors.textMuted },
          ]}
        >
          {currencySymbol}
        </Text>

        <TextInput
          value={textValue}
          onChangeText={handleChangeText}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={[
            styles.input,
            { color: colors.textPrimary },
          ]}
        />
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.semantic.expense }]}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          {helperText}
        </Text>
      ) : null}

      {quickPresets && quickPresets.length > 0 && (
        <View style={styles.presetsRow}>
          {quickPresets.map((presetNaira) => {
            const isSelected = valueKobo === presetNaira * 100;
            return (
              <Pressable
                key={presetNaira}
                onPress={() => handleSelectPreset(presetNaira)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isSelected
                      ? (isDark ? 'rgba(8, 127, 91, 0.25)' : colors.mintTint)
                      : (isDark ? colors.surfaceSubtle : '#F1F5F9'),
                    borderColor: isSelected ? colors.primary : colors.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.presetText,
                    {
                      color: isSelected ? colors.primary : colors.textSecondary,
                    },
                  ]}
                >
                  {formatNaira(presetNaira * 100, {
                    symbol: currencySymbol,
                    hideDecimalsIfWhole: true,
                    compact: presetNaira >= 100000,
                  })}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: DesignTokens.spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DesignTokens.radii.lg,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
  },
  symbol: {
    fontSize: 18,
    fontWeight: '800',
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  helperText: {
    fontSize: 11,
    marginTop: 4,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: DesignTokens.radii.md,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
