import { useState, useCallback, Suspense, lazy } from 'react';
import { Sidebar, BottomNav } from './components/Navigation';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Mistake, ImportantNote, InorganicAssignment, GamificationState, View, ExamTemplate, TestAttempt, SyllabusChapter } from './types';
import { dummyMistakes, dummyNotes, dummyAssignments } from './data/dummyData';
import { SEED_SYLLABUS } from './data/syllabus';
import { getLevelFromXP } from './data/gamification';
import { X, Settings } from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const MistakeLedger = lazy(() => import('./components/MistakeLedger').then(m => ({ default: m.MistakeLedger })));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const JEEExamStrategy = lazy(() => import('./components/JEEExamStrategy').then(m => ({ default: m.JEEExamStrategy })));
const ImportantNotes = lazy(() => import('./components/ImportantNotes').then(m => ({ default: m.ImportantNotes })));
const AssignmentsTracker = lazy(() => import('./components/AssignmentsTracker').then(m => ({ default: m.AssignmentsTracker })));
const TestTracker = lazy(() => import('./components/TestTracker').then(m => ({ default: m.TestTracker })));
const SyllabusTracker = lazy(() => import('./components/SyllabusTracker').then(m => ({ default: m.SyllabusTracker })));
const AppSettings = lazy(() => import('./components/AppSettings').then(m => ({ default: m.AppSettings })));

const DEFAULT_GAMIFICATION: GamificationState = {
  xp: 0, level: 1, streakDays: 0,
  lastActiveDate: '', lastStreakDate: '',
  totalMastered: 0, totalLogged: 0,
};

function RouteLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border-subtle)', borderTopColor: 'var(--accent)', animation: 'spin 0.6s linear infinite' }} />
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showSettings, setShowSettings] = useState(false);

  const [mistakes, setMistakes] = useLocalStorage<Mistake[]>('jee-mistakes-v4', dummyMistakes);
  const [notes, setNotes] = useLocalStorage<ImportantNote[]>('jee-notes-v4', dummyNotes);
  const [assignments, setAssignments] = useLocalStorage<InorganicAssignment[]>('jee-assignments-v4', dummyAssignments);
  const [testTemplates, setTestTemplates] = useLocalStorage<ExamTemplate[]>('jee-test-templates-v4', []);
  const [testAttempts, setTestAttempts] = useLocalStorage<TestAttempt[]>('jee-test-attempts-v4', []);
  const [syllabus, setSyllabus] = useLocalStorage<SyllabusChapter[]>('jee-syllabus-v1', SEED_SYLLABUS);
  const [gamification, setGamification] = useLocalStorage<GamificationState>('jee-gamification-v4', DEFAULT_GAMIFICATION);

  const handleXP = useCallback((amount: number) => {
    setGamification(prev => {
      const p = (prev as GamificationState) ?? DEFAULT_GAMIFICATION;
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
      const newXP = (p.xp ?? 0) + amount;
      let streak = p.streakDays ?? 0;
      if (p.lastActiveDate === yesterday) streak++;
      else if (p.lastActiveDate !== today) streak = 1;
      return { ...p, xp: newXP, level: getLevelFromXP(newXP), streakDays: streak, lastActiveDate: today, totalLogged: amount === 10 ? (p.totalLogged ?? 0) + 1 : p.totalLogged, totalMastered: amount === 50 ? (p.totalMastered ?? 0) + 1 : p.totalMastered };
    });
  }, [setGamification]);

  const handleResetAll = () => {
    localStorage.setItem('jee-mistakes-v4', JSON.stringify([]));
    localStorage.setItem('jee-notes-v4', JSON.stringify([]));
    localStorage.setItem('jee-assignments-v4', JSON.stringify([]));
    localStorage.setItem('jee-test-templates-v4', JSON.stringify([]));
    localStorage.setItem('jee-test-attempts-v4', JSON.stringify([]));
    localStorage.setItem('jee-syllabus-v1', JSON.stringify(SEED_SYLLABUS));
    localStorage.setItem('jee-gamification-v4', JSON.stringify(DEFAULT_GAMIFICATION));
    setMistakes([]); setNotes([]); setAssignments([]); setTestTemplates([]); setTestAttempts([]); setSyllabus(SEED_SYLLABUS.map(c => ({ ...c }))); setGamification(DEFAULT_GAMIFICATION);
  };

  const handleImport = (data: { mistakes: Mistake[]; notes: ImportantNote[]; assignments: InorganicAssignment[]; testTemplates: ExamTemplate[]; testAttempts: TestAttempt[]; syllabus: SyllabusChapter[] }) => {
    localStorage.setItem('jee-mistakes-v4', JSON.stringify(data.mistakes));
    localStorage.setItem('jee-notes-v4', JSON.stringify(data.notes));
    localStorage.setItem('jee-assignments-v4', JSON.stringify(data.assignments));
    if (data.testTemplates.length > 0) localStorage.setItem('jee-test-templates-v4', JSON.stringify(data.testTemplates));
    if (data.testAttempts.length > 0) localStorage.setItem('jee-test-attempts-v4', JSON.stringify(data.testAttempts));
    if (data.syllabus.length > 0) localStorage.setItem('jee-syllabus-v1', JSON.stringify(data.syllabus));
    setMistakes(data.mistakes); setNotes(data.notes); setAssignments(data.assignments);
    if (data.testTemplates.length > 0) setTestTemplates(data.testTemplates);
    if (data.testAttempts.length > 0) setTestAttempts(data.testAttempts);
    if (data.syllabus.length > 0) setSyllabus(data.syllabus);
  };

  const safeM = Array.isArray(mistakes) ? mistakes : [];
  const safeN = Array.isArray(notes) ? notes : [];
  const safeA = Array.isArray(assignments) ? assignments : [];
  const safeT = Array.isArray(testTemplates) ? testTemplates : [];
  const safeTA = Array.isArray(testAttempts) ? testAttempts : [];
  const safeSyl = Array.isArray(syllabus) && syllabus.length > 0 ? syllabus : SEED_SYLLABUS;
  const safeG = (gamification as GamificationState) ?? DEFAULT_GAMIFICATION;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', color: 'var(--text-secondary)' }}>
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} onSettingsClick={() => setShowSettings(true)} />

      <main style={{ flex: 1, minHeight: '100vh', paddingBottom: 72, overflowX: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }} className="md:!px-8">
          <Suspense fallback={<RouteLoader />}>
            {currentView === 'dashboard'    && <Dashboard mistakes={safeM} gamification={safeG} setCurrentView={setCurrentView} />}
            {currentView === 'ledger'       && <MistakeLedger mistakes={safeM} setMistakes={setMistakes} onXP={handleXP} />}
            {currentView === 'tests'        && <TestTracker templates={safeT} setTemplates={setTestTemplates} attempts={safeTA} setAttempts={setTestAttempts} mistakes={safeM} setMistakes={setMistakes} onXP={handleXP} />}
            {currentView === 'analytics'   && <AnalyticsDashboard mistakes={safeM} />}
            {currentView === 'strategy'    && <JEEExamStrategy mistakes={safeM} setMistakes={setMistakes} />}
            {currentView === 'notes'       && <ImportantNotes notes={safeN} setNotes={setNotes} />}
            {currentView === 'assignments' && <AssignmentsTracker assignments={safeA} setAssignments={setAssignments} />}
            {currentView === 'syllabus'    && <SyllabusTracker chapters={safeSyl} setChapters={setSyllabus} onXP={handleXP} />}
          </Suspense>
        </div>
      </main>

      <BottomNav currentView={currentView} setCurrentView={setCurrentView} />

      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card animate-slide-up" style={{ maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-button)', background: 'var(--accent-muted-bg)', border: '1px solid rgba(13,148,136,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={15} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>Settings & Data</p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Manage your local database</p>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="btn-ghost" style={{ padding: '7px 9px' }}>
                <X size={15} />
              </button>
            </div>
            <Suspense fallback={<RouteLoader />}>
              <AppSettings mistakes={safeM} notes={safeN} assignments={safeA} testTemplates={safeT} testAttempts={safeTA} syllabus={safeSyl} onReset={handleResetAll} onImport={handleImport} onClose={() => setShowSettings(false)} />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
