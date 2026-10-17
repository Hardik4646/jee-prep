import {
  Mistake,
  ImportantNote,
  InorganicAssignment,
  ExamTemplate,
  TestAttempt,
  SyllabusChapter,
  Subject,
  ErrorCategory,
  Priority,
  MistakeStatus,
  AssignmentType,
  ChapterClass,
  Weightage,
  TestSourceType,
  TemplateSubject,
  PaperScore,
  SubjectScore,
  PaperSubjectTiming,
} from '../types';

export const VALID_SUBJECTS: Subject[] = [
  'Physics',
  'Mathematics',
  'Physical Chemistry',
  'Organic Chemistry',
  'Inorganic Chemistry',
];

export const VALID_CATEGORIES: ErrorCategory[] = [
  'Calculation',
  'Conceptual Gap',
  'Formula Misapplication',
  'Question Misread',
  'Careless/Silly',
];

export const VALID_PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];
export const VALID_STATUSES: MistakeStatus[] = ['Active', 'Mastered'];
export const VALID_ASSIGNMENT_TYPES: AssignmentType[] = ['CSC', 'TFT', 'Other'];
export const VALID_CLASS_LEVELS: ChapterClass[] = ['11', '12'];
export const VALID_WEIGHTAGE: Weightage[] = ['High', 'Medium', 'Low'];
export const VALID_TEST_TYPES: TestSourceType[] = [
  'Mock Test',
  'PYQ/Previous Year Paper',
  'School Test',
  'Custom',
];

/**
 * Cryptographically strong ID generator with fallback for older environments.
 */
export function generateSafeId(prefix = ''): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    return prefix ? `${prefix}-${id}` : id;
  }
  const randomPart = Math.random().toString(36).substring(2, 11) + Date.now().toString(36).slice(-4);
  return prefix ? `${prefix}-${randomPart}` : randomPart;
}

function stripControlChars(str: string, preserveNewlines: boolean): string {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (preserveNewlines && (code === 9 || code === 10 || code === 13)) {
      out += str[i];
    } else if (code >= 32 && code !== 127) {
      out += str[i];
    }
  }
  return out;
}

/**
 * Sanitizes untrusted user text to prevent XSS injection, control character pollution,
 * and excessive payload size in local storage.
 */
