import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LoginPage } from '../LoginPage';
import { AppProvider } from '../../../context/AppContext';
import React from 'react';

// Mock Firebase
vi.mock('../../../lib/firebase', () => ({
  auth: {},
  googleProvider: {},
}));

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
}));

describe('LoginPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders Google and Email options', () => {
    render(
      <AppProvider>
        <LoginPage />
      </AppProvider>
    );
    
    expect(screen.getByText('Sign In with Email')).toBeDefined();
    expect(screen.getByText('Continue with Google')).toBeDefined();
  });

  it('switches to registration mode', () => {
    render(
      <AppProvider>
        <LoginPage />
      </AppProvider>
    );
    
    const signUpButtons = screen.getAllByText("Don't have an account? Sign up");
    fireEvent.click(signUpButtons[0]);
    
    expect(screen.getAllByText('Create Account')[0]).toBeDefined();
    expect(screen.getAllByPlaceholderText('Enter your name')[0]).toBeDefined();
  });
});
