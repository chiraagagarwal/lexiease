import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReadingContent } from '../ReadingContent';
import { DEFAULT_READING_PREFERENCES } from '../../../data/themes';
import { DocumentPage, TTSState, ReadingPreferences } from '../../../types';

describe('ReadingContent - Confusable letter pair s/z', () => {
  const dummyPage: DocumentPage = {
    pageNumber: 1,
    content: 'The solar size and zebra sunrise was amazing.',
    paragraphs: ['The solar size and zebra sunrise was amazing.']
  };

  const defaultTTS: TTSState = {
    isPlaying: false,
    isPaused: false,
    currentWordIndex: -1,
    currentSentenceIndex: 0,
    totalWords: 0,
    activeWordText: '',
    playbackRate: 1.0,
    voiceName: '',
    isSupported: true
  };

  it('renders s and z with confusable styling when s/z pair is active with weight style', () => {
    const preferences: ReadingPreferences = {
      ...DEFAULT_READING_PREFERENCES,
      confusableLetterSettings: {
        enabled: true,
        activePairs: ['s/z'],
        style: 'weight'
      }
    };

    const { container } = render(
      <ReadingContent
        page={dummyPage}
        preferences={preferences}
        ttsState={defaultTTS}
        translatedText={null}
      />
    );

    // Confusable s should be styled with amber text [#B45309] and bold weight
    const sSpans = container.querySelectorAll('span.font-black.text-\\[\\#B45309\\]');
    expect(sSpans.length).toBeGreaterThan(0);
    const sTexts = Array.from(sSpans).map(el => el.textContent?.toLowerCase());
    expect(sTexts.every(t => t === 's')).toBe(true);

    // Confusable z should be styled with emerald green text [#047857] and bold weight
    const zSpans = container.querySelectorAll('span.font-black.text-\\[\\#047857\\]');
    expect(zSpans.length).toBeGreaterThan(0);
    const zTexts = Array.from(zSpans).map(el => el.textContent?.toLowerCase());
    expect(zTexts.every(t => t === 'z')).toBe(true);
  });

  it('renders s and z with subtle-color style when requested', () => {
    const preferences: ReadingPreferences = {
      ...DEFAULT_READING_PREFERENCES,
      confusableLetterSettings: {
        enabled: true,
        activePairs: ['s/z'],
        style: 'subtle-color'
      }
    };

    const { container } = render(
      <ReadingContent
        page={dummyPage}
        preferences={preferences}
        ttsState={defaultTTS}
        translatedText={null}
      />
    );

    // 's' receives bg-[#FED7AA]/50 text-[#9A3412]
    const sSpans = container.querySelectorAll('span.bg-\\[\\#FED7AA\\]\\/50');
    expect(sSpans.length).toBeGreaterThan(0);

    // 'z' receives bg-[#BBF7D0]/50 text-[#166534]
    const zSpans = container.querySelectorAll('span.bg-\\[\\#BBF7D0\\]\\/50');
    expect(zSpans.length).toBeGreaterThan(0);
  });

  it('does not apply confusable classes to s and z when confusableLetterSettings is disabled', () => {
    const preferences: ReadingPreferences = {
      ...DEFAULT_READING_PREFERENCES,
      confusableLetterSettings: {
        enabled: false,
        activePairs: ['s/z'],
        style: 'weight'
      }
    };

    const { container } = render(
      <ReadingContent
        page={dummyPage}
        preferences={preferences}
        ttsState={defaultTTS}
        translatedText={null}
      />
    );

    const confusableSpans = container.querySelectorAll('span.text-\\[\\#B45309\\], span.text-\\[\\#047857\\]');
    expect(confusableSpans.length).toBe(0);
  });
});
