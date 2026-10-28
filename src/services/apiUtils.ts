/**
 * Utility to safely resolve API endpoints for both browser and Node.js test environments.
 * Prevents ERR_INVALID_URL errors in Node (undici) when relative paths like '/api/...' are passed to fetch.
 */
export const resolveApiUrl = (endpoint: string): string => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  // 1. Configured production/staging API base URL (e.g., https://api.lexiease.org)
  const envApiBase = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL;
  if (envApiBase) {
    const cleanBase = envApiBase.endsWith('/') ? envApiBase.slice(0, -1) : envApiBase;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${cleanBase}${cleanEndpoint}`;
  }

  // 2. Browser runtime: use current origin (same-origin or reverse-proxied)
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
    try {
      return new URL(endpoint, window.location.origin).toString();
    } catch {
      // Fall through to fallback
    }
  }

  // 3. Headless/Node test environment fallback
  const base = 'http://localhost:3000';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
};