export function sanitizeText(input: unknown, maxLength = 4000): string {
  if (typeof input !== 'string') return '';
  return stripControlChars(input, false)
    .replace(/<\s*\/?\s*(script|iframe|object|embed|link|meta|style)[^>]*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeMultilineText(input: unknown, maxLength = 4000): string {
  if (typeof input !== 'string') return '';
  return stripControlChars(input, true)
    .replace(/<\s*\/?\s*(script|iframe|object|embed|link|meta|style)[^>]*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeDateString(input: unknown): string {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }
  return new Date().toISOString().split('T')[0];
}

export function clampNumber(val: unknown, min: number, max: number, fallback = 0): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function sanitizeMistake(x: unknown): Mistake | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const id = sanitizeText(o.id, 64);
  if (!id) return null;
  if (!VALID_SUBJECTS.includes(o.subject as Subject)) return null;
  if (!VALID_CATEGORIES.includes(o.errorCategory as ErrorCategory)) return null;
  if (!VALID_PRIORITIES.includes(o.priority as Priority)) return null;
  if (!VALID_STATUSES.includes(o.status as MistakeStatus)) return null;

  return {
    id,
    subject: o.subject as Subject,
    errorCategory: o.errorCategory as ErrorCategory,
    priority: o.priority as Priority,
    status: o.status as MistakeStatus,
    date: sanitizeDateString(o.date),
    chapter: sanitizeText(o.chapter, 180),
    notes: sanitizeText(o.notes, 4000),
    tags: Array.isArray(o.tags)
      ? o.tags
          .map((t: unknown) => sanitizeText(t, 48))
          .filter(Boolean)
          .slice(0, 20)
      : [],
    createdAt: clampNumber(o.createdAt, 0, Date.now() + 86400000 * 365, Date.now()),
    ...(typeof o.masteredAt === 'number' && Number.isFinite(o.masteredAt) ? { masteredAt: o.masteredAt } : {}),
    ...(typeof o.nextReviewAt === 'number' && Number.isFinite(o.nextReviewAt) ? { nextReviewAt: o.nextReviewAt } : {}),
    ...(typeof o.reviewCount === 'number' ? { reviewCount: clampNumber(o.reviewCount, 0, 1000, 0) } : {}),
    ...(typeof o.timeSpentMinutes === 'number' ? { timeSpentMinutes: clampNumber(o.timeSpentMinutes, 0, 10000, 0) } : {}),
    ...(typeof o.xpAwarded === 'boolean' ? { xpAwarded: o.xpAwarded } : {}),
    ...(typeof o.marksLost === 'number' ? { marksLost: clampNumber(o.marksLost, 0, 100, 0) } : {}),
    ...(typeof o.sourceAttemptId === 'string' ? { sourceAttemptId: sanitizeText(o.sourceAttemptId, 64) } : {}),
    ...(typeof o.questionTimeSeconds === 'number' ? { questionTimeSeconds: clampNumber(o.questionTimeSeconds, 0, 7200, 0) } : {}),
  };
}

export function sanitizeNote(x: unknown): ImportantNote | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const id = sanitizeText(o.id, 64);
  if (!id) return null;
  if (!VALID_SUBJECTS.includes(o.subject as Subject)) return null;
  const note = sanitizeText(o.note, 4000);
  if (!note) return null;
  return {
    id,
    subject: o.subject as Subject,
    tags: Array.isArray(o.tags)
      ? o.tags.map((t: unknown) => sanitizeText(t, 48)).filter(Boolean).slice(0, 20)
      : [],
    note,
    createdAt: clampNumber(o.createdAt, 0, Date.now() + 86400000 * 365, Date.now()),
  };
}

export function sanitizeAssignment(x: unknown): InorganicAssignment | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const id = sanitizeText(o.id, 64);
  const assignmentName = sanitizeText(o.assignmentName, 200);
  if (!id || !assignmentName) return null;
  if (!VALID_ASSIGNMENT_TYPES.includes(o.assignmentType as AssignmentType)) return null;
  return {
    id,
    assignmentType: o.assignmentType as AssignmentType,
    assignmentName,
    totalQuestions: clampNumber(o.totalQuestions, 0, 1000, 0),
    totalAttempted: clampNumber(o.totalAttempted, 0, 1000, 0),
    totalCorrect: clampNumber(o.totalCorrect, 0, 1000, 0),
    marksObtained: clampNumber(o.marksObtained, -500, 5000, 0),
    date: sanitizeDateString(o.date),
    createdAt: clampNumber(o.createdAt, 0, Date.now() + 86400000 * 365, Date.now()),
  };
}

function sanitizeTemplateSubject(x: unknown): TemplateSubject | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const name = sanitizeText(o.name, 80);
  if (!name) return null;
  return {
    id: sanitizeText(o.id, 64) || generateSafeId('sub'),
    name,
    numQuestions: clampNumber(o.numQuestions, 1, 500, 25),
    marksPerCorrect: clampNumber(o.marksPerCorrect, 0, 100, 4),
    negativePerWrong: clampNumber(o.negativePerWrong, -100, 0, -1),
    partialMarking: Boolean(o.partialMarking),
    ...(typeof o.targetMinutes === 'number' ? { targetMinutes: clampNumber(o.targetMinutes, 1, 360, 60) } : {}),
  };
}

export function sanitizeTemplate(x: unknown): ExamTemplate | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const id = sanitizeText(o.id, 64);
  const name = sanitizeText(o.name, 140);
  if (!id || !name) return null;
  if (o.pattern !== 'single' && o.pattern !== 'dual') return null;
  if (!Array.isArray(o.papers) || o.papers.length === 0) return null;

  const papers: TemplateSubject[][] = o.papers
    .slice(0, 2)
    .map((p: unknown) =>
      Array.isArray(p)
        ? p.map(sanitizeTemplateSubject).filter((s): s is TemplateSubject => s !== null)
        : []
    )
    .filter(p => p.length > 0);

  if (papers.length === 0) return null;

  return {
    id,
    name,
    pattern: o.pattern,
    papers,
    totalQuestions: clampNumber(o.totalQuestions, 1, 1000, 90),
    totalMaxMarks: clampNumber(o.totalMaxMarks, 1, 5000, 300),
    manualOverride: Boolean(o.manualOverride),
    marksPreset: Array.isArray(o.marksPreset) ? o.marksPreset.map(Boolean) : papers.map(() => true),
    durationPerPaperMinutes: clampNumber(o.durationPerPaperMinutes, 30, 360, 180),
    createdAt: clampNumber(o.createdAt, 0, Date.now() + 86400000 * 365, Date.now()),
    timesUsed: clampNumber(o.timesUsed, 0, 10000, 0),
  };
}

