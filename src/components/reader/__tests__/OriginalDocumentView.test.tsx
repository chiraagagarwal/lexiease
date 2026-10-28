import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OriginalDocumentView } from '../OriginalDocumentView';
import { Document, DocumentPage } from '../../../types';

describe('OriginalDocumentView', () => {
  const mockCreateObjectURL = vi.fn();
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    mockCreateObjectURL.mockReturnValue('blob:http://localhost:3000/mock-blob-uuid');
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const samplePage: DocumentPage = {
    pageNumber: 1,
    content: 'First paragraph.\n\nSecond paragraph.',
    paragraphs: ['First paragraph of textbook text.', 'Second paragraph of textbook text.']
  };

  const syntheticDoc: Document = {
    id: 'doc-synthetic-1',
    title: 'NCERT Grade 8 Science',
    category: 'Science',
    language: 'en-IN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progressPercent: 0,
    totalWords: 150,
    estimatedReadTimeMinutes: 2,
    pages: [samplePage],
    status: 'completed',
    originalViewStyle: {
      headerColor: '#1E40AF',
      chapterNumber: 'CHAPTER 01',
      subheading: 'Crop Production & Management',
      accentColor: '#3B82F6'
    }
  };

  it('renders synthetic document with NCERT layout and page paragraphs when originalFile is undefined', () => {
    render(
      <OriginalDocumentView
        document={syntheticDoc}
        page={samplePage}
        currentPageNumber={1}
        totalPages={1}
      />
    );

    expect(screen.getByText('NCERT Grade 8 Science')).toBeDefined();
    expect(screen.getByText('CHAPTER 01')).toBeDefined();
    expect(screen.getByText('Crop Production & Management')).toBeDefined();
    expect(screen.getByText('First paragraph of textbook text.')).toBeDefined();
    expect(screen.getByText('Second paragraph of textbook text.')).toBeDefined();
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it('renders native PDF preview when originalFile is a PDF', () => {
    const pdfBlob = new Blob(['%PDF-1.4 sample content'], { type: 'application/pdf' });
    const pdfDoc: Document = {
      ...syntheticDoc,
      id: 'doc-pdf-1',
      title: 'Biology Handout PDF',
      originalFile: pdfBlob
    };

    const { unmount } = render(
      <OriginalDocumentView
        document={pdfDoc}
        page={samplePage}
        currentPageNumber={1}
        totalPages={1}
      />
    );

    expect(mockCreateObjectURL).toHaveBeenCalledWith(pdfBlob);
    expect(screen.getByText('PDF SOURCE')).toBeDefined();
    expect(screen.getByText('Biology Handout PDF')).toBeDefined();

    // Check embedded object
    const pdfObject = document.querySelector('object[type="application/pdf"]');
    expect(pdfObject).toBeTruthy();
    expect(pdfObject?.getAttribute('data')).toBe('blob:http://localhost:3000/mock-blob-uuid');

    // Unmount should revoke the created blob URL
    unmount();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost:3000/mock-blob-uuid');
  });

  it('renders scanned image preview when originalFile is an image', () => {
    const imageBlob = new Blob(['fake image bytes'], { type: 'image/png' });
    const imageDoc: Document = {
      ...syntheticDoc,
      id: 'doc-img-1',
      title: 'History Textbook Scan',
      originalFile: imageBlob
    };

    const { unmount } = render(
      <OriginalDocumentView
        document={imageDoc}
        page={samplePage}
        currentPageNumber={1}
        totalPages={1}
      />
    );

    expect(mockCreateObjectURL).toHaveBeenCalledWith(imageBlob);
    expect(screen.getByText('SCANNED ASSET')).toBeDefined();
    expect(screen.getByText('History Textbook Scan')).toBeDefined();

    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('blob:http://localhost:3000/mock-blob-uuid');

    unmount();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost:3000/mock-blob-uuid');
  });

  it('falls back to extracted paragraphs gracefully if file is unsupported format', () => {
    const textBlob = new Blob(['sample plain text'], { type: 'text/plain' });
    const textDoc: Document = {
      ...syntheticDoc,
      id: 'doc-text-1',
      title: 'Notes Document',
      originalFile: textBlob
    };

    render(
      <OriginalDocumentView
        document={textDoc}
        page={samplePage}
        currentPageNumber={1}
        totalPages={1}
      />
    );

    expect(screen.getByText(/Raw preview is not available for this file type/i)).toBeDefined();
    expect(screen.getByText('First paragraph of textbook text.')).toBeDefined();
  });

  it('safely treats SVG as unsupported format and falls back to text preview', () => {
    const svgBlob = new Blob(['<svg><script>alert(1)</script></svg>'], { type: 'image/svg+xml' });
    const svgDoc: Document = {
      ...syntheticDoc,
      id: 'doc-svg-1',
      title: 'Vector Diagram',
      originalFile: svgBlob
    };

    render(
      <OriginalDocumentView
        document={svgDoc}
        page={samplePage}
        currentPageNumber={1}
        totalPages={1}
      />
    );

    // SVG must NOT be rendered in an <img> tag for security
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(/Raw preview is not available for this file type/i)).toBeDefined();
  });
});
