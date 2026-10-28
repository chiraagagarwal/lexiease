import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '../../App';

// Mock Firebase dependencies
vi.mock('../../lib/firebase', () => ({
  auth: {},
  googleProvider: {},
}));

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return vi.fn();
  }),
}));

describe('App Code-Splitting & Route Lazy Loading', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup();
    window.location.hash = '';
    vi.restoreAllMocks();
  });

  it('renders landing page immediately on default route', async () => {
    window.location.hash = '';
    render(<App />);

    expect(screen.getByText('LexiEase')).toBeDefined();
    expect(screen.getByText('Start Reading')).toBeDefined();
    expect(screen.getByText('Calibrate Reading (5 Steps)')).toBeDefined();
  });

  it('resolves and renders lazy-loaded calibration view when clicking Calibrate CTA', async () => {
    window.location.hash = '';
    const { container } = render(<App />);

    const calibrateBtn = container.querySelector('#landing-calibrate-btn');
    expect(calibrateBtn).not.toBeNull();
    fireEvent.click(calibrateBtn!);

    const stepBadge = await screen.findByText(/Step 1 of/i, {}, { timeout: 4000 });
    expect(stepBadge).toBeDefined();
  });

  it('resolves and renders lazy-loaded profile page when navigating to Profile', async () => {
    window.location.hash = '';
    const { container } = render(<App />);

    const profileNavBtn = container.querySelector('#nav-profile-btn');
    expect(profileNavBtn).not.toBeNull();
    fireEvent.click(profileNavBtn!);

    const exportBtn = await screen.findByTestId('profile-export-btn', {}, { timeout: 4000 });
    expect(exportBtn).toBeDefined();
  });

  it('resolves and renders lazy-loaded document library when clicking Library nav button', async () => {
    window.location.hash = '';
    const { container } = render(<App />);

    const libraryNavBtn = container.querySelector('#nav-library-btn');
    expect(libraryNavBtn).not.toBeNull();
    fireEvent.click(libraryNavBtn!);

    const libraryHeading = await screen.findByText('Document Library', {}, { timeout: 4000 });
    expect(libraryHeading).toBeDefined();
  });
});
