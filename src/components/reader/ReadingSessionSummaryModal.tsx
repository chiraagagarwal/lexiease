import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useApp } from '../../context/AppContext';
import { readingService } from '../../services/readingService';
import { formatTime } from '../../lib/utils';
import { 
  Clock, 
  BookOpen, 
  Zap, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  RotateCcw 
} from 'lucide-react';

export const ReadingSessionSummaryModal: React.FC = () => {
  const { isSessionSummaryOpen, setIsSessionSummaryOpen, activeDocument, preferences } = useApp();
  const session = readingService.getActiveSession() || {
    documentId: activeDocument?.id || '',
    startTime: Date.now() - 120000,
    elapsedSeconds: 145,
    wordsRead: 180,
    wpm: 125,
    difficultWordsLookedUp: ['Deforestation', 'Biosphere', 'Biodiversity'],
    completed: true
  };

  return (
    <Modal
      isOpen={isSessionSummaryOpen}
      onClose={() => setIsSessionSummaryOpen(false)}
      title="Reading Session Reflection"
      subtitle="Encouraging fluency through personalized sensory pacing"
      maxWidth="lg"
    >
      <div className="space-y-6 text-[#26231E]">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-[#FAF3E0] border border-[#E7DFCA] rounded-2xl text-center space-y-1">
            <Clock className="w-5 h-5 text-[#D97706] mx-auto" />
            <span className="text-[10px] uppercase font-bold text-[#706655] block">Reading Time</span>
            <p className="text-xl font-bold text-[#1E1B18] font-mono">
              {formatTime(session.elapsedSeconds || 120)}
            </p>
          </div>

          <div className="p-4 bg-[#FAF3E0] border border-[#E7DFCA] rounded-2xl text-center space-y-1">
            <BookOpen className="w-5 h-5 text-[#047857] mx-auto" />
            <span className="text-[10px] uppercase font-bold text-[#706655] block">Words Explored</span>
            <p className="text-xl font-bold text-[#1E1B18] font-mono">
              {session.wordsRead || 150}
            </p>
          </div>

          <div className="p-4 bg-[#FAF3E0] border border-[#E7DFCA] rounded-2xl text-center space-y-1 col-span-2 sm:col-span-1">
            <Zap className="w-5 h-5 text-[#1E40AF] mx-auto" />
            <span className="text-[10px] uppercase font-bold text-[#706655] block">Estimated Pace</span>
            <p className="text-xl font-bold text-[#1E1B18] font-mono">
              {session.wpm > 0 ? session.wpm : 120} <span className="text-xs font-normal">WPM</span>
            </p>
          </div>
        </div>

        {/* Applied Environmental Settings */}
        <div className="p-4 bg-[#FEF9EB] border border-[#E7DFCA] rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-[#1E1B18]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#D97706]" />
              Reading Settings Employed
            </span>
            <span className="text-[#047857] font-semibold">Active Profile</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[#524B40] pt-1">
            <div>• Font: <span className="font-semibold text-[#1E1B18]">{preferences.font}</span></div>
            <div>• Background: <span className="font-semibold text-[#1E1B18]">Warm Ivory #FEF9EB</span></div>
            <div>• Line Spacing: <span className="font-semibold text-[#1E1B18]">{preferences.lineSpacing}x</span></div>
            <div>• Confusable Letters: <span className="font-semibold text-[#1E1B18]">{preferences.confusableLetterSettings.enabled ? 'On (b/d/p/q)' : 'Off'}</span></div>
          </div>
        </div>

        {/* Non-diagnostic notice */}
        <div className="p-3 bg-[#EEF4F8] border border-[#CADCE6] rounded-xl text-xs text-[#1E2B37] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1E40AF] shrink-0 mt-0.5" />
          <p>
            This summary tracks reading engagement and pace. It does not diagnose dyslexia or score performance.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="primary"
            onClick={() => setIsSessionSummaryOpen(false)}
          >
            Continue Reading
          </Button>
        </div>
      </div>
    </Modal>
  );
};
