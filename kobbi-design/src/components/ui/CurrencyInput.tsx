import React from 'react';
import { koboToEditableString, parseNairaInputToKobo } from '../../utils/money';

interface CurrencyInputProps {
  id?: string;
  label: string;
  valueKobo: number;
  onChangeKobo: (kobo: number) => void;
  currencySymbol?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  autoFocus?: boolean;
  quickPresets?: number[]; // in Naira, e.g., [2000, 5000, 10000, 25000]
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  id,
  label,
  valueKobo,
  onChangeKobo,
  currencySymbol = '₦',
  placeholder = '0.00',
  error,
  helperText,
  autoFocus = false,
  quickPresets,
}) => {
  const [text, setText] = React.useState<string>(() =>
    valueKobo > 0 ? koboToEditableString(valueKobo) : ''
  );

  React.useEffect(() => {
    const parsedCurrent = parseNairaInputToKobo(text);
    if (parsedCurrent !== valueKobo) {
      setText(valueKobo > 0 ? koboToEditableString(valueKobo) : '');
    }
  }, [valueKobo]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits, commas, and at most one decimal dot with 2 digits
    const sanitized = raw.replace(/[^\d.]/g, '');
    const dotParts = sanitized.split('.');
    let normalized = dotParts[0] || '';
    if (dotParts.length > 1) {
      normalized += '.' + dotParts[1].slice(0, 2);
    }
    setText(normalized);
    onChangeKobo(parseNairaInputToKobo(normalized));
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
      >
        {label}
      </label>
      <div
        className={`flex items-center rounded-xl border px-3.5 min-h-[52px] bg-[#F8FAFC] dark:bg-[#101828] transition-colors ${
          error
            ? 'border-[#DC5C5C] focus-within:ring-2 focus-within:ring-[#DC5C5C]/20'
            : 'border-[#E4E7EC] dark:border-[#2B3952] focus-within:border-[#087F5B] focus-within:ring-2 focus-within:ring-[#087F5B]/15'
        }`}
      >
        <span className="font-display text-lg font-bold text-slate-500 dark:text-slate-400 mr-2 select-none">
          {currencySymbol}
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoFocus={autoFocus}
          value={text}
          onChange={handleTextChange}
          placeholder={placeholder}
          className="w-full bg-transparent font-display text-xl font-bold tabular-nums text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none"
        />
      </div>

      {quickPresets && quickPresets.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {quickPresets.map((nairaVal) => (
            <button
              key={nairaVal}
              type="button"
              onClick={() => {
                const kobo = nairaVal * 100;
                setText(String(nairaVal));
                onChangeKobo(kobo);
              }}
              className="min-h-[36px] px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              {currencySymbol}
              {nairaVal.toLocaleString('en-NG')}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs font-medium text-[#DC5C5C] dark:text-[#F07171]">{error}</p>
      )}
      {!error && helperText && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
};
