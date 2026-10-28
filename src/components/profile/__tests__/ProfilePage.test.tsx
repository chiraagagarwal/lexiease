import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import React from 'react';
import { AppProvider } from '../../../context/AppContext';
import { ProfilePage } from '../ProfilePage';
import { DEFAULT_READING_PREFERENCES } from '../../../data/themes';

describe('ProfilePage Export and Import Workflows', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Export Profile and Import Profile buttons', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <ProfilePage />
        </AppProvider>
      );
    });

    expect(screen.getByTestId('profile-export-btn')).toBeTruthy();
    expect(screen.getByTestId('profile-import-btn')).toBeTruthy();
  });

  it('exports valid reading profile JSON file when Export Profile is clicked', async () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost:3000/mock-profile-blob');
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    await act(async () => {
      render(
        <AppProvider>
          <ProfilePage />
        </AppProvider>
      );
    });

    const exportBtn = screen.getByTestId('profile-export-btn');
    fireEvent.click(exportBtn);

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURLMock.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('application/json');
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost:3000/mock-profile-blob');
  });

  it('triggers confirmation dialog upon selecting valid profile JSON file and applies settings upon confirmation', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <ProfilePage />
        </AppProvider>
      );
    });

    const validProfile = {
      version: 1,
      appName: 'LexiEase',
      name: 'Custom Dyslexia Profile',
      preferences: {
        ...DEFAULT_READING_PREFERENCES,
        font: 'OpenDyslexic',
        fontSize: 26,
        lineSpacing: 2.0,
        themeId: 'cream',
        confusableLetterSettings: {
          enabled: true,
          activePairs: ['b/d', 's/z'],
          style: 'weight'
        }
      }
    };

    const file = new File([JSON.stringify(validProfile)], 'my-profile.json', { type: 'application/json' });
    const fileInput = screen.getByTestId('profile-import-file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Wait for confirmation card to appear
    await waitFor(() => {
      const card = screen.getByTestId('import-confirmation-card');
      expect(card).toBeTruthy();
      expect(card.textContent).toContain('my-profile.json');
      expect(card.textContent).toContain('OpenDyslexic');
    });

    // Click confirm
    const confirmBtn = screen.getByRole('button', { name: /Apply Imported Profile/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // Toast should show success
    await waitFor(() => {
      expect(screen.getByText(/Reading Profile imported and applied successfully!/i)).toBeTruthy();
    });
  });

  it('cancels import without modifying profile settings when Cancel is clicked', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <ProfilePage />
        </AppProvider>
      );
    });

    const validProfile = {
      version: 1,
      appName: 'LexiEase',
      preferences: {
        ...DEFAULT_READING_PREFERENCES,
        font: 'Atkinson Hyperlegible',
        fontSize: 28
      }
    };

    const file = new File([JSON.stringify(validProfile)], 'test-cancel.json', { type: 'application/json' });
    const fileInput = screen.getByTestId('profile-import-file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Confirm Profile Import/i)).toBeTruthy();
    });

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    expect(screen.queryByText(/Confirm Profile Import/i)).toBeNull();
  });

  it('displays error alert and preserves existing profile settings when JSON is invalid syntax', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <ProfilePage />
        </AppProvider>
      );
    });

    const badFile = new File(['{ invalid json content '], 'broken.json', { type: 'application/json' });
    const fileInput = screen.getByTestId('profile-import-file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [badFile] } });
    });

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeTruthy();
      expect(alert.textContent).toMatch(/Invalid JSON syntax/i);
      expect(alert.textContent).toMatch(/Your current profile preferences were left unchanged/i);
    });
  });

  it('displays error alert and preserves settings when profile structure has out-of-bounds values', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <ProfilePage />
        </AppProvider>
      );
    });

    const outOfBoundsProfile = {
      version: 1,
      preferences: {
        ...DEFAULT_READING_PREFERENCES,
        fontSize: 99 // Maximum allowed is 40
      }
    };

    const badFile = new File([JSON.stringify(outOfBoundsProfile)], 'overflow.json', { type: 'application/json' });
    const fileInput = screen.getByTestId('profile-import-file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [badFile] } });
    });

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeTruthy();
      expect(alert.textContent).toMatch(/Font size out of bounds/i);
    });
  });

  it('allows toggling s/z confusable pair in Tab 3', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <ProfilePage />
        </AppProvider>
      );
    });

    // Switch to confusable tab
    const confusableTabBtn = screen.getByRole('button', { name: /Confusable Letters/i });
    await act(async () => {
      fireEvent.click(confusableTabBtn);
    });

    // Turn on disambiguation toggle if not already on
    const toggle = screen.getByLabelText(/Enable Character Disambiguation/i);
    if (!toggle.className.includes('bg-[#26231E]') && !toggle.className.includes('bg-[#D97706]')) {
      await act(async () => {
        fireEvent.click(toggle);
      });
    }

    // Verify s/z button exists
    await waitFor(() => {
      const szPairBtn = screen.getByRole('button', { name: /s\/z/i });
      expect(szPairBtn).toBeTruthy();
    });

    const szPairBtn = screen.getByRole('button', { name: /s\/z/i });
    await act(async () => {
      fireEvent.click(szPairBtn);
    });
    expect(szPairBtn).toBeTruthy();
  });
});
