import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { UploadCloud, FileCheck, ShieldAlert, Sparkles, ArrowRight, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AssessmentUploadModal: React.FC = () => {
  const { isAssessmentModalOpen, setIsAssessmentModalOpen, updatePreferences, saveAsGlobalPreferences } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedNotes, setExtractedNotes] = useState<string[] | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setIsProcessing(true);

      // Simulate realistic mock processing of assessment document
      setTimeout(() => {
        setIsProcessing(false);
        setExtractedNotes([
          'Reader benefits from high letter spacing (+0.06em) to relieve optical crowding.',
          'Warm yellow/cream background (#FEF9EB) advised to soften ocular glare.',
          'Synchronized single-word audio pacing recommended for phoneme-to-text binding.',
          'Subtle disambiguation enabled for mirror letters b/d and p/q.'
        ]);
      }, 1200);
    }
  };

  const handleApplyRecommendations = async () => {
    updatePreferences({
      letterSpacing: 0.06,
      lineSpacing: 2.0,
      wordSpacing: 0.14,
      themeId: 'warm-cream',
      backgroundColor: '#FEF9EB',
      highlightMode: 'word',
      confusableLetterSettings: {
        enabled: true,
        activePairs: ['b/d', 'p/q', 'm/w'],
        style: 'weight'
      }
    });
    await saveAsGlobalPreferences();
    setIsConfirmed(true);
    setTimeout(() => {
      setIsConfirmed(false);
      setFile(null);
      setExtractedNotes(null);
      setIsAssessmentModalOpen(false);
    }, 900);
  };

  const handleClose = () => {
    setFile(null);
    setExtractedNotes(null);
    setIsProcessing(false);
    setIsAssessmentModalOpen(false);
  };

  return (
    <Modal
      isOpen={isAssessmentModalOpen}
      onClose={handleClose}
      title="Optional Reading Assessment Document"
      subtitle="Upload an educational report or prescription to auto-tune initial preferences"
      maxWidth="lg"
    >
      <div className="space-y-5 text-[#26231E]">
        {/* Important Disclaimer Notice */}
        <div className="p-3.5 bg-[#FAF1DA] border border-[#E4D5AD] rounded-xl flex items-start gap-2.5 text-xs text-[#524B40]">
          <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#8C6D23]">Non-Diagnostic Notice</p>
            <p>
              LexiEase does not diagnose dyslexia or make medical claims. Uploading this document is 100% optional and only assists in configuring your initial reading theme and spacing.
            </p>
          </div>
        </div>

        {!extractedNotes ? (
          <div className="space-y-4">
            {/* Drag and drop upload box */}
            <label className="block p-8 border-2 border-dashed border-[#D8CEB9] hover:border-[#8C7A5D] rounded-2xl text-center bg-[#FAF3E0] hover:bg-[#EFE8D6] transition-colors cursor-pointer">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#FEF9EB] text-[#D97706] flex items-center justify-center border border-[#E7DFCA] shadow-2xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#1E1B18]">
                  {isProcessing ? 'Processing assessment document...' : 'Upload assessment PDF or Image'}
                </p>
                <p className="text-xs text-[#706655]">
                  Accepts PDF, JPG, PNG from school psychologists or reading specialists
                </p>
              </div>
            </label>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="ghost"
                onClick={handleClose}
              >
                Skip for now
              </Button>
              <span className="text-xs text-[#706655]">You can configure preferences manually at any time</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-[#FAF3E0] border border-[#E7DFCA] rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#047857]">
                <FileCheck className="w-4 h-4" />
                Extracted Guidance for Personalization
              </div>
              <ul className="space-y-2 text-xs text-[#3D372E]">
                {extractedNotes.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-1.5 shrink-0" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                icon={isConfirmed ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                onClick={handleApplyRecommendations}
                disabled={isConfirmed}
              >
                {isConfirmed ? 'Applied to Profile!' : 'Confirm & Apply Settings'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
