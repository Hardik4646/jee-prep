import { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { Sidebar, BottomNav, NAV_ITEMS } from './components/Navigation';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  Mistake,
  ImportantNote,
  InorganicAssignment,
  GamificationState,
  SyllabusChapter,
  ExamTemplate,
  TestAttempt,
  View,
} from './types';
import {
  dummyMistakes,
  dummyNotes,
  dummyAssignments,
  SEED_TEMPLATES,
  SEED_ATTEMPTS,
} from './data/dummyData';
import { SEED_SYLLABUS } from './data/syllabus';
import { getLevelFromXP } from './data/gamification';
import { saveAutoBackupSnapshot } from './utils/backupDb';
import {
  X,
  Settings,
  Command,
  ClipboardList,
  FileText,
  Minimize2,
  ShieldCheck,
  Keyboard,
} from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = lazy(() =>
  import('./components/Dashboard').then(m => ({ default: m.Dashboard }))
);
const MistakeLedger = lazy(() =>
  import('./components/MistakeLedger').then(m => ({ default: m.MistakeLedger }))
);
const AnalyticsDashboard = lazy(() =>
  import('./components/AnalyticsDashboard').then(m => ({
    default: m.AnalyticsDashboard,
  }))
);
const JEEExamStrategy = lazy(() =>
  import('./components/JEEExamStrategy').then(m => ({ default: m.JEEExamStrategy }))
);
const ImportantNotes = lazy(() =>
  import('./components/ImportantNotes').then(m => ({ default: m.ImportantNotes }))
);
const AssignmentsTracker = lazy(() =>
  import('./components/AssignmentsTracker').then(m => ({
    default: m.AssignmentsTracker,
  }))
);
const SyllabusTracker = lazy(() =>
  import('./components/SyllabusTracker').then(m => ({ default: m.SyllabusTracker }))
);
const TestTracker = lazy(() =>
  import('./components/TestTracker').then(m => ({ default: m.TestTracker }))
);
const AppSettings = lazy(() =>
  import('./components/AppSettings').then(m => ({ default: m.AppSettings }))
);

const DEFAULT_GAMIFICATION: GamificationState = {
  xp: 280,
  level: 2,
  streakDays: 5,
  lastActiveDate: format(new Date(), 'yyyy-MM-dd'),
  lastStreakDate: format(new Date(), 'yyyy-MM-dd'),
  totalMastered: 2,
  totalLogged: 8,
};

function RouteLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 220,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '2px solid var(--border-subtle)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.6s linear infinite',
        }}
      />
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [quickLogTrigger, setQuickLogTrigger] = useState(0);
  const [lastAutoBackupTime, setLastAutoBackupTime] = useState<string>('');

  const [mistakes, setMistakes] = useLocalStorage<Mistake[]>(
    'jee-mistakes-v4',
    dummyMistakes
  );
  const [notes, setNotes] = useLocalStorage<ImportantNote[]>(
    'jee-notes-v4',
    dummyNotes
  );
  const [assignments, setAssignments] = useLocalStorage<InorganicAssignment[]>(
    'jee-assignments-v4',
    dummyAssignments
  );
  const [gamification, setGamification] = useLocalStorage<GamificationState>(
    'jee-gamification-v4',
    DEFAULT_GAMIFICATION
  );
  const [syllabus, setSyllabus] = useLocalStorage<SyllabusChapter[]>(
    'jee-syllabus-v4',
    SEED_SYLLABUS
  );
  const [testTemplates, setTestTemplates] = useLocalStorage<ExamTemplate[]>(
    'jee-test-templates-v4',
    SEED_TEMPLATES
  );
  const [testAttempts, setTestAttempts] = useLocalStorage<TestAttempt[]>(
    'jee-test-attempts-v4',
    SEED_ATTEMPTS
  );

  // Seed default templates & attempts if an older localStorage had empty arrays
  useEffect(() => {
    const seededKey = 'jee-v5-seeded-templates';
    if (!localStorage.getItem(seededKey)) {
      if (!Array.isArray(testTemplates) || testTemplates.length === 0) {
        setTestTemplates(SEED_TEMPLATES);
      }
      if (!Array.isArray(testAttempts) || testAttempts.length === 0) {
        setTestAttempts(SEED_ATTEMPTS);
      }
      localStorage.setItem(seededKey, 'true');
    }
  }, [testTemplates, testAttempts, setTestTemplates, setTestAttempts]);

  const handleXP = useCallback(
    (amount: number) => {
      setGamification(prev => {
        const p = (prev as GamificationState) ?? DEFAULT_GAMIFICATION;
        const today = format(new Date(), 'yyyy-MM-dd');
        const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
        const newXP = (p.xp ?? 0) + amount;
        let streak = p.streakDays ?? 0;
        if (p.lastActiveDate === yesterday) streak++;
        else if (p.lastActiveDate !== today) streak = 1;
        return {
          ...p,
          xp: newXP,
          level: getLevelFromXP(newXP),
          streakDays: streak,
          lastActiveDate: today,
          totalLogged: amount === 10 ? (p.totalLogged ?? 0) + 1 : p.totalLogged,
          totalMastered:
            amount === 50 ? (p.totalMastered ?? 0) + 1 : p.totalMastered,
        };
      });
    },
    [setGamification]
  );

  const triggerQuickLogTest = useCallback(() => {
    setCurrentView('tests');
    setQuickLogTrigger(c => c + 1);
    setShowCommandPalette(false);
  }, []);

  // Global Productive Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // Ctrl/Cmd + K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
        return;
      }

      // Ctrl/Cmd + L -> Quick-Log Test
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        triggerQuickLogTest();
        return;
      }

      if (isInputFocused) return;

      // Alt + F -> Toggle Distraction-Free Focus Mode
      if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFocusMode(prev => !prev);
        return;
      }

      // Alt + 1..8 -> View Switching
      if (e.altKey && e.key >= '1' && e.key <= '8') {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        if (NAV_ITEMS[idx]) {
          setCurrentView(NAV_ITEMS[idx].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerQuickLogTest]);

  // Periodic Automatic IndexedDB + LocalStorage Backup Engine
  useEffect(() => {
    const runBackup = async (reason: 'auto' | 'manual') => {
      await saveAutoBackupSnapshot(
        {
          mistakes: Array.isArray(mistakes) ? mistakes : [],
          notes: Array.isArray(notes) ? notes : [],
          assignments: Array.isArray(assignments) ? assignments : [],
          testTemplates: Array.isArray(testTemplates) ? testTemplates : [],
          testAttempts: Array.isArray(testAttempts) ? testAttempts : [],
          syllabus: Array.isArray(syllabus) ? syllabus : [],
        },
        reason
      );
      setLastAutoBackupTime(format(new Date(), 'HH:mm'));
    };

    const initialTimer = setTimeout(() => {
      runBackup('auto');
    }, 3500);

    const interval = setInterval(() => {
      runBackup('auto');
    }, 180000); // Every 3 minutes

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [mistakes, notes, assignments, testTemplates, testAttempts, syllabus]);

  const handleResetAll = () => {
    localStorage.setItem('jee-mistakes-v4', JSON.stringify([]));
    localStorage.setItem('jee-notes-v4', JSON.stringify([]));
    localStorage.setItem('jee-assignments-v4', JSON.stringify([]));
    localStorage.setItem(
      'jee-gamification-v4',
      JSON.stringify(DEFAULT_GAMIFICATION)
    );
    localStorage.setItem('jee-test-templates-v4', JSON.stringify([]));
    localStorage.setItem('jee-test-attempts-v4', JSON.stringify([]));
    setMistakes([]);
    setNotes([]);
    setAssignments([]);
    setGamification(DEFAULT_GAMIFICATION);
    setTestTemplates([]);
    setTestAttempts([]);
  };

  const handleImport = (data: {
    mistakes: Mistake[];
    notes: ImportantNote[];
    assignments: InorganicAssignment[];
    testTemplates: ExamTemplate[];
    testAttempts: TestAttempt[];
    syllabus: SyllabusChapter[];
  }) => {
    localStorage.setItem('jee-mistakes-v4', JSON.stringify(data.mistakes));
    localStorage.setItem('jee-notes-v4', JSON.stringify(data.notes));
    localStorage.setItem('jee-assignments-v4', JSON.stringify(data.assignments));
    localStorage.setItem(
      'jee-test-templates-v4',
      JSON.stringify(data.testTemplates)
    );
    localStorage.setItem(
      'jee-test-attempts-v4',
      JSON.stringify(data.testAttempts)
    );
    if (data.syllabus.length > 0) {
      localStorage.setItem('jee-syllabus-v4', JSON.stringify(data.syllabus));
      setSyllabus(data.syllabus);
    }
    setMistakes(data.mistakes);
    setNotes(data.notes);
    setAssignments(data.assignments);
    setTestTemplates(data.testTemplates);
    setTestAttempts(data.testAttempts);
  };

  const safeM = Array.isArray(mistakes) ? mistakes : [];
  const safeN = Array.isArray(notes) ? notes : [];
  const safeA = Array.isArray(assignments) ? assignments : [];
  const safeG = (gamification as GamificationState) ?? DEFAULT_GAMIFICATION;
  const safeTpl = Array.isArray(testTemplates) ? testTemplates : [];
  const safeAtt = Array.isArray(testAttempts) ? testAttempts : [];
  const safeSyl = Array.isArray(syllabus) ? syllabus : SEED_SYLLABUS;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        display: 'flex',
        color: 'var(--text-secondary)',
      }}
    >
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onSettingsClick={() => setShowSettings(true)}
        onCommandPaletteClick={() => setShowCommandPalette(true)}
        focusMode={focusMode}
        onToggleFocusMode={() => setFocusMode(f => !f)}
      />

      <main
        style={{
          flex: 1,
          minHeight: '100vh',
          paddingBottom: focusMode ? 32 : 76,
          overflowX: 'hidden',
        }}
      >
        {/* Top Productivity Status Bar */}
        <header
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(17, 20, 27, 0.78)',
            backdropFilter: 'blur(12px)',
          }}
          className="sticky top-0 z-30 px-4 md:px-8 py-2.5 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
              {NAV_ITEMS.find(n => n.id === currentView)?.label ?? 'Workspace'}
            </span>
            {lastAutoBackupTime && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                <ShieldCheck size={12} className="text-emerald-400" />
                Auto-saved {lastAutoBackupTime}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerQuickLogTest}
              className="btn-ghost !py-1.5 !px-2.5 text-[11.5px]"
              title="Quick-Log Mock Test (Ctrl+L)"
            >
              <ClipboardList size={13} className="text-emerald-400" />
              <span className="hidden sm:inline">Quick-Log Test</span>
              <span className="kbd-key">⌘L</span>
            </button>

            <button
              onClick={() => setShowCommandPalette(true)}
              className="btn-ghost !py-1.5 !px-2.5 text-[11.5px]"
              title="Command Palette (Ctrl+K)"
            >
              <Command size={13} />
              <span className="hidden sm:inline">Commands</span>
              <span className="kbd-key">⌘K</span>
            </button>

            {focusMode && (
              <button
                onClick={() => setFocusMode(false)}
                className="btn-primary !py-1.5 !px-3 text-[11.5px]"
              >
                <Minimize2 size={13} /> Exit Focus Mode (⌥F)
              </button>
            )}
          </div>
        </header>

        <div
          style={{
            maxWidth: focusMode ? 1280 : 1140,
            margin: '0 auto',
            padding: '26px 16px',
          }}
          className="md:!px-8"
        >
          <ErrorBoundary fallbackLabel={currentView}>
            <Suspense fallback={<RouteLoader />}>
              {currentView === 'dashboard' && (
                <Dashboard
                  mistakes={safeM}
                  testAttempts={safeAtt}
                  gamification={safeG}
                  setCurrentView={setCurrentView}
                  onQuickLogTest={triggerQuickLogTest}
                />
              )}
              {currentView === 'ledger' && (
                <MistakeLedger
                  mistakes={safeM}
                  setMistakes={setMistakes}
                  onXP={handleXP}
                  distractionFree={focusMode}
                  onToggleDistractionFree={() => setFocusMode(f => !f)}
                />
              )}
              {currentView === 'tests' && (
                <TestTracker
                  templates={safeTpl}
                  setTemplates={setTestTemplates}
                  attempts={safeAtt}
                  setAttempts={setTestAttempts}
                  mistakes={safeM}
                  setMistakes={setMistakes}
                  onXP={handleXP}
                  quickLogTrigger={quickLogTrigger}
                />
              )}
              {currentView === 'analytics' && (
                <AnalyticsDashboard mistakes={safeM} />
              )}
              {currentView === 'syllabus' && (
                <SyllabusTracker
                  chapters={safeSyl}
                  setChapters={setSyllabus}
                  onXP={handleXP}
                />
              )}
              {currentView === 'strategy' && (
                <JEEExamStrategy mistakes={safeM} setMistakes={setMistakes} />
              )}
              {currentView === 'notes' && (
                <ImportantNotes notes={safeN} setNotes={setNotes} />
              )}
              {currentView === 'assignments' && (
                <AssignmentsTracker
                  assignments={safeA}
                  setAssignments={setAssignments}
                />
              )}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      <BottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        focusMode={focusMode}
      />

      {/* Command Palette Modal (Ctrl/Cmd + K) */}
      {showCommandPalette && (
        <div
          onClick={() => setShowCommandPalette(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.68)',
            backdropFilter: 'blur(6px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '10vh 16px 16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="card animate-slide-down"
            style={{ maxWidth: 500, width: '100%', overflow: 'hidden' }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2">
                <Keyboard size={15} className="text-emerald-400" />
                <span className="text-[13px] font-bold text-slate-100">
                  Workspace Command & Shortcut Palette
                </span>
              </div>
              <button
                onClick={() => setShowCommandPalette(false)}
                className="btn-ghost !p-1"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                Rapid Actions
              </div>
              <button
                onClick={triggerQuickLogTest}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] hover:bg-slate-800/70 text-left transition-colors"
              >
                <span className="flex items-center gap-2.5 text-[13px] font-medium text-slate-200">
                  <ClipboardList size={15} className="text-emerald-400" />
                  Log New JEE Main / JEE Advanced Mock Test
                </span>
                <span className="kbd-key">⌘L</span>
              </button>
              <button
                onClick={() => {
                  setCurrentView('ledger');
                  setShowCommandPalette(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] hover:bg-slate-800/70 text-left transition-colors"
              >
                <span className="flex items-center gap-2.5 text-[13px] font-medium text-slate-200">
                  <FileText size={15} className="text-sky-400" />
                  Inspect & Filter Mistake Ledger
                </span>
                <span className="kbd-key">⌥2</span>
              </button>
              <button
                onClick={() => {
                  setFocusMode(f => !f);
                  setShowCommandPalette(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] hover:bg-slate-800/70 text-left transition-colors"
              >
                <span className="flex items-center gap-2.5 text-[13px] font-medium text-slate-200">
                  <Minimize2 size={15} className="text-amber-400" />
                  Toggle Distraction-Free Focus Mode
                </span>
                <span className="kbd-key">⌥F</span>
              </button>
              <button
                onClick={() => {
                  setShowSettings(true);
                  setShowCommandPalette(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] hover:bg-slate-800/70 text-left transition-colors"
              >
                <span className="flex items-center gap-2.5 text-[13px] font-medium text-slate-200">
                  <Settings size={15} className="text-slate-400" />
                  Data Export (JSON/CSV), Schema Import & Auto-Backups
                </span>
                <span className="kbd-key">Data</span>
              </button>

              <div className="px-2.5 pt-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                Navigate Views
              </div>
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setShowCommandPalette(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] hover:bg-slate-800/70 text-left transition-colors"
                  >
                    <span className="flex items-center gap-2.5 text-[12.5px] text-slate-300">
                      <Icon size={14} className="text-slate-400" />
                      {item.label}
                    </span>
                    <span className="kbd-key">{item.shortcut}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Settings & Data Management Modal */}
      {showSettings && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className="card animate-slide-up"
            style={{
              maxWidth: 540,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                padding: '18px 20px 14px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 'var(--radius-button)',
                    background: 'var(--accent-muted-bg)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Settings size={15} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      lineHeight: 1,
                    }}
                  >
                    Data Management, Backups & Security
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      marginTop: 3,
                    }}
                  >
                    JSON/CSV export · Schema-validated import · IndexedDB snapshots
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="btn-ghost"
                style={{ padding: '7px 9px' }}
              >
                <X size={15} />
              </button>
            </div>
            <ErrorBoundary fallbackLabel="Settings & Data">
              <Suspense fallback={<RouteLoader />}>
                <AppSettings
                  mistakes={safeM}
                  notes={safeN}
                  assignments={safeA}
                  testTemplates={safeTpl}
                  testAttempts={safeAtt}
                  syllabus={safeSyl}
                  onReset={handleResetAll}
                  onImport={handleImport}
                  onClose={() => setShowSettings(false)}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      )}
    </div>
  );
}
