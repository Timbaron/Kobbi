import React, { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { DesignTokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { ChartDataPoint } from '../../utils/calculations';
import { formatNaira } from '../../utils/money';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface CashFlowChartProps {
  data: ChartDataPoint[];
  currencySymbol?: string;
  hideBalances?: boolean;
  mode?: 'bar' | 'line';
  compact?: boolean;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({
  data,
  currencySymbol = '₦',
  hideBalances = false,
  mode = 'bar',
  compact = false,
}) => {
  const { colors, isDark } = useTheme();
  const [selectedIdx, setSelectedIdx] = useState<number>(data.length - 1);
  const safeIdx = Math.min(Math.max(0, selectedIdx), Math.max(0, data.length - 1));
  const activePoint = data[safeIdx];

  const maxVal = Math.max(
    100,
    ...data.flatMap((d) => [d.incomeKobo, d.expenseKobo])
  );

  const chartHeight = compact ? 120 : 150;
  const chartWidth = SCREEN_WIDTH - (compact ? 72 : 48);

  if (mode === 'line') {
    const padX = 20;
    const padY = 16;
    const plotW = chartWidth - padX * 2;
    const plotH = chartHeight - padY * 2;

    const getX = (i: number) =>
      data.length <= 1 ? chartWidth / 2 : padX + (i / (data.length - 1)) * plotW;
    const getY = (val: number) =>
      padY + plotH - (val / maxVal) * plotH;

    const expensePath = data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.expenseKobo).toFixed(1)}`)
      .join(' ');
    const incomePath = data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.incomeKobo).toFixed(1)}`)
      .join(' ');

    return (
      <View style={styles.chartWrapper}>
        {activePoint && (
          <View style={styles.activeHeaderRow}>
            <Text style={[styles.activeHeaderLabel, { color: colors.textSecondary }]}>
              {activePoint.label}
            </Text>
            <View style={styles.activeHeaderNums}>
              <Text style={{ color: colors.semantic.income, fontWeight: '700', fontSize: 12 }}>
                In: {formatNaira(activePoint.incomeKobo, { symbol: currencySymbol, masked: hideBalances, hideDecimalsIfWhole: true })}
              </Text>
              <Text style={{ color: colors.semantic.expense, fontWeight: '700', fontSize: 12 }}>
                Out: {formatNaira(activePoint.expenseKobo, { symbol: currencySymbol, masked: hideBalances, hideDecimalsIfWhole: true })}
              </Text>
            </View>
          </View>
        )}

        <Svg width={chartWidth} height={chartHeight}>
          {[0.25, 0.5, 0.75, 1].map((step) => {
            const y = padY + plotH * (1 - step);
            return (
              <Line
                key={step}
                x1={padX}
                y1={y}
                x2={chartWidth - padX}
                y2={y}
                stroke={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            );
          })}

          {data.length > 1 && (
            <>
              <Path
                d={incomePath}
                fill="none"
                stroke={colors.semantic.income}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d={expensePath}
                fill="none"
                stroke={colors.semantic.expense}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {data.map((d, i) => {
            const x = getX(i);
            const isSelected = i === safeIdx;
            return (
              <G key={i}>
                <Circle
                  cx={x}
                  cy={getY(d.incomeKobo)}
                  r={isSelected ? 5 : 3.5}
                  fill={colors.semantic.income}
                  stroke={colors.surface}
                  strokeWidth={1.5}
                />
                <Circle
                  cx={x}
                  cy={getY(d.expenseKobo)}
                  r={isSelected ? 5 : 3.5}
                  fill={colors.semantic.expense}
                  stroke={colors.surface}
                  strokeWidth={1.5}
                />
              </G>
            );
          })}
        </Svg>
      </View>
    );
  }

  // Bar mode
  const barGap = data.length > 7 ? 6 : 10;
  const colWidth = (chartWidth - barGap * (data.length + 1)) / data.length;
  const singleBarW = Math.max(4, (colWidth - 4) / 2);

  return (
    <View style={styles.chartWrapper}>
      {activePoint && (
        <View style={styles.activeHeaderRow}>
          <Text style={[styles.activeHeaderLabel, { color: colors.textSecondary }]}>
            {activePoint.label}
          </Text>
          <View style={styles.activeHeaderNums}>
            <Text style={{ color: colors.semantic.income, fontWeight: '700', fontSize: 12 }}>
              In: {formatNaira(activePoint.incomeKobo, { symbol: currencySymbol, masked: hideBalances, hideDecimalsIfWhole: true })}
            </Text>
            <Text style={{ color: colors.semantic.expense, fontWeight: '700', fontSize: 12 }}>
              Out: {formatNaira(activePoint.expenseKobo, { symbol: currencySymbol, masked: hideBalances, hideDecimalsIfWhole: true })}
            </Text>
          </View>
        </View>
      )}

      <Svg width={chartWidth} height={chartHeight}>
        {[0.33, 0.66, 1].map((step) => {
          const y = chartHeight - 24 - (chartHeight - 34) * step;
          return (
            <Line
              key={step}
              x1={0}
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          );
        })}

        {data.map((d, i) => {
          const xBase = barGap + i * (colWidth + barGap);
          const maxBarH = chartHeight - 34;

          const inH = Math.max(3, (d.incomeKobo / maxVal) * maxBarH);
          const exH = Math.max(3, (d.expenseKobo / maxVal) * maxBarH);

          const inY = chartHeight - 24 - inH;
          const exY = chartHeight - 24 - exH;
          const isSelected = i === safeIdx;

          return (
            <G key={i} onPress={() => setSelectedIdx(i)}>
              {/* Income bar */}
              <Rect
                x={xBase}
                y={inY}
                width={singleBarW}
                height={inH}
                rx={singleBarW / 2}
                fill={colors.semantic.income}
                opacity={isSelected ? 1 : 0.75}
              />

              {/* Expense bar */}
              <Rect
                x={xBase + singleBarW + 3}
                y={exY}
                width={singleBarW}
                height={exH}
                rx={singleBarW / 2}
                fill={colors.semantic.expense}
                opacity={isSelected ? 1 : 0.75}
              />
            </G>
          );
        })}
      </Svg>

      {/* X-axis labels */}
      <View style={[styles.labelsRow, { width: chartWidth }]}>
        {data.map((d, i) => (
          <Pressable key={i} onPress={() => setSelectedIdx(i)} style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={[
                styles.colLabel,
                {
                  color: i === safeIdx ? colors.textPrimary : colors.textMuted,
                  fontWeight: i === safeIdx ? '700' : '500',
                },
              ]}
            >
              {d.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export interface DonutSlice {
  id: string;
  label: string;
  valueKobo: number;
  color: string;
}

interface CategoryDonutChartProps {
  slices: DonutSlice[];
  totalKobo: number;
  currencySymbol?: string;
  hideBalances?: boolean;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  slices,
  totalKobo,
  currencySymbol = '₦',
  hideBalances = false,
}) => {
  const { colors } = useTheme();

  if (slices.length === 0 || totalKobo <= 0) {
    return (
      <View style={styles.emptyDonutContainer}>
        <Text style={[styles.emptyDonutText, { color: colors.textMuted }]}>
          No categorized expenses recorded for this period.
        </Text>
      </View>
    );
  }

  const size = 160;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <View style={styles.donutWrapper}>
      <View style={styles.donutSvgWrapper}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {slices.map((slice) => {
              const proportion = slice.valueKobo / totalKobo;
              const strokeDasharray = `${proportion * circumference} ${circumference}`;
              const strokeDashoffset = -currentOffset;
              currentOffset += proportion * circumference;

              return (
                <Circle
                  key={slice.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  fill="none"
                />
              );
            })}
          </G>
        </Svg>

        <View style={styles.donutCenter}>
          <Text style={[styles.donutCenterLabel, { color: colors.textSecondary }]}>
            Total
          </Text>
          <Text style={[styles.donutCenterAmount, { color: colors.textPrimary }]}>
            {formatNaira(totalKobo, {
              symbol: currencySymbol,
              masked: hideBalances,
              hideDecimalsIfWhole: true,
              compact: true,
            })}
          </Text>
        </View>
      </View>

      {/* Legend list */}
      <View style={styles.legendContainer}>
        {slices.slice(0, 5).map((slice) => {
          const sharePct = Math.round((slice.valueKobo * 100) / totalKobo);
          return (
            <View key={slice.id} style={styles.legendRow}>
              <View style={styles.legendLeft}>
                <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                <Text numberOfLines={1} style={[styles.legendLabel, { color: colors.textPrimary }]}>
                  {slice.label}
                </Text>
              </View>

              <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                {sharePct}% ({formatNaira(slice.valueKobo, { symbol: currencySymbol, hideDecimalsIfWhole: true })})
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartWrapper: {
    marginVertical: 4,
  },
  activeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  activeHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeHeaderNums: {
    flexDirection: 'row',
    gap: 12,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  colLabel: {
    fontSize: 10,
  },
  emptyDonutContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDonutText: {
    fontSize: 13,
    textAlign: 'center',
  },
  donutWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  donutSvgWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  donutCenterAmount: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    marginTop: 1,
  },
  legendContainer: {
    width: '100%',
    marginTop: 18,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 10,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
