import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { AppProvider, useApp } from '../../context/AppContext';

// Lightweight test component to inspect and trigger router actions
const RouterTestHarness: React.FC = () => {
  const { currentRoute, setCurrentRoute, activeDocument, activePageNumber, navigateToReader } = useApp();

  return (
    <div>
      <span data-testid="current-route">{currentRoute}</span>
      <span data-testid="active-doc-id">{activeDocument?.id || 'none'}</span>
      <span data-testid="active-page">{activePageNumber}</span>

      <button data-testid="nav-library-btn" onClick={() => setCurrentRoute('library')}>
        Go to Library
      </button>
      <button data-testid="nav-profile-btn" onClick={() => setCurrentRoute('profile')}>
        Go to Profile
      </button>
      <button
        data-testid="nav-reader-btn"
        onClick={() => navigateToReader('doc_science_01', 2)}
      >
        Go to Reader Page 2
      </button>
    </div>
  );
};

describe('URL Hash Routing & Deep Linking', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup();
    window.location.hash = '';
    vi.restoreAllMocks();
  });

  it('initializes to landing when no hash is present', async () => {
    window.location.hash = '';
    render(
      <AppProvider>
        <RouterTestHarness />
      </AppProvider>
    );

    const routeSpan = await screen.findByTestId('current-route');
    expect(routeSpan.textContent).toBe('landing');
  });

  it('deep-links directly to #library on initial load', async () => {
    window.location.hash = '#library';
    render(
      <AppProvider>
        <RouterTestHarness />
      </AppProvider>
    );

    const routeSpan = await screen.findByTestId('current-route');
    expect(routeSpan.textContent).toBe('library');
  });

  it('deep-links directly to #reader with specific docId and page', async () => {
    window.location.hash = '#reader?id=doc_science_01&page=1';
    render(
      <AppProvider>
        <RouterTestHarness />
      </AppProvider>
    );

    const routeSpan = await screen.findByTestId('current-route');
    expect(routeSpan.textContent).toBe('reader');

    const docSpan = await screen.findByTestId('active-doc-id');
    expect(docSpan.textContent).toBe('doc_science_01');

    const pageSpan = await screen.findByTestId('active-page');
    expect(pageSpan.textContent).toBe('1');
  });

  it('updates the URL hash when navigating within the app', async () => {
    render(
      <AppProvider>
        <RouterTestHarness />
      </AppProvider>
    );

    const libBtn = await screen.findByTestId('nav-library-btn');
    act(() => {
      libBtn.click();
    });

    const routeSpan = await screen.findByTestId('current-route');
    expect(routeSpan.textContent).toBe('library');
    expect(window.location.hash).toBe('#library');
  });

  it('updates route when window hash changes externally (e.g. browser back button)', async () => {
    render(
      <AppProvider>
        <RouterTestHarness />
      </AppProvider>
    );

    await screen.findByTestId('current-route');

    act(() => {
      window.location.hash = '#profile';
      window.dispatchEvent(new Event('hashchange'));
    });

    const routeSpan = await screen.findByTestId('current-route');
    expect(routeSpan.textContent).toBe('profile');
  });
});
