import { useState } from 'react';
import { Download, Upload, Trash2, AlertTriangle, CheckCircle, Database, Shield } from 'lucide-react';
import { Mistake, ImportantNote, InorganicAssignment, Subject, ErrorCategory, Priority, MistakeStatus, AssignmentType } from '../types';

interface AppSettingsProps {
  mistakes: Mistake[];
  notes: ImportantNote[];
  assignments: InorganicAssignment[];
  onReset: () => void;
  onImport: (data: { mistakes: Mistake[]; notes: ImportantNote[]; assignments: InorganicAssignment[] }) => void;
  onClose: () => void;
}

const VALID_SUBJECTS: Subject[] = ['Physics', 'Mathematics', 'Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'];
const VALID_CATEGORIES: ErrorCategory[] = ['Calculation', 'Conceptual Gap', 'Formula Misapplication', 'Question Misread', 'Careless/Silly'];
const VALID_PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];
const VALID_STATUSES: MistakeStatus[] = ['Active', 'Mastered'];
const VALID_ASSIGNMENT_TYPES: AssignmentType[] = ['CSC', 'TFT', 'Other'];

function sanitizeMistake(x: unknown): Mistake | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) return null;
  if (!VALID_SUBJECTS.includes(o.subject as Subject)) return null;
  if (!VALID_CATEGORIES.includes(o.errorCategory as ErrorCategory)) return null;
  if (!VALID_PRIORITIES.includes(o.priority as Priority)) return null;
  if (!VALID_STATUSES.includes(o.status as MistakeStatus)) return null;
  return {
    id: o.id, subject: o.subject as Subject, errorCategory: o.errorCategory as ErrorCategory,
    priority: o.priority as Priority, status: o.status as MistakeStatus,
    date: typeof o.date === 'string' ? o.date : new Date().toISOString().split('T')[0],
    chapter: typeof o.chapter === 'string' ? o.chapter : '',
    notes: typeof o.notes === 'string' ? o.notes : '',
    tags: Array.isArray(o.tags) ? o.tags.filter((t: unknown) => typeof t === 'string') : [],
    createdAt: typeof o.createdAt === 'number' ? o.createdAt : Date.now(),
    ...(typeof o.masteredAt === 'number' ? { masteredAt: o.masteredAt } : {}),
    ...(typeof o.nextReviewAt === 'number' ? { nextReviewAt: o.nextReviewAt } : {}),
    ...(typeof o.reviewCount === 'number' ? { reviewCount: o.reviewCount } : {}),
    ...(typeof o.timeSpentMinutes === 'number' ? { timeSpentMinutes: o.timeSpentMinutes } : {}),
    ...(typeof o.xpAwarded === 'boolean' ? { xpAwarded: o.xpAwarded } : {}),
  };
}

function sanitizeNote(x: unknown): ImportantNote | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) return null;
  if (!VALID_SUBJECTS.includes(o.subject as Subject)) return null;
  return {
    id: o.id, subject: o.subject as Subject,
    tags: Array.isArray(o.tags) ? o.tags.filter((t: unknown) => typeof t === 'string') : [],
    note: typeof o.note === 'string' ? o.note : '',
    createdAt: typeof o.createdAt === 'number' ? o.createdAt : Date.now(),
  };
}

function sanitizeAssignment(x: unknown): InorganicAssignment | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) return null;
  if (typeof o.assignmentName !== 'string' || !o.assignmentName) return null;
  if (!VALID_ASSIGNMENT_TYPES.includes(o.assignmentType as AssignmentType)) return null;
  return {
    id: o.id, assignmentType: o.assignmentType as AssignmentType, assignmentName: o.assignmentName,
    totalQuestions: Number(o.totalQuestions) || 0, totalAttempted: Number(o.totalAttempted) || 0,
    totalCorrect: Number(o.totalCorrect) || 0, marksObtained: Number(o.marksObtained) || 0,
    date: typeof o.date === 'string' ? o.date : new Date().toISOString().split('T')[0],
    createdAt: typeof o.createdAt === 'number' ? o.createdAt : Date.now(),
  };
}

