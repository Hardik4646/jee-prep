import { useState, useCallback } from 'react';
import { Plus, ClipboardList, BarChart3, FileText } from 'lucide-react';
import { ExamTemplate, TestAttempt, Mistake } from '../types';
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
}

type Tab = 'history' | 'analytics' | 'templates';

export function TestTracker({ templates, setTemplates, attempts, setAttempts, setMistakes, onXP }: TestTrackerProps) {
  const [tab, setTab] = useState<Tab>('history');
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExamTemplate | null>(null);
  const [showLogTest, setShowLogTest] = useState(false);

  const handleSaveTemplate = useCallback((tpl: ExamTemplate) => {
    setTemplates(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const exists = arr.some(t => t.id === tpl.id);
      return exists ? arr.map(t => t.id === tpl.id ? tpl : t) : [...arr, tpl];
    });
    setShowTemplateBuilder(false);
    setEditingTemplate(null);
  }, [setTemplates]);

  const handleDuplicateTemplate = (tpl: ExamTemplate) => {
    const dup: ExamTemplate = { ...tpl, id: genId(), name: `${tpl.name} (Copy)`, createdAt: Date.now(), timesUsed: 0 };
    setTemplates(prev => [...(Array.isArray(prev) ? prev : []), dup]);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => (Array.isArray(prev) ? prev : []).filter(t => t.id !== id));
  };

  const handleSaveAttempt = useCallback((attempt: TestAttempt, wrongQuestions: { chapter: string; errorCategory: string }[]) => {
    setAttempts(prev => [attempt, ...(Array.isArray(prev) ? prev : [])]);
    setTemplates(prev => (Array.isArray(prev) ? prev : []).map(t => t.id === attempt.templateId ? { ...t, timesUsed: t.timesUsed + 1 } : t));
    onXP(30);
    if (wrongQuestions.length > 0) {
      const newMistakes = createMistakesFromTest(attempt, wrongQuestions);
      if (newMistakes.length > 0) setMistakes(prev => [...newMistakes, ...(Array.isArray(prev) ? prev : [])]);
    }
    setShowLogTest(false);
  }, [setAttempts, setTemplates, setMistakes, onXP]);

  const handleDeleteAttempt = (id: string) => {
    setAttempts(prev => (Array.isArray(prev) ? prev : []).filter(a => a.id !== id));
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Tests</h2>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{attempts.length} attempts · {templates.length} templates</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditingTemplate(null); setShowTemplateBuilder(true); }} className="btn-ghost"><Plus size={15} />Template</button>
          <button onClick={() => setShowLogTest(true)} className="btn-primary"><Plus size={15} />Log Test<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginLeft: 2 }}>+30 XP</span></button>
        </div>
      </div>

      <div className="flex gap-1" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-button)', padding: 3, border: '1px solid var(--border-subtle)' }}>
        {([
          { id: 'history' as const, label: 'History', icon: ClipboardList },
          { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
          { id: 'templates' as const, label: 'Templates', icon: FileText },
        ]).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 'var(--radius-button)', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: tab === t.id ? 'var(--accent)' : 'transparent', color: tab === t.id ? '#fff' : 'var(--text-tertiary)', transition: 'all 150ms' }}>
              <Icon size={14} />{t.label}
            </button>
          );
        })}
      </div>

      {showTemplateBuilder && <TemplateBuilder onSave={handleSaveTemplate} onCancel={() => { setShowTemplateBuilder(false); setEditingTemplate(null); }} editing={editingTemplate} />}
      {showLogTest && <LogTest templates={templates} onSave={handleSaveAttempt} onCancel={() => setShowLogTest(false)} />}

      {!showTemplateBuilder && !showLogTest && (
        <>
          {tab === 'history' && <TestHistory attempts={attempts} templates={templates} onDelete={handleDeleteAttempt} />}
          {tab === 'analytics' && <TestAnalytics attempts={attempts} templates={templates} />}
          {tab === 'templates' && <TemplateLibrary templates={templates} attempts={attempts} onEdit={t => { setEditingTemplate(t); setShowTemplateBuilder(true); }} onDuplicate={handleDuplicateTemplate} onDelete={handleDeleteTemplate} onCreate={() => { setEditingTemplate(null); setShowTemplateBuilder(true); }} />}
        </>
      )}
    </div>
  );
}
