import React from 'react';
import { useApp } from '../../context/AppContext';
import { SUPPORTED_LANGUAGES } from '../../data/themes';
import { Languages, Loader2, RotateCcw } from 'lucide-react';

export const LanguageSelector: React.FC = () => {
  const { 
    currentLanguage, 
    changeReadingLanguage, 
    isTranslating, 
    activeDocument,
    activeTranslatedText 
  } = useApp();

  if (!activeDocument) return null;

  const originalLang = activeDocument.language || 'en-IN';
  const isTranslated = currentLanguage !== originalLang;

  return (
    <div className="flex items-center gap-2 bg-[#FAF3E0] px-3 py-1.5 rounded-xl border border-[#E7DFCA] text-xs">
      <Languages className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
      <span className="font-semibold text-[#1E1B18] hidden sm:inline">Language:</span>

      <div className="relative">
        <select
          value={currentLanguage}
          onChange={(e) => changeReadingLanguage(e.target.value)}
          disabled={isTranslating}
          className="bg-[#FEF9EB] border border-[#D8CEB9] rounded-lg px-2.5 py-1 text-xs font-bold text-[#26231E] focus:outline-none focus:ring-2 focus:ring-[#D97706]/40 cursor-pointer disabled:opacity-50"
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name} ({lang.nativeName})
            </option>
          ))}
        </select>
      </div>

      {isTranslating && (
        <span className="flex items-center gap-1 text-[11px] text-[#D97706] font-semibold animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          Translating...
        </span>
      )}

      {isTranslated && !isTranslating && (
        <button
          onClick={() => changeReadingLanguage(originalLang)}
          title="Switch back to original document language"
          className="flex items-center gap-1 text-[11px] text-[#706655] hover:text-[#1E1B18] hover:underline ml-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden md:inline">Original ({originalLang.split('-')[0].toUpperCase()})</span>
        </button>
      )}
    </div>
  );
};
