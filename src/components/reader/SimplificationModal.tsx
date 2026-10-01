import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useApp } from '../../context/AppContext';
import { simplificationService, SimplifiedResult } from '../../services/simplificationService';
import { Sparkles, ArrowRight, BookOpen, Check, ListChecks, HelpCircle } from 'lucide-react';
import { LoadingState } from '../common/LoadingState';

export const SimplificationModal: React.FC = () => {
  const { isSimplificationModalOpen, setIsSimplificationModalOpen, activeDocument, activePageNumber } = useApp();
  const [simplifiedResult, setSimplifiedResult] = useState<SimplifiedResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'comparison' | 'simplified' | 'summary'>('comparison');

  const currentPage = activeDocument?.pages.find(p => p.pageNumber === activePageNumber) || activeDocument?.pages[0];

  useEffect(() => {
    if (isSimplificationModalOpen && currentPage) {
      setIsLoading(true);
      simplificationService.simplify(currentPage.content).then(res => {
        setSimplifiedResult(res);
        setIsLoading(false);
      }).catch(err => {
        console.warn('Simplification failed:', err);
        setIsLoading(false);
      });
    }
  }, [isSimplificationModalOpen, currentPage]);

  return (
    <Modal
      isOpen={isSimplificationModalOpen}
      onClose={() => setIsSimplificationModalOpen(false)}
      title="Accessible Text Simplification"
      subtitle="Restructures dense syntax into clear, active-voice concepts with key glossaries"
      maxWidth="4xl"
    >
      <div className="space-y-5 text-[#26231E]">
        {isLoading ? (
          <LoadingState 
            message="Analyzing syntactic density..." 
            submessage="Deconstructing subordinate clauses and generating accessible reading structure" 
          />
        ) : simplifiedResult ? (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex items-center justify-between border-b border-[#E7DFCA] pb-2">
              <div className="flex items-center gap-1.5 bg-[#FAF3E0] p-1 rounded-xl border border-[#E7DFCA]">
                <button
                  onClick={() => setActiveTab('comparison')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'comparison' ? 'bg-[#26231E] text-[#FEF9EB]' : 'text-[#524B40] hover:text-[#1E1B18]'
                  }`}
                >
                  Side-by-Side Comparison
                </button>
                <button
                  onClick={() => setActiveTab('simplified')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'simplified' ? 'bg-[#26231E] text-[#FEF9EB]' : 'text-[#524B40] hover:text-[#1E1B18]'
                  }`}
                >
                  Simplified Only
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'summary' ? 'bg-[#26231E] text-[#FEF9EB]' : 'text-[#524B40] hover:text-[#1E1B18]'
                  }`}
                >
                  Key Takeaways & Glossary
                </button>
              </div>

              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EDF5EC] text-[#047857] border border-[#CBDBCB]">
                {simplifiedResult.readingGradeReduction}
              </span>
            </div>

            {/* TAB: COMPARISON */}
            {activeTab === 'comparison' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Column */}
                <div className="p-4 rounded-xl bg-[#FAF3E0] border border-[#E7DFCA] space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E7DFCA] pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#706655]">Original Complex Text</span>
                    <span className="text-[10px] text-[#706655]">Source</span>
                  </div>
                  <div className="text-xs text-[#3D372E] leading-relaxed whitespace-pre-line max-h-80 overflow-y-auto">
                    {simplifiedResult.originalText}
                  </div>
                </div>

                {/* Simplified Column */}
                <div className="p-4 rounded-xl bg-[#FEF9EB] border-2 border-[#D97706]/50 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#E7DFCA] pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#D97706] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Accessible Simplified Version
                    </span>
                    <span className="text-[10px] text-[#047857] font-semibold">Active Voice</span>
                  </div>
                  <div className="text-xs font-medium text-[#1E1B18] leading-relaxed whitespace-pre-line max-h-80 overflow-y-auto">
                    {simplifiedResult.simplifiedText}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SIMPLIFIED ONLY */}
            {activeTab === 'simplified' && (
              <div className="p-6 rounded-2xl bg-[#FEF9EB] border border-[#E7DFCA] text-sm sm:text-base leading-relaxed text-[#1E1B18] whitespace-pre-line">
                {simplifiedResult.simplifiedText}
              </div>
            )}

            {/* TAB: SUMMARY & GLOSSARY */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#FAF3E0] border border-[#E7DFCA] rounded-xl space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E1B18] flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-[#D97706]" />
                    Essential Lesson Points:
                  </h4>
                  <ul className="space-y-1.5 text-xs text-[#3D372E]">
                    {simplifiedResult.bulletSummary.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-1.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#706655]">
                    Key Vocabulary:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {simplifiedResult.keyVocabulary.map((v, i) => (
                      <div key={i} className="p-3 bg-[#FEF9EB] border border-[#E7DFCA] rounded-xl">
                        <p className="text-xs font-bold text-[#1E1B18]">{v.term}</p>
                        <p className="text-[11px] text-[#524B40] mt-0.5">{v.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsSimplificationModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