export function AppSettings({ mistakes, notes, assignments, onReset, onImport, onClose }: AppSettingsProps) {
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMsg, setImportMsg] = useState('');

  const handleExport = () => {
    const payload = { version: '4.0', exportDate: new Date().toISOString(), mistakes, notes, assignments };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mistake-tracker-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        if (!raw || typeof raw !== 'object') throw new Error('Not a JSON object');
        const m = (Array.isArray(raw.mistakes) ? raw.mistakes : []).map((x: unknown) => sanitizeMistake(x)).filter((x: Mistake | null): x is Mistake => x !== null);
        const n = (Array.isArray(raw.notes) ? raw.notes : []).map((x: unknown) => sanitizeNote(x)).filter((x: ImportantNote | null): x is ImportantNote => x !== null);
        const a = (Array.isArray(raw.assignments) ? raw.assignments : []).map((x: unknown) => sanitizeAssignment(x)).filter((x: InorganicAssignment | null): x is InorganicAssignment => x !== null);
        const total = m.length + n.length + a.length;
        if (total === 0) throw new Error('No valid records found in file');
        onImport({ mistakes: m, notes: n, assignments: a });
        setImportStatus('success');
        setImportMsg(`Restored ${m.length} mistakes · ${n.length} notes · ${a.length} assignments`);
        setTimeout(() => setImportStatus('idle'), 6000);
      } catch (err) {
        setImportStatus('error');
        setImportMsg(err instanceof Error ? err.message : 'Import failed.');
        setTimeout(() => setImportStatus('idle'), 6000);
      }
    };
    reader.readAsText(file); e.target.value = '';
  };

  const total = mistakes.length + notes.length + assignments.length;

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {importStatus !== 'idle' && (
        <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-card)', display: 'flex', alignItems: 'flex-start', gap: 10, background: importStatus === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${importStatus === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(245,69,92,0.2)'}`, color: importStatus === 'success' ? 'var(--success)' : 'var(--danger)' }}>
          {importStatus === 'success' ? <CheckCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />}
          <span style={{ fontSize: 12 }}>{importMsg}</span>
        </div>
      )}

      <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-card)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-button)', background: 'var(--accent-muted-bg)', border: '1px solid rgba(79,107,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Database size={15} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>Offline-First Storage</p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{mistakes.length} mistakes · {notes.length} notes · {assignments.length} assignments</p>
        </div>
      </div>

      <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-card)', background: 'var(--accent-muted-bg)', border: '1px solid rgba(79,107,255,0.15)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>EXPORT FORMAT v4.0</p>
        <p style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.6, fontFamily: 'monospace' }}>{'{ version, exportDate, mistakes[], notes[], assignments[] }'}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="section-label">Data Controls</p>
        <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Export Backup</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Download full JSON snapshot ({total} items)</p>
          </div>
          <button onClick={handleExport} className="btn-primary" style={{ background: 'var(--info)', flexShrink: 0 }}>
            <Download size={13} />Export
          </button>
        </div>
        <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Import / Restore</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Upload a previously exported .json backup</p>
          </div>
          <label className="btn-primary" style={{ background: 'var(--success)', cursor: 'pointer', flexShrink: 0 }}>
            <Upload size={13} />Import
            <input type="file" accept=".json,application/json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(245,69,92,0.5)' }}>Danger Zone</p>
        {resetStep === 0 && (
          <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', border: '1px solid rgba(245,69,92,0.1)', gap: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Reset All Data</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Permanently wipe all {total} items</p>
            </div>
            <button onClick={() => setResetStep(1)} className="btn-ghost" style={{ borderColor: 'rgba(245,69,92,0.2)', color: 'var(--danger)', flexShrink: 0 }}>
              <Trash2 size={13} />Reset
            </button>
          </div>
        )}
        {resetStep === 1 && (
          <div style={{ padding: 16, borderRadius: 'var(--radius-card)', background: 'var(--danger-bg)', border: '1px solid rgba(245,69,92,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <Shield size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>Are you sure?</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>This will delete all {total} items permanently.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setResetStep(2)} style={{ padding: '8px 16px', borderRadius: 'var(--radius-button)', background: 'rgba(245,69,92,0.15)', border: '1px solid rgba(245,69,92,0.3)', color: 'var(--danger)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Yes, continue</button>
              <button onClick={() => setResetStep(0)} className="btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>Cancel</button>
            </div>
          </div>
        )}
        {resetStep === 2 && (
          <div style={{ padding: 16, borderRadius: 'var(--radius-card)', background: 'var(--danger-bg)', border: '1px solid rgba(245,69,92,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <Trash2 size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)', marginBottom: 3 }}>Final confirmation — cannot be undone</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>All mistakes, notes, and assignments will be permanently deleted.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { onReset(); setResetStep(0); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-button)', background: 'var(--danger)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Trash2 size={11} />Delete Everything
              </button>
              <button onClick={() => setResetStep(0)} className="btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
      <p style={{ fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'center' }}>All data lives in your browser's localStorage · 100% offline · nothing leaves your device</p>
    </div>
  );
}
