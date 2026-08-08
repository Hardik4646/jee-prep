export type Subject =
  | 'Physics'
  | 'Mathematics'
  | 'Physical Chemistry'
  | 'Organic Chemistry'
  | 'Inorganic Chemistry';

export type ErrorCategory =
  | 'Calculation'
  | 'Conceptual Gap'
  | 'Formula Misapplication'
  | 'Question Misread'
  | 'Careless/Silly';

export type Priority = 'High' | 'Medium' | 'Low';

export type MistakeStatus = 'Active' | 'Mastered';

export interface Mistake {
  id: string;
  date: string;
  subject: Subject;
  chapter: string;
  errorCategory: ErrorCategory;
  priority: Priority;
  notes: string;
  tags: string[];
  status: MistakeStatus;
  createdAt: number;
  masteredAt?: number;
  timeSpentMinutes?: number;
  nextReviewAt?: number;
  reviewCount?: number;
  xpAwarded?: boolean;
}

export interface ImportantNote {
  id: string;
  subject: Subject;
  tags: string[];
  note: string;
  createdAt: number;
}

export type AssignmentType = 'CSC' | 'TFT' | 'Other';

export interface InorganicAssignment {
  id: string;
  assignmentType: AssignmentType;
  assignmentName: string;
  totalQuestions: number;
  totalAttempted: number;
  totalCorrect: number;
  marksObtained: number;
  createdAt: number;
  date: string;
}

export interface GamificationState {
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDate: string;
  lastStreakDate: string;
  totalMastered: number;
  totalLogged: number;
}

export interface DailyFact {
  title: string;
  content: string;
  category: 'formula' | 'constant' | 'concept';
  subject: Subject;
}

export type View = 'dashboard' | 'ledger' | 'tests' | 'analytics' | 'notes' | 'assignments' | 'strategy' | 'syllabus';

// ─── Syllabus Tracker Types ───────────────────────────────────────
export type ChapterClass = '11' | '12';
export type Weightage = 'High' | 'Medium' | 'Low';

export interface SyllabusChapter {
  id: string;
  name: string;
  subject: Subject;
  classLevel: ChapterClass;
  weightage: Weightage;
  lectureDone: boolean;
  notesDone: boolean;
  moduleDone: boolean;
  supplementDone: boolean;
  isCustom?: boolean;
}

export interface SupplementBook {
  subject: Subject;
  title: string;
  author: string;
  essential: boolean;
  howTo: string[];
}

// ─── Test Tracker Types ───────────────────────────────────────────

export type ExamPattern = 'single' | 'dual';
export type TestSourceType = 'Mock Test' | 'PYQ/Previous Year Paper' | 'School Test' | 'Custom';

export interface TemplateSubject {
  id: string;
  name: string;
  numQuestions: number;
  marksPerCorrect: number;
  negativePerWrong: number;
  partialMarking: boolean;
}

export interface ExamTemplate {
  id: string;
  name: string;
  pattern: ExamPattern;
  papers: TemplateSubject[][]; // 1 array for single, 2 arrays for dual
  totalQuestions: number;
  totalMaxMarks: number;
  manualOverride: boolean;
  marksPreset: boolean[];
  createdAt: number;
  timesUsed: number;
}

export interface SubjectScore {
  subjectName: string;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
  maxScore: number;
  accuracy: number;
}

export interface PaperScore {
  subjects: SubjectScore[];
  totalScore: number;
  maxScore: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnattempted: number;
  totalQuestions: number;
  accuracy: number;
}

export interface TestAttempt {
  id: string;
  templateId: string;
  templateName: string;
  pattern: ExamPattern;
  testType: TestSourceType;
  attemptName: string;
  date: string;
  timeTakenMinutes?: number;
  difficultyRating?: number;
  notes?: string;
  papers: PaperScore[];
  totalScore: number;
  maxScore: number;
  percentage: number;
  accuracy: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnattempted: number;
  totalQuestions: number;
  marksLostToNegative: number;
  percentile?: number;
  targetAchieved: boolean;
  createdAt: number;
}
