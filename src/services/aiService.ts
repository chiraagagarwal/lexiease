import { documentService } from './documentService';
import { Document, DocumentPage, ReadingPreferences } from '../types';
import { getAuthHeaders } from './auth';
import { resolveApiUrl } from './apiUtils';

const API_BASE = '/api/ai';

export interface AssessmentAnalysisResult {
  recommendations: Partial<ReadingPreferences>;
  extractedNotes: string[];
  disclaimer: string;
  isFallback: boolean;
}

class AIService {
  public async simplifyPage(docId: string, pageIndex: number): Promise<DocumentPage | null> {
    const doc = await documentService.getDocument(docId);
    if (!doc || !doc.pages[pageIndex]) return null;

    const page = doc.pages[pageIndex];
    if (page.simplificationResult) return page; // Already simplified

    try {
      console.log(`[aiService] Calling simplify endpoint for docId=${docId}, pageIndex=${pageIndex}`);
      const response = await fetch(resolveApiUrl(`${API_BASE}/simplify`), {
        method: 'POST',
        headers: {
          ...(await getAuthHeaders()),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: page.content })
      });

      if (!response.ok) {
        let errorMsg = 'Failed to simplify text';
        try {
          const errData = await response.json();
          errorMsg = errData.detail || errorMsg;
        } catch {
          // ignore parsing error
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      page.simplificationResult = {
        originalText: page.content,
        simplifiedText: data.simplified_text,
        readingGradeReduction: data.reading_grade_reduction,
        keyVocabulary: data.key_vocabulary.map((item: any) => ({
          term: item.term,
          explanation: item.explanation
        })),
        bulletSummary: data.bullet_summary
      };

      // Also maintain backward compatibility for Personalized View
      page.simplifiedContent = data.simplified_text;

      doc.pages[pageIndex] = page;
      await documentService.saveDocument(doc);
      return page;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  public async translatePage(docId: string, pageIndex: number, targetLanguage: string): Promise<DocumentPage | null> {
    const doc = await documentService.getDocument(docId);
    if (!doc || !doc.pages[pageIndex]) return null;

    const page = doc.pages[pageIndex];
    if (!page.translations) page.translations = {};
    if (page.translations[targetLanguage]) return page;

    try {
      const response = await fetch(resolveApiUrl(`${API_BASE}/translate`), {
        method: 'POST',
        headers: {
          ...(await getAuthHeaders()),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: page.content, target_language_code: targetLanguage })
      });

      if (!response.ok) throw new Error('Failed to translate text');

      const data = await response.json();

      page.translations[targetLanguage] = data.translated_text;
      doc.pages[pageIndex] = page;
      await documentService.saveDocument(doc);
      return page;
    } catch (e) {
      console.error(e);
      return page;
    }
  }

  public async generateTTS(text: string, languageCode: string): Promise<string[] | null> {
     // NOTE: Caching logic for TTS could be implemented in IndexedDB or handled locally
     try {
       const response = await fetch(resolveApiUrl(`${API_BASE}/tts`), {
         method: 'POST',
         headers: {
           ...(await getAuthHeaders()),
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({ text, target_language_code: languageCode })
       });

       if (!response.ok) throw new Error('Failed to generate TTS');

       const data = await response.json();
       const audiosBase64 = data.audios_base64 || [];
       const defaultMime = data.audio_format || 'audio/mpeg';

       const blobUrls = audiosBase64.map((audioBase64: string) => {
           const binaryString = window.atob(audioBase64);
           const len = binaryString.length;
           const bytes = new Uint8Array(len);
           for (let i = 0; i < len; i++) {
               bytes[i] = binaryString.charCodeAt(i);
           }
           let mimeType = defaultMime;
           if (bytes.length >= 3) {
               if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46) {
                   mimeType = 'audio/wav';
               } else if ((bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) || (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33)) {
                   mimeType = 'audio/mpeg';
               }
           }
           const blob = new Blob([bytes], { type: mimeType });
           return URL.createObjectURL(blob);
       });

       return blobUrls;
     } catch (e) {
       console.error(e);
       return null;
     }
  }

  public async analyzeAssessment(file: File): Promise<AssessmentAnalysisResult> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(resolveApiUrl(`${API_BASE}/analyze-assessment`), {
        method: 'POST',
        headers: {
          ...authHeaders
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMsg = 'Failed to analyze assessment document';
        try {
          const errData = await response.json();
          errorMsg = errData.detail || errorMsg;
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      return {
        recommendations: data.recommendations || {},
        extractedNotes: data.extractedNotes || [],
        disclaimer: data.disclaimer || 'Non-diagnostic guidance provided for visual reading comfort only.',
        isFallback: data.is_fallback ?? data.isFallback ?? false
      };
    } catch (e) {
      console.error('[aiService] Assessment analysis failed or offline, using safe fallback accommodations', e);
      // Safe fallback recommendations that strictly preserve educational assistance without diagnostic claims
      return {
        recommendations: {
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
        },
        extractedNotes: [
          'High letter spacing (+0.06em) recommended to reduce optical crowding.',
          'Warm yellow/cream background (#FEF9EB) applied to soften ocular glare.',
          'Synchronized single-word audio pacing recommended for phoneme-to-text binding.',
          'Subtle disambiguation enabled for mirror letters b/d and p/q.'
        ],
        disclaimer: 'LexiEase does not diagnose dyslexia or make medical evaluations. These accommodation settings are tailored solely to enhance visual reading comfort.',
        isFallback: true
      };
    }
  }
}

export const aiService = new AIService();
