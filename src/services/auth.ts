import { auth } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';

let anonymousAuthPromise: Promise<string | null> | null = null;

export const ensureGuestToken = async (): Promise<string | null> => {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return localStorage.getItem('lexiease_auth_token') || 'mock_test_token';
  }

  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch (e) {
      console.warn("[auth] Failed to retrieve token from current user:", e);
    }
  }

  if (!anonymousAuthPromise) {
    anonymousAuthPromise = (async () => {
      try {
        const userCredential = await signInAnonymously(auth);
        const token = await userCredential.user.getIdToken();
        localStorage.setItem('lexiease_auth_token', token);
        return token;
      } catch (err: any) {
        // Log clear diagnostic if anonymous authentication is not enabled in Firebase Console
        console.warn(
          "[auth] Firebase anonymous sign-in unavailable (" +
          (err?.code || "unknown") +
          "). Guest endpoints will fall back to local offline mode or require sign-in.",
          err
        );
        return null;
      } finally {
        anonymousAuthPromise = null;
      }
    })();
  }

  return await anonymousAuthPromise;
};

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  let token = localStorage.getItem('lexiease_auth_token');

  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
      if (token) {
        localStorage.setItem('lexiease_auth_token', token);
      }
    } catch (e) {
      console.error("[auth] Failed to refresh token", e);
    }
  } else {
    // Attempt anonymous sign-in to get real signed Firebase ID token for guests
    const anonToken = await ensureGuestToken();
    if (anonToken) {
      token = anonToken;
    }
  }

  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const isUserAuthenticated = (): boolean => {
  return !!auth.currentUser && !auth.currentUser.isAnonymous;
};
