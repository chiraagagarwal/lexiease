import React from 'react';
import { ReadingPreferences } from '../../types';
import { Button } from '../common/Button';
import { CheckCircle2, RotateCcw, BookOpen, Sparkles, Sliders } from 'lucide-react';
import { getFontFamilyCSS } from '../../lib/utils';
import { READING_THEMES } from '../../data/themes';

export interface CalibrationSummaryProps {
  preferences: ReadingPreferences;
  onApply: () => void;
  onRedo: () => void;
  onOpenReader: () => void;
}

export const CalibrationSummary: React.FC<CalibrationSummaryProps> = ({
  preferences,
  onApply,
  onRedo,
  onOpenReader
}) => {
  const theme = READING_THEMES.find(t => t.id === preferences.themeId) || READING_THEMES[0];
  const fontFamily = getFontFamilyCSS(preferences.font);

  return (
    <div className="max-w-3xl mx-auto bg-[#FAF3E0] border border-[#E7DFCA] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 border-b border-[#E7DFCA] pb-5">
        <div className="w-12 h-12 rounded-full bg-[#EDF5EC] text-[#047857] flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-2xl font-bold text-[#1E1B18]">Your Calibrated Reading Profile</h3>
        <p className="text-xs text-[#706655] max-w-lg mx-auto">
          We synthesized your 5 calibration choices into a custom personalized environment to eliminate glare, letter vibration, and line slipping.
        </p>
      </div>

      {/* Live Sample Box */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[#706655]">
          Live Render with Your Calibrated Profile:
        </label>
        <div
          className="p-6 rounded-2xl border border-[#E7DFCA] shadow-xs"
          style={{
            backgroundColor: preferences.backgroundColor,
            color: preferences.textColor,
            fontFamily: fontFamily,
            fontSize: `${preferences.fontSize}px`,
            fontWeight: preferences.boldness,
            letterSpacing: `${preferences.letterSpacing}em`,
            wordSpacing: `${preferences.wordSpacing}em`,
            lineHeight: preferences.lineSpacing,
            textAlign: preferences.alignment
          }}
        >
          <p>
            "In every branch of science and story, reading becomes effortless when characters stand distinct and the background gently absorbs harsh reflection. You are now ready to read comfortably at your own pace."
          </p>
        </div>
      </div>

      {/* Structured Profile Specification Table */}
      <div className="bg-[#FEF9EB] border border-[#E7DFCA] rounded-xl p-5 space-y-3">
        <h4 className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider">
          Calibrated Specifications:
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-[#FAF3E0] border border-[#E7DFCA]">
            <span className="text-[10px] text-[#706655] block">Font Family</span>
            <span className="font-bold text-[#26231E]">{preferences.font}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FAF3E0] border border-[#E7DFCA]">
            <span className="text-[10px] text-[#706655] block">Font Size</span>
            <span className="font-bold text-[#26231E]">{preferences.fontSize}px</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FAF3E0] border border-[#E7DFCA]">
            <span className="text-[10px] text-[#706655] block">Letter Spacing</span>
            <span className="font-bold text-[#26231E]">+{preferences.letterSpacing}em</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FAF3E0] border border-[#E7DFCA]">
            <span className="text-[10px] text-[#706655] block">Word Spacing</span>
            <span className="font-bold text-[#26231E]">+{preferences.wordSpacing}em</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FAF3E0] border border-[#E7DFCA]">
            <span className="text-[10px] text-[#706655] block">Line Height</span>
            <span className="font-bold text-[#26231E]">{preferences.lineSpacing}x</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FAF3E0] border border-[#E7DFCA]">
            <span className="text-[10px] text-[#706655] block">Background Surface</span>
            <span className="font-bold text-[#26231E] flex items-center gap-1.5">
              <span 
                className="w-3 h-3 rounded-full border border-black/20"
                style={{ backgroundColor: preferences.backgroundColor }}
              />
              {theme.name.split('(')[0]}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FAF3E0] border border-[#E7DFCA]">
            <span className="text-[10px] text-[#706655] block">Text Color</span>
            <span className="font-bold text-[#26231E]">{preferences.textColor}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FAF3E0] border border-[#E7DFCA]">
            <span className="text-[10px] text-[#706655] block">Highlight Mode</span>
            <span className="font-bold text-[#26231E] capitalize">{preferences.highlightMode}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button
          variant="outline"
          size="md"
          icon={<RotateCcw className="w-4 h-4" />}
          onClick={onRedo}
        >
          Redo Calibration
        </Button>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            icon={<Sliders className="w-4 h-4" />}
            onClick={onApply}
          >
            Save to Profile
          </Button>

          <Button
            variant="accent"
            size="md"
            icon={<BookOpen className="w-4 h-4" />}
            onClick={() => {
              onApply();
              onOpenReader();
            }}
          >
            Apply & Start Reading
          </Button>
        </div>
      </div>
    </div>
  );
};
