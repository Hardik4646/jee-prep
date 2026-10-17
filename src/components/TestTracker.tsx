import { useState, useCallback, useEffect } from 'react';
import { Plus, ClipboardList, BarChart3, FileText } from 'lucide-react';
import { ExamTemplate, TestAttempt, Mistake, WrongQuestionLogInput } from '../types';
import { genId, createMistakesFromTest } from './testTracker/helpers';
import { TemplateBuilder, TemplateLibrary } from './testTracker/TemplateBuilder';
import { LogTest } from './testTracker/LogTest';
import { TestHistory } from './testTracker/TestHistory';
import { TestAnalytics } from './testTracker/TestAnalytics';

interface TestTrackerProps {
  templates: ExamTemplate[];
  setTemplates: (t: ExamTemplate[] | ((p: ExamTemplate[]) => ExamTemplate[])) => void;
  attempts: TestAttempt[];
  setAttempts: (a: TestAttempt[] | ((p: TestAttempt[]) => TestAttempt[])) => void;
  mistakes: Mistake[];
  setMistakes: (m: Mistake[] | ((p: Mistake[]) => Mistake[])) => void;
  onXP: (amount: number) => void;
  autoOpenLogTest?: boolean;
  onAutoOpenConsumed?: () => void;
}

type Tab = 'history' | 'analytics' | 'templates';

export function TestTracker({
  templates,
  setTemplates,
  attempts,
  setAttempts,
  mistakes,
  setMistakes,
  onXP,
  autoOpenLogTest,
  onAutoOpenConsumed,
}: TestTrackerProps) {
  const [tab, setTab] = useState<Tab>('history');
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExamTemplate | null>(null);
  const [showLogTest, setShowLogTest] = useState(false);
  const [editingAttempt, setEditingAttempt] = useState<TestAttempt | null>(null);

  useEffect(() => {
    if (autoOpenLogTest) {
      setEditingAttempt(null);
      setShowTemplateBuilder(false);
      setShowLogTest(true);
      onAutoOpenConsumed?.();
    }
  }, [autoOpenLogTest, onAutoOpenConsumed]);

  const handleSaveTemplate = useCallback(
    (tpl: ExamTemplate) => {
      setTemplates(prev => {
        const arr = Array.isArray(prev) ? prev : [];
        const exists = arr.some(t => t.id === tpl.id);
        return exists ? arr.map(t => (t.id === tpl.id ? tpl : t)) : [...arr, tpl];
      });
      setShowTemplateBuilder(false);
      setEditingTemplate(null);
    },
    [setTemplates]
  );

  const handleDuplicateTemplate = (tpl: ExamTemplate) => {
    const dup: ExamTemplate = {
      ...tpl,
      id: genId(),
      name: `${tpl.name} (Copy)`,
      createdAt: Date.now(),
      timesUsed: 0,
    };
    setTemplates(prev => [...(Array.isArray(prev) ? prev : []), dup]);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => (Array.isArray(prev) ? prev : []).filter(t => t.id !== id));
  };

  const handleSaveAttempt = useCallback(
    (attempt: TestAttempt, wrongQuestions: WrongQuestionLogInput[]) => {
      setAttempts(prev => {
        const arr = Array.isArray(prev) ? prev : [];
        const exists = arr.some(a => a.id === attempt.id);
        return exists ? arr.map(a => (a.id === attempt.id ? attempt : a)) : [attempt, ...arr];
      });
      if (!editingAttempt) {
        setTemplates(prev =>
          (Array.isArray(prev) ? prev : []).map(t =>
            t.id === attempt.templateId ? { ...t, timesUsed: t.timesUsed + 1 } : t
          )
        );
        onXP(30);
        if (wrongQuestions.length > 0) {
          const newMistakes = createMistakesFromTest(attempt, wrongQuestions);
          if (newMistakes.length > 0) {
            setMistakes(prev => [...newMistakes, ...(Array.isArray(prev) ? prev : [])]);
          }
        }
      }
      setShowLogTest(false);
      setEditingAttempt(null);
    },
    [setAttempts, setTemplates, setMistakes, onXP, editingAttempt]
  );

  const handleDeleteAttempt = (id: string) => {
    setAttempts(prev => (Array.isArray(prev) ? prev : []).filter(a => a.id !== id));
  };

  const handleEditAttempt = (attempt: TestAttempt) => {
    setEditingAttempt(attempt);
    setShowLogTest(true);
  };

  const mainCount = attempts.filter(a => a.pattern === 'single').length;
  const advCount = attempts.filter(a => a.pattern === 'dual').length;

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Test Events & Paper Telemetry</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {attempts.length} logged events ({mainCount} JEE Main · {advCount} JEE Advanced) ·{' '}
            {templates.length} exam blueprints
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingTemplate(null);
              setShowLogTest(false);
              setShowTemplateBuilder(true);
            }}
            className="btn-ghost"
          >
            <Plus size={14} />
            Template
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingAttempt(null);
              setShowTemplateBuilder(false);
              setShowLogTest(true);
            }}
            className="btn-primary"
          >
            <Plus size={14} />
            Log Test Event
            <span className="kbd-shortcut ml-1" style={{ background: 'rgba(0,0,0,0.25)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
              T
            </span>
          </button>
        </div>
      </div>

      <div
        className="flex gap-1"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-button)',
          padding: 3,
          border: '1px solid var(--border-subtle)',
        }}
      >
        {([
          { id: 'history' as const, label: 'Test Event Ledger', icon: ClipboardList },
          { id: 'analytics' as const, label: 'Timing & Accuracy Analytics', icon: BarChart3 },
          { id: 'templates' as const, label: 'Exam Blueprints', icon: FileText },
        ]).map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 'var(--radius-badge)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: tab === t.id ? 'var(--accent)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--text-tertiary)',
                transition: 'all 150ms',
              }}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {showTemplateBuilder && (
        <TemplateBuilder
          onSave={handleSaveTemplate}
          onCancel={() => {
            setShowTemplateBuilder(false);
            setEditingTemplate(null);
          }}
          editing={editingTemplate}
        />
      )}
      {showLogTest && (
        <LogTest
          templates={templates}
          onSave={handleSaveAttempt}
          onCancel={() => {
            setShowLogTest(false);
            setEditingAttempt(null);
          }}
          editing={editingAttempt}
        />
      )}

      {!showTemplateBuilder && !showLogTest && (
        <>
          {tab === 'history' && (
            <TestHistory
              attempts={attempts}
              templates={templates}
              onDelete={handleDeleteAttempt}
              onEdit={handleEditAttempt}
            />
          )}
          {tab === 'analytics' && (
            <TestAnalytics attempts={attempts} templates={templates} mistakes={mistakes} />
          )}
          {tab === 'templates' && (
            <TemplateLibrary
              templates={templates}
              attempts={attempts}
              onEdit={t => {
                setEditingTemplate(t);
                setShowTemplateBuilder(true);
              }}
              onDuplicate={handleDuplicateTemplate}
              onDelete={handleDeleteTemplate}
              onCreate={() => {
                setEditingTemplate(null);
                setShowTemplateBuilder(true);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