function sanitizeSubjectScore(x: unknown): SubjectScore | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const subjectName = sanitizeText(o.subjectName, 80);
  if (!subjectName) return null;
  return {
    subjectName,
    correct: clampNumber(o.correct, 0, 500, 0),
    incorrect: clampNumber(o.incorrect, 0, 500, 0),
    unattempted: clampNumber(o.unattempted, 0, 500, 0),
    score: clampNumber(o.score, -500, 5000, 0),
    maxScore: clampNumber(o.maxScore, 0, 5000, 100),
    accuracy: clampNumber(o.accuracy, 0, 100, 0),
    ...(typeof o.marksLostToNegative === 'number'
      ? { marksLostToNegative: clampNumber(o.marksLostToNegative, 0, 500, 0) }
      : {}),
    ...(typeof o.timeSpentMinutes === 'number'
      ? { timeSpentMinutes: clampNumber(o.timeSpentMinutes, 0, 360, 0) }
      : {}),
    ...(typeof o.targetMinutes === 'number'
      ? { targetMinutes: clampNumber(o.targetMinutes, 0, 360, 60) }
      : {}),
    ...(typeof o.totalQuestions === 'number'
      ? { totalQuestions: clampNumber(o.totalQuestions, 0, 500, 0) }
      : {}),
  };
}

function sanitizePaperScore(x: unknown): PaperScore | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (!Array.isArray(o.subjects)) return null;
  const subjects = o.subjects
    .map(sanitizeSubjectScore)
    .filter((s): s is SubjectScore => s !== null);
  if (subjects.length === 0) return null;

  return {
    subjects,
    totalScore: clampNumber(o.totalScore, -1000, 5000, 0),
    maxScore: clampNumber(o.maxScore, 1, 5000, 180),
    totalCorrect: clampNumber(o.totalCorrect, 0, 1000, 0),
    totalIncorrect: clampNumber(o.totalIncorrect, 0, 1000, 0),
    totalUnattempted: clampNumber(o.totalUnattempted, 0, 1000, 0),
    totalQuestions: clampNumber(o.totalQuestions, 1, 1000, 54),
    accuracy: clampNumber(o.accuracy, 0, 100, 0),
    ...(typeof o.marksLostToNegative === 'number'
      ? { marksLostToNegative: clampNumber(o.marksLostToNegative, 0, 1000, 0) }
      : {}),
    ...(typeof o.timePhysics === 'number' ? { timePhysics: clampNumber(o.timePhysics, 0, 180, 0) } : {}),
    ...(typeof o.timeChemistry === 'number' ? { timeChemistry: clampNumber(o.timeChemistry, 0, 180, 0) } : {}),
    ...(typeof o.timeMaths === 'number' ? { timeMaths: clampNumber(o.timeMaths, 0, 180, 0) } : {}),
    ...(typeof o.timeTakenMinutes === 'number' ? { timeTakenMinutes: clampNumber(o.timeTakenMinutes, 0, 180, 0) } : {}),
    ...(typeof o.targetDurationMinutes === 'number'
      ? { targetDurationMinutes: clampNumber(o.targetDurationMinutes, 30, 360, 180) }
      : {}),
  };
}

