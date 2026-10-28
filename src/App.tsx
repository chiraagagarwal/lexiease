import React, { Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { LandingPage } from './components/landing/LandingPage';
import { HowItWorksModal } from './components/landing/HowItWorksModal';
import { DocumentUploaderModal } from './components/documents/DocumentUploaderModal';
import { AssessmentUploadModal } from './components/documents/AssessmentUploadModal';

// Route-level code-splitting: Lazy load secondary route views so initial load is minimal
const DocumentLibrary = React.lazy(() =>
  import('./components/documents/DocumentLibrary').then(m => ({ default: m.DocumentLibrary }))
);
const ReaderView = React.lazy(() =>
  import('./components/reader/ReaderView').then(m => ({ default: m.ReaderView }))
);
const CalibrationView = React.lazy(() =>
  import('./components/calibration/CalibrationView').then(m => ({ default: m.CalibrationView }))
);
const ProfilePage = React.lazy(() =>
  import('./components/profile/ProfilePage').then(m => ({ default: m.ProfilePage }))
);
const LoginPage = React.lazy(() =>
  import('./components/auth/LoginPage').then(m => ({ default: m.LoginPage }))
);

const ViewLoadingFallback: React.FC = () => (
  <div className="flex-1 flex items-center justify-center p-12" role="status" aria-label="Loading view">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium text-stone-600">Loading view...</span>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { currentRoute } = useApp();

  return (
    <div className="min-h-screen bg-[#FEF9EB] text-[#26231E] flex flex-col font-sans selection:bg-[#FDE047] selection:text-[#1E1B18]">
      {/* Persistent App Header */}
      <Header />

      {/* Main Viewport Router */}
      <main className="flex-1 flex flex-col">
        <Suspense fallback={<ViewLoadingFallback />}>
          {currentRoute === 'landing' && <LandingPage />}
          {currentRoute === 'library' && <DocumentLibrary />}
          {currentRoute === 'reader' && <ReaderView />}
          {currentRoute === 'calibration' && <CalibrationView />}
          {currentRoute === 'profile' && <ProfilePage />}
          {currentRoute === 'login' && <LoginPage />}
        </Suspense>
      </main>

      {/* Global Modals */}
      <HowItWorksModal />
      <DocumentUploaderModal />
      <AssessmentUploadModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
