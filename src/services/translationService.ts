/**
 * LEGACY / PROTOTYPE NOTICE:
 * This standalone translation service contains dictionary fallbacks and is preserved
 * for offline reference only. Active document page translation in production is handled
 * by aiService.ts (translatePage) communicating directly with the backend /api/ai/translate endpoint.
 * Do not present outputs from this service as genuine AI output.
 */

import { getAuthHeaders } from './auth';
import { resolveApiUrl } from './apiUtils';

export interface TranslationResult {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  detectedLang?: string;
  confidence: number;
}

class TranslationService {
  // Common educational translations cache / dictionary for instant realistic translation
  private vocabularyDict: Record<string, Record<string, string>> = {
    'hi-IN': {
      'Deforestation': 'वनों की कटाई',
      'Forest': 'जंगल',
      'Environment': 'पर्यावरण',
      'Nature': 'प्रकृति',
      'Animals': 'जानवर',
      'Plants': 'पौधे',
      'Conservation': 'संरक्षण',
      'Science': 'विज्ञान',
      'History': 'इतिहास',
      'Silk Road': 'रेशम मार्ग',
      'Lighthouse': 'प्रकाशस्तंभ',
      'Mathematics': 'गणित',
      'Sun': 'सूर्य',
      'Water': 'जल',
      'Earth': 'पृथ्वी'
    }
  };

  public async translate(text: string, sourceLang: string, targetLang: string): Promise<TranslationResult> {
    if (sourceLang === targetLang) {
      return {
        translatedText: text,
        sourceLang,
        targetLang,
        confidence: 1.0
      };
    }

    try {
      const response = await fetch(resolveApiUrl("/api/ai/translate"), {
        method: "POST",
        headers: {
          ...(await getAuthHeaders()),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text, target_language_code: targetLang })
      });

      if (!response.ok) {
        throw new Error("Translation failed");
      }

      const data = await response.json();
      return {
        translatedText: data.translated_text,
        sourceLang,
        targetLang,
        confidence: 1.0
      };
    } catch (error) {
      console.error("Error calling translation API:", error);
      // Fallback
      return {
        translatedText: text,
        sourceLang,
        targetLang,
        confidence: 0.0
      };
    }
  }
}

export const translationService = new TranslationService();
