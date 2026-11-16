import React, { useState } from 'react';
import { ChartDataPoint } from '../../utils/calculations';
import { formatCompactNairaSafe, formatNairaSafe } from './chartFormatters';

interface BarTrendChartProps {
  data: ChartDataPoint[];
  currencySymbol: string;
  hideBalances: boolean;
  mode?: 'bar' | 'line';
  compact?: boolean;
}

export const CashFlowChart: React.FC<BarTrendChartProps> = ({
  data,
  currencySymbol,
  hideBalances,
  mode = 'bar',
  compact = false,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(data.length - 1);
  const safeIdx = Math.min(Math.max(0, selectedIdx), Math.max(0, data.length - 1));
  const activePoint = data[safeIdx];

  const maxVal = Math.max(
    100,
    ...data.flatMap((d) => [d.incomeKobo, d.expenseKobo])
  );

  const height = compact ? 120 : 168;

  if (mode === 'line') {
    const svgW = 320;
    const svgH = 140;
    const padX = 18;
    const padY = 16;
    const plotW = svgW - padX * 2;
    const plotH = svgH - padY * 2;

    const getX = (i: number) =>
      data.length <= 1 ? svgW / 2 : padX + (i / (data.length - 1)) * plotW;
    const getY = (val: number) =>
      padY + plotH - (val / maxVal) * plotH;

    const expensePath = data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.expenseKobo).toFixed(1)}`)
      .join(' ');
    const incomePath = data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.incomeKobo).toFixed(1)}`)
      .join(' ');

    return (
      <div>
        {activePoint && (
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {activePoint.label}
            </span>
            <div className="flex items-center gap-3 tabular-nums">
              <span className="text-[#16A34A] dark:text-[#22C55E] font-semibold">
                In: {formatNairaSafe(activePoint.incomeKobo, currencySymbol, hideBalances)}
              </span>
              <span className="text-[#DC5C5C] dark:text-[#F07171] font-semibold">
                Out: {formatNairaSafe(activePoint.expenseKobo, currencySymbol, hideBalances)}
              </span>
            </div>
          </div>
        )}

        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-36 overflow-visible">
          {[0.25, 0.5, 0.75, 1].map((step) => {
            const y = padY + plotH * (1 - step);
            return (
              <line
                key={step}
                x1={padX}
                y1={y}
                x2={svgW - padX}
                y2={y}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700/70"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            );
          })}

          {data.length > 1 && (
            <>
              <path
                d={incomePath}
                fill="none"
                stroke="#16A34A"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={expensePath}
                fill="none"
                stroke="#DC5C5C"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {data.map((d, idx) => {
            const cx = getX(idx);
            const isSel = idx === safeIdx;
            return (
              <g
                key={d.label}
                className="cursor-pointer"
                onClick={() => setSelectedIdx(idx)}
              >
                <circle
                  cx={cx}
                  cy={getY(d.incomeKobo)}
                  r={isSel ? 5 : 3.5}
                  fill="#16A34A"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <circle
                  cx={cx}
                  cy={getY(d.expenseKobo)}
                  r={isSel ? 5 : 3.5}
                  fill="#DC5C5C"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <text
                  x={cx}
                  y={svgH - 1}
                  textAnchor="middle"
                  className={`text-[10px] fill-current ${
                    isSel
                      ? 'font-bold text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  return (
    <div>
      {activePoint && (
        <div className="mb-3 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {activePoint.label}
          </span>
          <div className="flex items-center gap-3 tabular-nums">
            <span className="text-[#16A34A] dark:text-[#22C55E] font-semibold">
              +{formatCompactNairaSafe(activePoint.incomeKobo, currencySymbol, hideBalances)}
            </span>
            <span className="text-[#DC5C5C] dark:text-[#F07171] font-semibold">
              -{formatCompactNairaSafe(activePoint.expenseKobo, currencySymbol, hideBalances)}
            </span>
          </div>
        </div>
      )}

      <div
        className="flex items-end justify-between gap-1.5 pt-2"
        style={{ height }}
      >
        {data.map((d, idx) => {
          const incPct = d.incomeKobo > 0 ? Math.max(6, Math.round((d.incomeKobo / maxVal) * 100)) : 0;
          const expPct = d.expenseKobo > 0 ? Math.max(6, Math.round((d.expenseKobo / maxVal) * 100)) : 0;
          const isSelected = idx === safeIdx;

          return (
            <button
              key={d.label}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`flex-1 h-full flex flex-col items-center justify-end gap-1.5 rounded-xl px-1 py-1 transition-colors ${
                isSelected ? 'bg-[#F1F5F9] dark:bg-[#222E44]' : 'hover:bg-[#F8FAFC] dark:hover:bg-[#222E44]/50'
              }`}
            >
              <div className="w-full flex-1 flex items-end justify-center gap-1">
                <div
                  className="w-2.5 rounded-t-md bg-[#16A34A] dark:bg-[#22C55E] transition-all duration-300"
                  style={{ height: `${incPct}%` }}
                />
                <div
                  className="w-2.5 rounded-t-md bg-[#DC5C5C] dark:bg-[#F07171] transition-all duration-300"
                  style={{ height: `${expPct}%` }}
                />
              </div>
              <span
                className={`text-[10.5px] leading-none ${
                  isSelected
                    ? 'font-bold text-slate-900 dark:text-white'
                    : 'font-medium text-slate-400 dark:text-slate-500'
                }`}
              >
                {d.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
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
  currencySymbol: string;
  hideBalances: boolean;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  slices,
  currencySymbol,
  hideBalances,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(slices[0]?.id ?? null);
  const totalKobo = slices.reduce((sum, s) => sum + s.valueKobo, 0);

  if (slices.length === 0 || totalKobo <= 0) {
    return (
      <p className="py-6 text-center text-xs text-[#667085] dark:text-[#98A2B3]">
        Keep tracking your money to unlock more insights.
      </p>
    );
  }

  const activeSlice = slices.find((s) => s.id === selectedId) || slices[0];
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center relative py-2">
        <svg viewBox="0 0 140 140" className="w-40 h-40 -rotate-90">
          {slices.map((slice) => {
            const fraction = slice.valueKobo / totalKobo;
            const dashLength = Math.max(2, fraction * circumference - 2);
            const offset = -cumulativeOffset;
            cumulativeOffset += fraction * circumference;
            const isActive = activeSlice?.id === slice.id;

            return (
              <circle
                key={slice.id}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={isActive ? 18 : 14}
                strokeDasharray={`${dashLength} ${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                className="cursor-pointer transition-all duration-200"
                onClick={() => setSelectedId(slice.id)}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[92px]">
            {activeSlice.label}
          </span>
          <span className="font-display text-sm font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
            {formatCompactNairaSafe(activeSlice.valueKobo, currencySymbol, hideBalances)}
          </span>
          <span className="text-[10.5px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
            {Math.round((activeSlice.valueKobo * 100) / totalKobo)}%
          </span>
        </div>
      </div>

      {/* Interactive Legend List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {slices.map((slice) => {
          const pct = Math.round((slice.valueKobo * 100) / totalKobo);
          const isActive = activeSlice?.id === slice.id;
          return (
            <button
              key={slice.id}
              type="button"
              onClick={() => setSelectedId(slice.id)}
              className={`w-full min-h-[44px] py-2 px-2 flex items-center justify-between gap-2 text-left rounded-lg transition-colors ${
                isActive ? 'bg-slate-50 dark:bg-slate-800/60' : ''
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {slice.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs tabular-nums shrink-0">
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatNairaSafe(slice.valueKobo, currencySymbol, hideBalances)}
                </span>
                <span className="text-slate-400 dark:text-slate-500 w-9 text-right">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
