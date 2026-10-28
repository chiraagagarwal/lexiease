import { aiService } from './aiService';

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  voiceName?: string;
  lang?: string;
  onWordBoundary?: (wordIndex: number, charIndex: number, word: string) => void;
  onSentenceBoundary?: (sentenceIndex: number) => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeakingInternal = false;
  private isPausedInternal = false;
  private fallbackTimer: number | null = null;
  private currentTokens: string[] = [];
  private currentTokenIndex = 0;
  private currentRate = 1.0;
  private activeAudioUrls: string[] = [];
  private currentAudioElement: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isSupported(): boolean {
    return !!this.synth;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  public setRate(rate: number) {
    this.currentRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.currentUtterance) {
      // Some browsers require restart on rate change
      this.currentUtterance.rate = this.currentRate;
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.playbackRate = this.currentRate;
    }
  }

  private revokeActiveAudioUrls(): void {
    if (this.activeAudioUrls.length > 0) {
      this.activeAudioUrls.forEach(url => {
        try {
          if (typeof window !== 'undefined' && window.URL && typeof window.URL.revokeObjectURL === 'function') {
            window.URL.revokeObjectURL(url);
          }
        } catch {
          // Ignore revocation errors
        }
      });
      this.activeAudioUrls = [];
    }
  }

  public async speak(
    text: string,
    options: TTSOptions = {}
  ): Promise<void> {
    this.stop();

    this.currentTokens = text.match(/\S+/g) || [];
    this.currentTokenIndex = 0;
    this.currentRate = options.rate || this.currentRate || 1.0;
    this.isSpeakingInternal = true;
    this.isPausedInternal = false;

    try {
        const langCode = options.lang || 'en-IN';
        const audioUrls = await aiService.generateTTS(text, langCode);

        if (!audioUrls || audioUrls.length === 0) {
           throw new Error("Failed to get audio URL");
        }

        this.activeAudioUrls = [...audioUrls];
        let currentAudioIndex = 0;

        const playNextAudio = async () => {
            if (currentAudioIndex >= audioUrls.length) {
                this.cleanup();
                options.onEnd?.();
                return;
            }

            const currentAudio = new Audio(audioUrls[currentAudioIndex]);
            currentAudio.playbackRate = this.currentRate;
            this.currentAudioElement = currentAudio;
            (this as any).audioElement = currentAudio;

            currentAudio.onplay = () => {
                const estimatedMsPerWord = (60000 / (160 * this.currentRate));
                this.startFallbackTimer(estimatedMsPerWord, options.onWordBoundary);
            };

            currentAudio.onended = () => {
                currentAudioIndex++;
                playNextAudio();
            };

            currentAudio.onerror = (e) => {
                console.warn('Audio playback error:', e);
                this.cleanup();
                options.onError?.(e);
            };

            await currentAudio.play();
        };

        await playNextAudio();

    } catch(e) {
        console.warn('TTS API error, falling back to window.speechSynthesis', e);
        this.revokeActiveAudioUrls();
        if (!this.synth) {
            options.onError?.(e);
            return;
        }

        const UtteranceConstructor = typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window
          ? window.SpeechSynthesisUtterance
          : (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);

        if (!UtteranceConstructor) {
          options.onError?.('SpeechSynthesisUtterance not supported');
          return;
        }

        // Fallback to old behavior
        const utterance = new UtteranceConstructor(text);
        this.currentUtterance = utterance;
        utterance.rate = this.currentRate;
        utterance.pitch = options.pitch || 1.0;
        utterance.lang = options.lang || 'en-IN';

        if (options.voiceName) {
          const voices = this.getVoices();
          const matched = voices.find(v => v.name === options.voiceName || v.lang.startsWith(options.lang || 'en'));
          if (matched) utterance.voice = matched;
        }

        let hasReceivedBoundary = false;

        utterance.onstart = () => {
          this.isSpeakingInternal = true;
          this.isPausedInternal = false;
          const estimatedMsPerWord = (60000 / (160 * this.currentRate));
          this.startFallbackTimer(estimatedMsPerWord, options.onWordBoundary, () => hasReceivedBoundary);
        };

        utterance.onboundary = (event: SpeechSynthesisEvent) => {
          hasReceivedBoundary = true;
          this.clearFallbackTimer();

          if (event.name === 'word') {
            const charIndex = event.charIndex;
            const textUpToChar = text.substring(0, charIndex);
            const wordIndex = (textUpToChar.match(/\S+/g) || []).length;
            const currentWord = this.currentTokens[wordIndex] || '';

            this.currentTokenIndex = wordIndex;
            options.onWordBoundary?.(wordIndex, charIndex, currentWord);
          }
        };

        utterance.onend = () => {
          this.cleanup();
          options.onEnd?.();
        };

        utterance.onerror = (e) => {
          console.warn('TTS utterance error:', e);
          this.cleanup();
          options.onError?.(e);
        };

        this.synth.speak(utterance);
    }
  }

  private startFallbackTimer(
    msPerWord: number,
    onWordBoundary?: (index: number, charIndex: number, word: string) => void,
    hasRealBoundary?: () => boolean
  ) {
    this.clearFallbackTimer();

    // Slight grace period before fallback engages
    const interval = window.setInterval(() => {
      if (hasRealBoundary && hasRealBoundary()) {
        this.clearFallbackTimer();
        return;
      }

      if (!this.isSpeakingInternal || this.isPausedInternal) return;

      if (this.currentTokenIndex < this.currentTokens.length) {
        const word = this.currentTokens[this.currentTokenIndex] || '';
        onWordBoundary?.(this.currentTokenIndex, 0, word);
        this.currentTokenIndex++;
      } else {
        this.clearFallbackTimer();
      }
    }, Math.max(120, msPerWord));

    this.fallbackTimer = interval;
  }

  private clearFallbackTimer() {
    if (this.fallbackTimer !== null) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  public pause(): void {
    if ((this as any).audioElement && this.isSpeakingInternal && !this.isPausedInternal) {
      (this as any).audioElement.pause();
      this.isPausedInternal = true;
      return;
    }
    if (this.synth && this.isSpeakingInternal && !this.isPausedInternal) {
      this.synth.pause();
      this.isPausedInternal = true;
    }
  }

  public resume(): void {
    if ((this as any).audioElement && this.isPausedInternal) {
      (this as any).audioElement.play();
      this.isPausedInternal = false;
      return;
    }
    if (this.synth && this.isPausedInternal) {
      this.synth.resume();
      this.isPausedInternal = false;
    }
  }

  public stop(): void {
    this.clearFallbackTimer();
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }
    (this as any).audioElement = null;
    if (this.synth) {
      this.synth.cancel();
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.clearFallbackTimer();
    this.revokeActiveAudioUrls();
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement = null;
    }
    (this as any).audioElement = null;
    this.isSpeakingInternal = false;
    this.isPausedInternal = false;
    this.currentUtterance = null;
    this.currentTokenIndex = 0;
  }

  public isPlaying(): boolean {
    return this.isSpeakingInternal && !this.isPausedInternal;
  }

  public isPaused(): boolean {
    return this.isPausedInternal;
  }
}

export const ttsService = new TTSService();
