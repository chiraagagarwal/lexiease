import React from 'react';
import { CalibrationOption, ReadingPreferences } from '../../types';
import { getFontFamilyCSS } from '../../lib/utils';
import { Check } from 'lucide-react';

export interface CalibrationCardProps {
  option: CalibrationOption;
  isSelected: boolean;
  sampleText: string;
  basePreferences: ReadingPreferences;
  onSelect: () => void;
}

export const CalibrationCard: React.FC<CalibrationCardProps> = ({
  option,
  isSelected,
  sampleText,
  basePreferences,
  onSelect
}) => {
  // Merge base preferences with option's specific preview settings
  const merged: ReadingPreferences = {
    ...basePreferences,
    ...option.previewSettings
  };

  const fontFamily = getFontFamilyCSS(merged.font);

  return (
    <div
      onClick={onSelect}
      className={`group cursor-pointer rounded-2xl p-5 border-2 transition-all relative flex flex-col justify-between ${
        isSelected
          ? 'border-[#D97706] ring-2 ring-[#D97706]/30 bg-[#FEF9EB] shadow-md'
          : 'border-[#E7DFCA] bg-[#FAF3E0] hover:border-[#8C7A5D] hover:bg-[#FEF9EB]'
      }`}
    >
      <div className="space-y-3">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
              isSelected ? 'bg-[#D97706] border-[#D97706] text-white' : 'border-[#8C7A5D] bg-white'
            }`}>
              {isSelected && <Check className="w-3.5 h-3.5" />}
            </div>
            <h4 className="font-bold text-sm text-[#1E1B18]">{option.title}</h4>
          </div>
          {option.badge && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FAF1DA] text-[#8C6D23] border border-[#E4D5AD]">
              {option.badge}
            </span>
          )}
        </div>

        {/* Interactive typography live render sample */}
        <div
          className="p-4 rounded-xl border border-[#E7DFCA] transition-colors overflow-hidden"
          style={{
            backgroundColor: merged.backgroundColor || '#FEF9EB',
            color: merged.textColor || '#26231E',
            fontFamily: fontFamily,
            fontSize: `${merged.fontSize || 18}px`,
            fontWeight: merged.boldness || 450,
            letterSpacing: `${merged.letterSpacing || 0.04}em`,
            wordSpacing: `${merged.wordSpacing || 0.1}em`,
            lineHeight: merged.lineSpacing || 1.8,
            textAlign: merged.alignment || 'left'
          }}
        >
          <p>
            {merged.highlightMode === 'word' ? (
              <>
                The great blue heron <span className="bg-[#FDE047] text-[#1E1B18] px-1 rounded font-semibold">stepped</span> silently through the shallow riverbed...
              </>
            ) : merged.highlightMode === 'phrase' ? (
              <>
                <span className="bg-[#FDE047]/80 text-[#1E1B18] px-1 rounded">The great blue heron</span> stepped silently through the shallow riverbed...
              </>
            ) : merged.highlightMode === 'line' ? (
              <span className="bg-[#FEF08A] px-1 rounded block">
                {sampleText}
              </span>
            ) : (
              sampleText
            )}
          </p>
        </div>

        <p className="text-xs text-[#706655] leading-relaxed">
          {option.description}
        </p>
      </div>

      <div className="pt-3 border-t border-[#E7DFCA]/60 flex items-center justify-between text-[11px] text-[#8C7A5D]">
        <span>Tap to choose this style</span>
        <span className="font-semibold text-[#D97706]">{isSelected ? 'Selected' : 'Select'}</span>
      </div>
    </div>
  );
};
