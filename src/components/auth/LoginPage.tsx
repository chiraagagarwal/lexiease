import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { User as UserType } from '../../types';
import { auth, googleProvider } from '../../lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginUser, setCurrentRoute } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleAuthSuccess = async (userResult: any, defaultName: string) => {
    const idToken = await userResult.getIdToken();
    localStorage.setItem('lexiease_auth_token', idToken);
    
    const displayName = userResult.displayName || defaultName || 'User';
    const user: UserType = {
      id: userResult.uid,
      name: displayName,
      email: userResult.email || '',
      avatar: displayName.substring(0, 2).toUpperCase(),
      role: 'student',
      createdAt: new Date().toISOString()
    };
    
    await loginUser(user);
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleAuthSuccess(result.user, 'Google User');
    } catch (err: any) {
      console.error("Google sign in failed", err);
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (isRegistering && !name) {
      setError('Name is required for registration.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      if (isRegistering) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        await handleAuthSuccess({ ...result.user, displayName: name }, name);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await handleAuthSuccess(result.user, 'User');
      }
    } catch (err: any) {
      console.error("Email auth failed", err);
      setError(err.message || (isRegistering ? 'Registration failed' : 'Sign in failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#FEF9EB] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-[#FAF3E0] border border-[#E7DFCA] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#26231E] text-[#FEF9EB] flex items-center justify-center font-bold text-xl mx-auto shadow-xs">
            L
          </div>
          <h2 className="text-2xl font-bold text-[#1E1B18]">
            {isRegistering ? 'Create an Account' : 'Welcome to LexiEase'}
          </h2>
          <p className="text-xs text-[#706655]">
            {isRegistering 
              ? 'Sign up to personalize your reading experience.' 
              : 'Sign in securely to load your personalized reading profile and settings.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isRegistering && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#26231E]" htmlFor="auth-name">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required={isRegistering}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FEF9EB] border border-[#D8CEB9] text-sm text-[#26231E] focus:outline-none focus:ring-2 focus:ring-[#D97706]/40 pl-10"
                />
                <User className="w-4 h-4 text-[#8C7A5D] absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#26231E]" htmlFor="auth-email">
              Email Address
            </label>
            <div className="relative">
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FEF9EB] border border-[#D8CEB9] text-sm text-[#26231E] focus:outline-none focus:ring-2 focus:ring-[#D97706]/40 pl-10"
              />
              <Mail className="w-4 h-4 text-[#8C7A5D] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#26231E]" htmlFor="auth-password">
              Password
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FEF9EB] border border-[#D8CEB9] text-sm text-[#26231E] focus:outline-none focus:ring-2 focus:ring-[#D97706]/40 pl-10 pr-10"
              />
              <Lock className="w-4 h-4 text-[#8C7A5D] absolute left-3 top-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-[#8C7A5D] hover:text-[#26231E]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5"
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? (isRegistering ? 'Creating account...' : 'Signing in...') 
              : (isRegistering ? 'Create Account' : 'Sign In with Email')}
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px bg-[#E7DFCA] flex-1"></div>
          <span className="text-[10px] uppercase font-bold text-[#8C7A5D] tracking-wider">or</span>
          <div className="h-px bg-[#E7DFCA] flex-1"></div>
        </div>

        <div>
          <Button
            type="button"
            variant="secondary"
            className="w-full py-2.5 text-sm flex items-center justify-center gap-2 border border-[#D8CEB9] bg-white hover:bg-[#FEF9EB]"
            disabled={isSubmitting}
            onClick={handleGoogleSignIn}
          >
            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>
        </div>

        <div className="text-center pt-4 border-t border-[#E7DFCA] flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-xs text-[#26231E] hover:underline font-medium"
          >
            {isRegistering 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Sign up"}
          </button>

          <button
            type="button"
            onClick={() => setCurrentRoute('landing')}
            className="text-xs text-[#706655] hover:text-[#26231E] underline transition-colors"
          >
            Continue as Guest without signing in
          </button>
        </div>
      </div>
    </div>
  );
};
