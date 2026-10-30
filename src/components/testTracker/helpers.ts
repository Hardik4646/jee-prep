import {
  TestAttempt,
  TemplateSubject,
  SubjectScore,
  PaperScore,
  TestSourceType,
  Mistake,
  Subject,
  ExamTemplate,
  PaperSubjectTiming,
  WrongQuestionLogInput,
} from '../../types';
import { generateSafeId, sanitizeText } from '../../utils/security';

export const genId = () => generateSafeId();
export const DEFAULT_SUBJECTS = ['Physics', 'Chemistry', 'Mathematics'];
export const TEST_TYPES: TestSourceType[] = [
  'Mock Test',
  'PYQ/Previous Year Paper',
  'School Test',
  'Custom',
];

/**
 * JEE Main: 1 paper × 180 min = 180 min total (Ideal split: 50m Physics, 40m Chemistry, 90m Mathematics)
 * JEE Advanced: 2 papers × 180 min = 360 min total (Ideal split per paper: 50m Physics, 40m Chemistry, 90m Mathematics)
 */
export const PAPER_DURATION_MINUTES = 180;
export const SUBJECT_TARGET_MINUTES_PER_PAPER = 60;

export const SUBJECT_IDEAL_MINUTES_PER_PAPER: Record<'physics' | 'chemistry' | 'maths', number> = {
  physics: 50,
  chemistry: 40,
  maths: 90,
};

export function normalizeCanonicalSubject(name: string): 'physics' | 'chemistry' | 'maths' | null {
  const lower = name.toLowerCase();
  if (lower.includes('phys')) return 'physics';
  if (lower.includes('chem')) return 'chemistry';
  if (lower.includes('math')) return 'maths';
  return null;
}

export function getSubjectIdealMinutes(name: string): number {
  const canonical = normalizeCanonicalSubject(name);
  return canonical ? SUBJECT_IDEAL_MINUTES_PER_PAPER[canonical] : SUBJECT_TARGET_MINUTES_PER_PAPER;
}

export function blankSubject(name: string, numQuestions = 25): TemplateSubject {
  return {
    id: genId(),
    name,
    numQuestions,
    marksPerCorrect: 4,
    negativePerWrong: -1,
    partialMarking: false,
    targetMinutes: getSubjectIdealMinutes(name),
  };
}

export function subjectMaxScore(s: TemplateSubject, template?: ExamTemplate): number {
  if (!template?.manualOverride || !template.totalMaxMarks || !template.totalQuestions) {
    return Number((s.numQuestions * s.marksPerCorrect).toFixed(2));
  }
  const share = s.numQuestions / template.totalQuestions;
  return Number((share * template.totalMaxMarks).toFixed(2));
}

export function computeSubjectScore(
  s: TemplateSubject,
  correct: number,
  incorrect: number,
  unattempted: number,
  template?: ExamTemplate,
  timeSpentMinutes?: number,
  sillyMistakes = 0
): SubjectScore {
  const safeCorrect = Math.max(0, correct);
  const safeIncorrect = Math.max(0, incorrect);
  const safeUnattempted = Math.max(0, unattempted);
  const safeSilly = Math.max(0, sillyMistakes);
  const marksLost = s.negativePerWrong < 0 ? safeIncorrect * Math.abs(s.negativePerWrong) : 0;
  const score = Number((safeCorrect * s.marksPerCorrect - marksLost).toFixed(2));
  const maxScore = subjectMaxScore(s, template);
  const attempted = safeCorrect + safeIncorrect;
  const accuracy = attempted > 0 ? Number(((safeCorrect / attempted) * 100).toFixed(2)) : 0;
  // Each silly mistake on a wrong question costs marksPerCorrect + |negativePerWrong| (recoverable swing)
  const swingPerSilly = s.marksPerCorrect + (s.negativePerWrong < 0 ? Math.abs(s.negativePerWrong) : 0);
  const sillyMarksLost = Number((safeSilly * swingPerSilly).toFixed(2));

  return {
    subjectName: s.name,
    correct: safeCorrect,
    incorrect: safeIncorrect,
    unattempted: safeUnattempted,
    score,
    maxScore,
    accuracy,
    marksLostToNegative: Number(marksLost.toFixed(2)),
    sillyMistakes: safeSilly,
    sillyMarksLost,
    timeSpentMinutes: timeSpentMinutes && timeSpentMinutes > 0 ? timeSpentMinutes : undefined,
    targetMinutes: s.targetMinutes ?? getSubjectIdealMinutes(s.name),
    totalQuestions: s.numQuestions,
  };
}

