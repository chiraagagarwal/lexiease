import { ReadingPreferences, ReadingProfile } from '../types';
import { DEFAULT_READING_PREFERENCES } from '../data/themes';

const PROFILE_STORAGE_KEY = 'lexiease_user_profile_v1';
const CALIBRATED_STORAGE_KEY = 'lexiease_calibrated_profile_v1';

class ProfileService {
  private currentProfile: ReadingProfile | null = null;

  private getAuthHeaders() {
    const token = localStorage.getItem('lexiease_auth_token') || 'mock_token_user_alex';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  public async getProfile(): Promise<ReadingProfile> {
    try {
      const res = await fetch('/api/profile/', { headers: this.getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      
      this.currentProfile = {
        id: data.id ? `profile_${data.id}` : 'profile_default',
        userId: data.user_id,
        name: 'Alex Rivera',
        preferences: { ...DEFAULT_READING_PREFERENCES, ...(data.preferences || {}) },
        calibrationAnswers: data.calibrationAnswers,
        calibratedAt: data.calibratedAt,
        updatedAt: data.updatedAt
      };
      
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.currentProfile));
      } catch (e) {}
      
      return this.currentProfile;
    } catch (e) {
      console.warn('Backend fetch failed, falling back to local storage:', e);
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        this.currentProfile = JSON.parse(stored);
        return this.currentProfile!;
      }
      
      this.currentProfile = {
        id: 'profile_default',
        userId: 'user_alex',
        name: 'Alex (Personal Profile)',
        preferences: { ...DEFAULT_READING_PREFERENCES },
        updatedAt: new Date().toISOString()
      };
      return this.currentProfile;
    }
  }

  public async saveProfile(profile: ReadingProfile): Promise<ReadingProfile> {
    this.currentProfile = {
      ...profile,
      updatedAt: new Date().toISOString()
    };
    
    try {
      const res = await fetch('/api/profile/', {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          preferences: this.currentProfile.preferences,
          calibration_answers: this.currentProfile.calibrationAnswers
        })
      });
      if (res.ok) {
        const data = await res.json();
        this.currentProfile.updatedAt = data.updatedAt;
      }
    } catch (e) {
      console.warn('Failed to sync profile to backend:', e);
    }
    
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.currentProfile));
    } catch (e) {
      console.warn('Failed to persist profile:', e);
    }
    return this.currentProfile;
  }

  public async updatePreferences(preferences: Partial<ReadingPreferences>): Promise<ReadingProfile> {
    if (!this.currentProfile) await this.getProfile();
    this.currentProfile!.preferences = {
      ...this.currentProfile!.preferences,
      ...preferences
    };
    return this.saveProfile(this.currentProfile!);
  }

  public async saveCalibratedProfile(preferences: ReadingPreferences, answers: Record<string, string>): Promise<ReadingProfile> {
    if (!this.currentProfile) await this.getProfile();
    
    this.currentProfile = {
      ...this.currentProfile!,
      preferences: { ...preferences },
      calibrationAnswers: answers,
    };
    
    try {
      localStorage.setItem(CALIBRATED_STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.warn('Failed to save calibrated settings:', e);
    }
    
    return this.saveProfile(this.currentProfile);
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
