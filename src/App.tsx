import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { LandingPage } from './components/landing/LandingPage';
import { DocumentLibrary } from './components/documents/DocumentLibrary';
import { ReaderView } from './components/reader/ReaderView';
import { CalibrationView } from './components/calibration/CalibrationView';
import { ProfilePage } from './components/profile/ProfilePage';
import { LoginPage } from './components/auth/LoginPage';
import { HowItWorksModal } from './components/landing/HowItWorksModal';
import { DocumentUploaderModal } from './components/documents/DocumentUploaderModal';
import { AssessmentUploadModal } from './components/documents/AssessmentUploadModal';

const AppContent: React.FC = () => {
  const { currentRoute } = useApp();

  return (
    <div className="min-h-screen bg-[#FEF9EB] text-[#26231E] flex flex-col font-sans selection:bg-[#FDE047] selection:text-[#1E1B18]">
      {/* Persistent App Header */}
      <Header />

      {/* Main Viewport Router */}
      <main className="flex-1 flex flex-col">
        {currentRoute === 'landing' && <LandingPage />}
        {currentRoute === 'library' && <DocumentLibrary />}
        {currentRoute === 'reader' && <ReaderView />}
        {currentRoute === 'calibration' && <CalibrationView />}
        {currentRoute === 'profile' && <ProfilePage />}
        {currentRoute === 'login' && <LoginPage />}
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
