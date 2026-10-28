import { ReadingPreferences, ReadingProfile } from '../types';
import { DEFAULT_READING_PREFERENCES } from '../data/themes';
import { getAuthHeaders, isUserAuthenticated } from './auth';
import { resolveApiUrl } from './apiUtils';
import { validateProfileJSON } from './profileValidation';
import { auth } from '../lib/firebase';

const PROFILE_STORAGE_KEY = 'lexiease_user_profile_v1';
const CALIBRATED_STORAGE_KEY = 'lexiease_calibrated_profile_v1';

class ProfileService {
  private currentProfile: ReadingProfile | null = null;

  public async getProfile(): Promise<ReadingProfile> {
    // If user is guest/unauthenticated, read directly from local storage
    if (!isUserAuthenticated()) {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        try {
          this.currentProfile = JSON.parse(stored);
          return this.currentProfile!;
        } catch {}
      }

      this.currentProfile = {
        id: 'profile_default',
        userId: 'user_guest',
        name: 'Guest Reader',
        preferences: { ...DEFAULT_READING_PREFERENCES },
        updatedAt: new Date().toISOString()
      };
      return this.currentProfile;
    }

    try {
      const res = await fetch(resolveApiUrl('/api/profile/'), {
        headers: {
          ...(await getAuthHeaders()),
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error(`Failed to fetch profile: ${res.status}`);
      const data = await res.json();

      this.currentProfile = {
        id: data.id ? `profile_${data.id}` : 'profile_default',
        userId: data.user_id,
        name: auth.currentUser?.displayName || (auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'Reader'),
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

      const fallbackName = auth.currentUser
        ? (auth.currentUser.displayName || (auth.currentUser.email ? auth.currentUser.email.split('@')[0] : 'Reader'))
        : 'Guest Reader';
      const fallbackUserId = auth.currentUser ? auth.currentUser.uid : 'user_guest';

      this.currentProfile = {
        id: 'profile_default',
        userId: fallbackUserId,
        name: fallbackName,
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

    // Always persist to local storage first
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.currentProfile));
    } catch (e) {
      console.warn('Failed to persist profile to local storage:', e);
    }

    // Only attempt backend sync if user is authenticated
    if (isUserAuthenticated()) {
      try {
        const res = await fetch(resolveApiUrl('/api/profile/'), {
          method: 'PUT',
          headers: {
            ...(await getAuthHeaders()),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            preferences: this.currentProfile.preferences,
            calibration_answers: this.currentProfile.calibrationAnswers
          })
        });
        if (res.ok) {
          const data = await res.json();
          this.currentProfile.updatedAt = data.updatedAt;
          try {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.currentProfile));
          } catch {}
        }
      } catch (e) {
        console.warn('Failed to sync profile to backend:', e);
      }
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

  public exportProfileJSON(profileOverride?: ReadingProfile | null, preferencesOverride?: ReadingPreferences | null): string {
    const baseProfile = profileOverride || this.currentProfile;
    const basePreferences = preferencesOverride || baseProfile?.preferences || DEFAULT_READING_PREFERENCES;

    const exportData = {
      version: 1,
      appName: 'LexiEase',
      exportedAt: new Date().toISOString(),
      name: baseProfile?.name || 'Reading Profile',
      calibratedAt: baseProfile?.calibratedAt,
      calibrationAnswers: baseProfile?.calibrationAnswers,
      preferences: basePreferences
    };

    return JSON.stringify(exportData, null, 2);
  }

  public async importProfileJSON(jsonStr: string): Promise<ReadingProfile> {
    const validation = validateProfileJSON(jsonStr);
    if (!validation.success) {
      throw new Error(validation.error);
    }

    const current = this.currentProfile || await this.getProfile();
    const updated: ReadingProfile = {
      ...current,
      ...validation.profile,
      preferences: validation.preferences,
      updatedAt: new Date().toISOString()
    };

    return this.saveProfile(updated);
  }
}

export const profileService = new ProfileService();
