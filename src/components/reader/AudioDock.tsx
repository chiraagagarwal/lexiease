import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Gauge, 
  VolumeX,
  X
} from 'lucide-react';
import { Button } from '../common/Button';

export const AudioDock: React.FC = () => {
  const { 
    ttsState, 
    startTTS, 
    pauseTTS, 
    resumeTTS, 
    stopTTS, 
    setTTSSpeed,
    activeDocument,
    activePageNumber
  } = useApp();

  if (!activeDocument) return null;

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const handlePlayPause = () => {
    if (ttsState.isPlaying) {
      pauseTTS();
    } else if (ttsState.isPaused) {
      resumeTTS();
    } else {
      startTTS();
    }
  };

  const handleReplay = () => {
    stopTTS();
    setTimeout(() => startTTS(), 100);
  };

  return (
    <div 
      id="floating-audio-dock"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#FEF9EB] border-2 border-[#E7DFCA] rounded-2xl shadow-xl p-3 sm:px-5 sm:py-3.5 max-w-xl w-[94%] text-[#26231E] transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Indicator */}
        <div className="flex items-center gap-2.5 min-w-[140px]">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            ttsState.isPlaying ? 'bg-[#FAF1DA] text-[#D97706]' : 'bg-[#FAF3E0] text-[#706655]'
          }`}>
            <Volume2 className={`w-4 h-4 ${ttsState.isPlaying ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#1E1B18] line-clamp-1">
              {ttsState.isPlaying ? 'Reading Aloud' : ttsState.isPaused ? 'Paused' : 'Text-to-Speech'}
            </p>
            <p className="text-[10px] text-[#706655] font-mono">
              {ttsState.totalWords > 0 && ttsState.currentWordIndex >= 0 
                ? `Word ${ttsState.currentWordIndex + 1} of ${ttsState.totalWords}`
                : `Speed ${ttsState.playbackRate}x • Web Speech`}
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleReplay}
            aria-label="Replay from beginning"
            title="Replay from start"
            className="p-2 rounded-xl text-[#706655] hover:text-[#1E1B18] hover:bg-[#FAF3E0] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handlePlayPause}
            aria-label={ttsState.isPlaying ? "Pause audio" : "Play audio"}
            className="w-10 h-10 rounded-xl bg-[#26231E] text-[#FEF9EB] flex items-center justify-center hover:bg-[#3D372E] shadow-sm transition-transform active:scale-95"
          >
            {ttsState.isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={stopTTS}
            aria-label="Stop audio"
            title="Stop audio"
            disabled={!ttsState.isPlaying && !ttsState.isPaused}
            className="p-2 rounded-xl text-[#706655] hover:text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-30 transition-colors"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector Pills */}
        <div className="flex items-center gap-1 bg-[#FAF3E0] p-1 rounded-xl border border-[#E7DFCA]">
          <Gauge className="w-3.5 h-3.5 text-[#8C7A5D] ml-1 mr-0.5 hidden sm:inline" />
          {speeds.map(spd => (
            <button
              key={spd}
              onClick={() => setTTSSpeed(spd)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                ttsState.playbackRate === spd
                  ? 'bg-[#26231E] text-[#FEF9EB]'
                  : 'text-[#524B40] hover:text-[#1E1B18]'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
