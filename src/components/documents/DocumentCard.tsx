import React from 'react';
import { Document } from '../../types';
import { Button } from '../common/Button';
import { BookOpen, Clock, FileText, Trash2, Globe, Sparkles } from 'lucide-react';

export interface DocumentCardProps {
  document: Document;
  onOpen: () => void;
  onDelete: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onOpen,
  onDelete
}) => {
  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    Science: { bg: '#EDF5EC', text: '#047857', border: '#CBDBCB' },
    History: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
    English: { bg: '#EEF4F8', text: '#1E40AF', border: '#CADCE6' },
    Mathematics: { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' },
    General: { bg: '#FAF3E0', text: '#786E5E', border: '#E7DFCA' }
  };

  const badgeStyle = categoryColors[document.category] || categoryColors.General;

  return (
    <div className="bg-[#FAF3E0] border border-[#E7DFCA] rounded-2xl p-5 hover:border-[#8C7A5D] hover:shadow-sm transition-all flex flex-col justify-between group space-y-4">
      <div className="space-y-3">
        {/* Badges */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
            style={{
              backgroundColor: badgeStyle.bg,
              color: badgeStyle.text,
              borderColor: badgeStyle.border
            }}
          >
            {document.category}
          </span>

          <div className="flex items-center gap-2 text-[11px] text-[#706655]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {document.estimatedReadTimeMinutes} min read
            </span>
            <span className="flex items-center gap-1 uppercase font-semibold text-[#8C7A5D]">
              <Globe className="w-3 h-3" />
              {document.language.split('-')[0]}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-base text-[#1E1B18] group-hover:text-[#D97706] transition-colors line-clamp-2">
          {document.title}
        </h3>

        {/* Preview snippet */}
        <p className="text-xs text-[#524B40] line-clamp-2 leading-relaxed">
          {document.pages[0]?.content || 'Educational text document...'}
        </p>

        {/* Reading Progress bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-[#706655]">
            <span>Progress</span>
            <span className="font-semibold text-[#26231E]">{document.progressPercent}%</span>
          </div>
          <div className="w-full bg-[#E7DFCA] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#D97706] h-full rounded-full transition-all duration-300"
              style={{ width: `${document.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E7DFCA]/70">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete document"
          className="p-1.5 rounded-lg text-[#8C7A5D] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <Button
          variant={document.progressPercent > 0 ? 'primary' : 'accent'}
          size="sm"
          icon={<BookOpen className="w-3.5 h-3.5" />}
          onClick={onOpen}
        >
          {document.progressPercent > 0 ? 'Continue Reading' : 'Open in Reader'}
        </Button>
      </div>
    </div>
  );
};
