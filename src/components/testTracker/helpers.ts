import { TestAttempt, TemplateSubject, SubjectScore, PaperScore, TestSourceType, Mistake, Subject } from '../../types';

export const genId = () => Math.random().toString(36).substr(2, 9);
export const DEFAULT_SUBJECTS = ['Physics', 'Chemistry', 'Mathematics'];
export const TEST_TYPES: TestSourceType[] = ['Mock Test', 'PYQ/Previous Year Paper', 'School Test', 'Custom'];

export function blankSubject(name: string): TemplateSubject {
  return { id: genId(), name, numQuestions: 30, marksPerCorrect: 4, negativePerWrong: -1, partialMarking: false };
}

export function computeSubjectScore(s: TemplateSubject, correct: number, incorrect: number, unattempted: number): SubjectScore {
  const score = correct * s.marksPerCorrect + incorrect * s.negativePerWrong;
  const maxScore = s.numQuestions * s.marksPerCorrect;
  const attempted = correct + incorrect;
  const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
  return { subjectName: s.name, correct, incorrect, unattempted, score, maxScore, accuracy };
}

export function computePaperScore(subjects: TemplateSubject[], scores: { correct: number; incorrect: number; unattempted: number }[]): PaperScore {
  const subjScores = subjects.map((s, i) => computeSubjectScore(s, scores[i]?.correct ?? 0, scores[i]?.incorrect ?? 0, scores[i]?.unattempted ?? 0));
  const totalScore = subjScores.reduce((a, b) => a + b.score, 0);
  const maxScore = subjScores.reduce((a, b) => a + b.maxScore, 0);
  const totalCorrect = subjScores.reduce((a, b) => a + b.correct, 0);
  const totalIncorrect = subjScores.reduce((a, b) => a + b.incorrect, 0);
  const totalUnattempted = subjScores.reduce((a, b) => a + b.unattempted, 0);
  const totalQuestions = subjects.reduce((a, b) => a + b.numQuestions, 0);
  const accuracy = totalCorrect + totalIncorrect > 0 ? (totalCorrect / (totalCorrect + totalIncorrect)) * 100 : 0;
  return { subjects: subjScores, totalScore, maxScore, totalCorrect, totalIncorrect, totalUnattempted, totalQuestions, accuracy };
}

export function createMistakesFromTest(attempt: TestAttempt, wrongQuestions: { chapter: string; errorCategory: string }[]): Mistake[] {
  return wrongQuestions.filter(wq => wq.chapter.trim()).map(wq => ({
    id: genId(),
    date: attempt.date,
    subject: 'Physics' as Subject,
    chapter: wq.chapter,
    errorCategory: wq.errorCategory as any,
    priority: 'High',
    notes: `From ${attempt.attemptName} (${attempt.templateName})`,
    tags: ['from-test'],
    status: 'Active' as const,
    createdAt: Date.now(),
    reviewCount: 0,
  }));
}
