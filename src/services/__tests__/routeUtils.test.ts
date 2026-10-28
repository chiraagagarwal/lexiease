import { describe, it, expect } from 'vitest';
import { parseRouteFromHash, buildRouteHash } from '../routeUtils';

describe('routeUtils', () => {
  describe('parseRouteFromHash', () => {
    it('defaults to landing for empty or root hashes', () => {
      expect(parseRouteFromHash('')).toEqual({ route: 'landing' });
      expect(parseRouteFromHash('#')).toEqual({ route: 'landing' });
      expect(parseRouteFromHash('#/')).toEqual({ route: 'landing' });
    });

    it('parses basic valid routes', () => {
      expect(parseRouteFromHash('#library')).toEqual({ route: 'library' });
      expect(parseRouteFromHash('#calibration')).toEqual({ route: 'calibration' });
      expect(parseRouteFromHash('#profile')).toEqual({ route: 'profile' });
      expect(parseRouteFromHash('#login')).toEqual({ route: 'login' });
      expect(parseRouteFromHash('#landing')).toEqual({ route: 'landing' });
    });

    it('falls back to landing on unknown routes', () => {
      expect(parseRouteFromHash('#unknown-path-123')).toEqual({ route: 'landing' });
    });

    it('parses reader route with document id and page number', () => {
      const result = parseRouteFromHash('#reader?id=doc_123&page=3');
      expect(result).toEqual({
        route: 'reader',
        docId: 'doc_123',
        pageNumber: 3
      });
    });

    it('supports docId alias parameter in reader route', () => {
      const result = parseRouteFromHash('#reader?docId=doc_456&page=2');
      expect(result).toEqual({
        route: 'reader',
        docId: 'doc_456',
        pageNumber: 2
      });
    });

    it('ignores invalid page numbers gracefully', () => {
      const result = parseRouteFromHash('#reader?id=doc_789&page=invalid');
      expect(result).toEqual({
        route: 'reader',
        docId: 'doc_789',
        pageNumber: undefined
      });
    });
  });

  describe('buildRouteHash', () => {
    it('builds standard route hashes', () => {
      expect(buildRouteHash('landing')).toBe('#landing');
      expect(buildRouteHash('library')).toBe('#library');
      expect(buildRouteHash('profile')).toBe('#profile');
      expect(buildRouteHash('calibration')).toBe('#calibration');
    });

    it('builds reader route without params when docId is omitted', () => {
      expect(buildRouteHash('reader')).toBe('#reader');
    });

    it('builds reader route with docId', () => {
      expect(buildRouteHash('reader', 'doc_123')).toBe('#reader?id=doc_123');
    });

    it('builds reader route with docId and page > 1', () => {
      expect(buildRouteHash('reader', 'doc_123', 4)).toBe('#reader?id=doc_123&page=4');
    });

    it('omits page parameter when page is 1', () => {
      expect(buildRouteHash('reader', 'doc_123', 1)).toBe('#reader?id=doc_123');
    });
  });
});