export function sanitizeAttempt(x: unknown): TestAttempt | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const id = sanitizeText(o.id, 64);
  const templateId = sanitizeText(o.templateId, 64);
  const attemptName = sanitizeText(o.attemptName, 160);
  if (!id || !templateId || !attemptName) return null;
  if (!Array.isArray(o.papers) || o.papers.length === 0) return null;

  const papers = o.papers
    .slice(0, 2)
    .map(sanitizePaperScore)
    .filter((p): p is PaperScore => p !== null);
  if (papers.length === 0) return null;

  const pattern = o.pattern === 'dual' || papers.length > 1 ? 'dual' : 'single';
  const maxAllowedMinutes = pattern === 'dual' ? 360 : 180;

  const paperTimings: PaperSubjectTiming[] | undefined = Array.isArray(o.paperTimings)
    ? o.paperTimings.slice(0, 2).map((pt: unknown) => {
        const rec = (pt && typeof pt === 'object' ? pt : {}) as Record<string, unknown>;
        return {
          physics: clampNumber(rec.physics, 0, 180, 0),
          chemistry: clampNumber(rec.chemistry, 0, 180, 0),
          maths: clampNumber(rec.maths, 0, 180, 0),
        };
      })
    : undefined;

  return {
    id,
    templateId,
    templateName: sanitizeText(o.templateName, 140) || 'Exam Template',
    pattern,
    testType: VALID_TEST_TYPES.includes(o.testType as TestSourceType)
      ? (o.testType as TestSourceType)
      : 'Mock Test',
    attemptName,
    date: sanitizeDateString(o.date),
    timeTakenMinutes:
      typeof o.timeTakenMinutes === 'number'
        ? clampNumber(o.timeTakenMinutes, 0, maxAllowedMinutes, 0)
        : undefined,
    difficultyRating:
      typeof o.difficultyRating === 'number'
        ? clampNumber(o.difficultyRating, 1, 5, 3)
        : undefined,
    notes: typeof o.notes === 'string' ? sanitizeText(o.notes, 2000) : undefined,
    papers,
    totalScore: clampNumber(o.totalScore, -1000, 5000, 0),
    maxScore: clampNumber(o.maxScore, 1, 5000, 300),
    percentage: clampNumber(o.percentage, -100, 100, 0),
    accuracy: clampNumber(o.accuracy, 0, 100, 0),
    totalCorrect: clampNumber(o.totalCorrect, 0, 1000, 0),
    totalIncorrect: clampNumber(o.totalIncorrect, 0, 1000, 0),
    totalUnattempted: clampNumber(o.totalUnattempted, 0, 1000, 0),
    totalQuestions: clampNumber(o.totalQuestions, 1, 1000, 90),
    marksLostToNegative: clampNumber(o.marksLostToNegative, 0, 1000, 0),
    percentile:
      typeof o.percentile === 'number' ? clampNumber(o.percentile, 0, 100, 0) : undefined,
    targetScore:
      typeof o.targetScore === 'number' ? clampNumber(o.targetScore, 0, 5000, 0) : undefined,
    targetAchieved: Boolean(o.targetAchieved),
    createdAt: clampNumber(o.createdAt, 0, Date.now() + 86400000 * 365, Date.now()),
    timePhysics:
      typeof o.timePhysics === 'number'
        ? clampNumber(o.timePhysics, 0, maxAllowedMinutes, 0)
        : undefined,
    timeChemistry:
      typeof o.timeChemistry === 'number'
        ? clampNumber(o.timeChemistry, 0, maxAllowedMinutes, 0)
        : undefined,
    timeMaths:
      typeof o.timeMaths === 'number'
        ? clampNumber(o.timeMaths, 0, maxAllowedMinutes, 0)
        : undefined,
    ...(paperTimings ? { paperTimings } : {}),
  };
}

export function sanitizeChapter(x: unknown): SyllabusChapter | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const id = sanitizeText(o.id, 64);
  const name = sanitizeText(o.name, 160);
  if (!id || !name) return null;
  if (!VALID_SUBJECTS.includes(o.subject as Subject)) return null;
  if (!VALID_CLASS_LEVELS.includes(o.classLevel as ChapterClass)) return null;
  if (!VALID_WEIGHTAGE.includes(o.weightage as Weightage)) return null;
  return {
    id,
    name,
    subject: o.subject as Subject,
    classLevel: o.classLevel as ChapterClass,
    weightage: o.weightage as Weightage,
    lectureDone: Boolean(o.lectureDone),
    notesDone: Boolean(o.notesDone),
    moduleDone: Boolean(o.moduleDone),
    supplementDone: Boolean(o.supplementDone),
    ...(typeof o.isCustom === 'boolean' ? { isCustom: o.isCustom } : {}),
  };
}
