import { useState, useMemo } from 'react';
import { Plus, X, Save, FileText, Edit3, Copy, Trash2 } from 'lucide-react';
import { ExamTemplate, ExamPattern, TemplateSubject, TestAttempt } from '../../types';
import { genId, blankSubject, DEFAULT_SUBJECTS } from './helpers';

interface TemplateBuilderProps {
  onSave: (t: ExamTemplate) => void;
  onCancel: () => void;
  editing?: ExamTemplate | null;
}

export function TemplateBuilder({ onSave, onCancel, editing }: TemplateBuilderProps) {
  const [name, setName] = useState(editing?.name ?? '');
  const [pattern, setPattern] = useState<ExamPattern>(editing?.pattern ?? 'single');
  const [papers, setPapers] = useState<TemplateSubject[][]>(
    editing?.papers ?? [DEFAULT_SUBJECTS.map(s => blankSubject(s))]
  );
  const [manualOverride, setManualOverride] = useState(editing?.manualOverride ?? false);
  const [manualQuestions, setManualQuestions] = useState(editing?.totalQuestions ?? 0);
  const [manualMarks, setManualMarks] = useState(editing?.totalMaxMarks ?? 0);
  const [marksPreset, setMarksPreset] = useState<boolean[]>(editing?.marksPreset ?? [true]);
  const togglePaperPreset = (pi: number) => setMarksPreset(prev => prev.map((v, i) => i === pi ? !v : v));

  const updatePaper = (pi: number, fn: (p: TemplateSubject[]) => TemplateSubject[]) => {
    setPapers(prev => prev.map((p, i) => i === pi ? fn(p) : p));
  };
  const updateSubject = (pi: number, si: number, patch: Partial<TemplateSubject>) => {
    updatePaper(pi, p => p.map((s, i) => i === si ? { ...s, ...patch } : s));
  };
  const addSubject = (pi: number) => updatePaper(pi, p => [...p, blankSubject(`Subject ${p.length + 1}`)]);
  const removeSubject = (pi: number, si: number) => updatePaper(pi, p => p.filter((_, i) => i !== si));
  const moveSubject = (pi: number, si: number, dir: -1 | 1) => {
    updatePaper(pi, p => {
      const ni = si + dir; if (ni < 0 || ni >= p.length) return p;
      const c = [...p]; [c[si], c[ni]] = [c[ni], c[si]]; return c;
    });
  };
  const addPaper = () => { setPapers(prev => [...prev, DEFAULT_SUBJECTS.map(s => blankSubject(s))]); setMarksPreset(prev => [...prev, true]); };
  const removePaper = (pi: number) => { setPapers(prev => prev.filter((_, i) => i !== pi)); setMarksPreset(prev => prev.filter((_, i) => i !== pi)); };

  const auto = useMemo(() => {
    let tq = 0, tm = 0;
    for (const paper of papers) for (const s of paper) { tq += s.numQuestions; tm += s.numQuestions * s.marksPerCorrect; }
    return { tq, tm };
  }, [papers]);

  const totalQuestions = manualOverride ? manualQuestions : auto.tq;
  const totalMaxMarks = manualOverride ? manualMarks : auto.tm;
  const canSave = name.trim().length > 0 && papers.every(p => p.length > 0);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: editing?.id ?? genId(), name: name.trim(), pattern, papers,
      totalQuestions, totalMaxMarks, manualOverride, marksPreset,
      createdAt: editing?.createdAt ?? Date.now(), timesUsed: editing?.timesUsed ?? 0,
    });
  };

  const paperLabels = pattern === 'dual' ? ['Paper 1', 'Paper 2'] : ['Subjects'];

  return (
    <div className="card animate-slide-down" style={{ padding: 24 }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="card-title">{editing ? 'Edit Template' : 'Create Exam Template'}</h3>
        <button onClick={onCancel} className="btn-ghost" style={{ padding: '7px 9px' }}><X size={15} /></button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="field-label">Template Name</label>
          <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. JEE Main, JEE Advanced, School PT-1" />
        </div>

        <div>
          <label className="field-label">Pattern Type</label>
          <div className="flex gap-2">
            {(['single', 'dual'] as ExamPattern[]).map(p => (
              <button key={p} onClick={() => {
                setPattern(p);
                if (p === 'dual' && papers.length < 2) { setPapers(prev => [...prev, DEFAULT_SUBJECTS.map(s => blankSubject(s))]); setMarksPreset(prev => [...prev, true]); }
                if (p === 'single' && papers.length > 1) { setPapers(prev => prev.slice(0, 1)); setMarksPreset(prev => prev.slice(0, 1)); }
              }}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-button)', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: pattern === p ? 'rgba(79,107,255,0.4)' : 'var(--border-subtle)', background: pattern === p ? 'var(--accent-muted-bg)' : 'var(--bg-elevated)', color: pattern === p ? 'var(--accent)' : 'var(--text-secondary)', transition: 'all 150ms' }}>
                {p === 'single' ? 'Single Paper' : 'Dual Paper (Advanced)'}
              </button>
            ))}
          </div>
        </div>

        {papers.map((paper, pi) => (
          <div key={pi} className="card" style={{ padding: 16, background: 'var(--bg-elevated)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="section-label">{paperLabels[pi] ?? `Paper ${pi + 1}`}</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 11, fontWeight: 600, color: marksPreset[pi] ? 'var(--accent)' : 'var(--text-tertiary)' }}>Marks Preset</span>
                  <button onClick={() => togglePaperPreset(pi)}
                    style={{ width: 36, height: 20, borderRadius: 999, border: '1px solid', borderColor: marksPreset[pi] ? 'rgba(79,107,255,0.4)' : 'var(--border-subtle)', background: marksPreset[pi] ? 'var(--accent)' : 'var(--bg-surface)', position: 'relative', cursor: 'pointer', transition: 'all 200ms', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 1, left: marksPreset[pi] ? 18 : 1, width: 16, height: 16, borderRadius: '50%', background: marksPreset[pi] ? '#fff' : 'var(--text-tertiary)', transition: 'all 200ms' }} />
                  </button>
                </div>
                {pattern === 'dual' && papers.length > 2 && (
                  <button onClick={() => removePaper(pi)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11, borderColor: 'rgba(245,69,92,0.2)', color: 'var(--danger)' }}><Trash2 size={11} />Remove</button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {paper.map((s, si) => (
                <div key={s.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end" style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border-subtle)' }}>
                  <div className="md:col-span-3">
                    <label className="field-label" style={{ marginBottom: 3 }}>Subject</label>
                    <input className="field" style={{ padding: '7px 10px', fontSize: 13 }} value={s.name} onChange={e => updateSubject(pi, si, { name: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="field-label" style={{ marginBottom: 3 }}>Questions</label>
                    <input type="number" className="field" style={{ padding: '7px 10px', fontSize: 13 }} value={s.numQuestions} onChange={e => updateSubject(pi, si, { numQuestions: parseInt(e.target.value) || 0 })} min={0} />
                  </div>
                  {marksPreset[pi] ? (
                    <>
                      <div className="md:col-span-2">
                        <label className="field-label" style={{ marginBottom: 3 }}>Marks/Correct</label>
                        <input type="number" step="0.5" className="field" style={{ padding: '7px 10px', fontSize: 13 }} value={s.marksPerCorrect} onChange={e => updateSubject(pi, si, { marksPerCorrect: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="field-label" style={{ marginBottom: 3 }}>Neg/Wrong</label>
                        <input type="number" step="0.5" className="field" style={{ padding: '7px 10px', fontSize: 13 }} value={s.negativePerWrong} onChange={e => updateSubject(pi, si, { negativePerWrong: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2" style={{ paddingBottom: 7 }}>
                        <button onClick={() => updateSubject(pi, si, { partialMarking: !s.partialMarking })}
                          style={{ padding: '6px 10px', borderRadius: 'var(--radius-badge)', fontSize: 10, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: s.partialMarking ? 'rgba(79,107,255,0.4)' : 'var(--border-subtle)', background: s.partialMarking ? 'var(--accent-muted-bg)' : 'var(--bg-elevated)', color: s.partialMarking ? 'var(--accent)' : 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                          Partial
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-6 flex items-center" style={{ paddingBottom: 7 }}>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Manual entry — marks per question not required</p>
                    </div>
                  )}
                  <div className="md:col-span-1 flex items-center gap-1" style={{ paddingBottom: 7 }}>
                    <button onClick={() => moveSubject(pi, si, -1)} disabled={si === 0} style={{ padding: '4px', borderRadius: 'var(--radius-badge)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', cursor: si === 0 ? 'default' : 'pointer', opacity: si === 0 ? 0.3 : 1 }}>↑</button>
                    <button onClick={() => moveSubject(pi, si, 1)} disabled={si === paper.length - 1} style={{ padding: '4px', borderRadius: 'var(--radius-badge)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', cursor: si === paper.length - 1 ? 'default' : 'pointer', opacity: si === paper.length - 1 ? 0.3 : 1 }}>↓</button>
                    <button onClick={() => removeSubject(pi, si)} style={{ padding: '4px', borderRadius: 'var(--radius-badge)', background: 'var(--danger-bg)', border: '1px solid rgba(245,69,92,0.15)', color: 'var(--danger)', cursor: 'pointer' }}><X size={11} /></button>
                  </div>
                </div>
              ))}
              <button onClick={() => addSubject(pi)} className="btn-ghost w-full" style={{ justifyContent: 'center', fontSize: 12 }}><Plus size={13} />Add Subject</button>
            </div>
          </div>
        ))}

        {pattern === 'dual' && papers.length < 3 && (
          <button onClick={addPaper} className="btn-ghost w-full" style={{ justifyContent: 'center', fontSize: 12 }}><Plus size={13} />Add Paper</button>
        )}

        <div className="card" style={{ padding: 16, background: 'var(--bg-elevated)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Computed Totals</span>
            <button onClick={() => { setManualOverride(!manualOverride); if (!manualOverride) { setManualQuestions(auto.tq); setManualMarks(auto.tm); } }}
              style={{ padding: '5px 10px', borderRadius: 'var(--radius-badge)', fontSize: 10, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: manualOverride ? 'rgba(79,107,255,0.4)' : 'var(--border-subtle)', background: manualOverride ? 'var(--accent-muted-bg)' : 'var(--bg-surface)', color: manualOverride ? 'var(--accent)' : 'var(--text-tertiary)' }}>
              Manual Override
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Total Questions</label>
              <input type="number" className="field" value={totalQuestions} disabled={!manualOverride}
                onChange={e => setManualQuestions(parseInt(e.target.value) || 0)}
                style={{ opacity: manualOverride ? 1 : 0.6, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="field-label">Total Max Marks</label>
              <input type="number" className="field" value={totalMaxMarks} disabled={!manualOverride}
                onChange={e => setManualMarks(parseFloat(e.target.value) || 0)}
                style={{ opacity: manualOverride ? 1 : 0.6, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={!canSave} style={{ opacity: canSave ? 1 : 0.5 }}><Save size={14} />{editing ? 'Update Template' : 'Save Template'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Template Library ────────────────────────────────────────────

export function TemplateLibrary({ templates, attempts, onEdit, onDuplicate, onDelete, onCreate }: {
  templates: ExamTemplate[]; attempts: TestAttempt[];
  onEdit: (t: ExamTemplate) => void; onDuplicate: (t: ExamTemplate) => void; onDelete: (id: string) => void; onCreate: () => void;
}) {
  if (templates.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3" style={{ padding: '64px 24px' }}>
        <div className="w-14 h-14 rounded-[16px] flex items-center justify-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <FileText size={24} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>No exam templates yet</p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Create a reusable template to start logging test scores</p>
        <button onClick={onCreate} className="btn-primary" style={{ marginTop: 8 }}><Plus size={15} />Create Your First Template</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates.map(tpl => {
        const used = attempts.filter(a => a.templateId === tpl.id).length;
        return (
          <div key={tpl.id} className="card group" style={{ padding: 24 }}>
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{tpl.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge" style={{ background: 'var(--accent-muted-bg)', color: 'var(--accent)', borderColor: 'rgba(79,107,255,0.2)' }}>
                    {tpl.pattern === 'single' ? 'Single Paper' : 'Dual Paper'}
                  </span>
                  <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)', borderColor: 'var(--border-subtle)' }}>
                    {tpl.papers.flat().length} subjects
                  </span>
                  <span className="badge" style={{ background: 'var(--info-bg)', color: 'var(--info)', borderColor: 'rgba(56,189,248,0.2)' }}>
                    Used {used}×
                  </span>
                  {tpl.marksPreset.map((on, pi) => (
                    <span key={pi} className="badge" style={{ background: on ? 'var(--success-bg)' : 'var(--warning-bg)', color: on ? 'var(--success)' : 'var(--warning)', borderColor: on ? 'rgba(34,197,94,0.2)' : 'rgba(245,166,35,0.2)' }}>
                      {tpl.pattern === 'dual' ? `P${pi + 1}: ` : ''}{on ? 'Preset' : 'Manual'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Total Questions</p>
                <p className="stat-number" style={{ fontSize: 22 }}>{tpl.totalQuestions}</p>
              </div>
              <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Max Marks</p>
                <p className="stat-number" style={{ fontSize: 22 }}>{tpl.totalMaxMarks}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-60 group-hover:!opacity-100 transition-opacity">
              <button onClick={() => onEdit(tpl)} className="btn-ghost" style={{ padding: '7px 12px', fontSize: 12 }}><Edit3 size={12} />Edit</button>
              <button onClick={() => onDuplicate(tpl)} className="btn-ghost" style={{ padding: '7px 12px', fontSize: 12 }}><Copy size={12} />Duplicate</button>
              <button onClick={() => onDelete(tpl.id)} className="btn-ghost" style={{ padding: '7px 12px', fontSize: 12, borderColor: 'rgba(245,69,92,0.2)', color: 'var(--danger)', marginLeft: 'auto' }}><Trash2 size={12} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
