import { AppRoute } from '../types';

export interface ParsedRoute {
  route: AppRoute;
  docId?: string;
  pageNumber?: number;
}

export const VALID_ROUTES: AppRoute[] = [
  'landing',
  'library',
  'reader',
  'calibration',
  'profile',
  'login',
  'assessment'
];

/**
 * Parses current route, document ID, and page number from a URL hash string.
 * Example inputs: "#reader?id=doc_1&page=2", "#library", "#profile"
 */
export function parseRouteFromHash(hashString?: string): ParsedRoute {
  const hash = typeof window !== 'undefined'
    ? (hashString !== undefined ? hashString : window.location.hash)
    : (hashString || '');

  const cleaned = hash.replace(/^#\/?/, '').trim();
  if (!cleaned) {
    return { route: 'landing' };
  }

  const [pathPart, queryPart] = cleaned.split('?');
  const route = VALID_ROUTES.includes(pathPart as AppRoute)
    ? (pathPart as AppRoute)
    : 'landing';

  let docId: string | undefined;
  let pageNumber: number | undefined;

  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    const id = params.get('id') || params.get('docId');
    if (id) docId = id;
    const page = params.get('page');
    if (page) {
      const parsed = parseInt(page, 10);
      if (!isNaN(parsed) && parsed > 0) {
        pageNumber = parsed;
      }
    }
  }

  return { route, docId, pageNumber };
}

/**
 * Generates the canonical hash string for a given route and optional document / page.
 */
export function buildRouteHash(route: AppRoute, docId?: string, pageNumber?: number): string {
  if (route === 'reader') {
    const params = new URLSearchParams();
    if (docId) params.set('id', docId);
    if (pageNumber && pageNumber > 1) params.set('page', pageNumber.toString());
    const q = params.toString();
    return `#reader${q ? `?${q}` : ''}`;
  }
  if (route === 'landing') {
    return '#landing';
  }
  return `#${route}`;
}
