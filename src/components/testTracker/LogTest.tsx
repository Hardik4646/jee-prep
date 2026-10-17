import { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Save,
  ChevronRight,
  CheckCircle2,
  Target,
  AlertTriangle,
  Star,
  Clock,
  Layers,
} from 'lucide-react';
import {
  ExamTemplate,
  TestAttempt,
  TestSourceType,
  SubjectScore,
  PaperScore,
  PaperSubjectTiming,
  WrongQuestionLogInput,
  Subject,
  ErrorCategory,
} from '../../types';
import {
  genId,
  computeSubjectScore,
  computePaperScore,
  subjectMaxScore,
  normalizeCanonicalSubject,
  TEST_TYPES,
  PAPER_DURATION_MINUTES,
} from './helpers';
import { VALID_SUBJECTS, VALID_CATEGORIES, sanitizeText } from '../../utils/security';
import { format } from 'date-fns';

interface LogTestProps {
  templates: ExamTemplate[];
  onSave: (a: TestAttempt, wrongQuestions: WrongQuestionLogInput[]) => void;
  onCancel: () => void;
  editing?: TestAttempt | null;
}

interface PaperTimeInput {
  physics: string;
  chemistry: string;
  maths: string;
}

export function LogTest({ templates, onSave, onCancel, editing }: LogTestProps) {
  const [step, setStep] = useState(editing ? 2 : 1);
  const [templateId, setTemplateId] = useState(editing?.templateId ?? (templates[0]?.id ?? ''));
  const [attemptName, setAttemptName] = useState(editing?.attemptName ?? '');
  const [date, setDate] = useState(editing?.date ?? format(new Date(), 'yyyy-MM-dd'));
  const [testType, setTestType] = useState<TestSourceType>(editing?.testType ?? 'Mock Test');
  const [difficulty, setDifficulty] = useState(editing?.difficultyRating ?? 3);
  const [notes, setNotes] = useState(editing?.notes ?? '');

  const template = templates.find(t => t.id === templateId);

  const [entryMode, setEntryMode] = useState<'counts' | 'marks' | 'manual'>(() => {
    if (!editing) {
      const initialTpl = templates[0];
      return initialTpl?.marksPreset.every(Boolean) ? 'counts' : 'manual';
    }
    const tpl = templates.find(t => t.id === editing.templateId);
    return tpl?.marksPreset.every(Boolean) ? 'counts' : 'manual';
  });

  // Per-paper subject timings: 1 item for JEE Main (single), 2 items for JEE Advanced (dual)
  const [paperTimeInputs, setPaperTimeInputs] = useState<PaperTimeInput[]>(() => {
    if (editing) {
      if (editing.paperTimings && editing.paperTimings.length > 0) {
        return editing.paperTimings.map(pt => ({
          physics: pt.physics > 0 ? String(pt.physics) : '',
          chemistry: pt.chemistry > 0 ? String(pt.chemistry) : '',
          maths: pt.maths > 0 ? String(pt.maths) : '',
        }));
      }
      // Reconstruct from papers or legacy top-level subject times
      if (editing.pattern === 'dual' && editing.papers.length >= 2) {
        return editing.papers.map(p => ({
          physics: p.timePhysics ? String(p.timePhysics) : '',
          chemistry: p.timeChemistry ? String(p.timeChemistry) : '',
          maths: p.timeMaths ? String(p.timeMaths) : '',
        }));
      }
      return [
        {
          physics: editing.timePhysics ? String(editing.timePhysics) : '',
          chemistry: editing.timeChemistry ? String(editing.timeChemistry) : '',
          maths: editing.timeMaths ? String(editing.timeMaths) : '',
        },
      ];
    }
    const initialTpl = templates[0];
    const count = initialTpl?.pattern === 'dual' ? 2 : 1;
    return Array.from({ length: count }, () => ({ physics: '60', chemistry: '50', maths: '65' }));
  });

  const [paperInputs, setPaperInputs] = useState<
    { correct: string; incorrect: string; unattempted: string }[][]
  >(() => {
    if (editing) {
      return editing.papers.map(p =>
        p.subjects.map(s => ({
          correct: String(s.correct),
          incorrect: String(s.incorrect),
          unattempted: String(s.unattempted),
        }))
      );
    }
    const initialTpl = templates[0];
    return initialTpl
      ? initialTpl.papers.map(paper =>
          paper.map(s => ({ correct: '', incorrect: '', unattempted: String(s.numQuestions) }))
        )
      : [];
  });

  const [directMarks, setDirectMarks] = useState<string[]>(() =>
    editing ? editing.papers.map(p => String(p.totalScore)) : templates[0]?.papers.map(() => '') ?? []
  );

  const [manualInputs, setManualInputs] = useState<
    {
      marksObtained: string;
      negativeMarks: string;
      correct: string;
      incorrect: string;
      unattempted: string;
    }[][]
  >(() => {
    if (editing) {
      return editing.papers.map(p =>
        p.subjects.map(s => ({
          marksObtained: String(s.score + (s.marksLostToNegative ?? 0)),
          negativeMarks: String(s.marksLostToNegative ?? 0),
          correct: String(s.correct),
          incorrect: String(s.incorrect),
          unattempted: String(s.unattempted),
        }))
      );
    }
    const initialTpl = templates[0];
    return initialTpl
      ? initialTpl.papers.map(paper =>
          paper.map(s => ({
            marksObtained: '',
            negativeMarks: '',
            correct: '',
            incorrect: '',
            unattempted: String(s.numQuestions),
          }))
        )
      : [];
  });

  const [percentile, setPercentile] = useState(
    editing?.percentile !== undefined ? String(editing.percentile) : ''
  );
  const [targetScore, setTargetScore] = useState(
    editing?.targetScore !== undefined ? String(editing.targetScore) : ''
  );
  const [addToLedger, setAddToLedger] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestionLogInput[]>([
    {
      subject: 'Physics',
      chapter: '',
      errorCategory: 'Conceptual Gap',
      marksLost: 5,
      questionTimeSeconds: 180,
      notes: '',
    },
  ]);

  const selectTemplate = (id: string) => {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    setTemplateId(id);
    setPaperInputs(
      tpl.papers.map(paper =>
        paper.map(s => ({ correct: '', incorrect: '', unattempted: String(s.numQuestions) }))
      )
    );
    setDirectMarks(tpl.papers.map(() => ''));
    setManualInputs(
      tpl.papers.map(paper =>
        paper.map(s => ({
          marksObtained: '',
          negativeMarks: '',
          correct: '',
          incorrect: '',
          unattempted: String(s.numQuestions),
        }))
      )
    );
    setPaperTimeInputs(
      Array.from({ length: tpl.pattern === 'dual' ? 2 : 1 }, () => ({
        physics: '60',
        chemistry: '50',
        maths: '65',
      }))
    );
    setEntryMode(tpl.marksPreset.every(Boolean) ? 'counts' : 'manual');
  };

  // Parsed per-paper timing breakdown
  const parsedPaperTimings: PaperSubjectTiming[] = useMemo(() => {
    const paperCount = template?.pattern === 'dual' ? 2 : 1;
    return Array.from({ length: paperCount }, (_, pi) => {
      const inp = paperTimeInputs[pi] ?? { physics: '', chemistry: '', maths: '' };
      return {
        physics: Math.max(0, parseInt(inp.physics) || 0),
        chemistry: Math.max(0, parseInt(inp.chemistry) || 0),
        maths: Math.max(0, parseInt(inp.maths) || 0),
      };
    });
  }, [template, paperTimeInputs]);

  const paperTimeTotals = useMemo(
    () => parsedPaperTimings.map(pt => pt.physics + pt.chemistry + pt.maths),
    [parsedPaperTimings]
  );

  // Strict validation: each 3-hour paper must not exceed 180 minutes
  const paperExceedsFlags = useMemo(
    () => paperTimeTotals.map(tot => tot > PAPER_DURATION_MINUTES),
    [paperTimeTotals]
  );
  const anyPaperTimeExceeds = paperExceedsFlags.some(Boolean);

  // Aggregated subject times across all papers (1 paper for JEE Main, 2 papers for JEE Advanced)
  const aggregatedTimePhysics = parsedPaperTimings.reduce((s, p) => s + p.physics, 0);
  const aggregatedTimeChemistry = parsedPaperTimings.reduce((s, p) => s + p.chemistry, 0);
  const aggregatedTimeMaths = parsedPaperTimings.reduce((s, p) => s + p.maths, 0);
  const aggregatedTotalTime = aggregatedTimePhysics + aggregatedTimeChemistry + aggregatedTimeMaths;
  const maxExamMinutes = (template?.pattern === 'dual' ? 2 : 1) * PAPER_DURATION_MINUTES;

  const livePapers: PaperScore[] = useMemo(() => {
    if (!template) return [];
    return template.papers.map((paper, pi) => {
      const pTiming = parsedPaperTimings[pi] ?? { physics: 0, chemistry: 0, maths: 0 };
      const pTotalTime = pTiming.physics + pTiming.chemistry + pTiming.maths;
      const mode = template.marksPreset[pi] ? (entryMode === 'marks' ? 'marks' : 'counts') : 'manual';

      if (mode === 'marks') {
        const dm = parseFloat(directMarks[pi] ?? '') || 0;
        return {
          subjects: paper.map(s => {
            const canonical = normalizeCanonicalSubject(s.name);
            return {
              subjectName: s.name,
              correct: 0,
              incorrect: 0,
              unattempted: 0,
              score: Number((dm / Math.max(1, paper.length)).toFixed(2)),
              maxScore: subjectMaxScore(s, template),
              accuracy: 0,
              marksLostToNegative: 0,
              timeSpentMinutes: canonical ? pTiming[canonical] : undefined,
              targetMinutes: s.targetMinutes ?? SUBJECT_TARGET_MINUTES_PER_PAPER,
              totalQuestions: s.numQuestions,
            };
          }),
          totalScore: dm,
          maxScore: paper.reduce((a, s) => a + subjectMaxScore(s, template), 0),
          totalCorrect: 0,
          totalIncorrect: 0,
          totalUnattempted: 0,
          totalQuestions: paper.reduce((a, s) => a + s.numQuestions, 0),
          accuracy: 0,
          marksLostToNegative: 0,
          timePhysics: pTiming.physics || undefined,
          timeChemistry: pTiming.chemistry || undefined,
          timeMaths: pTiming.maths || undefined,
          timeTakenMinutes: pTotalTime || undefined,
          targetDurationMinutes: PAPER_DURATION_MINUTES,
        };
      }

      if (mode === 'manual') {
        const inputs = manualInputs[pi] ?? [];
        const subjScores: SubjectScore[] = paper.map((s, si) => {
          const inp = inputs[si] ?? {
            marksObtained: '',
            negativeMarks: '',
            correct: '',
            incorrect: '',
            unattempted: '',
          };
          const positiveMarks = parseFloat(inp.marksObtained) || 0;
          const neg = Math.abs(parseFloat(inp.negativeMarks) || 0);
          const correct = Math.max(0, parseInt(inp.correct) || 0);
          const incorrect = Math.max(0, parseInt(inp.incorrect) || 0);
          const unattempted = Math.max(
            0,
            inp.unattempted !== ''
              ? parseInt(inp.unattempted) || 0
              : s.numQuestions - correct - incorrect
          );
          const maxScore = subjectMaxScore(s, template);
          const attempted = correct + incorrect;
          const accuracy = attempted > 0 ? Number(((correct / attempted) * 100).toFixed(2)) : 0;
          const canonical = normalizeCanonicalSubject(s.name);
          return {
            subjectName: s.name,
            correct,
            incorrect,
            unattempted,
            score: Number((positiveMarks - neg).toFixed(2)),
            maxScore,
            accuracy,
            marksLostToNegative: Number(neg.toFixed(2)),
            timeSpentMinutes: canonical ? pTiming[canonical] : undefined,
            targetMinutes: s.targetMinutes ?? SUBJECT_TARGET_MINUTES_PER_PAPER,
            totalQuestions: s.numQuestions,
          };
        });
        const totC = subjScores.reduce((a, b) => a + b.correct, 0);
        const totW = subjScores.reduce((a, b) => a + b.incorrect, 0);
        return {
          subjects: subjScores,
          totalScore: Number(subjScores.reduce((a, b) => a + b.score, 0).toFixed(2)),
          maxScore: Number(subjScores.reduce((a, b) => a + b.maxScore, 0).toFixed(2)),
          totalCorrect: totC,
          totalIncorrect: totW,
          totalUnattempted: subjScores.reduce((a, b) => a + b.unattempted, 0),
          totalQuestions: paper.reduce((a, s) => a + s.numQuestions, 0),
          accuracy: totC + totW > 0 ? Number(((totC / (totC + totW)) * 100).toFixed(2)) : 0,
          marksLostToNegative: Number(
            subjScores.reduce((a, b) => a + (b.marksLostToNegative ?? 0), 0).toFixed(2)
          ),
          timePhysics: pTiming.physics || undefined,
          timeChemistry: pTiming.chemistry || undefined,
          timeMaths: pTiming.maths || undefined,
          timeTakenMinutes: pTotalTime || undefined,
          targetDurationMinutes: PAPER_DURATION_MINUTES,
        };
      }

      const inputs = paperInputs[pi] ?? [];
      return computePaperScore(
        paper,
        inputs.map((i, si) => {
          const c = Math.max(0, parseInt(i?.correct ?? '') || 0);
          const w = Math.max(0, parseInt(i?.incorrect ?? '') || 0);
          const maxQ = paper[si]?.numQuestions ?? 25;
          const u =
            i?.unattempted !== undefined && i.unattempted !== ''
              ? Math.max(0, parseInt(i.unattempted) || 0)
              : Math.max(0, maxQ - c - w);
          return { correct: c, incorrect: w, unattempted: u };
        }),
        template,
        pTiming
      );
    });
  }, [template, paperInputs, directMarks, manualInputs, entryMode, parsedPaperTimings]);

  const liveTotal = Number(livePapers.reduce((a, p) => a + p.totalScore, 0).toFixed(2));
  const liveMax = Number(livePapers.reduce((a, p) => a + p.maxScore, 0).toFixed(2));
  const liveCorrect = livePapers.reduce((a, p) => a + p.totalCorrect, 0);
  const liveIncorrect = livePapers.reduce((a, p) => a + p.totalIncorrect, 0);
  const liveUnattempted = livePapers.reduce((a, p) => a + p.totalUnattempted, 0);
  const liveTotalQ = livePapers.reduce((a, p) => a + p.totalQuestions, 0);
  const liveAccuracy =
    liveCorrect + liveIncorrect > 0
      ? Number(((liveCorrect / (liveCorrect + liveIncorrect)) * 100).toFixed(2))
      : 0;
  const livePct = liveMax > 0 ? Number(((liveTotal / liveMax) * 100).toFixed(2)) : 0;
  const liveMarksLost = Number(
    livePapers.reduce((a, p) => a + (p.marksLostToNegative ?? 0), 0).toFixed(2)
  );

  const target = parseFloat(targetScore) || 0;
  const achieved = target > 0 ? liveTotal >= target : livePct >= 70;

  const canSave =
    !!template && attemptName.trim().length > 0 && liveMax > 0 && !anyPaperTimeExceeds;

  const handleSave = () => {
    if (!template || !canSave) return;
    const attempt: TestAttempt = {
      id: editing?.id ?? genId(),
      templateId: template.id,
      templateName: template.name,
      pattern: template.pattern,
      testType,
      attemptName: sanitizeText(attemptName, 160),
      date,
      timeTakenMinutes: aggregatedTotalTime > 0 ? aggregatedTotalTime : undefined,
      timePhysics: aggregatedTimePhysics > 0 ? aggregatedTimePhysics : undefined,
      timeChemistry: aggregatedTimeChemistry > 0 ? aggregatedTimeChemistry : undefined,
      timeMaths: aggregatedTimeMaths > 0 ? aggregatedTimeMaths : undefined,
      paperTimings: parsedPaperTimings,
      difficultyRating: difficulty || undefined,
      notes: sanitizeText(notes, 2000) || undefined,
      papers: livePapers,
      totalScore: liveTotal,
      maxScore: liveMax,
      percentage: livePct,
      accuracy: liveAccuracy,
      totalCorrect: liveCorrect,
      totalIncorrect: liveIncorrect,
      totalUnattempted: liveUnattempted,
      totalQuestions: liveTotalQ,
      marksLostToNegative: liveMarksLost,
      percentile: percentile ? parseFloat(percentile) : undefined,
      targetScore: target > 0 ? target : undefined,
      targetAchieved: achieved,
      createdAt: editing?.createdAt ?? Date.now(),
    };
    onSave(attempt, addToLedger ? wrongQuestions : []);
  };

  if (templates.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3" style={{ padding: '64px 24px' }}>
        <AlertTriangle size={28} style={{ color: 'var(--text-tertiary)' }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
          No exam templates available
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Create a JEE Main or JEE Advanced template first to log a test
        </p>
        <button onClick={onCancel} className="btn-ghost" style={{ marginTop: 8 }}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="card animate-slide-down" style={{ padding: 24 }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="card-title">{editing ? 'Edit Test Event' : 'Log Test Event'}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {template?.pattern === 'dual'
              ? 'JEE Advanced Unified Event — Tracks Paper 1 (180m) & Paper 2 (180m) independently'
              : 'JEE Main Single Paper Mode — 180m total (Ideal: 50m Physics · 40m Chemistry · 90m Maths)'}
          </p>
        </div>
        <button onClick={onCancel} className="btn-ghost" style={{ padding: '7px 9px' }}>
          <X size={15} />
        </button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { n: 1, label: 'Exam Mode & Template' },
          { n: 2, label: 'Event & Subject Timings' },
          { n: 3, label: 'Paper-wise Scores' },
          { n: 4, label: 'Review & Mistake Sync' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2" style={{ flex: i < 3 ? 1 : undefined }}>
            <button
              type="button"
              onClick={() => {
                if (template && (s.n < step || attemptName.trim())) setStep(s.n);
              }}
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                border: '1px solid',
                borderColor: step >= s.n ? 'var(--accent)' : 'var(--border-subtle)',
                background:
                  step > s.n
                    ? 'var(--accent)'
                    : step === s.n
                    ? 'var(--accent-muted-bg)'
                    : 'var(--bg-elevated)',
                color: step > s.n ? '#fff' : step === s.n ? 'var(--accent)' : 'var(--text-tertiary)',
                cursor: 'pointer',
              }}
            >
              {step > s.n ? '✓' : s.n}
            </button>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: step >= s.n ? 'var(--text-primary)' : 'var(--text-tertiary)',
                whiteSpace: 'nowrap',
              }}
              className="hidden sm:inline"
            >
              {s.label}
            </span>
            {i < 3 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: step > s.n ? 'var(--accent)' : 'var(--border-subtle)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Template */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="body-text">
            Select an exam blueprint (JEE Main Single 3-Hr Paper or JEE Advanced Dual 2×3-Hr Event):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map(tpl => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => selectTemplate(tpl.id)}
                style={{
                  textAlign: 'left',
                  padding: 16,
                  borderRadius: 'var(--radius-card)',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  border: '1px solid',
                  borderColor:
                    templateId === tpl.id ? 'rgba(13,148,136,0.45)' : 'var(--border-subtle)',
                  background:
                    templateId === tpl.id ? 'var(--accent-muted-bg)' : 'var(--bg-elevated)',
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: templateId === tpl.id ? 'var(--accent)' : 'var(--text-primary)',
                    }}
                  >
                    {tpl.name}
                  </span>
                  {templateId === tpl.id && (
                    <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {tpl.pattern === 'single' ? 'JEE Main (1 × 180m)' : 'JEE Advanced (2 × 180m)'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-num">{tpl.totalQuestions} Q</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-num">{tpl.totalMaxMarks} Marks</span>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!templateId}
              className="btn-primary"
              style={{ opacity: templateId ? 1 : 0.5 }}
            >
              Continue <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Details & Strict Subject-Wise Paper Timings */}
      {step === 2 && template && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="field-label">Test Event Name</label>
              <input
                className="field"
                value={attemptName}
                onChange={e => setAttemptName(e.target.value)}
                placeholder={
                  template.pattern === 'dual'
                    ? 'e.g. JEE Advanced AITS Full Test #3'
                    : 'e.g. JEE Main Full Syllabus Mock #8'
                }
                autoFocus
              />
            </div>
            <div>
              <label className="field-label">Test Date</label>
              <input
                type="date"
                className="field tabular-num"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="field-label">Source Type</label>
              <select
                className="field"
                value={testType}
                onChange={e => setTestType(e.target.value as TestSourceType)}
              >
                {TEST_TYPES.map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Percentile (optional)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                className="field tabular-num"
                value={percentile}
                onChange={e => setPercentile(e.target.value)}
                placeholder="99.45"
              />
            </div>
            <div>
              <label className="field-label">Target Score (optional)</label>
              <input
                type="number"
                className="field tabular-num"
                value={targetScore}
                onChange={e => setTargetScore(e.target.value)}
                placeholder={`${Math.round(template.totalMaxMarks * 0.7)}`}
              />
            </div>
            <div>
              <label className="field-label">Perceived Difficulty</label>
              <div className="flex gap-1 items-center" style={{ paddingTop: 6 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDifficulty(difficulty === n ? 0 : n)}
                    style={{
                      padding: 4,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Star
                      size={17}
                      fill={n <= difficulty ? 'var(--warning)' : 'none'}
                      stroke={n <= difficulty ? 'var(--warning)' : 'var(--text-tertiary)'}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Strict Subject-Wise Timing Architecture */}
          <div className="card-elevated" style={{ padding: 16 }}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Clock size={14} style={{ color: 'var(--accent)' }} />
                <span className="section-label">
                  {template.pattern === 'dual'
                    ? 'JEE Advanced Dual-Paper Timing (Paper 1: 180m + Paper 2: 180m)'
                    : 'JEE Main 3-Hour Timing Split (Ideal: 50m Physics · 40m Chemistry · 90m Maths)'}
                </span>
              </div>
              <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                Event Total: {aggregatedTotalTime} / {maxExamMinutes} min
              </span>
            </div>

            <div className="space-y-3">
              {Array.from({ length: template.pattern === 'dual' ? 2 : 1 }, (_, pi) => {
                const ptInp = paperTimeInputs[pi] ?? { physics: '', chemistry: '', maths: '' };
                const pTot = paperTimeTotals[pi] ?? 0;
                const pExceeds = paperExceedsFlags[pi] ?? false;

                const updatePaperTime = (field: keyof PaperTimeInput, val: string) => {
                  setPaperTimeInputs(prev => {
                    const next = [...prev];
                    next[pi] = { ...(next[pi] ?? { physics: '', chemistry: '', maths: '' }), [field]: val };
                    return next;
                  });
                };

                return (
                  <div
                    key={pi}
                    style={{
                      padding: 12,
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-button)',
                      border: `1px solid ${pExceeds ? 'rgba(244,63,94,0.4)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                        <Layers size={12} style={{ color: 'var(--accent)' }} />
                        {template.pattern === 'dual' ? `Paper ${pi + 1} Subject Allocation` : 'Single Paper Subject Allocation'}
                      </span>
                      <span
                        className="text-xs font-mono font-semibold"
                        style={{ color: pExceeds ? 'var(--danger)' : 'var(--success)' }}
                      >
                        {pTot} / {PAPER_DURATION_MINUTES} min{' '}
                        {pExceeds
                          ? `(Exceeds by ${pTot - PAPER_DURATION_MINUTES}m)`
                          : `(${PAPER_DURATION_MINUTES - pTot}m buffer)`}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { key: 'physics' as const, label: 'Physics (Ideal 50m)', ideal: 50 },
                        { key: 'chemistry' as const, label: 'Chemistry (Ideal 40m)', ideal: 40 },
                        { key: 'maths' as const, label: 'Mathematics (Ideal 90m)', ideal: 90 },
                      ]).map(sub => {
                        const valNum = parseInt(ptInp[sub.key]) || 0;
                        const delta = valNum - sub.ideal;
                        return (
                          <div key={sub.key}>
                            <div className="flex items-center justify-between mb-1">
                              <label className="field-label" style={{ marginBottom: 0 }}>
                                {sub.label}
                              </label>
                              {valNum > 0 && (
                                <span
                                  className="text-[10px] font-mono"
                                  style={{
                                    color:
                                      delta > 10
                                        ? 'var(--warning)'
                                        : delta < -15
                                        ? 'var(--info)'
                                        : 'var(--text-tertiary)',
                                  }}
                                >
                                  {delta >= 0 ? `+${delta}m` : `${delta}m`}
                                </span>
                              )}
                            </div>
                            <input
                              type="number"
                              min={0}
                              max={180}
                              className="field tabular-num"
                              style={{ padding: '7px 10px', fontSize: 13 }}
                              value={ptInp[sub.key]}
                              onChange={e => updatePaperTime(sub.key, e.target.value)}
                              placeholder={String(sub.ideal)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {template.pattern === 'dual' && (
              <div
                className="grid grid-cols-3 gap-2 mt-3 pt-3 text-xs font-mono"
                style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <div>Combined Physics: {aggregatedTimePhysics}m / 100m</div>
                <div>Combined Chemistry: {aggregatedTimeChemistry}m / 80m</div>
                <div>Combined Maths: {aggregatedTimeMaths}m / 180m</div>
              </div>
            )}

            {anyPaperTimeExceeds && (
              <div
                style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-button)',
                  background: 'var(--danger-bg)',
                  border: '1px solid rgba(244,63,94,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertTriangle size={13} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: 'var(--danger)' }}>
                  Each 3-hour paper has a strict 180-minute ceiling. Please adjust subject minutes so no single paper exceeds 180 minutes.
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="field-label">Post-Test Reflection & Strategy Notes</label>
            <textarea
              className="field"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Which section caused a time bottleneck? Were negative marks due to guessing or calculation slips?"
              style={{ resize: 'none' }}
            />
          </div>

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="btn-ghost">
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!attemptName.trim() || anyPaperTimeExceeds}
              className="btn-primary"
              style={{ opacity: attemptName.trim() && !anyPaperTimeExceeds ? 1 : 0.5 }}
            >
              Enter Scores <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Paper-Wise & Subject-Wise Scores */}
      {step === 3 && template && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="section-label">
              {template.pattern === 'dual'
                ? 'JEE Advanced Unified Score Entry (Paper 1 & Paper 2)'
                : 'JEE Main Subject-Wise Score Entry'}
            </span>
            {template.marksPreset.every(Boolean) && (
              <div
                className="flex gap-1"
                style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-button)',
                  padding: 3,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {(['counts', 'manual', 'marks'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEntryMode(m)}
                    style={{
                      padding: '5px 11px',
                      borderRadius: 'var(--radius-badge)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      background: entryMode === m ? 'var(--accent)' : 'transparent',
                      color: entryMode === m ? '#fff' : 'var(--text-tertiary)',
                    }}
                  >
                    {m === 'counts'
                      ? 'By Question Counts'
                      : m === 'manual'
                      ? 'Marks + Negatives'
                      : 'Direct Paper Total'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {template.papers.map((paper, pi) => {
            const paperMode = template.marksPreset[pi] ? entryMode : 'manual';
            const pTiming = parsedPaperTimings[pi] ?? { physics: 0, chemistry: 0, maths: 0 };

            return (
              <div key={pi} className="card-elevated" style={{ padding: 16 }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="section-label">
                    {template.pattern === 'dual' ? `Paper ${pi + 1} (3 Hours)` : 'Single Paper Breakdown'}
                  </p>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                    P{pi + 1} Time: {(pTiming.physics || 0) + (pTiming.chemistry || 0) + (pTiming.maths || 0)}m / 180m
                  </span>
                </div>

                {paperMode === 'counts' ? (
                  <div className="space-y-2">
                    {paper.map((s, si) => {
                      const inp = paperInputs[pi]?.[si] ?? {
                        correct: '',
                        incorrect: '',
                        unattempted: String(s.numQuestions),
                      };
                      const cVal = Math.max(0, parseInt(inp.correct) || 0);
                      const wVal = Math.max(0, parseInt(inp.incorrect) || 0);
                      const uVal =
                        inp.unattempted !== ''
                          ? Math.max(0, parseInt(inp.unattempted) || 0)
                          : Math.max(0, s.numQuestions - cVal - wVal);
                      const canonical = normalizeCanonicalSubject(s.name);
                      const subjTime = canonical ? pTiming[canonical] : undefined;
                      const sc: SubjectScore = computeSubjectScore(
                        s,
                        cVal,
                        wVal,
                        uVal,
                        template,
                        subjTime
                      );

                      const handleCountChange = (field: 'correct' | 'incorrect' | 'unattempted', rawVal: string) => {
                        const np = [...paperInputs];
                        np[pi] = [...(np[pi] ?? [])];
                        const nextItem = { ...inp, [field]: rawVal };
                        if (field === 'correct' || field === 'incorrect') {
                          const newC = field === 'correct' ? parseInt(rawVal) || 0 : cVal;
                          const newW = field === 'incorrect' ? parseInt(rawVal) || 0 : wVal;
                          nextItem.unattempted = String(Math.max(0, s.numQuestions - newC - newW));
                        }
                        np[pi][si] = nextItem;
                        setPaperInputs(np);
                      };

                      return (
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
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                              {s.name}
                            </p>
                            <p className="font-mono" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                              {s.numQuestions}Q · +{s.marksPerCorrect} / {s.negativePerWrong}
                              {subjTime ? ` · ${subjTime}m` : ''}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="field-label" style={{ marginBottom: 3 }}>
                              Correct
                            </label>
                            <input
                              type="number"
                              className="field tabular-num"
                              style={{ padding: '7px 10px', fontSize: 13 }}
                              value={inp.correct}
                              onChange={e => handleCountChange('correct', e.target.value)}
                              min={0}
                              max={s.numQuestions}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="field-label" style={{ marginBottom: 3 }}>
                              Wrong
                            </label>
                            <input
                              type="number"
                              className="field tabular-num"
                              style={{ padding: '7px 10px', fontSize: 13 }}
                              value={inp.incorrect}
                              onChange={e => handleCountChange('incorrect', e.target.value)}
                              min={0}
                              max={s.numQuestions}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="field-label" style={{ marginBottom: 3 }}>
                              Unattempted
                            </label>
                            <input
                              type="number"
                              className="field tabular-num"
                              style={{ padding: '7px 10px', fontSize: 13 }}
                              value={inp.unattempted}
                              onChange={e => handleCountChange('unattempted', e.target.value)}
                              min={0}
                              max={s.numQuestions}
                            />
                          </div>
                          <div className="md:col-span-3" style={{ textAlign: 'right' }}>
                            <p
                              className="tabular-num"
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: sc.score >= 0 ? 'var(--success)' : 'var(--danger)',
                              }}
                            >
                              {sc.score.toFixed(1)}{' '}
                              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)' }}>
                                / {sc.maxScore.toFixed(0)}
                              </span>
                            </p>
                            <p className="tabular-num" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                              {sc.accuracy.toFixed(0)}% acc · -{(sc.marksLostToNegative ?? 0).toFixed(1)} neg
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : paperMode === 'manual' ? (
                  <div className="space-y-2">
                    {paper.map((s, si) => {
                      const inp = manualInputs[pi]?.[si] ?? {
                        marksObtained: '',
                        negativeMarks: '',
                        correct: '',
                        incorrect: '',
                        unattempted: String(s.numQuestions),
                      };
                      const posScore = parseFloat(inp.marksObtained) || 0;
                      const negMarks = Math.abs(parseFloat(inp.negativeMarks) || 0);
                      const netScore = posScore - negMarks;
                      const maxScore = subjectMaxScore(s, template);
                      const correct = Math.max(0, parseInt(inp.correct) || 0);
                      const wrong = Math.max(0, parseInt(inp.incorrect) || 0);
                      const unattempted = Math.max(0, parseInt(inp.unattempted) || 0);
                      const sumQ = correct + wrong + unattempted;
                      const mismatch =
                        (inp.correct !== '' || inp.incorrect !== '') && sumQ !== s.numQuestions;

                      return (
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
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                              {s.name}
                            </p>
                            <p className="font-mono" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                              {s.numQuestions}Q · Max {maxScore.toFixed(0)}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="field-label" style={{ marginBottom: 3 }}>
                              Gross Marks
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              className="field tabular-num"
                              style={{ padding: '7px 10px', fontSize: 13 }}
                              value={inp.marksObtained}
                              onChange={e => {
                                const np = [...manualInputs];
                                np[pi] = [...(np[pi] ?? [])];
                                np[pi][si] = { ...inp, marksObtained: e.target.value };
                                setManualInputs(np);
                              }}
                              min={0}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="field-label" style={{ marginBottom: 3 }}>
                              Neg. Lost
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              className="field tabular-num"
                              style={{ padding: '7px 10px', fontSize: 13 }}
                              value={inp.negativeMarks}
                              onChange={e => {
                                const np = [...manualInputs];
                                np[pi] = [...(np[pi] ?? [])];
                                np[pi][si] = { ...inp, negativeMarks: e.target.value };
                                setManualInputs(np);
                              }}
                              min={0}
                            />
                          </div>
                          <div className="md:col-span-1">
                            <label className="field-label" style={{ marginBottom: 3 }}>
                              Correct
                            </label>
                            <input
                              type="number"
                              className="field tabular-num"
                              style={{ padding: '7px 8px', fontSize: 13 }}
                              value={inp.correct}
                              onChange={e => {
                                const c = parseInt(e.target.value) || 0;
                                const np = [...manualInputs];
                                np[pi] = [...(np[pi] ?? [])];
                                np[pi][si] = {
                                  ...inp,
                                  correct: e.target.value,
                                  unattempted: String(Math.max(0, s.numQuestions - c - wrong)),
                                };
                                setManualInputs(np);
                              }}
                              min={0}
                            />
                          </div>
                          <div className="md:col-span-1">
                            <label className="field-label" style={{ marginBottom: 3 }}>
                              Wrong
                            </label>
                            <input
                              type="number"
                              className="field tabular-num"
                              style={{ padding: '7px 8px', fontSize: 13 }}
                              value={inp.incorrect}
                              onChange={e => {
                                const w = parseInt(e.target.value) || 0;
                                const np = [...manualInputs];
                                np[pi] = [...(np[pi] ?? [])];
                                np[pi][si] = {
                                  ...inp,
                                  incorrect: e.target.value,
                                  unattempted: String(Math.max(0, s.numQuestions - correct - w)),
                                };
                                setManualInputs(np);
                              }}
                              min={0}
                            />
                          </div>
                          <div className="md:col-span-1">
                            <label className="field-label" style={{ marginBottom: 3 }}>
                              Unatt.
                            </label>
                            <input
                              type="number"
                              className="field tabular-num"
                              style={{ padding: '7px 8px', fontSize: 13 }}
                              value={inp.unattempted}
                              onChange={e => {
                                const np = [...manualInputs];
                                np[pi] = [...(np[pi] ?? [])];
                                np[pi][si] = { ...inp, unattempted: e.target.value };
                                setManualInputs(np);
                              }}
                              min={0}
                            />
                          </div>
                          <div className="md:col-span-2" style={{ textAlign: 'right' }}>
                            <p
                              className="tabular-num"
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: netScore >= 0 ? 'var(--success)' : 'var(--danger)',
                              }}
                            >
                              {netScore.toFixed(1)}
                            </p>
                            <p className="tabular-num" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                              of {maxScore.toFixed(0)}
                            </p>
                            {mismatch && (
                              <p style={{ fontSize: 9.5, color: 'var(--warning)', fontWeight: 600 }}>
                                Sum = {sumQ}/{s.numQuestions}Q
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    <label className="field-label">Total Marks for Paper {pi + 1}</label>
                    <input
                      type="number"
                      step="0.5"
                      className="field tabular-num"
                      style={{ fontSize: 18, fontWeight: 700 }}
                      value={directMarks[pi] ?? ''}
                      onChange={e => {
                        const nd = [...directMarks];
                        nd[pi] = e.target.value;
                        setDirectMarks(nd);
                      }}
                      placeholder={`Max: ${paper.reduce((a, s) => a + subjectMaxScore(s, template), 0)}`}
                    />
                  </div>
                )}

                {paperMode !== 'marks' && (
                  <div
                    className="flex items-center justify-between mt-3"
                    style={{ paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {template.pattern === 'dual' ? `Paper ${pi + 1} Subtotal` : 'Paper Subtotal'}
                    </span>
                    <span className="tabular-num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {livePapers[pi]?.totalScore.toFixed(1)} / {livePapers[pi]?.maxScore.toFixed(0)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Live Combined Summary */}
          <div className="card" style={{ padding: 16, background: 'var(--bg-surface)' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>
                  Combined Score
                </p>
                <p className="stat-number" style={{ fontSize: 22, color: 'var(--accent)' }}>
                  {liveTotal.toFixed(1)}
                </p>
                <p className="tabular-num" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                  / {liveMax} marks
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>
                  Percentage
                </p>
                <p
                  className="stat-number"
                  style={{
                    fontSize: 22,
                    color:
                      livePct >= 70
                        ? 'var(--success)'
                        : livePct >= 50
                        ? 'var(--warning)'
                        : 'var(--danger)',
                  }}
                >
                  {livePct.toFixed(1)}%
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>
                  Accuracy
                </p>
                <p className="stat-number" style={{ fontSize: 22 }}>
                  {liveAccuracy.toFixed(1)}%
                </p>
                <p className="tabular-num" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                  {liveCorrect}C · {liveIncorrect}W · {liveUnattempted}U
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>
                  Neg. Marking Loss
                </p>
                <p
                  className="stat-number"
                  style={{
                    fontSize: 22,
                    color: liveMarksLost > 0 ? 'var(--danger)' : 'var(--text-tertiary)',
                  }}
                >
                  -{liveMarksLost.toFixed(1)}
                </p>
              </div>
            </div>
            {target > 0 && (
              <div
                className="flex items-center gap-2 mt-3"
                style={{ paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}
              >
                {achieved ? (
                  <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
                ) : (
                  <Target size={15} style={{ color: 'var(--warning)' }} />
                )}
                <span
                  className="tabular-num"
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: achieved ? 'var(--success)' : 'var(--warning)',
                  }}
                >
                  {achieved
                    ? `Target achieved (${liveTotal.toFixed(1)} / ${target})`
                    : `${(target - liveTotal).toFixed(1)} marks short of target (${target})`}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="btn-ghost">
              Back
            </button>
            <button type="button" onClick={() => setStep(4)} className="btn-primary">
              Review & Mistake Sync <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Mistake Sync */}
      {step === 4 && template && (
        <div className="space-y-4">
          <div className="card-elevated" style={{ padding: 16 }}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Test Event</p>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {attemptName}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Mode</p>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {template.pattern === 'dual' ? 'JEE Advanced (P1+P2)' : 'JEE Main (Single)'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Total Score</p>
                <p className="tabular-num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                  {liveTotal.toFixed(1)} / {liveMax} ({livePct.toFixed(1)}%)
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Subject Time (P/C/M)</p>
                <p className="tabular-num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {aggregatedTimePhysics}m / {aggregatedTimeChemistry}m / {aggregatedTimeMaths}m
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Marks Lost to Neg</p>
                <p className="tabular-num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)' }}>
                  -{liveMarksLost.toFixed(1)} pts
                </p>
              </div>
            </div>
          </div>

          <div className="card-elevated" style={{ padding: 16 }}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addToLedger}
                onChange={e => setAddToLedger(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Log wrong questions directly into Mistake Ledger & Negative-Mark Heatmap
                </p>
                <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                  Assign subject, chapter, error category, negative mark impact, and time spent per question
                </p>
              </div>
            </label>

            {addToLedger && (
              <div className="space-y-2.5 mt-4">
                {wrongQuestions.map((wq, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end"
                    style={{
                      padding: 10,
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-button)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div className="md:col-span-3">
                      <label className="field-label" style={{ marginBottom: 3 }}>
                        Subject
                      </label>
                      <select
                        className="field"
                        style={{ padding: '6px 9px', fontSize: 12 }}
                        value={wq.subject}
                        onChange={e => {
                          const nw = [...wrongQuestions];
                          nw[i] = { ...wq, subject: e.target.value as Subject };
                          setWrongQuestions(nw);
                        }}
                      >
                        {VALID_SUBJECTS.map(s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="field-label" style={{ marginBottom: 3 }}>
                        Chapter / Topic
                      </label>
                      <input
                        className="field"
                        style={{ padding: '6px 9px', fontSize: 12 }}
                        value={wq.chapter}
                        onChange={e => {
                          const nw = [...wrongQuestions];
                          nw[i] = { ...wq, chapter: e.target.value };
                          setWrongQuestions(nw);
                        }}
                        placeholder="e.g. Rotational Mechanics"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="field-label" style={{ marginBottom: 3 }}>
                        Error Category
                      </label>
                      <select
                        className="field"
                        style={{ padding: '6px 9px', fontSize: 12 }}
                        value={wq.errorCategory}
                        onChange={e => {
                          const nw = [...wrongQuestions];
                          nw[i] = { ...wq, errorCategory: e.target.value as ErrorCategory };
                          setWrongQuestions(nw);
                        }}
                      >
                        {VALID_CATEGORIES.map(c => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="field-label" style={{ marginBottom: 3 }}>
                        Marks Lost
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        max={20}
                        className="field tabular-num"
                        style={{ padding: '6px 9px', fontSize: 12 }}
                        value={wq.marksLost}
                        onChange={e => {
                          const nw = [...wrongQuestions];
                          nw[i] = { ...wq, marksLost: parseFloat(e.target.value) || 0 };
                          setWrongQuestions(nw);
                        }}
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setWrongQuestions(wrongQuestions.filter((_, j) => j !== i))
                        }
                        style={{
                          padding: 7,
                          borderRadius: 'var(--radius-button)',
                          background: 'var(--danger-bg)',
                          border: '1px solid rgba(244,63,94,0.2)',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setWrongQuestions([
                      ...wrongQuestions,
                      {
                        subject: 'Physics',
                        chapter: '',
                        errorCategory: 'Conceptual Gap',
                        marksLost: 5,
                        questionTimeSeconds: 180,
                      },
                    ])
                  }
                  className="btn-ghost"
                  style={{ fontSize: 12 }}
                >
                  <Plus size={13} />
                  Add Another Mistake
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(3)} className="btn-ghost">
              Back
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary"
              style={{ background: 'var(--success)' }}
            >
              <Save size={14} />
              {editing ? 'Update Test Event' : 'Save Test Event (+30 XP)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
