import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from '../aiService';

describe('AIService - Assessment Analysis', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls backend analyze-assessment endpoint with FormData and returns structured response', async () => {
    const mockResponse = {
      recommendations: {
        font: 'OpenDyslexic',
        letterSpacing: 0.08,
        lineSpacing: 2.2,
        wordSpacing: 0.16,
        themeId: 'warm-cream',
        backgroundColor: '#FEF9EB',
        highlightMode: 'word',
        confusableLetterSettings: {
          enabled: true,
          activePairs: ['b/d', 'p/q'],
          style: 'weight'
        }
      },
      extractedNotes: [
        'Reader demonstrates improved tracking with extra letter spacing.'
      ],
      disclaimer: 'LexiEase does not diagnose dyslexia or provide medical advice.',
      is_fallback: false
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const file = new File(['%PDF-1.4 sample data'], 'report.pdf', { type: 'application/pdf' });
    const result = await aiService.analyzeAssessment(file);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchArgs = (global.fetch as any).mock.calls[0];
    expect(fetchArgs[0]).toContain('/api/ai/analyze-assessment');
    expect(fetchArgs[1].method).toBe('POST');
    expect(fetchArgs[1].body).toBeInstanceOf(FormData);

    expect(result.recommendations.letterSpacing).toBe(0.08);
    expect(result.extractedNotes).toHaveLength(1);
    expect(result.disclaimer).toContain('does not diagnose');
    expect(result.isFallback).toBe(false);
  });

  it('provides safe fallback accommodations and non-diagnostic disclaimer when endpoint fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Service temporarily unavailable' })
    });

    const file = new File(['bad content'], 'corrupted.pdf', { type: 'application/pdf' });
    const result = await aiService.analyzeAssessment(file);

    // Should return safe defaults instead of throwing an unhandled exception
    expect(result).toBeDefined();
    expect(result.recommendations.themeId).toBe('warm-cream');
    expect(result.extractedNotes.length).toBeGreaterThan(0);
    expect(result.disclaimer).toContain('does not diagnose');
    expect(result.isFallback).toBe(true);
  });

  it('provides safe fallback accommodations when network throws an error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error / offline'));

    const file = new File(['sample'], 'notes.png', { type: 'image/png' });
    const result = await aiService.analyzeAssessment(file);

    expect(result).toBeDefined();
    expect(result.recommendations.confusableLetterSettings?.enabled).toBe(true);
    expect(result.extractedNotes.length).toBeGreaterThan(0);
    expect(result.isFallback).toBe(true);
  });
});
