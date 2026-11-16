import React from 'react';
import { Category } from '../../types/finance';
import { CategoryIcon } from '../ui/CategoryIcon';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
  disabledIds?: string[];
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  onSelect,
  disabledIds = [],
}) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {categories.map((cat) => {
        const isSelected = cat.id === selectedCategoryId;
        const isDisabled = disabledIds.includes(cat.id);
        return (
          <button
            key={cat.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(cat.id)}
            className={`min-h-[68px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all ${
              isDisabled
                ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'
                : isSelected
                ? 'border-[#087F5B] bg-[#ECFDF5] dark:bg-[#087F5B]/20 text-[#087F5B] dark:text-[#34D399] ring-1 ring-[#087F5B]'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101828] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: isSelected ? cat.color : `${cat.color}1A`,
                color: isSelected ? '#FFFFFF' : cat.color,
              }}
            >
              <CategoryIcon name={cat.iconName} size={16} />
            </span>
            <span className="text-[11px] font-semibold leading-tight line-clamp-2">
              {cat.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};
