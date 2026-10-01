import { ReadingPreferences, ReadingProfile } from '../types';
import { DEFAULT_READING_PREFERENCES } from '../data/themes';

const PROFILE_STORAGE_KEY = 'lexiease_user_profile_v1';
const CALIBRATED_STORAGE_KEY = 'lexiease_calibrated_profile_v1';

class ProfileService {
  private currentProfile: ReadingProfile;

  constructor() {
    this.currentProfile = this.loadProfile();
  }

  private loadProfile(): ReadingProfile {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load profile from storage:', e);
    }

    const defaultProfile: ReadingProfile = {
      id: 'profile_default',
      userId: 'user_alex',
      name: 'Alex (Personal Profile)',
      preferences: { ...DEFAULT_READING_PREFERENCES },
      updatedAt: new Date().toISOString()
    };

    return defaultProfile;
  }

  public async getProfile(): Promise<ReadingProfile> {
    await new Promise(r => setTimeout(r, 40));
    return JSON.parse(JSON.stringify(this.currentProfile));
  }

  public async saveProfile(profile: ReadingProfile): Promise<ReadingProfile> {
    this.currentProfile = {
      ...profile,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.currentProfile));
    } catch (e) {
      console.warn('Failed to persist profile:', e);
    }
    return this.currentProfile;
  }

  public async updatePreferences(preferences: Partial<ReadingPreferences>): Promise<ReadingProfile> {
    this.currentProfile.preferences = {
      ...this.currentProfile.preferences,
      ...preferences
    };
    this.currentProfile.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.currentProfile));
    } catch (e) {
      console.warn('Failed to persist profile preferences:', e);
    }
    return this.currentProfile;
  }

  public async saveCalibratedProfile(preferences: ReadingPreferences, answers: Record<string, string>): Promise<ReadingProfile> {
    this.currentProfile = {
      ...this.currentProfile,
      preferences: { ...preferences },
      calibratedAt: new Date().toISOString(),
      calibrationAnswers: answers,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.currentProfile));
      localStorage.setItem(CALIBRATED_STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.warn('Failed to save calibrated settings:', e);
    }
    return this.currentProfile;
  }

  public async resetToCalibrated(): Promise<ReadingPreferences> {
    try {
      const stored = localStorage.getItem(CALIBRATED_STORAGE_KEY);
      if (stored) {
        const cal = JSON.parse(stored);
        await this.updatePreferences(cal);
        return cal;
      }
    } catch (e) {
      console.warn('No calibrated settings found, falling back to defaults:', e);
    }
    await this.updatePreferences(DEFAULT_READING_PREFERENCES);
    return { ...DEFAULT_READING_PREFERENCES };
  }

  public async resetToDefaults(): Promise<ReadingPreferences> {
    await this.updatePreferences(DEFAULT_READING_PREFERENCES);
    return { ...DEFAULT_READING_PREFERENCES };
  }

  public exportProfileJSON(): string {
    return JSON.stringify(this.currentProfile, null, 2);
  }

  public async importProfileJSON(jsonStr: string): Promise<ReadingProfile> {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.preferences) throw new Error('Invalid profile schema');
    return this.saveProfile(parsed);
  }
}

export const profileService = new ProfileService();
