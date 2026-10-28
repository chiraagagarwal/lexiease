import { describe, it, expect, beforeEach, vi } from 'vitest';
import { profileService } from '../profileService';
import { resolveApiUrl } from '../apiUtils';
import * as authModule from '../auth';

describe('profileService & apiUtils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('resolveApiUrl', () => {
    it('preserves absolute URLs', () => {
      expect(resolveApiUrl('https://example.com/api/test')).toBe('https://example.com/api/test');
      expect(resolveApiUrl('http://localhost:8002/api/doc')).toBe('http://localhost:8002/api/doc');
    });

    it('resolves relative URLs to valid absolute URLs', () => {
      const resolved = resolveApiUrl('/api/profile/');
      expect(resolved).toMatch(/^https?:\/\//);
      expect(resolved).toContain('/api/profile/');
    });
  });

  describe('ProfileService', () => {
    it('returns local guest profile when unauthenticated without throwing network error', async () => {
      vi.spyOn(authModule, 'isUserAuthenticated').mockReturnValue(false);
      const profile = await profileService.getProfile();
      expect(profile).toBeDefined();
      expect(profile.preferences).toBeDefined();
      expect(profile.userId).toBe('user_guest');
    });

    it('persists and restores profile from local storage for guests', async () => {
      vi.spyOn(authModule, 'isUserAuthenticated').mockReturnValue(false);
      const initial = await profileService.getProfile();
      await profileService.updatePreferences({ fontSize: 24, font: 'OpenDyslexic' });

      const updated = await profileService.getProfile();
      expect(updated.preferences.fontSize).toBe(24);
      expect(updated.preferences.font).toBe('OpenDyslexic');
    });

    it('exports and imports profile JSON correctly', async () => {
      vi.spyOn(authModule, 'isUserAuthenticated').mockReturnValue(false);
      await profileService.updatePreferences({ fontSize: 28, textWidth: 60 });
      const jsonStr = profileService.exportProfileJSON();
      expect(typeof jsonStr).toBe('string');

      const parsed = JSON.parse(jsonStr);
      expect(parsed.preferences.fontSize).toBe(28);

      parsed.preferences.fontSize = 32;
      const imported = await profileService.importProfileJSON(JSON.stringify(parsed));
      expect(imported.preferences.fontSize).toBe(32);
    });

    it('rejects invalid JSON schema on import', async () => {
      await expect(profileService.importProfileJSON(JSON.stringify({ notAPreference: true })))
        .rejects.toThrow('Invalid profile schema');
    });

    it('falls back cleanly to local storage if authenticated backend call fails', async () => {
      vi.spyOn(authModule, 'isUserAuthenticated').mockReturnValue(true);
      vi.spyOn(authModule, 'getAuthHeaders').mockResolvedValue({ 'Authorization': 'Bearer test_token' });
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const profile = await profileService.getProfile();
      expect(profile).toBeDefined();
      expect(profile.preferences).toBeDefined();
    });
  });
});
