import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ReadingPreferences, ReadingProfile, FontOption, ConfusablePair } from '../../types';
import { READING_THEMES, SUPPORTED_LANGUAGES } from '../../data/themes';
import { Slider } from '../common/Slider';
import { ToggleSwitch } from '../common/ToggleSwitch';
import { Button } from '../common/Button';
import {
  User,
  Sparkles,
  Type,
  Palette,
  Volume2,
  Languages,
  RotateCcw,
  Save,
  Download,
  Upload,
  CheckCircle2,
  Glasses,
  LogOut,
  ShieldCheck,
  AlertCircle,
  Check
} from 'lucide-react';
import { profileService } from '../../services/profileService';
import { validateProfileJSON } from '../../services/profileValidation';

export const ProfilePage: React.FC = () => {
  const {
    currentUser,
    logoutUser,
    preferences,
    updatePreferences,
    saveAsGlobalPreferences,
    saveProfileChanges,
    resetToCalibratedSettings,
    resetToDefaultSettings,
    profile,
    setCurrentRoute
  } = useApp();

  const [activeTab, setActiveTab] = useState<'typography' | 'colors' | 'confusable' | 'audio' | 'calibration'>('typography');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    filename: string;
    preferences: ReadingPreferences;
    profile: Partial<ReadingProfile>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fonts: Array<{ name: FontOption; label: string }> = [
    { name: 'Lexend', label: 'Lexend' },
    { name: 'Atkinson Hyperlegible', label: 'Atkinson Hyperlegible' },
    { name: 'OpenDyslexic', label: 'OpenDyslexic' },
    { name: 'Comic Neue', label: 'Comic Neue' },
    { name: 'Arial', label: 'Arial' },
    { name: 'Verdana', label: 'Verdana' }
  ];

  const confusablePairs: ConfusablePair[] = ['b/d', 'p/q', 'm/w', 'n/u', 's/z'];

  const handleSave = async () => {
    await saveAsGlobalPreferences();
    setSaveToast('Reading Profile saved successfully!');
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleExport = () => {
    const jsonStr = profileService.exportProfileJSON(profile, preferences);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lexiease-reading-profile.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const validation = validateProfileJSON(text);
        if (!validation.success) {
          setImportError(validation.error);
          setPendingImport(null);
          return;
        }

        setImportError(null);
        setPendingImport({
          filename: file.name,
          preferences: validation.preferences,
          profile: validation.profile
        });
      } catch (err: any) {
        setImportError(`Failed to parse file: ${err?.message || 'Invalid format'}`);
        setPendingImport(null);
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read the selected file from disk.');
      setPendingImport(null);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;

    try {
      const baseProfile = profile || {
        id: 'profile_default',
        userId: currentUser?.id || 'user_guest',
        name: currentUser?.name || 'Guest Reader',
        preferences: preferences,
        updatedAt: new Date().toISOString()
      };

      const fullProfile: ReadingProfile = {
        ...baseProfile,
        ...pendingImport.profile,
        preferences: pendingImport.preferences,
        updatedAt: new Date().toISOString()
      };

      await saveProfileChanges(fullProfile);
      setPendingImport(null);
      setSaveToast('Reading Profile imported and applied successfully!');
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err: any) {
      setImportError(`Failed to apply imported profile: ${err?.message || 'Unknown error'}`);
      setPendingImport(null);
    }
  };

  const handleCancelImport = () => {
    setPendingImport(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#26231E]">
      {/* Hidden Profile Import File Picker */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        onChange={handleFileSelect}
        className="hidden"
        id="profile-import-file-input"
        data-testid="profile-import-file-input"
      />

      {/* Profile Header Card */}
      <div className="bg-[#FAF3E0] border border-[#E7DFCA] rounded-2xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#26231E] text-[#FEF9EB] text-2xl font-bold flex items-center justify-center shadow-sm">
            {currentUser?.avatar || (currentUser ? 'U' : 'GR')}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#1E1B18] tracking-tight">
              {currentUser?.name || (profile?.name && profile.name !== 'Alex Rivera' ? profile.name : 'Guest Reader')}
            </h1>
            <p className="text-xs text-[#706655]">
              {currentUser ? (
                <>
                  {currentUser.email || 'authenticated'} • Role: <span className="capitalize font-semibold text-[#1E1B18]">{currentUser.role || 'student'}</span>
                </>
              ) : (
                <>
                  Guest Mode • Local Preferences (Saved on this device)
                </>
              )}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF1DA] text-[#8C6D23] border border-[#E4D5AD]">
                Ivory Clarity Design Profile
              </span>
              {profile?.calibratedAt && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF5EC] text-[#047857] border border-[#CBDBCB] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Calibrated
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            id="profile-export-btn"
            data-testid="profile-export-btn"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExport}
          >
            Export Profile
          </Button>

          <Button
            variant="outline"
            size="sm"
            id="profile-import-btn"
            data-testid="profile-import-btn"
            icon={<Upload className="w-4 h-4" />}
            onClick={handleImportClick}
          >
            Import Profile
          </Button>

          {currentUser ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<LogOut className="w-4 h-4 text-[#DC2626]" />}
              onClick={logoutUser}
            >
              Sign Out
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={<ShieldCheck className="w-4 h-4" />}
              onClick={() => setCurrentRoute('login')}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Main Settings Navigation & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Settings Tabs */}
        <div className="bg-[#FAF3E0] border border-[#E7DFCA] rounded-2xl p-2 sm:p-3 space-y-1 h-fit">
          <button
            onClick={() => setActiveTab('typography')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'typography'
                ? 'bg-[#26231E] text-[#FEF9EB] shadow-xs'
                : 'text-[#524B40] hover:bg-[#EFE8D6]'
            }`}
          >
            <Type className="w-4 h-4" />
            Reading Typography
          </button>

          <button
            onClick={() => setActiveTab('colors')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'colors'
                ? 'bg-[#26231E] text-[#FEF9EB] shadow-xs'
                : 'text-[#524B40] hover:bg-[#EFE8D6]'
            }`}
          >
            <Palette className="w-4 h-4" />
            Anti-Glare Themes
          </button>

          <button
            onClick={() => setActiveTab('confusable')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'confusable'
                ? 'bg-[#26231E] text-[#FEF9EB] shadow-xs'
                : 'text-[#524B40] hover:bg-[#EFE8D6]'
            }`}
          >
            <Glasses className="w-4 h-4" />
            Confusable Letters (b/d)
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'audio'
                ? 'bg-[#26231E] text-[#FEF9EB] shadow-xs'
                : 'text-[#524B40] hover:bg-[#EFE8D6]'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            Speech & Audio
          </button>

          <button
            onClick={() => setActiveTab('calibration')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'calibration'
                ? 'bg-[#26231E] text-[#FEF9EB] shadow-xs'
                : 'text-[#524B40] hover:bg-[#EFE8D6]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#D97706]" />
            Calibration History
          </button>
        </div>

        {/* Right Settings Panel */}
        <div className="lg:col-span-3 bg-[#FAF3E0] border border-[#E7DFCA] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          {saveToast && (
            <div className="p-3 rounded-xl bg-[#EDF5EC] border border-[#CBDBCB] text-xs text-[#047857] text-center font-bold animate-in fade-in">
              {saveToast}
            </div>
          )}

          {/* Pending Import Confirmation Banner */}
          {pendingImport && (
            <div
              id="import-confirmation-card"
              data-testid="import-confirmation-card"
              role="region"
              aria-label="Confirm Profile Import"
              className="p-5 rounded-2xl bg-[#FEF9EB] border-2 border-[#D97706] shadow-md space-y-4 animate-in fade-in"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#1E1B18] flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#D97706]" />
                    Confirm Profile Import
                  </h4>
                  <p className="text-xs text-[#524B40]">
                    Are you sure you want to replace your current reading preferences with settings from <strong className="text-[#1E1B18]">{pendingImport.filename}</strong>?
                  </p>
                </div>
              </div>

              {/* Preview Settings */}
              <div className="p-3 bg-[#FAF3E0] rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#706655] block">Font</span>
                  <span className="font-bold text-[#1E1B18]">{pendingImport.preferences.font}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#706655] block">Size & Line</span>
                  <span className="font-bold text-[#1E1B18]">{pendingImport.preferences.fontSize}px / {pendingImport.preferences.lineSpacing}x</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#706655] block">Theme</span>
                  <span className="font-bold text-[#1E1B18]">{pendingImport.preferences.themeId}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#706655] block">Confusables</span>
                  <span className="font-bold text-[#1E1B18]">
                    {pendingImport.preferences.confusableLetterSettings.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button
                  id="confirm-import-btn"
                  variant="primary"
                  size="sm"
                  icon={<Check className="w-4 h-4" />}
                  onClick={handleConfirmImport}
                >
                  Apply Imported Profile
                </Button>
                <Button
                  id="cancel-import-btn"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelImport}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {importError && (
            <div
              id="profile-error-alert"
              role="alert"
              className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#DC2626] flex items-start justify-between gap-3 font-semibold animate-in fade-in"
            >
              <div className="space-y-0.5">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                  Profile Import Error
                </p>
                <p className="font-normal text-[#991B1B]">{importError}</p>
                <p className="text-[11px] text-[#706655] font-normal pt-1">Your current profile preferences were left unchanged.</p>
              </div>
              <button
                onClick={() => setImportError(null)}
                className="text-[#DC2626] hover:text-[#7F1D1D] font-bold text-xs px-2 py-1 rounded hover:bg-[#FEE2E2]"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* TAB 1: TYPOGRAPHY */}
          {activeTab === 'typography' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#1E1B18]">Reading Typography Settings</h3>
                <p className="text-xs text-[#706655]">
                  Configure your baseline font family, sizing, tracking, and line spacing.
                </p>
              </div>

              {/* Font Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider">
                  Font Family
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {fonts.map(f => (
                    <button
                      key={f.name}
                      onClick={() => updatePreferences({ font: f.name })}
                      className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                        preferences.font === f.name
                          ? 'bg-[#26231E] text-[#FEF9EB] shadow-xs'
                          : 'bg-[#FEF9EB] border-[#E7DFCA] text-[#26231E] hover:bg-[#EFE8D6]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <Slider
                  label="Font Size"
                  value={preferences.fontSize}
                  min={14}
                  max={34}
                  step={1}
                  unit="px"
                  onChange={(val) => updatePreferences({ fontSize: val })}
                />

                <Slider
                  label="Line Height"
                  value={preferences.lineSpacing}
                  min={1.4}
                  max={2.6}
                  step={0.1}
                  unit="x"
                  onChange={(val) => updatePreferences({ lineSpacing: val })}
                />

                <Slider
                  label="Letter Spacing"
                  value={preferences.letterSpacing}
                  min={0}
                  max={0.2}
                  step={0.01}
                  unit="em"
                  onChange={(val) => updatePreferences({ letterSpacing: val })}
                />

                <Slider
                  label="Word Spacing"
                  value={preferences.wordSpacing}
                  min={0}
                  max={0.4}
                  step={0.02}
                  unit="em"
                  onChange={(val) => updatePreferences({ wordSpacing: val })}
                />

                <Slider
                  label="Paragraph Gap"
                  value={preferences.paragraphSpacing}
                  min={0.8}
                  max={3.0}
                  step={0.1}
                  unit="rem"
                  onChange={(val) => updatePreferences({ paragraphSpacing: val })}
                />

                <Slider
                  label="Text Max Width"
                  value={preferences.textWidth}
                  min={45}
                  max={85}
                  step={2}
                  unit="ch"
                  onChange={(val) => updatePreferences({ textWidth: val })}
                />
              </div>

              <div className="pt-2">
                <ToggleSwitch
                  label="Bionic Fixation Bold"
                  checked={preferences.bionicReading}
                  description="Subtly bolds initial letters to assist eye fixations across words"
                  onChange={(checked) => updatePreferences({ bionicReading: checked })}
                />
              </div>
            </div>
          )}

          {/* TAB 2: COLORS */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#1E1B18]">Anti-Glare Color Themes</h3>
                <p className="text-xs text-[#706655]">
                  Ivory Clarity soft parchment hues and gentle contrast palettes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {READING_THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => updatePreferences({
                      themeId: theme.id,
                      backgroundColor: theme.backgroundColor,
                      textColor: theme.textColor,
                      highlightColor: theme.highlightColor
                    })}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      preferences.themeId === theme.id
                        ? 'border-[#D97706] ring-2 ring-[#D97706]/30 shadow-xs'
                        : 'border-[#E7DFCA] hover:border-[#8C7A5D]'
                    }`}
                    style={{ backgroundColor: theme.backgroundColor }}
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-black/20 shrink-0 mt-0.5"
                      style={{ backgroundColor: theme.highlightColor }}
                    />
                    <div>
                      <p className="text-xs font-bold" style={{ color: theme.textColor }}>
                        {theme.name}
                      </p>
                      <p className="text-[11px] opacity-80 mt-1 line-clamp-2" style={{ color: theme.textColor }}>
                        {theme.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CONFUSABLE LETTERS */}
          {activeTab === 'confusable' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#1E1B18]">Confusable Letter Disambiguation</h3>
                <p className="text-xs text-[#706655]">
                  Helps differentiate mirror characters such as b/d, p/q, m/w, n/u, s/z.
                </p>
              </div>

              <ToggleSwitch
                label="Enable Character Disambiguation"
                checked={preferences.confusableLetterSettings.enabled}
                description="Highlights or weights commonly flipped letters in reading view"
                onChange={(checked) => updatePreferences({
                  confusableLetterSettings: {
                    ...preferences.confusableLetterSettings,
                    enabled: checked
                  }
                })}
              />

              {preferences.confusableLetterSettings.enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider">
                      Active Letter Pairs
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {confusablePairs.map(pair => {
                        const isActive = preferences.confusableLetterSettings.activePairs.includes(pair);
                        return (
                          <button
                            key={pair}
                            id={`confusable-pair-${pair.replace('/', '-')}`}
                            onClick={() => {
                              const current = preferences.confusableLetterSettings.activePairs;
                              const next = isActive
                                ? current.filter(p => p !== pair)
                                : [...current, pair];
                              updatePreferences({
                                confusableLetterSettings: {
                                  ...preferences.confusableLetterSettings,
                                  activePairs: next
                                }
                              });
                            }}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                              isActive
                                ? 'bg-[#FEF9EB] border-[#D97706] text-[#D97706]'
                                : 'bg-[#FEF9EB]/60 border-[#E7DFCA] text-[#706655]'
                            }`}
                          >
                            <span className="font-mono text-sm tracking-wider">{pair}</span>
                            {isActive && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 bg-[#FEF9EB] border border-[#E7DFCA] rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider">
                      Interactive Disambiguation Demo:
                    </h4>
                    <div className="p-4 bg-[#FAF3E0] rounded-xl text-base leading-relaxed">
                      <p>
                        "The <span className="font-black text-[#B45309]">b</span>old <span className="font-black text-[#047857]">d</span>og jumped over the <span className="font-black text-[#B45309]">p</span>ond <span className="font-black text-[#047857]">q</span>uickly, enjoying the <span className="font-black text-[#B45309]">w</span>arm <span className="font-black text-[#047857]">m</span>orning sunlight, while the <span className="font-black text-[#B45309]">s</span>un reached the hori<span className="font-black text-[#047857]">z</span>on."
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIO & SPEECH */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#1E1B18]">Text-to-Speech & Read-Along</h3>
                <p className="text-xs text-[#706655]">
                  Configure speech playback speed, boundary tracking, and languages.
                </p>
              </div>

              <Slider
                label="Default Read-Aloud Speed"
                value={preferences.ttsSpeed}
                min={0.5}
                max={2.0}
                step={0.25}
                unit="x"
                onChange={(val) => updatePreferences({ ttsSpeed: val })}
              />

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider">
                  Default Reading Language
                </label>
                <select
                  value={preferences.language}
                  onChange={(e) => updatePreferences({ language: e.target.value })}
                  className="w-full bg-[#FEF9EB] border border-[#D8CEB9] rounded-xl p-2.5 text-xs font-bold text-[#26231E] focus:outline-none focus:ring-2 focus:ring-[#D97706]/40"
                >
                  {SUPPORTED_LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.name} ({l.nativeName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* TAB 5: CALIBRATION */}
          {activeTab === 'calibration' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#1E1B18]">Calibration History & Management</h3>
                <p className="text-xs text-[#706655]">
                  Review your calibrated reading profile or run the 5-step test again.
                </p>
              </div>

              <div className="p-4 bg-[#FEF9EB] border border-[#E7DFCA] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1E1B18]">Latest Calibration Status:</span>
                  <span className="text-xs font-semibold text-[#047857]">
                    {profile?.calibratedAt ? new Date(profile.calibratedAt).toLocaleDateString() : 'Active Profile'}
                  </span>
                </div>
                <p className="text-xs text-[#524B40]">
                  Your reading environment is currently optimized with <strong>{preferences.font}</strong> typography, <strong>{preferences.lineSpacing}x</strong> line height, and warm anti-glare ivory canvas.
                </p>
                <div className="pt-2">
                  <Button
                    variant="accent"
                    size="sm"
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    onClick={() => setCurrentRoute('calibration')}
                  >
                    Redo 5-Step Reading Calibration
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Settings Footer Actions */}
          <div className="pt-6 border-t border-[#E7DFCA] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="md"
                icon={<Save className="w-4 h-4" />}
                onClick={handleSave}
              >
                Save Changes to Profile
              </Button>

              <Button
                variant="outline"
                size="md"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={resetToCalibratedSettings}
              >
                Reset to Calibrated
              </Button>
            </div>

            <button
              onClick={resetToDefaultSettings}
              className="text-xs text-[#706655] hover:text-[#DC2626] underline"
            >
              Reset to Factory Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
