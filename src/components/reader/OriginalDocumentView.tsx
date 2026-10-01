import React from 'react';
import { Document, DocumentPage } from '../../types';
import { BookOpen, AlertCircle } from 'lucide-react';

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
  const style = document.originalViewStyle || {
    headerColor: '#1E40AF',
    chapterNumber: 'CHAPTER 01',
    subheading: 'Original Textbook Source',
    accentColor: '#3B82F6'
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-[#CBD5E1] rounded-xl shadow-md overflow-hidden text-[#0F172A]">
      {/* Textbook Header Banner */}
      <div 
        className="p-6 text-white flex flex-wrap items-center justify-between gap-4"
        style={{ backgroundColor: style.headerColor }}
      >
        <div className="space-y-1">
          <span className="text-[11px] font-mono tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">
            {style.chapterNumber}
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight">
            {document.title}
          </h2>
          <p className="text-xs text-white/80 font-sans">
            {style.subheading}
          </p>
        </div>

        <div className="text-right text-xs text-white/90">
          <p className="font-mono font-bold">PAGE {currentPageNumber} OF {totalPages}</p>
          <p className="text-[10px] text-white/70">NCERT / Standard Curriculum</p>
        </div>
      </div>

      {/* Simulated Authentic Textbook Layout */}
      <div className="p-8 sm:p-12 space-y-6 font-serif text-base sm:text-lg leading-relaxed bg-[#FFFFFF] border-b border-[#E2E8F0]">
        {/* Notice badge */}
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-sans text-[#64748B] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#3B82F6] shrink-0" />
          <span>
            Displaying fixed original typesetting with standard contrast. Switch back to <strong>Personalized View</strong> for anti-glare warm hues, custom letter spacing, and speech tracking.
          </span>
        </div>

        {/* Content Paragraphs */}
        <div className="space-y-4 text-justify font-serif text-[#1E293B]">
          {page.paragraphs.map((para, idx) => (
            <p key={idx} className="indent-6 leading-7">
              {para}
            </p>
          ))}
        </div>
      </div>

      {/* Textbook Page Footer */}
      <div className="px-8 py-3 bg-[#F1F5F9] text-xs font-sans text-[#64748B] flex items-center justify-between border-t border-[#E2E8F0]">
        <span>Original Document Source Archive</span>
        <span>Standard Grade 8 Educational Series</span>
      </div>
    </div>
  );
};
