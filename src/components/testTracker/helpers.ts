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
  timeSpentMinutes?: number
): SubjectScore {
  const safeCorrect = Math.max(0, correct);
  const safeIncorrect = Math.max(0, incorrect);
  const safeUnattempted = Math.max(0, unattempted);
  const marksLost = s.negativePerWrong < 0 ? safeIncorrect * Math.abs(s.negativePerWrong) : 0;
  const score = Number((safeCorrect * s.marksPerCorrect - marksLost).toFixed(2));
  const maxScore = subjectMaxScore(s, template);
  const attempted = safeCorrect + safeIncorrect;
  const accuracy = attempted > 0 ? Number(((safeCorrect / attempted) * 100).toFixed(2)) : 0;

  return {
    subjectName: s.name,
    correct: safeCorrect,
    incorrect: safeIncorrect,
    unattempted: safeUnattempted,
    score,
    maxScore,
    accuracy,
    marksLostToNegative: Number(marksLost.toFixed(2)),
    timeSpentMinutes: timeSpentMinutes && timeSpentMinutes > 0 ? timeSpentMinutes : undefined,
    targetMinutes: s.targetMinutes ?? getSubjectIdealMinutes(s.name),
    totalQuestions: s.numQuestions,
  };
}

export function computePaperScore(
  subjects: TemplateSubject[],
  scores: { correct: number; incorrect: number; unattempted: number }[],
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
      subjTime
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
    timePhysics: tP > 0 ? tP : undefined,
    timeChemistry: tC > 0 ? tC : undefined,
    timeMaths: tM > 0 ? tM : undefined,
    timeTakenMinutes: paperTotalTime > 0 ? paperTotalTime : undefined,
    targetDurationMinutes: PAPER_DURATION_MINUTES,
  };
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
