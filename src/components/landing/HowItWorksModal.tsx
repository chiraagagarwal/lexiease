import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Check, Sparkles, BookOpen, Volume2, ShieldCheck, HeartHandshake } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HowItWorksModal: React.FC = () => {
  const { isHowItWorksOpen, setIsHowItWorksOpen, setCurrentRoute } = useApp();

  return (
    <Modal
      isOpen={isHowItWorksOpen}
      onClose={() => setIsHowItWorksOpen(false)}
      title="How LexiEase Adapts to You"
      subtitle="A respectful, evidence-based approach to multisensory reading support"
      maxWidth="2xl"
    >
      <div className="space-y-6 text-[#26231E]">
        {/* Core philosophy banner */}
        <div className="p-4 bg-[#FAF1DA] border border-[#E4D5AD] rounded-xl flex items-start gap-3">
          <HeartHandshake className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-[#8C6D23]">No Universal Font or Color</p>
            <p className="text-[#524B40] leading-relaxed">
              Research demonstrates that no single font or tint is best for everyone. LexiEase empowers each reader to discover and tune their own comfortable visual sweet spot.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-[#FAF3E0] border border-[#E7DFCA] rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#1E1B18]">
              <span className="w-6 h-6 rounded-lg bg-[#26231E] text-[#FEF9EB] text-xs flex items-center justify-center font-bold">1</span>
              Personal Calibration
            </div>
            <p className="text-xs text-[#524B40] leading-relaxed">
              Compare font families (Lexend, Atkinson Hyperlegible, OpenDyslexic), line spacing, and anti-glare warm hues to find what stops text jumping.
            </p>
          </div>

          <div className="p-4 bg-[#FAF3E0] border border-[#E7DFCA] rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#1E1B18]">
              <span className="w-6 h-6 rounded-lg bg-[#26231E] text-[#FEF9EB] text-xs flex items-center justify-center font-bold">2</span>
              Upload & OCR Any Document
            </div>
            <p className="text-xs text-[#524B40] leading-relaxed">
              Drag & drop textbooks, worksheets, or PDFs. Our system digitizes the text and reflows it instantly with your chosen rules.
            </p>
          </div>

          <div className="p-4 bg-[#FAF3E0] border border-[#E7DFCA] rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#1E1B18]">
              <span className="w-6 h-6 rounded-lg bg-[#26231E] text-[#FEF9EB] text-xs flex items-center justify-center font-bold">3</span>
              Synchronized Read-Along
            </div>
            <p className="text-xs text-[#524B40] leading-relaxed">
              Follow along with real-time word highlighting, variable speech speeds (0.5x to 2x), and automated smooth page scrolling.
            </p>
          </div>

          <div className="p-4 bg-[#FAF3E0] border border-[#E7DFCA] rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#1E1B18]">
              <span className="w-6 h-6 rounded-lg bg-[#26231E] text-[#FEF9EB] text-xs flex items-center justify-center font-bold">4</span>
              Multilingual & Simplification
            </div>
            <p className="text-xs text-[#524B40] leading-relaxed">
              Translate reading content across Indian and global languages without losing your personalized typography and colors.
            </p>
          </div>
        </div>

        {/* Safety & Non-medical disclaimer */}
        <div className="p-3 bg-[#EEF4F8] border border-[#CADCE6] rounded-xl text-xs text-[#1E2B37] flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#1E40AF] shrink-0 mt-0.5" />
          <p>
            <strong>Important:</strong> LexiEase is an accessible reading-support environment. It does not diagnose dyslexia or replace professional medical or educational assessments.
          </p>
        </div>

        {/* Action */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => setIsHowItWorksOpen(false)}
          >
            Close
          </Button>
          <Button
            variant="accent"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => {
              setIsHowItWorksOpen(false);
              setCurrentRoute('calibration');
            }}
          >
            Start 5-Step Calibration
          </Button>
        </div>
      </div>
    </Modal>
  );
};
