import React, { useState, useEffect } from 'react';
import { Document, DocumentPage } from '../../types';
import { BookOpen, AlertCircle, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';

export interface OriginalDocumentViewProps {
  document: Document;
  page: DocumentPage;
  currentPageNumber: number;
  totalPages: number;
}

export const OriginalDocumentView: React.FC<OriginalDocumentViewProps> = ({
  document,
  page,
  currentPageNumber,
  totalPages
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const style = document.originalViewStyle || {
    headerColor: '#1E40AF',
    chapterNumber: 'CHAPTER 01',
    subheading: 'Original Textbook Source',
    accentColor: '#3B82F6'
  };

  const originalFile = document.originalFile;
  const fileName = originalFile instanceof File ? originalFile.name : '';
  const fileType = originalFile?.type || '';

  const isPdf = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const isImage = (fileType.startsWith('image/') && !fileType.includes('svg')) || /\.(png|jpe?g|webp)$/i.test(fileName);
  const isSupportedMedia = isPdf || isImage;

  useEffect(() => {
    if (!originalFile) {
      setObjectUrl(null);
      setFileError(null);
      return;
    }

    try {
      const url = URL.createObjectURL(originalFile);
      setObjectUrl(url);
      setFileError(null);
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (err: any) {
      console.error('[OriginalDocumentView] Failed to create object URL for original file:', err);
      setFileError('Could not create preview for uploaded document.');
      setObjectUrl(null);
    }
  }, [originalFile]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-[#CBD5E1] rounded-xl shadow-md overflow-hidden text-[#0F172A]">
      {/* Document Header Banner */}
      <div
        className="p-6 text-white flex flex-wrap items-center justify-between gap-4"
        style={{ backgroundColor: style.headerColor }}
      >
        <div className="space-y-1">
          <span className="text-[11px] font-mono tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">
            {originalFile ? (isPdf ? 'PDF SOURCE' : isImage ? 'SCANNED ASSET' : 'UPLOADED FILE') : style.chapterNumber}
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight">
            {document.title}
          </h2>
          <p className="text-xs text-white/80 font-sans">
            {originalFile ? (fileName || 'Original Document Upload') : style.subheading}
          </p>
        </div>

        <div className="text-right text-xs text-white/90">
          <p className="font-mono font-bold">PAGE {currentPageNumber} OF {totalPages}</p>
          <p className="text-[10px] text-white/70">
            {originalFile ? 'Digitized Document Archive' : 'NCERT / Standard Curriculum'}
          </p>
        </div>
      </div>

      {/* Main Content Area: Genuine File Preview or Synthetic Fallback */}
      <div className="p-6 sm:p-10 space-y-6 bg-[#FFFFFF] border-b border-[#E2E8F0]">
        {/* Notice badge */}
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-sans text-[#64748B] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#3B82F6] shrink-0" />
            <span>
              {originalFile
                ? 'Displaying original uploaded document file. Switch to Personalized View for dyslexia-friendly formatting, font spacing, and voice tracking.'
                : 'Displaying fixed original typesetting with standard contrast. Switch back to Personalized View for anti-glare warm hues, custom letter spacing, and speech tracking.'}
            </span>
          </div>
          {objectUrl && (
            <a
              href={objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#1E40AF] hover:underline font-semibold text-xs shrink-0"
            >
              <span>Open in new tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {fileError && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            {fileError} Falling back to extracted textbook text below.
          </div>
        )}

        {/* 1. PDF Document Rendering */}
        {objectUrl && isPdf && (
          <div className="w-full bg-[#F1F5F9] rounded-xl overflow-hidden border border-[#CBD5E1] shadow-inner">
            <object
              data={objectUrl}
              type="application/pdf"
              className="w-full h-[750px] block"
              aria-label={document.title}
            >
              <div className="p-8 text-center text-sm text-[#475569] space-y-3">
                <FileText className="w-8 h-8 text-[#64748B] mx-auto" />
                <p>Embedded PDF preview is not supported directly by your browser.</p>
                <a
                  href={objectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1E40AF] text-white rounded-lg text-xs font-semibold hover:bg-[#1E3A8A] transition-colors"
                >
                  <span>Open PDF in New Window</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </object>
          </div>
        )}

        {/* 2. Image Document Rendering */}
        {objectUrl && isImage && (
          <div className="flex justify-center p-4 sm:p-6 bg-[#F8FAFC] rounded-xl border border-[#CBD5E1]">
            <img
              src={objectUrl}
              alt={document.title}
              className="max-w-full max-h-[850px] object-contain rounded-lg shadow-sm"
            />
          </div>
        )}

        {/* 3. Fallback for Synthetic Documents or Unsupported/Missing Media */}
        {(!objectUrl || !isSupportedMedia) && (
          <div className="space-y-4 text-justify font-serif text-[#1E293B]">
            {originalFile && !isSupportedMedia && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs font-sans text-amber-800 mb-4">
                Raw preview is not available for this file type. Showing extracted text below:
              </div>
            )}
            {page.paragraphs && page.paragraphs.length > 0 ? (
              page.paragraphs.map((para, idx) => (
                <p key={idx} className="indent-6 leading-7">
                  {para}
                </p>
              ))
            ) : (
              <p className="italic text-[#64748B]">{page.content || 'No text content available for this page.'}</p>
            )}
          </div>
        )}
      </div>

      {/* Document Page Footer */}
      <div className="px-8 py-3 bg-[#F1F5F9] text-xs font-sans text-[#64748B] flex items-center justify-between border-t border-[#E2E8F0]">
        <span>{originalFile ? 'Digitized Educational Source' : 'Original Document Source Archive'}</span>
        <span>{originalFile ? 'Uploaded Document Asset' : 'Standard Grade 8 Educational Series'}</span>
      </div>
    </div>
  );
};
