import { ReadingPreferences, ReadingProfile, FontOption, HighlightMode, ConfusablePair } from '../types';
import { DEFAULT_READING_PREFERENCES } from '../data/themes';

const VALID_FONTS: FontOption[] = [
  'Lexend',
  'Atkinson Hyperlegible',
  'OpenDyslexic',
  'Comic Neue',
  'Arial',
  'Verdana',
  'Lora'
];

const VALID_HIGHLIGHT_MODES: HighlightMode[] = ['none', 'word', 'phrase', 'line', 'selective'];
const VALID_CONFUSABLE_PAIRS: ConfusablePair[] = ['b/d', 'p/q', 'm/w', 'n/u', 's/z'];
const VALID_CONFUSABLE_STYLES = ['weight', 'subtle-color', 'underline', 'dot'];

export interface ValidationSuccess {
  success: true;
  preferences: ReadingPreferences;
  profile: Partial<ReadingProfile>;
  error?: undefined;
}

export interface ValidationFailure {
  success: false;
  preferences?: undefined;
  profile?: undefined;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validates imported profile JSON string or object.
 * Enforces structure, supported fields, types, and reasonable value bounds.
 */
export function validateProfileJSON(jsonInput: string | Record<string, any>): ValidationResult {
  let data: any;

  if (typeof jsonInput === 'string') {
    try {
      data = JSON.parse(jsonInput);
    } catch (err: any) {
      return {
        success: false,
        error: `Invalid JSON syntax: ${err?.message || 'File is not a valid JSON document'}`
      };
    }
  } else {
    data = jsonInput;
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid profile format: Expected a JSON object at the root'
    };
  }

  // Determine whether raw preferences or nested profile object
  let rawPrefs: any;
  let profileName: string | undefined;
  let calibratedAt: string | undefined;
  let calibrationAnswers: Record<string, string> | undefined;

  if (data.preferences && typeof data.preferences === 'object' && !Array.isArray(data.preferences)) {
    rawPrefs = data.preferences;
    if (typeof data.name === 'string') profileName = data.name;
    if (typeof data.calibratedAt === 'string') calibratedAt = data.calibratedAt;
    if (data.calibrationAnswers && typeof data.calibrationAnswers === 'object') {
      calibrationAnswers = data.calibrationAnswers;
    }
  } else if (data.font || data.fontSize || data.themeId) {
    // Direct preferences format
    rawPrefs = data;
  } else {
    return {
      success: false,
      error: 'Invalid profile schema: Missing "preferences" object or required typography settings'
    };
  }

  // Validate Font
  if (rawPrefs.font !== undefined) {
    if (!VALID_FONTS.includes(rawPrefs.font)) {
      return {
        success: false,
        error: `Unsupported font: "${rawPrefs.font}". Supported fonts: ${VALID_FONTS.join(', ')}`
      };
    }
  }

  // Validate Font Size (12 - 40px)
  if (rawPrefs.fontSize !== undefined) {
    if (typeof rawPrefs.fontSize !== 'number' || isNaN(rawPrefs.fontSize) || rawPrefs.fontSize < 12 || rawPrefs.fontSize > 40) {
      return {
        success: false,
        error: `Font size out of bounds (${rawPrefs.fontSize}px). Must be a number between 12 and 40.`
      };
    }
  }

  // Validate Line Spacing (1.2 - 3.2x)
  if (rawPrefs.lineSpacing !== undefined) {
    if (typeof rawPrefs.lineSpacing !== 'number' || isNaN(rawPrefs.lineSpacing) || rawPrefs.lineSpacing < 1.2 || rawPrefs.lineSpacing > 3.2) {
      return {
        success: false,
        error: `Line spacing out of bounds (${rawPrefs.lineSpacing}). Must be a multiplier between 1.2 and 3.2.`
      };
    }
  }

  // Validate Letter Spacing (0 - 0.4em)
  if (rawPrefs.letterSpacing !== undefined) {
    if (typeof rawPrefs.letterSpacing !== 'number' || isNaN(rawPrefs.letterSpacing) || rawPrefs.letterSpacing < 0 || rawPrefs.letterSpacing > 0.4) {
      return {
        success: false,
        error: `Letter spacing out of bounds (${rawPrefs.letterSpacing}). Must be a number between 0 and 0.4em.`
      };
    }
  }

  // Validate Word Spacing (0 - 0.8em)
  if (rawPrefs.wordSpacing !== undefined) {
    if (typeof rawPrefs.wordSpacing !== 'number' || isNaN(rawPrefs.wordSpacing) || rawPrefs.wordSpacing < 0 || rawPrefs.wordSpacing > 0.8) {
      return {
        success: false,
        error: `Word spacing out of bounds (${rawPrefs.wordSpacing}). Must be a number between 0 and 0.8em.`
      };
    }
  }

