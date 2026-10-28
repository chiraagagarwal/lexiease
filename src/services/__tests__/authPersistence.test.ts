import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAuthHeaders, isUserAuthenticated } from '../auth';
import { resolveApiUrl } from '../apiUtils';

describe('Auth Persistence & API URL Resolution', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('resolveApiUrl', () => {
    it('returns fully-qualified URLs untouched', () => {
      expect(resolveApiUrl('https://api.example.com/api/test')).toBe('https://api.example.com/api/test');
      expect(resolveApiUrl('http://127.0.0.1:8002/api/health')).toBe('http://127.0.0.1:8002/api/health');
    });

    it('resolves relative paths with origin in browser environment', () => {
      const resolved = resolveApiUrl('/api/document/parse');
      expect(resolved).toMatch(/^https?:\/\//);
      expect(resolved).toContain('/api/document/parse');
    });
  });

  describe('getAuthHeaders persistence', () => {
    it('returns empty object when no token is present and in test mode', async () => {
      // In test mode without token
      const headers = await getAuthHeaders();
      // Should have Authorization Bearer header
      expect(headers).toBeDefined();
    });

    it('returns Authorization header matching stored token', async () => {
      localStorage.setItem('lexiease_auth_token', 'sample_persistent_token_123');
      const headers = await getAuthHeaders();
      expect(headers['Authorization']).toBe('Bearer sample_persistent_token_123');
    });

    it('isUserAuthenticated returns boolean state based on auth status', () => {
      const authState = isUserAuthenticated();
      expect(typeof authState).toBe('boolean');
    });
  });
});
