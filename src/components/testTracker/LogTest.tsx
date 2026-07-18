import { useState, useMemo } from 'react';
import { X, Plus, Save, ChevronDown, CheckCircle2, Target, AlertTriangle, Star } from 'lucide-react';
import { ExamTemplate, TestAttempt, TestSourceType, SubjectScore, PaperScore } from '../../types';
import { genId, computeSubjectScore, computePaperScore, TEST_TYPES } from './helpers';
import { format } from 'date-fns';

interface LogTestProps {
  templates: ExamTemplate[];
  onSave: (a: TestAttempt, wrongQuestions: { chapter: string; errorCategory: string }[]) => void;
  onCancel: () => void;
}

export function LogTest({ templates, onSave, onCancel }: LogTestProps) {
  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState('');
  const [attemptName, setAttemptName] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [testType, setTestType] = useState<TestSourceType>('Mock Test');
  const [timeTaken, setTimeTaken] = useState('');
  const [difficulty, setDifficulty] = useState(0);
  const [notes, setNotes] = useState('');
  const [entryMode, setEntryMode] = useState<'counts' | 'marks' | 'manual'>('counts');
  const [paperInputs, setPaperInputs] = useState<{ correct: string; incorrect: string; unattempted: string }[][]>([]);
  const [directMarks, setDirectMarks] = useState<string[]>([]);
  const [manualInputs, setManualInputs] = useState<{ marksObtained: string; negativeMarks: string; correct: string; incorrect: string; unattempted: string }[][]>([]);
  const [percentile, setPercentile] = useState('');
  const [targetScore, setTargetScore] = useState('');
  const [addToLedger, setAddToLedger] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<{ chapter: string; errorCategory: string }[]>([]);

  const template = templates.find(t => t.id === templateId);

  const selectTemplate = (id: string) => {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    setTemplateId(id);
    setPaperInputs(tpl.papers.map(paper => paper.map(() => ({ correct: '', incorrect: '', unattempted: '' }))));
    setDirectMarks(tpl.papers.map(() => ''));
    setManualInputs(tpl.papers.map(paper => paper.map(() => ({ marksObtained: '', negativeMarks: '', correct: '', incorrect: '', unattempted: '' }))));
    setEntryMode(tpl.marksPreset.every(Boolean) ? 'counts' : 'manual');
    setTargetScore('');
  };

  const livePapers: PaperScore[] = useMemo(() => {
    if (!template) return [];
    return template.papers.map((paper, pi) => {
      const mode = template.marksPreset[pi] ? (entryMode === 'marks' ? 'marks' : 'counts') : 'manual';
      if (mode === 'marks') {
        const dm = parseFloat(directMarks[pi] ?? '') || 0;
        return {
          subjects: paper.map(s => ({ subjectName: s.name, correct: 0, incorrect: 0, unattempted: 0, score: 0, maxScore: s.numQuestions * s.marksPerCorrect, accuracy: 0 })),
          totalScore: dm, maxScore: paper.reduce((a, s) => a + s.numQuestions * s.marksPerCorrect, 0),
          totalCorrect: 0, totalIncorrect: 0, totalUnattempted: 0,
          totalQuestions: paper.reduce((a, s) => a + s.numQuestions, 0), accuracy: 0,
        };
      }
      if (mode === 'manual') {
        const inputs = manualInputs[pi] ?? [];
        const subjScores = paper.map((s, si) => {
          const inp = inputs[si] ?? { marksObtained: '', negativeMarks: '', correct: '', incorrect: '', unattempted: '' };
          const score = parseFloat(inp.marksObtained) || 0;
          const neg = parseFloat(inp.negativeMarks) || 0;
          const correct = parseInt(inp.correct) || 0;
          const incorrect = parseInt(inp.incorrect) || 0;
          const unattempted = parseInt(inp.unattempted) || 0;
          const maxScore = s.numQuestions * s.marksPerCorrect;
          const attempted = correct + incorrect;
          const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
          return { subjectName: s.name, correct, incorrect, unattempted, score: score - neg, maxScore, accuracy };
        });
        return {
          subjects: subjScores,
          totalScore: subjScores.reduce((a, b) => a + b.score, 0),
          maxScore: subjScores.reduce((a, b) => a + b.maxScore, 0),
          totalCorrect: subjScores.reduce((a, b) => a + b.correct, 0),
          totalIncorrect: subjScores.reduce((a, b) => a + b.incorrect, 0),
          totalUnattempted: subjScores.reduce((a, b) => a + b.unattempted, 0),
          totalQuestions: paper.reduce((a, s) => a + s.numQuestions, 0),
          accuracy: subjScores.reduce((a, b) => a + b.correct, 0) + subjScores.reduce((a, b) => a + b.incorrect, 0) > 0
            ? (subjScores.reduce((a, b) => a + b.correct, 0) / (subjScores.reduce((a, b) => a + b.correct, 0) + subjScores.reduce((a, b) => a + b.incorrect, 0))) * 100
            : 0,
        };
      }
      const inputs = paperInputs[pi] ?? [];
      return computePaperScore(paper, inputs.map(i => ({
        correct: parseInt(i?.correct ?? '') || 0,
        incorrect: parseInt(i?.incorrect ?? '') || 0,
        unattempted: parseInt(i?.unattempted ?? '') || 0,
      })));
    });
  }, [template, paperInputs, directMarks, manualInputs, entryMode]);

  const liveTotal = livePapers.reduce((a, p) => a + p.totalScore, 0);
  const liveMax = livePapers.reduce((a, p) => a + p.maxScore, 0);
  const liveCorrect = livePapers.reduce((a, p) => a + p.totalCorrect, 0);
  const liveIncorrect = livePapers.reduce((a, p) => a + p.totalIncorrect, 0);
  const liveUnattempted = livePapers.reduce((a, p) => a + p.totalUnattempted, 0);
  const liveTotalQ = livePapers.reduce((a, p) => a + p.totalQuestions, 0);
  const liveAccuracy = liveCorrect + liveIncorrect > 0 ? (liveCorrect / (liveCorrect + liveIncorrect)) * 100 : 0;
  const livePct = liveMax > 0 ? (liveTotal / liveMax) * 100 : 0;

  const liveMarksLost = useMemo(() => {
    if (!template) return 0;
    let lost = 0;
    template.papers.forEach((paper, pi) => {
      const mode = template.marksPreset[pi] ? (entryMode === 'marks' ? 'marks' : 'counts') : 'manual';
      if (mode === 'manual') {
        (manualInputs[pi] ?? []).forEach((inp) => {
          lost += parseFloat(inp?.negativeMarks ?? '') || 0;
        });
      } else if (mode === 'counts') {
        paper.forEach((s, si) => {
          const inc = parseInt(paperInputs[pi]?.[si]?.incorrect ?? '') || 0;
          if (s.negativePerWrong < 0) lost += inc * Math.abs(s.negativePerWrong);
        });
      }
    });
    return lost;
  }, [template, paperInputs, manualInputs, entryMode]);

  const target = parseFloat(targetScore) || 0;
  const achieved = target > 0 && liveTotal >= target;
  const canSave = !!template && attemptName.trim().length > 0 && liveMax > 0;

  const handleSave = () => {
    if (!template || !canSave) return;
    const attempt: TestAttempt = {
      id: genId(), templateId: template.id, templateName: template.name, pattern: template.pattern,
      testType, attemptName: attemptName.trim(), date,
      timeTakenMinutes: timeTaken ? parseInt(timeTaken) : undefined,
      difficultyRating: difficulty || undefined,
      notes: notes.trim() || undefined,
      papers: livePapers,
      totalScore: liveTotal, maxScore: liveMax, percentage: livePct, accuracy: liveAccuracy,
      totalCorrect: liveCorrect, totalIncorrect: liveIncorrect, totalUnattempted: liveUnattempted,
      totalQuestions: liveTotalQ, marksLostToNegative: liveMarksLost,
      percentile: percentile ? parseFloat(percentile) : undefined,
      targetAchieved: achieved, createdAt: Date.now(),
    };
    onSave(attempt, addToLedger ? wrongQuestions : []);
  };

  if (templates.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3" style={{ padding: '64px 24px' }}>
        <AlertTriangle size={28} style={{ color: 'var(--text-tertiary)' }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>No templates available</p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Create an exam template first to log a test</p>
        <button onClick={onCancel} className="btn-ghost" style={{ marginTop: 8 }}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="card animate-slide-down" style={{ padding: 24 }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="card-title">Log Test Attempt</h3>
        <button onClick={onCancel} className="btn-ghost" style={{ padding: '7px 9px' }}><X size={15} /></button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        {[
          { n: 1, label: 'Template' },
          { n: 2, label: 'Details' },
          { n: 3, label: 'Scores' },
          { n: 4, label: 'Review' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2" style={{ flex: i < 3 ? 1 : undefined }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, border: '1px solid', borderColor: step >= s.n ? 'var(--accent)' : 'var(--border-subtle)', background: step > s.n ? 'var(--accent)' : step === s.n ? 'var(--accent-muted-bg)' : 'var(--bg-elevated)', color: step > s.n ? '#fff' : step === s.n ? 'var(--accent)' : 'var(--text-tertiary)', transition: 'all 200ms' }}>{step > s.n ? '✓' : s.n}</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: step >= s.n ? 'var(--text-secondary)' : 'var(--text-tertiary)', whiteSpace: 'nowrap' }} className="hidden sm:inline">{s.label}</span>
            {i < 3 && <div style={{ flex: 1, height: 1, background: step > s.n ? 'var(--accent)' : 'var(--border-subtle)', transition: 'background 200ms' }} />}
          </div>
        ))}
      </div>

      {/* Step 1: Template */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="body-text" style={{ marginBottom: 8 }}>Select an exam template to use for this attempt:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map(tpl => (
              <button key={tpl.id} onClick={() => selectTemplate(tpl.id)}
                style={{ textAlign: 'left', padding: 16, borderRadius: 'var(--radius-card)', cursor: 'pointer', transition: 'all 150ms', border: '1px solid', borderColor: templateId === tpl.id ? 'rgba(13,148,136,0.4)' : 'var(--border-subtle)', background: templateId === tpl.id ? 'var(--accent-muted-bg)' : 'var(--bg-elevated)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 14, fontWeight: 600, color: templateId === tpl.id ? 'var(--accent)' : 'var(--text-primary)' }}>{tpl.name}</span>
                  {templateId === tpl.id && <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)', borderColor: 'var(--border-subtle)', fontSize: 10 }}>{tpl.pattern === 'single' ? 'Single' : 'Dual'}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tpl.totalQuestions} Q · {tpl.totalMaxMarks} marks</span>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={() => setStep(2)} disabled={!templateId} className="btn-primary" style={{ opacity: templateId ? 1 : 0.5 }}>Next <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} /></button>
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && template && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="field-label">Test / Attempt Name</label><input className="field" value={attemptName} onChange={e => setAttemptName(e.target.value)} placeholder="e.g. Mock Test 7" /></div>
            <div><label className="field-label">Date</label><input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="field-label">Test Type</label><select className="field" value={testType} onChange={e => setTestType(e.target.value as TestSourceType)}>{TEST_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="field-label">Time Taken (min)</label><input type="number" className="field" value={timeTaken} onChange={e => setTimeTaken(e.target.value)} placeholder="180" min={0} /></div>
            <div><label className="field-label">Difficulty</label><div className="flex gap-1" style={{ paddingTop: 9 }}>{[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setDifficulty(difficulty === n ? 0 : n)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}><Star size={18} fill={n <= difficulty ? 'var(--warning)' : 'none'} stroke={n <= difficulty ? 'var(--warning)' : 'var(--text-tertiary)'} /></button>)}</div></div>
          </div>
          <div><label className="field-label">Notes / Reflection</label><textarea className="field" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What went well? What to improve?" style={{ resize: 'none' }} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="field-label">Percentile (optional)</label><input type="number" step="0.01" className="field" value={percentile} onChange={e => setPercentile(e.target.value)} placeholder="99.5" /></div>
            <div><label className="field-label">Target Score (optional)</label><input type="number" className="field" value={targetScore} onChange={e => setTargetScore(e.target.value)} placeholder={`e.g. ${Math.round(template.totalMaxMarks * 0.8)}`} /></div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="btn-ghost">Back</button>
            <button onClick={() => setStep(3)} disabled={!attemptName.trim()} className="btn-primary" style={{ opacity: attemptName.trim() ? 1 : 0.5 }}>Next <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} /></button>
          </div>
        </div>
      )}

      {/* Step 3: Scores */}
      {step === 3 && template && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="section-label">Score Entry</span>
            {template.marksPreset.every(Boolean) ? (
              <div className="flex gap-1" style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-button)', padding: 3 }}>
                {(['counts', 'marks'] as const).map(m => (
                  <button key={m} onClick={() => setEntryMode(m)} style={{ padding: '6px 12px', borderRadius: 'var(--radius-button)', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: entryMode === m ? 'var(--accent)' : 'transparent', color: entryMode === m ? '#fff' : 'var(--text-tertiary)' }}>{m === 'counts' ? 'By Counts' : 'Direct Marks'}</button>
                ))}
              </div>
            ) : template.marksPreset.some(v => !v) ? (
              <div style={{ padding: '6px 12px', borderRadius: 'var(--radius-button)', fontSize: 11, fontWeight: 600, background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid rgba(245,166,35,0.2)' }}>Manual entry mode</div>
            ) : (
              <div style={{ padding: '6px 12px', borderRadius: 'var(--radius-button)', fontSize: 11, fontWeight: 600, background: 'var(--accent-muted-bg)', color: 'var(--accent)', border: '1px solid rgba(13,148,136,0.2)' }}>Auto-calc</div>
            )}
          </div>

          {template.papers.map((paper, pi) => {
            const paperMode = template.marksPreset[pi] ? (entryMode === 'marks' ? 'marks' : 'counts') : 'manual';
            return (
            <div key={pi} className="card" style={{ padding: 16, background: 'var(--bg-elevated)' }}>
              {template.pattern === 'dual' && (
                <div className="flex items-center justify-between mb-3">
                  <p className="section-label">Paper {pi + 1}</p>
                  <span className="badge" style={{ background: template.marksPreset[pi] ? 'var(--success-bg)' : 'var(--warning-bg)', color: template.marksPreset[pi] ? 'var(--success)' : 'var(--warning)', borderColor: template.marksPreset[pi] ? 'rgba(34,197,94,0.2)' : 'rgba(245,166,35,0.2)' }}>
                    {template.marksPreset[pi] ? 'Preset' : 'Manual'}
                  </span>
                </div>
              )}
              {paperMode === 'counts' ? (
                <div className="space-y-2">
                  {paper.map((s, si) => {
                    const inp = paperInputs[pi]?.[si] ?? { correct: '', incorrect: '', unattempted: '' };
                    const sc: SubjectScore = computeSubjectScore(s, parseInt(inp.correct) || 0, parseInt(inp.incorrect) || 0, parseInt(inp.unattempted) || 0);
                    return (
                      <div key={s.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end" style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border-subtle)' }}>
                        <div className="md:col-span-3">
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{s.numQuestions}Q · +{s.marksPerCorrect} / {s.negativePerWrong}</p>
                        </div>
                        <div className="md:col-span-2"><label className="field-label" style={{ marginBottom: 3 }}>Correct</label><input type="number" className="field" style={{ padding: '7px 10px', fontSize: 13 }} value={inp.correct} onChange={e => { const np = [...paperInputs]; np[pi] = [...(np[pi] ?? [])]; np[pi][si] = { ...inp, correct: e.target.value }; setPaperInputs(np); }} min={0} /></div>
                        <div className="md:col-span-2"><label className="field-label" style={{ marginBottom: 3 }}>Wrong</label><input type="number" className="field" style={{ padding: '7px 10px', fontSize: 13 }} value={inp.incorrect} onChange={e => { const np = [...paperInputs]; np[pi] = [...(np[pi] ?? [])]; np[pi][si] = { ...inp, incorrect: e.target.value }; setPaperInputs(np); }} min={0} /></div>
                        <div className="md:col-span-2"><label className="field-label" style={{ marginBottom: 3 }}>Unattempted</label><input type="number" className="field" style={{ padding: '7px 10px', fontSize: 13 }} value={inp.unattempted} onChange={e => { const np = [...paperInputs]; np[pi] = [...(np[pi] ?? [])]; np[pi][si] = { ...inp, unattempted: e.target.value }; setPaperInputs(np); }} min={0} /></div>
                        <div className="md:col-span-3" style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 16, fontWeight: 700, color: sc.score >= 0 ? 'var(--success)' : 'var(--danger)' }}>{sc.score.toFixed(1)}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>of {sc.maxScore} · {sc.accuracy.toFixed(0)}% acc</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : paperMode === 'manual' ? (
                <div className="space-y-2">
                  {paper.map((s, si) => {
                    const inp = manualInputs[pi]?.[si] ?? { marksObtained: '', negativeMarks: '', correct: '', incorrect: '', unattempted: '' };
                    const score = (parseFloat(inp.marksObtained) || 0) - (parseFloat(inp.negativeMarks) || 0);
                    const maxScore = s.numQuestions * s.marksPerCorrect;
                    const correct = parseInt(inp.correct) || 0;
                    const wrong = parseInt(inp.incorrect) || 0;
                    const unattempted = parseInt(inp.unattempted) || 0;
                    const attempted = correct + wrong;
                    const mismatch = attempted !== unattempted && (correct > 0 || wrong > 0 || unattempted > 0);
                    const exceedsTotal = unattempted > s.numQuestions && unattempted > 0;
                    return (
                      <div key={s.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end" style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border-subtle)' }}>
                        <div className="md:col-span-3">
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{s.numQuestions}Q · Max {maxScore}</p>
                        </div>
                        <div className="md:col-span-2"><label className="field-label" style={{ marginBottom: 3 }}>Marks Got</label><input type="number" step="0.5" className="field" style={{ padding: '7px 10px', fontSize: 13 }} value={inp.marksObtained} onChange={e => { const np = [...manualInputs]; np[pi] = [...(np[pi] ?? [])]; np[pi][si] = { ...inp, marksObtained: e.target.value }; setManualInputs(np); }} min={0} /></div>
                        <div className="md:col-span-2"><label className="field-label" style={{ marginBottom: 3 }}>Neg. Marks</label><input type="number" step="0.5" className="field" style={{ padding: '7px 10px', fontSize: 13 }} value={inp.negativeMarks} onChange={e => { const np = [...manualInputs]; np[pi] = [...(np[pi] ?? [])]; np[pi][si] = { ...inp, negativeMarks: e.target.value }; setManualInputs(np); }} min={0} /></div>
                        <div className="md:col-span-1"><label className="field-label" style={{ marginBottom: 3 }}>Correct</label><input type="number" className="field" style={{ padding: '7px 10px', fontSize: 13 }} value={inp.correct} onChange={e => { const np = [...manualInputs]; np[pi] = [...(np[pi] ?? [])]; np[pi][si] = { ...inp, correct: e.target.value }; setManualInputs(np); }} min={0} /></div>
                        <div className="md:col-span-1"><label className="field-label" style={{ marginBottom: 3 }}>Wrong</label><input type="number" className="field" style={{ padding: '7px 10px', fontSize: 13 }} value={inp.incorrect} onChange={e => { const np = [...manualInputs]; np[pi] = [...(np[pi] ?? [])]; np[pi][si] = { ...inp, incorrect: e.target.value }; setManualInputs(np); }} min={0} /></div>
                        <div className="md:col-span-1"><label className="field-label" style={{ marginBottom: 3 }}>Unatt.</label><input type="number" className="field" style={{ padding: '7px 10px', fontSize: 13 }} value={inp.unattempted} onChange={e => { const np = [...manualInputs]; np[pi] = [...(np[pi] ?? [])]; np[pi][si] = { ...inp, unattempted: e.target.value }; setManualInputs(np); }} min={0} /></div>
                        <div className="md:col-span-2" style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 16, fontWeight: 700, color: score >= 0 ? 'var(--success)' : 'var(--danger)' }}>{score.toFixed(1)}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>of {maxScore}</p>
                          {mismatch && <p style={{ fontSize: 9, color: 'var(--danger)', fontWeight: 600, marginTop: 2 }}>C+W≠Unatt</p>}
                          {exceedsTotal && <p style={{ fontSize: 9, color: 'var(--danger)', fontWeight: 600 }}>Exceeds {s.numQuestions}Q</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <label className="field-label">Total Marks for Paper {pi + 1}</label>
                  <input type="number" step="0.5" className="field" style={{ fontSize: 18, fontWeight: 700 }} value={directMarks[pi] ?? ''} onChange={e => { const nd = [...directMarks]; nd[pi] = e.target.value; setDirectMarks(nd); }} placeholder={`Max: ${paper.reduce((a, s) => a + s.numQuestions * s.marksPerCorrect, 0)}`} />
                </div>
              )}
              {paperMode !== 'marks' && (
                <div className="flex items-center justify-between mt-3" style={{ paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Paper {pi + 1} Subtotal</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{livePapers[pi]?.totalScore.toFixed(1)} / {livePapers[pi]?.maxScore.toFixed(0)}</span>
                </div>
              )}
            </div>
          );})}

          {/* Live totals */}
          <div className="card" style={{ padding: 16, background: 'var(--bg-surface)' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Total Score</p><p className="stat-number" style={{ fontSize: 24, color: 'var(--accent)' }}>{liveTotal.toFixed(1)}</p><p style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>/ {liveMax}</p></div>
              <div><p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Percentage</p><p className="stat-number" style={{ fontSize: 24, color: livePct >= 70 ? 'var(--success)' : livePct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{livePct.toFixed(1)}%</p></div>
              <div><p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Accuracy</p><p className="stat-number" style={{ fontSize: 24 }}>{liveAccuracy.toFixed(1)}%</p><p style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{liveCorrect}C / {liveIncorrect}W / {liveUnattempted}U</p></div>
              <div><p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Neg. Marking Loss</p><p className="stat-number" style={{ fontSize: 24, color: liveMarksLost > 0 ? 'var(--danger)' : 'var(--text-tertiary)' }}>-{liveMarksLost.toFixed(1)}</p></div>
            </div>
            {target > 0 && (
              <div className="flex items-center gap-2 mt-3" style={{ paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                {achieved ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} /> : <Target size={16} style={{ color: 'var(--warning)' }} />}
                <span style={{ fontSize: 13, fontWeight: 600, color: achieved ? 'var(--success)' : 'var(--warning)' }}>
                  {achieved ? `Target achieved! (${liveTotal.toFixed(1)} / ${target})` : `${(target - liveTotal).toFixed(1)} marks short of target (${target})`}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="btn-ghost">Back</button>
            <button onClick={() => setStep(4)} className="btn-primary">Next <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} /></button>
          </div>
        </div>
      )}

      {/* Step 4: Review + wrong questions */}
      {step === 4 && template && (
        <div className="space-y-4">
          <div className="card" style={{ padding: 16, background: 'var(--bg-elevated)' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Test</p><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{attemptName}</p></div>
              <div><p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Template</p><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{template.name}</p></div>
              <div><p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Score</p><p style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{liveTotal.toFixed(1)} / {liveMax}</p></div>
              <div><p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Percentage</p><p style={{ fontSize: 14, fontWeight: 700, color: livePct >= 70 ? 'var(--success)' : 'var(--warning)' }}>{livePct.toFixed(1)}%</p></div>
            </div>
          </div>

          <div className="card" style={{ padding: 16, background: 'var(--bg-elevated)' }}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={addToLedger} onChange={e => { setAddToLedger(e.target.checked); if (e.target.checked && wrongQuestions.length === 0) setWrongQuestions([{ chapter: '', errorCategory: 'Calculation' }]); }} style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Add wrong questions to Mistake Ledger?</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Tag each wrong question type with chapter and error category</p>
              </div>
            </label>
            {addToLedger && (
              <div className="space-y-2 mt-3">
                {wrongQuestions.map((wq, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div className="md:col-span-7"><label className="field-label" style={{ marginBottom: 3 }}>Chapter / Topic</label><input className="field" style={{ padding: '7px 10px', fontSize: 13 }} value={wq.chapter} onChange={e => { const nw = [...wrongQuestions]; nw[i] = { ...wq, chapter: e.target.value }; setWrongQuestions(nw); }} placeholder="e.g. Rotational Motion" /></div>
                    <div className="md:col-span-4"><label className="field-label" style={{ marginBottom: 3 }}>Error Type</label><select className="field" style={{ padding: '7px 10px', fontSize: 13 }} value={wq.errorCategory} onChange={e => { const nw = [...wrongQuestions]; nw[i] = { ...wq, errorCategory: e.target.value }; setWrongQuestions(nw); }}><option>Calculation</option><option>Conceptual Gap</option><option>Formula Misapplication</option><option>Question Misread</option><option>Careless/Silly</option></select></div>
                    <div className="md:col-span-1 flex items-end"><button onClick={() => setWrongQuestions(wrongQuestions.filter((_, j) => j !== i))} style={{ padding: '7px', borderRadius: 'var(--radius-button)', background: 'var(--danger-bg)', border: '1px solid rgba(245,69,92,0.15)', color: 'var(--danger)', cursor: 'pointer' }}><X size={13} /></button></div>
                  </div>
                ))}
                <button onClick={() => setWrongQuestions([...wrongQuestions, { chapter: '', errorCategory: 'Calculation' }])} className="btn-ghost" style={{ fontSize: 12 }}><Plus size={13} />Add Another</button>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="btn-ghost">Back</button>
            <button onClick={handleSave} className="btn-primary" style={{ background: 'var(--success)' }}><Save size={14} />Save Test +30 XP</button>
          </div>
        </div>
      )}
    </div>
  );
}