  // Validate Paragraph Spacing (0.5 - 4.0rem)
  if (rawPrefs.paragraphSpacing !== undefined) {
    if (typeof rawPrefs.paragraphSpacing !== 'number' || isNaN(rawPrefs.paragraphSpacing) || rawPrefs.paragraphSpacing < 0.5 || rawPrefs.paragraphSpacing > 4.0) {
      return {
        success: false,
        error: `Paragraph spacing out of bounds (${rawPrefs.paragraphSpacing}). Must be a number between 0.5 and 4.0rem.`
      };
    }
  }

  // Validate Text Width (35 - 110ch)
  if (rawPrefs.textWidth !== undefined) {
    if (typeof rawPrefs.textWidth !== 'number' || isNaN(rawPrefs.textWidth) || rawPrefs.textWidth < 35 || rawPrefs.textWidth > 110) {
      return {
        success: false,
        error: `Text width out of bounds (${rawPrefs.textWidth}). Must be between 35 and 110 characters.`
      };
    }
  }

  // Validate Alignment
  if (rawPrefs.alignment !== undefined) {
    if (rawPrefs.alignment !== 'left' && rawPrefs.alignment !== 'justify') {
      return {
        success: false,
        error: `Invalid text alignment "${rawPrefs.alignment}". Supported values: "left" or "justify"`
      };
    }
  }

  // Validate Highlight Mode
  if (rawPrefs.highlightMode !== undefined) {
    if (!VALID_HIGHLIGHT_MODES.includes(rawPrefs.highlightMode)) {
      return {
        success: false,
        error: `Invalid highlight mode "${rawPrefs.highlightMode}". Supported: ${VALID_HIGHLIGHT_MODES.join(', ')}`
      };
    }
  }

  // Validate Colors if present
  const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s,.]+\))$/;
  if (rawPrefs.backgroundColor !== undefined) {
    if (typeof rawPrefs.backgroundColor !== 'string' || !colorRegex.test(rawPrefs.backgroundColor.trim())) {
      return {
        success: false,
        error: `Invalid backgroundColor "${rawPrefs.backgroundColor}". Must be a valid hex or rgb color.`
      };
    }
  }
  if (rawPrefs.textColor !== undefined) {
    if (typeof rawPrefs.textColor !== 'string' || !colorRegex.test(rawPrefs.textColor.trim())) {
      return {
        success: false,
        error: `Invalid textColor "${rawPrefs.textColor}". Must be a valid hex or rgb color.`
      };
    }
  }

  // Validate Confusable Letter Settings
  let confusableSettings = DEFAULT_READING_PREFERENCES.confusableLetterSettings;
  if (rawPrefs.confusableLetterSettings !== undefined) {
    const rawConf = rawPrefs.confusableLetterSettings;
    if (typeof rawConf !== 'object' || rawConf === null) {
      return {
        success: false,
        error: 'confusableLetterSettings must be an object'
      };
    }

    const enabled = typeof rawConf.enabled === 'boolean' ? rawConf.enabled : false;
    let activePairs: ConfusablePair[] = [];
    if (Array.isArray(rawConf.activePairs)) {
      activePairs = rawConf.activePairs.filter((p: any) => VALID_CONFUSABLE_PAIRS.includes(p));
    }
    const style = VALID_CONFUSABLE_STYLES.includes(rawConf.style) ? rawConf.style : 'weight';

    confusableSettings = {
      enabled,
      activePairs,
      style: style as any
    };
  }

  // Validate TTS Speed (0.25 - 3.0x)
  if (rawPrefs.ttsSpeed !== undefined) {
    if (typeof rawPrefs.ttsSpeed !== 'number' || isNaN(rawPrefs.ttsSpeed) || rawPrefs.ttsSpeed < 0.25 || rawPrefs.ttsSpeed > 3.0) {
      return {
        success: false,
        error: `TTS speed out of bounds (${rawPrefs.ttsSpeed}). Must be between 0.25 and 3.0.`
      };
    }
  }

  // Construct clean sanitized preferences by merging defaults with validated fields
  const cleanPreferences: ReadingPreferences = {
    ...DEFAULT_READING_PREFERENCES,
    ...rawPrefs,
    confusableLetterSettings: confusableSettings
  };

  const cleanProfile: Partial<ReadingProfile> = {
    name: profileName || 'Imported Profile',
    preferences: cleanPreferences,
    calibratedAt,
    calibrationAnswers,
    updatedAt: new Date().toISOString()
  };

  return {
    success: true,
    preferences: cleanPreferences,
    profile: cleanProfile
  };
}
