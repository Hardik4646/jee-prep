import { useState, useMemo } from 'react';
import { Plus, X, Save, FileText, Edit3, Copy, Trash2, Clock, Layers } from 'lucide-react';
import { ExamTemplate, ExamPattern, TemplateSubject, TestAttempt } from '../../types';
import { genId, blankSubject, DEFAULT_SUBJECTS, PAPER_DURATION_MINUTES, SUBJECT_TARGET_MINUTES_PER_PAPER } from './helpers';
import { sanitizeText } from '../../utils/security';

interface TemplateBuilderProps {
  onSave: (t: ExamTemplate) => void;
  onCancel: () => void;
  editing?: ExamTemplate | null;
}

export function TemplateBuilder({ onSave, onCancel, editing }: TemplateBuilderProps) {
  const [name, setName] = useState(editing?.name ?? '');
  const [pattern, setPattern] = useState<ExamPattern>(editing?.pattern ?? 'single');
  const [papers, setPapers] = useState<TemplateSubject[][]>(
    editing?.papers ?? [DEFAULT_SUBJECTS.map(s => blankSubject(s, 25))]
  );
  const [manualOverride, setManualOverride] = useState(editing?.manualOverride ?? false);
  const [manualQuestions, setManualQuestions] = useState(editing?.totalQuestions ?? 0);
  const [manualMarks, setManualMarks] = useState(editing?.totalMaxMarks ?? 0);
  const [marksPreset, setMarksPreset] = useState<boolean[]>(editing?.marksPreset ?? [true]);

  const togglePaperPreset = (pi: number) =>
    setMarksPreset(prev => prev.map((v, i) => (i === pi ? !v : v)));

  const applyStandardPreset = (mode: 'jee-main' | 'jee-advanced') => {
    if (mode === 'jee-main') {
      setName('JEE Main — Standard 300M (Single 3-Hr)');
      setPattern('single');
      setPapers([
        DEFAULT_SUBJECTS.map(s => ({
          id: genId(),
          name: s,
          numQuestions: 25,
          marksPerCorrect: 4,
          negativePerWrong: -1,
          partialMarking: false,
          targetMinutes: 60,
        })),
      ]);
      setMarksPreset([true]);
      setManualOverride(false);
    } else {
      setName('JEE Advanced — Unified Event (Paper 1 + Paper 2)');
      setPattern('dual');
      const makeAdvPaper = () =>
        DEFAULT_SUBJECTS.map(s => ({
          id: genId(),
          name: s,
          numQuestions: 18,
          marksPerCorrect: 3.33,
          negativePerWrong: -1,
          partialMarking: true,
          targetMinutes: 60,
        }));
      setPapers([makeAdvPaper(), makeAdvPaper()]);
      setMarksPreset([true, true]);
      setManualOverride(true);
      setManualQuestions(108);
      setManualMarks(360);
    }
  };

  const updatePaper = (pi: number, fn: (p: TemplateSubject[]) => TemplateSubject[]) => {
    setPapers(prev => prev.map((p, i) => (i === pi ? fn(p) : p)));
  };

  const updateSubject = (pi: number, si: number, patch: Partial<TemplateSubject>) => {
    updatePaper(pi, p => p.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  };

  const addSubject = (pi: number) =>
    updatePaper(pi, p => [...p, blankSubject(`Subject ${p.length + 1}`, 20)]);

  const removeSubject = (pi: number, si: number) =>
    updatePaper(pi, p => p.filter((_, i) => i !== si));

  const moveSubject = (pi: number, si: number, dir: -1 | 1) => {
    updatePaper(pi, p => {
      const ni = si + dir;
      if (ni < 0 || ni >= p.length) return p;
      const c = [...p];
      [c[si], c[ni]] = [c[ni], c[si]];
      return c;
    });
  };

  const auto = useMemo(() => {
    let tq = 0;
    let tm = 0;
    for (const paper of papers) {
      for (const s of paper) {
        tq += s.numQuestions;
        tm += s.numQuestions * s.marksPerCorrect;
      }
    }
    return { tq, tm: Math.round(tm) };
  }, [papers]);

  const totalQuestions = manualOverride ? manualQuestions : auto.tq;
  const totalMaxMarks = manualOverride ? manualMarks : auto.tm;
  const canSave = name.trim().length > 0 && papers.every(p => p.length > 0);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: editing?.id ?? genId(),
      name: sanitizeText(name, 140),
      pattern,
      papers: pattern === 'dual' ? papers.slice(0, 2) : papers.slice(0, 1),
      totalQuestions,
      totalMaxMarks,
      manualOverride,
      marksPreset: pattern === 'dual' ? marksPreset.slice(0, 2) : marksPreset.slice(0, 1),
      durationPerPaperMinutes: PAPER_DURATION_MINUTES,
      createdAt: editing?.createdAt ?? Date.now(),
      timesUsed: editing?.timesUsed ?? 0,
    });
  };

  const paperLabels =
    pattern === 'dual'
      ? ['Paper 1 (3 Hours · 180 min)', 'Paper 2 (3 Hours · 180 min)']
      : ['Single Paper (3 Hours · 180 min · 60m/Subject)'];

  return (
    <div className="card animate-slide-down" style={{ padding: 24 }}>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h3 className="card-title">{editing ? 'Edit Exam Template' : 'Create Exam Template'}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Configure strict JEE Main (Single 180m) or JEE Advanced (Dual 2×180m) paper blueprints
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              <button
                type="button"
                onClick={() => applyStandardPreset('jee-main')}
                className="btn-ghost"
                style={{ fontSize: 12, padding: '6px 10px' }}
              >
                Preset: JEE Main
              </button>
              <button
                type="button"
                onClick={() => applyStandardPreset('jee-advanced')}
                className="btn-ghost"
                style={{ fontSize: 12, padding: '6px 10px' }}
              >
                Preset: JEE Advanced
              </button>
            </>
          )}
          <button onClick={onCancel} className="btn-ghost" style={{ padding: '7px 9px' }}>
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Template Name</label>
            <input
              className="field"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. JEE Main 300M, JEE Advanced Paper 1+2"
            />
          </div>

          <div>
            <label className="field-label">Exam Mode & Timing Architecture</label>
            <div className="grid grid-cols-2 gap-2">
              {(['single', 'dual'] as ExamPattern[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPattern(p);
                    if (p === 'dual' && papers.length < 2) {
                      setPapers(prev => [
                        prev[0] ?? DEFAULT_SUBJECTS.map(s => blankSubject(s, 18)),
                        DEFAULT_SUBJECTS.map(s => blankSubject(s, 18)),
                      ]);
                      setMarksPreset(prev => [prev[0] ?? true, true]);
                    }
                    if (p === 'single' && papers.length > 1) {
                      setPapers(prev => prev.slice(0, 1));
                      setMarksPreset(prev => prev.slice(0, 1));
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-button)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: pattern === p ? 'rgba(13,148,136,0.45)' : 'var(--border-subtle)',
                    background: pattern === p ? 'var(--accent-muted-bg)' : 'var(--bg-elevated)',
                    color: pattern === p ? 'var(--accent)' : 'var(--text-secondary)',
                    transition: 'all 150ms',
                  }}
                >
                  {p === 'single' ? 'JEE Main (1 × 3h Paper)' : 'JEE Advanced (2 × 3h Papers)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {papers.map((paper, pi) => (
          <div key={pi} className="card-elevated" style={{ padding: 16 }}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers size={14} style={{ color: 'var(--accent)' }} />
                <span className="section-label">{paperLabels[pi] ?? `Paper ${pi + 1}`}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  Target: {SUBJECT_TARGET_MINUTES_PER_PAPER}m / subject · {PAPER_DURATION_MINUTES}m total
                </span>
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: marksPreset[pi] ? 'var(--accent)' : 'var(--text-tertiary)',
                    }}
                  >
                    Marks Scheme
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePaperPreset(pi)}
                    style={{
                      width: 36,
                      height: 20,
                      borderRadius: 999,
                      border: '1px solid',
                      borderColor: marksPreset[pi] ? 'rgba(13,148,136,0.4)' : 'var(--border-subtle)',
                      background: marksPreset[pi] ? 'var(--accent)' : 'var(--bg-surface)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 200ms',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 1,
                        left: marksPreset[pi] ? 18 : 1,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: marksPreset[pi] ? '#fff' : 'var(--text-tertiary)',
                        transition: 'all 200ms',
                      }}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {paper.map((s, si) => (
                <div
                  key={s.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end"
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-button)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="md:col-span-3">
                    <label className="field-label" style={{ marginBottom: 3 }}>
                      Subject
                    </label>
                    <input
                      className="field"
                      style={{ padding: '7px 10px', fontSize: 13 }}
                      value={s.name}
                      onChange={e => updateSubject(pi, si, { name: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="field-label" style={{ marginBottom: 3 }}>
                      Questions
                    </label>
                    <input
                      type="number"
                      className="field tabular-num"
                      style={{ padding: '7px 10px', fontSize: 13 }}
                      value={s.numQuestions}
                      onChange={e =>
                        updateSubject(pi, si, { numQuestions: Math.max(1, parseInt(e.target.value) || 0) })
                      }
                      min={1}
                    />
                  </div>
                  {marksPreset[pi] ? (
                    <>
                      <div className="md:col-span-2">
                        <label className="field-label" style={{ marginBottom: 3 }}>
                          Marks / Correct
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="field tabular-num"
                          style={{ padding: '7px 10px', fontSize: 13 }}
                          value={s.marksPerCorrect}
                          onChange={e =>
                            updateSubject(pi, si, { marksPerCorrect: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="field-label" style={{ marginBottom: 3 }}>
                          Neg / Wrong
                        </label>
                        <input
                          type="number"
                          step="0.25"
                          className="field tabular-num"
                          style={{ padding: '7px 10px', fontSize: 13 }}
                          value={s.negativePerWrong}
                          onChange={e =>
                            updateSubject(pi, si, { negativePerWrong: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2" style={{ paddingBottom: 5 }}>
                        <button
                          type="button"
                          onClick={() => updateSubject(pi, si, { partialMarking: !s.partialMarking })}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-badge)',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: '1px solid',
                            borderColor: s.partialMarking
                              ? 'rgba(13,148,136,0.4)'
                              : 'var(--border-subtle)',
                            background: s.partialMarking
                              ? 'var(--accent-muted-bg)'
                              : 'var(--bg-elevated)',
                            color: s.partialMarking ? 'var(--accent)' : 'var(--text-tertiary)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Partial Marking
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-6 flex items-center" style={{ paddingBottom: 7 }}>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        Manual entry — variable section marking scheme (typical for JEE Advanced)
                      </p>
                    </div>
                  )}
                  <div className="md:col-span-1 flex items-center justify-end gap-1" style={{ paddingBottom: 5 }}>
                    <button
                      type="button"
                      onClick={() => moveSubject(pi, si, -1)}
                      disabled={si === 0}
                      style={{
                        padding: '4px 6px',
                        borderRadius: 'var(--radius-badge)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-tertiary)',
                        cursor: si === 0 ? 'default' : 'pointer',
                        opacity: si === 0 ? 0.3 : 1,
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSubject(pi, si, 1)}
                      disabled={si === paper.length - 1}
                      style={{
                        padding: '4px 6px',
                        borderRadius: 'var(--radius-badge)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-tertiary)',
                        cursor: si === paper.length - 1 ? 'default' : 'pointer',
                        opacity: si === paper.length - 1 ? 0.3 : 1,
                      }}
                    >
                      ↓
                    </button>
                    {paper.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSubject(pi, si)}
                        style={{
                          padding: '4px 6px',
                          borderRadius: 'var(--radius-badge)',
                          background: 'var(--danger-bg)',
                          border: '1px solid rgba(244,63,94,0.2)',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addSubject(pi)}
                className="btn-ghost w-full"
                style={{ justifyContent: 'center', fontSize: 12 }}
              >
                <Plus size={13} />
                Add Subject
              </button>
            </div>
          </div>
        ))}

        <div className="card-elevated" style={{ padding: 16 }}>
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Exam Totals & Override</span>
            <button
              type="button"
              onClick={() => {
                setManualOverride(!manualOverride);
                if (!manualOverride) {
                  setManualQuestions(auto.tq);
                  setManualMarks(auto.tm);
                }
              }}
              style={{
                padding: '5px 10px',
                borderRadius: 'var(--radius-badge)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: manualOverride ? 'rgba(13,148,136,0.4)' : 'var(--border-subtle)',
                background: manualOverride ? 'var(--accent-muted-bg)' : 'var(--bg-surface)',
                color: manualOverride ? 'var(--accent)' : 'var(--text-tertiary)',
              }}
            >
              Manual Total Override
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="field-label">Total Questions</label>
              <input
                type="number"
                className="field tabular-num"
                value={totalQuestions}
                disabled={!manualOverride}
                onChange={e => setManualQuestions(parseInt(e.target.value) || 0)}
                style={{
                  opacity: manualOverride ? 1 : 0.65,
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="field-label">Total Max Marks</label>
              <input
                type="number"
                className="field tabular-num"
                value={totalMaxMarks}
                disabled={!manualOverride}
                onChange={e => setManualMarks(parseFloat(e.target.value) || 0)}
                style={{
                  opacity: manualOverride ? 1 : 0.65,
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="field-label">Total Exam Time Limit</label>
              <div
                className="field tabular-num flex items-center gap-2"
                style={{ opacity: 0.8, fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}
              >
                <Clock size={14} />
                {pattern === 'dual' ? '360 min (Paper 1: 180m + Paper 2: 180m)' : '180 min (Single 3-Hr Paper)'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary"
            disabled={!canSave}
            style={{ opacity: canSave ? 1 : 0.5 }}
          >
            <Save size={14} />
            {editing ? 'Update Template' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Template Library ────────────────────────────────────────────

export function TemplateLibrary({
  templates,
  attempts,
  onEdit,
  onDuplicate,
  onDelete,
  onCreate,
}: {
  templates: ExamTemplate[];
  attempts: TestAttempt[];
  onEdit: (t: ExamTemplate) => void;
  onDuplicate: (t: ExamTemplate) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  if (templates.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3" style={{ padding: '64px 24px' }}>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <FileText size={22} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>No exam templates yet</p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Create a JEE Main (Single) or JEE Advanced (Dual) template to start logging test scores
        </p>
        <button onClick={onCreate} className="btn-primary" style={{ marginTop: 8 }}>
          <Plus size={15} />
          Create First Template
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates.map(tpl => {
        const used = attempts.filter(a => a.templateId === tpl.id).length;
        const duration = tpl.pattern === 'dual' ? 360 : 180;
        return (
          <div key={tpl.id} className="card group" style={{ padding: 20 }}>
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {tpl.name}
                </h3>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    {tpl.pattern === 'single' ? 'JEE Main · Single Paper' : 'JEE Advanced · Dual Paper Event'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-num">{duration} min limit</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-num">Used {used}×</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-button)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Questions</p>
                <p className="stat-number" style={{ fontSize: 20 }}>
                  {tpl.totalQuestions}
                </p>
              </div>
              <div
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-button)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Max Marks</p>
                <p className="stat-number" style={{ fontSize: 20 }}>
                  {tpl.totalMaxMarks}
                </p>
              </div>
              <div
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-button)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Papers</p>
                <p className="stat-number" style={{ fontSize: 20 }}>
                  {tpl.pattern === 'dual' ? '2 × 3h' : '1 × 3h'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => onEdit(tpl)} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
                <Edit3 size={12} />
                Edit
              </button>
              <button
                onClick={() => onDuplicate(tpl)}
                className="btn-ghost"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                <Copy size={12} />
                Duplicate
              </button>
              <button
                onClick={() => onDelete(tpl.id)}
                className="btn-ghost"
                style={{
                  padding: '6px 10px',
                  fontSize: 12,
                  borderColor: 'rgba(244,63,94,0.2)',
                  color: 'var(--danger)',
                  marginLeft: 'auto',
                }}
                title="Delete Template"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
