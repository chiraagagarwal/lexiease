import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import React from 'react';
import { AppProvider } from '../../context/AppContext';
import { ReaderView } from './ReaderView';
import { aiService } from '../../services/aiService';

// Add mock document
const { mockDocument } = vi.hoisted(() => ({
  mockDocument: {
    id: 'doc_test',
    title: 'Test Document',
    category: 'Science',
    language: 'en-IN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progressPercent: 0,
    totalWords: 100,
    estimatedReadTimeMinutes: 1,
    pages: [
      {
        pageNumber: 1,
        content: 'This is the first page of the test document.',
        paragraphs: ['This is the first page of the test document.'],
      },
      {
        pageNumber: 2,
        content: 'This is the second page of the test document.',
        paragraphs: ['This is the second page of the test document.'],
      }
    ]
  }
}));

// Mock the aiService
vi.mock('../../services/aiService', () => ({
  aiService: {
    simplifyPage: vi.fn(),
    translatePage: vi.fn(),
    generateTTS: vi.fn()
  }
}));

vi.mock('../../services/documentService', () => ({
  documentService: {
    getDocuments: vi.fn().mockResolvedValue([mockDocument]),
    getDocument: vi.fn().mockResolvedValue(mockDocument),
    saveDocument: vi.fn().mockImplementation((doc: any) => Promise.resolve(doc)),
    updateProgress: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('../../services/profileService', () => ({
  profileService: {
    getProfile: vi.fn().mockResolvedValue(null),
    saveProfile: vi.fn().mockResolvedValue(null)
  }
}));

describe('ReaderView AI Interaction Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('proves that opening or navigating pages makes ZERO Gemini requests', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <ReaderView />
        </AppProvider>
      );
    });

    // We should be on page 1
    // The AppContext selects the first document by default if it's the only one
    // But it might need to be explicitly selected. Wait for the mock document to load.
    expect(screen.getAllByText(/Test Document/)[0]).toBeTruthy();
    expect(aiService.simplifyPage).not.toHaveBeenCalled();

    // Navigate to page 2
    const nextBtn = screen.getByText('Next Page');
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    // Prove NO simplifyPage calls were made during navigation
    expect(aiService.simplifyPage).not.toHaveBeenCalled();
  });

  it('proves that clicking Simplify makes exactly one request when no cached result exists', async () => {
    // Setup mock response
    (aiService.simplifyPage as any).mockResolvedValue({
      pageNumber: 1,
      content: 'This is the first page of the test document.',
      paragraphs: ['This is the first page of the test document.'],
      simplificationResult: {
        originalText: 'original',
        simplifiedText: 'simplified',
        readingGradeReduction: 'reduced',
        keyVocabulary: [],
        bulletSummary: []
      }
    });

    await act(async () => {
      render(
        <AppProvider>
          <ReaderView />
        </AppProvider>
      );
    });

    const simplifyBtn = screen.getAllByText('Simplify Text')[0];

    await act(async () => {
      fireEvent.click(simplifyBtn);
    });

    // Prove it was called exactly once
    expect(aiService.simplifyPage).toHaveBeenCalledTimes(1);
    expect(aiService.simplifyPage).toHaveBeenCalledWith('doc_test', 0);
  });

  it('proves that repeating the same simplification uses cache instead of Gemini', async () => {
    // Modify the initial mock document to simulate it already being simplified
    const modifiedMock = JSON.parse(JSON.stringify(mockDocument));
    modifiedMock.pages[0].simplificationResult = {
      originalText: 'original',
      simplifiedText: 'already simplified',
      readingGradeReduction: 'reduced',
      keyVocabulary: [],
      bulletSummary: []
    };

    // Override the mock for this test
    const { documentService } = await import('../../services/documentService');
    (documentService.getDocuments as any).mockResolvedValueOnce([modifiedMock]);
    (documentService.getDocument as any).mockResolvedValueOnce(modifiedMock);

    await act(async () => {
      render(
        <AppProvider>
          <ReaderView />
        </AppProvider>
      );
    });

    const simplifyBtn = screen.getAllByText('Simplify Text')[0];

    await act(async () => {
      fireEvent.click(simplifyBtn);
    });

    // Prove that it DOES NOT call aiService.simplifyPage because it used the cache
    expect(aiService.simplifyPage).not.toHaveBeenCalled();
  });
});
