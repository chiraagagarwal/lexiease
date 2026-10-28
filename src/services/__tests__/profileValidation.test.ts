import { describe, it, expect } from 'vitest';
import { validateProfileJSON } from '../profileValidation';
import { DEFAULT_READING_PREFERENCES } from '../../data/themes';

describe('profileValidation service', () => {
  const validProfileData = {
    version: 1,
    appName: 'LexiEase',
    exportedAt: '2026-10-24T18:00:00.000Z',
    name: 'Alex Custom Profile',
    preferences: {
      ...DEFAULT_READING_PREFERENCES,
      font: 'OpenDyslexic',
      fontSize: 22,
      lineSpacing: 1.8,
      letterSpacing: 0.08,
      wordSpacing: 0.16,
      paragraphSpacing: 1.6,
      textWidth: 65,
      themeId: 'ivory',
      confusableLetterSettings: {
        enabled: true,
        activePairs: ['b/d', 's/z'],
        style: 'weight'
      }
    }
  };

  it('validates a correct LexiEase profile JSON string', () => {
    const result = validateProfileJSON(JSON.stringify(validProfileData));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.preferences.font).toBe('OpenDyslexic');
      expect(result.preferences.fontSize).toBe(22);
      expect(result.preferences.lineSpacing).toBe(1.8);
      expect(result.preferences.confusableLetterSettings.activePairs).toContain('s/z');
      expect(result.profile.name).toBe('Alex Custom Profile');
    }
  });

  it('validates direct preferences object format', () => {
    const directPrefs = {
      font: 'Lexend',
      fontSize: 20,
      lineSpacing: 1.6,
      themeId: 'cream'
    };
    const result = validateProfileJSON(JSON.stringify(directPrefs));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.preferences.font).toBe('Lexend');
      expect(result.preferences.fontSize).toBe(20);
    }
  });

  it('rejects malformed JSON syntax', () => {
    const result = validateProfileJSON('{ font: Lexend, fontSize: 18 ');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid JSON syntax');
    }
  });

  it('rejects non-object root formats (arrays, null, primitives)', () => {
    expect(validateProfileJSON('["Lexend", 18]').success).toBe(false);
    expect(validateProfileJSON('"plain text"').success).toBe(false);
    expect(validateProfileJSON('12345').success).toBe(false);
    expect(validateProfileJSON('null').success).toBe(false);
  });

  it('rejects missing preferences or missing typography settings', () => {
    const result = validateProfileJSON(JSON.stringify({ notSettings: 'hello' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Missing "preferences" object');
    }
  });

  it('rejects unsupported font families', () => {
    const invalidFont = {
      ...validProfileData,
      preferences: {
        ...validProfileData.preferences,
        font: 'Comic Sans MS'
      }
    };
    const result = validateProfileJSON(JSON.stringify(invalidFont));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Unsupported font: "Comic Sans MS"');
    }
  });

  it('rejects out-of-bounds font sizes', () => {
    // Too small (< 12)
    const tooSmall = {
      ...validProfileData,
      preferences: { ...validProfileData.preferences, fontSize: 8 }
    };
    expect(validateProfileJSON(JSON.stringify(tooSmall)).success).toBe(false);

    // Too large (> 40)
    const tooLarge = {
      ...validProfileData,
      preferences: { ...validProfileData.preferences, fontSize: 48 }
    };
    const result = validateProfileJSON(JSON.stringify(tooLarge));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Font size out of bounds');
    }
  });

  it('rejects out-of-bounds line spacing', () => {
    const invalidLine = {
      ...validProfileData,
      preferences: { ...validProfileData.preferences, lineSpacing: 4.5 }
    };
    const result = validateProfileJSON(JSON.stringify(invalidLine));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Line spacing out of bounds');
    }
  });

  it('rejects out-of-bounds text width', () => {
    const invalidWidth = {
      ...validProfileData,
      preferences: { ...validProfileData.preferences, textWidth: 150 }
    };
    const result = validateProfileJSON(JSON.stringify(invalidWidth));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Text width out of bounds');
    }
  });

  it('validates confusable letter settings and retains s/z pair', () => {
    const confusableTest = {
      ...validProfileData,
      preferences: {
        ...validProfileData.preferences,
        confusableLetterSettings: {
          enabled: true,
          activePairs: ['b/d', 's/z', 'invalid/pair'],
          style: 'weight'
        }
      }
    };
    const result = validateProfileJSON(JSON.stringify(confusableTest));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.preferences.confusableLetterSettings.activePairs).toEqual(['b/d', 's/z']);
    }
  });

  it('sanitizes and strips invalid/unrecognized properties safely', () => {
    const withExtraFields = {
      ...validProfileData,
      preferences: {
        ...validProfileData.preferences,
        maliciousToken: 'secret_token_value',
        unknownScript: '<script>alert(1)</script>'
      }
    };
    const result = validateProfileJSON(JSON.stringify(withExtraFields));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.preferences.font).toBe('OpenDyslexic');
      expect(result.preferences.fontSize).toBe(22);
    }
  });
});
