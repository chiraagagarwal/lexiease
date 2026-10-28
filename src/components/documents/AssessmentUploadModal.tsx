import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { UploadCloud, FileCheck, ShieldAlert, Sparkles, Check, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { aiService } from '../../services/aiService';
import { ReadingPreferences } from '../../types';

export const AssessmentUploadModal: React.FC = () => {
  const { isAssessmentModalOpen, setIsAssessmentModalOpen, updatePreferences, saveAsGlobalPreferences } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extractedNotes, setExtractedNotes] = useState<string[] | null>(null);
  const [recommendations, setRecommendations] = useState<Partial<ReadingPreferences> | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setErrorMsg(null);

      // Validate file size (max 5MB)
      if (selected.size > 5 * 1024 * 1024) {
        setErrorMsg('The assessment document exceeds the 5MB size limit. Please upload a smaller file.');
        return;
      }

      // Validate file extension
      const validExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
      const fileExt = '.' + (selected.name.split('.').pop() || '').toLowerCase();
      if (!validExts.includes(fileExt)) {
        setErrorMsg('Unsupported file type. Please upload a PDF or image file (.pdf, .png, .jpg, .jpeg, .webp).');
        return;
      }

      setFile(selected);
      setIsProcessing(true);

      try {
        const result = await aiService.analyzeAssessment(selected);
        setExtractedNotes(result.extractedNotes);
        setRecommendations(result.recommendations);
        setIsFallback(result.isFallback);
        if (result.disclaimer) {
          setDisclaimer(result.disclaimer);
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to analyze assessment document. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleApplyRecommendations = async () => {
    if (recommendations) {
      updatePreferences(recommendations);
    } else {
      updatePreferences({
        font: 'OpenDyslexic',
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
    }
    await saveAsGlobalPreferences();
    setIsConfirmed(true);
    setTimeout(() => {
      setIsConfirmed(false);
      setFile(null);
      setExtractedNotes(null);
      setRecommendations(null);
      setErrorMsg(null);
      setIsFallback(false);
      setIsAssessmentModalOpen(false);
    }, 900);
  };

  const handleClose = () => {
    setFile(null);
    setExtractedNotes(null);
    setRecommendations(null);
    setErrorMsg(null);
    setIsFallback(false);
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

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!extractedNotes ? (
          <div className="space-y-4">
            {/* Drag and drop upload box */}
            <label className="block p-8 border-2 border-dashed border-[#D8CEB9] hover:border-[#8C7A5D] rounded-2xl text-center bg-[#FAF3E0] hover:bg-[#EFE8D6] transition-colors cursor-pointer">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#FEF9EB] text-[#D97706] flex items-center justify-center border border-[#E7DFCA] shadow-2xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#1E1B18]">
                  {isProcessing ? 'Analyzing assessment document...' : 'Upload assessment PDF or Image'}
                </p>
                <p className="text-xs text-[#706655]">
                  Accepts PDF, JPG, PNG (up to 5MB) from school psychologists or reading specialists
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
              {isFallback ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#B45309]">
                    <AlertCircle className="w-4 h-4 text-[#D97706]" />
                    Standard Accommodation Presets (AI Offline)
                  </div>
                  <p className="text-[11px] text-[#78350F]">
                    Live document analysis was unavailable. We have provided standard educational accommodation presets to relieve visual crowding and glare, which you can review and adjust below.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-bold text-[#047857]">
                  <FileCheck className="w-4 h-4" />
                  Extracted Guidance from Assessment Document (AI Analyzed)
                </div>
              )}
              <ul className="space-y-2 text-xs text-[#3D372E]">
                {extractedNotes.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-1.5 shrink-0" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
              {disclaimer && (
                <p className="text-[11px] text-[#706655] pt-2 border-t border-[#E7DFCA]">
                  {disclaimer}
                </p>
              )}
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
