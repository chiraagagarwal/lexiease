import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ttsService } from '../ttsService';
import { aiService } from '../aiService';

describe('TTSService Blob URL Lifecycle & Audio Cleanup', () => {
  let originalRevokeObjectURL: any;
  let originalCreateObjectURL: any;
  let revokedUrls: string[] = [];

  beforeEach(() => {
    revokedUrls = [];
    originalRevokeObjectURL = window.URL.revokeObjectURL;
    originalCreateObjectURL = window.URL.createObjectURL;

    window.URL.revokeObjectURL = vi.fn((url: string) => {
      revokedUrls.push(url);
    });
    window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost:3000/mock-audio-blob');
  });

  afterEach(() => {
    ttsService.stop();
    window.URL.revokeObjectURL = originalRevokeObjectURL;
    window.URL.createObjectURL = originalCreateObjectURL;
    vi.restoreAllMocks();
  });

  it('revokes generated audio blob URLs when stop() is called', async () => {
    const mockBlobUrls = [
      'blob:http://localhost:3000/chunk-1',
      'blob:http://localhost:3000/chunk-2'
    ];

    vi.spyOn(aiService, 'generateTTS').mockResolvedValue(mockBlobUrls);

    // Mock Audio constructor using an ES class
    const mockAudioInstances: any[] = [];
    const originalAudio = window.Audio;

    class MockAudio {
      src: string;
      playbackRate = 1.0;
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      currentTime = 0;
      onplay: any = null;
      onended: any = null;
      onerror: any = null;

      constructor(src: string) {
        this.src = src;
        mockAudioInstances.push(this);
      }
    }

    (window as any).Audio = MockAudio;

    try {
      await ttsService.speak('First sentence. Second sentence.');
      expect(mockAudioInstances.length).toBeGreaterThan(0);

      // Stop speech and verify all tracked Blob URLs are revoked
      ttsService.stop();

      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost:3000/chunk-1');
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost:3000/chunk-2');
      expect(revokedUrls).toEqual(expect.arrayContaining(mockBlobUrls));
      expect(ttsService.isPlaying()).toBe(false);
    } finally {
      window.Audio = originalAudio;
    }
  });

  it('falls back to window.speechSynthesis if generateTTS fails and cleans up URLs', async () => {
    vi.spyOn(aiService, 'generateTTS').mockRejectedValue(new Error('Network error'));

    class MockUtterance {
      text: string;
      rate = 1.0;
      pitch = 1.0;
      lang = 'en-IN';
      onstart: any = null;
      onboundary: any = null;
      onend: any = null;
      onerror: any = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    (window as any).SpeechSynthesisUtterance = MockUtterance;

    const mockSpeak = vi.fn();
    const mockSynth = {
      speak: mockSpeak,
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
    };

    (ttsService as any).synth = mockSynth;

    // Trigger fallback
    await ttsService.speak('Fallback test speech text.');

    expect(mockSpeak).toHaveBeenCalled();
  });

  it('revokes blob URLs and triggers onEnd when audio playback finishes normally', async () => {
    const mockBlobUrls = ['blob:http://localhost:3000/seq-1', 'blob:http://localhost:3000/seq-2'];
    vi.spyOn(aiService, 'generateTTS').mockResolvedValue(mockBlobUrls);

    const mockAudioInstances: any[] = [];
    const originalAudio = window.Audio;

    class MockAudio {
      src: string;
      playbackRate = 1.0;
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      currentTime = 0;
      onplay: any = null;
      onended: any = null;
      onerror: any = null;

      constructor(src: string) {
        this.src = src;
        mockAudioInstances.push(this);
      }
    }
    (window as any).Audio = MockAudio;

    const onEnd = vi.fn();

    try {
      await ttsService.speak('Chunk one. Chunk two.', { onEnd });
      expect(mockAudioInstances.length).toBe(1);

      // Simulate completion of first audio chunk
      if (mockAudioInstances[0].onended) {
        mockAudioInstances[0].onended();
      }

      // Second audio chunk should now be playing
      expect(mockAudioInstances.length).toBe(2);

      // Simulate completion of second audio chunk
      if (mockAudioInstances[1].onended) {
        mockAudioInstances[1].onended();
      }

      // onEnd callback should have fired and all URLs revoked
      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost:3000/seq-1');
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost:3000/seq-2');
      expect(ttsService.isPlaying()).toBe(false);
    } finally {
      window.Audio = originalAudio;
    }
  });

  it('pauses and resumes HTML Audio element correctly during playback', async () => {
    const mockBlobUrls = ['blob:http://localhost:3000/pause-test'];
    vi.spyOn(aiService, 'generateTTS').mockResolvedValue(mockBlobUrls);

    let createdAudioInstance: any = null;
    const originalAudio = window.Audio;

    class MockAudio {
      src: string;
      playbackRate = 1.0;
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      currentTime = 0;
      onplay: any = null;
      onended: any = null;
      onerror: any = null;

      constructor(src: string) {
        this.src = src;
        createdAudioInstance = this;
      }
    }
    (window as any).Audio = MockAudio;

    try {
      await ttsService.speak('Testing pause and resume functionality.');
      expect(ttsService.isPlaying()).toBe(true);
      expect(ttsService.isPaused()).toBe(false);

      ttsService.pause();
      expect(createdAudioInstance.pause).toHaveBeenCalled();
      expect(ttsService.isPaused()).toBe(true);

      ttsService.resume();
      expect(createdAudioInstance.play).toHaveBeenCalled();
      expect(ttsService.isPaused()).toBe(false);

      ttsService.stop();
      expect(createdAudioInstance.pause).toHaveBeenCalled();
      expect(ttsService.isPlaying()).toBe(false);
    } finally {
      window.Audio = originalAudio;
    }
  });

  it('handles playback error, invokes onError, and cleans up active audio URLs', async () => {
    const mockBlobUrls = ['blob:http://localhost:3000/err-chunk'];
    vi.spyOn(aiService, 'generateTTS').mockResolvedValue(mockBlobUrls);

    let createdAudioInstance: any = null;
    const originalAudio = window.Audio;

    class MockAudio {
      src: string;
      playbackRate = 1.0;
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      currentTime = 0;
      onplay: any = null;
      onended: any = null;
      onerror: any = null;

      constructor(src: string) {
        this.src = src;
        createdAudioInstance = this;
      }
    }
    (window as any).Audio = MockAudio;

    const onError = vi.fn();

    try {
      await ttsService.speak('This playback will fail.', { onError });
      expect(createdAudioInstance).toBeDefined();

      // Trigger error
      const mockErr = new Error('Audio decoding failed');
      if (createdAudioInstance.onerror) {
        createdAudioInstance.onerror(mockErr);
      }

      expect(onError).toHaveBeenCalledWith(mockErr);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost:3000/err-chunk');
      expect(ttsService.isPlaying()).toBe(false);
    } finally {
      window.Audio = originalAudio;
    }
  });
});