export function computePaperScore(
  subjects: TemplateSubject[],
  scores: { correct: number; incorrect: number; unattempted: number; sillyMistakes?: number }[],
  template?: ExamTemplate,
  paperTiming?: PaperSubjectTiming
): PaperScore {
  const subjScores = subjects.map((s, i) => {
    const canonical = normalizeCanonicalSubject(s.name);
    const subjTime = canonical && paperTiming ? paperTiming[canonical] : undefined;
    return computeSubjectScore(
      s,
      scores[i]?.correct ?? 0,
      scores[i]?.incorrect ?? 0,
      scores[i]?.unattempted ?? 0,
      template,
      subjTime,
      scores[i]?.sillyMistakes ?? 0
    );
  });

  const totalScore = Number(subjScores.reduce((a, b) => a + b.score, 0).toFixed(2));
  const maxScore = Number(subjScores.reduce((a, b) => a + b.maxScore, 0).toFixed(2));
  const totalCorrect = subjScores.reduce((a, b) => a + b.correct, 0);
  const totalIncorrect = subjScores.reduce((a, b) => a + b.incorrect, 0);
  const totalUnattempted = subjScores.reduce((a, b) => a + b.unattempted, 0);
  const totalQuestions = subjects.reduce((a, b) => a + b.numQuestions, 0);
  const marksLostToNegative = Number(
    subjScores.reduce((a, b) => a + (b.marksLostToNegative ?? 0), 0).toFixed(2)
  );
  const totalSillyMistakes = subjScores.reduce((a, b) => a + (b.sillyMistakes ?? 0), 0);
  const sillyMarksLost = Number(
    subjScores.reduce((a, b) => a + (b.sillyMarksLost ?? 0), 0).toFixed(2)
  );
  const accuracy =
    totalCorrect + totalIncorrect > 0
      ? Number(((totalCorrect / (totalCorrect + totalIncorrect)) * 100).toFixed(2))
      : 0;

  const tP = paperTiming?.physics ?? 0;
  const tC = paperTiming?.chemistry ?? 0;
  const tM = paperTiming?.maths ?? 0;
  const paperTotalTime = tP + tC + tM;

  return {
    subjects: subjScores,
    totalScore,
    maxScore,
    totalCorrect,
    totalIncorrect,
    totalUnattempted,
    totalQuestions,
    accuracy,
    marksLostToNegative,
    totalSillyMistakes,
    sillyMarksLost,
    timePhysics: tP > 0 ? tP : undefined,
    timeChemistry: tC > 0 ? tC : undefined,
    timeMaths: tM > 0 ? tM : undefined,
    timeTakenMinutes: paperTotalTime > 0 ? paperTotalTime : undefined,
    targetDurationMinutes: PAPER_DURATION_MINUTES,
  };
}

/**
 * Extracts per-subject silly mistake count and recoverable marks for a test attempt,
 * combining explicit SubjectScore.sillyMistakes, top-level sillyPhysics/Chemistry/Maths,
 * or linked Mistake Ledger items categorized as 'Careless/Silly' or 'Calculation'.
 */
export function getSubjectSillyTelemetry(
  attempt: TestAttempt,
  subjectName: string,
  paperScope: 'combined' | 'paper1' | 'paper2' = 'combined',
  mistakes: Mistake[] = []
): { count: number; marksImpact: number } {
  const canon = normalizeCanonicalSubject(subjectName);
  const papersToRead =
    paperScope === 'paper1'
      ? [attempt.papers[0]].filter(Boolean)
      : paperScope === 'paper2'
      ? [attempt.papers[1]].filter(Boolean)
      : attempt.papers;

  const matchingScores = papersToRead
    .flatMap(p => p?.subjects ?? [])
    .filter(
      s =>
        s.subjectName === subjectName ||
        (canon && normalizeCanonicalSubject(s.subjectName) === canon)
    );

  let explicitCount = matchingScores.reduce((sum, s) => sum + (s.sillyMistakes ?? 0), 0);
  let explicitMarks = matchingScores.reduce((sum, s) => sum + (s.sillyMarksLost ?? 0), 0);

  if (explicitCount === 0 && paperScope === 'combined') {
    if (canon === 'physics' && attempt.sillyPhysics) explicitCount = attempt.sillyPhysics;
    else if (canon === 'chemistry' && attempt.sillyChemistry) explicitCount = attempt.sillyChemistry;
    else if (canon === 'maths' && attempt.sillyMaths) explicitCount = attempt.sillyMaths;
  }

  // Fallback to Mistake Ledger items linked to this attempt if not explicitly set
  if (explicitCount === 0 && mistakes.length > 0) {
    const linked = mistakes.filter(m => {
      if (m.sourceAttemptId !== attempt.id) return false;
      if (m.errorCategory !== 'Careless/Silly' && m.errorCategory !== 'Calculation') return false;
      const mCanon = normalizeCanonicalSubject(m.subject);
      return m.subject === subjectName || (canon && mCanon === canon);
    });
    if (linked.length > 0) {
      explicitCount = linked.length;
      explicitMarks = linked.reduce((sum, m) => sum + (m.marksLost ?? 5), 0);
    }
  }

  // Default swing per silly mistake (e.g. 5 marks in JEE Main [+4/-1], ~4.33 in JEE Adv)
  const defaultSwing = attempt.pattern === 'dual' ? 4.33 : 5;
  const marksImpact =
    explicitMarks > 0 ? Number(explicitMarks.toFixed(1)) : Number((explicitCount * defaultSwing).toFixed(1));

  return { count: explicitCount, marksImpact };
}

export function createMistakesFromTest(
  attempt: TestAttempt,
  wrongQuestions: WrongQuestionLogInput[]
): Mistake[] {
  return wrongQuestions
    .filter(wq => wq.chapter.trim())
    .map(wq => ({
      id: genId(),
      date: attempt.date,
      subject: wq.subject || ('Physics' as Subject),
      chapter: sanitizeText(wq.chapter, 160),
      errorCategory: wq.errorCategory,
      priority: wq.marksLost >= 4 ? 'High' : 'Medium',
      notes: sanitizeText(
        wq.notes?.trim()
          ? `${wq.notes.trim()} — Logged from ${attempt.attemptName} (${attempt.templateName})`
          : `Logged from ${attempt.attemptName} (${attempt.templateName})`,
        2000
      ),
      tags: ['from-test', attempt.pattern === 'dual' ? 'jee-advanced' : 'jee-main'],
      status: 'Active' as const,
      createdAt: Date.now(),
      reviewCount: 0,
      marksLost: wq.marksLost > 0 ? wq.marksLost : 1,
      sourceAttemptId: attempt.id,
      questionTimeSeconds: wq.questionTimeSeconds,
    }));
}
