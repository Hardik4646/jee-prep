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

export type View = 'dashboard' | 'ledger' | 'analytics' | 'notes' | 'assignments' | 'strategy';
