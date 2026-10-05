import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ExamTemplate, TestAttempt } from '../types';
import { useAuth } from '../hooks/useAuth';

// ─── DB Row Types ─────────────────────────────────────────────────
interface TemplateRow {
  id: string;
  user_id: string;
  name: string;
  pattern: 'single' | 'dual';
  papers: any[];
  total_questions: number;
  total_max_marks: number;
  manual_override: boolean;
  marks_preset: boolean[];
  times_used: number;
  created_at: string;
}

interface AttemptRow {
  id: string;
  user_id: string;
  template_id: string;
  template_name: string;
  pattern: 'single' | 'dual';
  test_type: string;
  attempt_name: string;
  date: string;
  time_taken_minutes: number | null;
  time_physics: number | null;
  time_chemistry: number | null;
  time_maths: number | null;
  difficulty_rating: number | null;
  notes: string | null;
  papers: any[];
  total_score: number;
  max_score: number;
  percentage: number;
  accuracy: number;
  total_correct: number;
  total_incorrect: number;
  total_unattempted: number;
  total_questions: number;
  marks_lost_to_negative: number;
  percentile: number | null;
  target_achieved: boolean;
  created_at: string;
}

// ─── Row → App Type Mappers ───────────────────────────────────────
function rowToTemplate(r: TemplateRow): ExamTemplate {
  return {
    id: r.id,
    name: r.name,
    pattern: r.pattern,
    papers: r.papers,
    totalQuestions: r.total_questions,
    totalMaxMarks: r.total_max_marks,
    manualOverride: r.manual_override,
    marksPreset: Array.isArray(r.marks_preset) ? r.marks_preset : [true],
    createdAt: new Date(r.created_at).getTime(),
    timesUsed: r.times_used ?? 0,
  };
}

function rowToAttempt(r: AttemptRow): TestAttempt {
  return {
    id: r.id,
    templateId: r.template_id,
    templateName: r.template_name,
    pattern: r.pattern,
    testType: r.test_type as TestAttempt['testType'],
    attemptName: r.attempt_name,
    date: r.date,
    timeTakenMinutes: r.time_taken_minutes ?? undefined,
    timePhysics: r.time_physics ?? undefined,
    timeChemistry: r.time_chemistry ?? undefined,
    timeMaths: r.time_maths ?? undefined,
    difficultyRating: r.difficulty_rating ?? undefined,
    notes: r.notes ?? undefined,
    papers: r.papers,
    totalScore: r.total_score,
    maxScore: r.max_score,
    percentage: r.percentage,
    accuracy: r.accuracy,
    totalCorrect: r.total_correct,
    totalIncorrect: r.total_incorrect,
    totalUnattempted: r.total_unattempted,
    totalQuestions: r.total_questions,
    marksLostToNegative: r.marks_lost_to_negative,
    percentile: r.percentile ?? undefined,
    targetAchieved: r.target_achieved,
    createdAt: new Date(r.created_at).getTime(),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useTestData() {
  const { user } = useAuth();
  const [templates, setTemplatesState] = useState<ExamTemplate[]>([]);
  const [attempts, setAttemptsState] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from Supabase when user changes
  useEffect(() => {
    if (!user) {
      setTemplatesState([]);
      setAttemptsState([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const [tplRes, attRes] = await Promise.all([
        supabase.from('test_templates').select('*').order('created_at', { ascending: false }),
        supabase.from('test_attempts').select('*').order('date', { ascending: false }),
      ]);

      if (cancelled) return;

      if (tplRes.data) setTemplatesState(tplRes.data.map(rowToTemplate));
      if (attRes.data) setAttemptsState(attRes.data.map(rowToAttempt));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  // ─── Template CRUD ──────────────────────────────────────────────
  const setTemplates = useCallback((updater: ExamTemplate[] | ((prev: ExamTemplate[]) => ExamTemplate[])) => {
    setTemplatesState(prev => {
      const next = typeof updater === 'function' ? (updater as (p: ExamTemplate[]) => ExamTemplate[])(prev) : updater;
      return next;
    });
  }, []);

  const saveTemplateToDB = useCallback(async (tpl: ExamTemplate) => {
    const row = {
      id: tpl.id,
      name: tpl.name,
      pattern: tpl.pattern,
      papers: tpl.papers,
      total_questions: tpl.totalQuestions,
      total_max_marks: tpl.totalMaxMarks,
      manual_override: tpl.manualOverride,
      marks_preset: tpl.marksPreset,
      times_used: tpl.timesUsed,
    };
    await supabase.from('test_templates').upsert(row).eq('id', tpl.id);
  }, []);

  const deleteTemplateFromDB = useCallback(async (id: string) => {
    await supabase.from('test_templates').delete().eq('id', id);
  }, []);

  // ─── Attempt CRUD ───────────────────────────────────────────────
  const setAttempts = useCallback((updater: TestAttempt[] | ((prev: TestAttempt[]) => TestAttempt[])) => {
    setAttemptsState(prev => {
      const next = typeof updater === 'function' ? (updater as (p: TestAttempt[]) => TestAttempt[])(prev) : updater;
      return next;
    });
  }, []);

  const saveAttemptToDB = useCallback(async (att: TestAttempt) => {
    const row = {
      id: att.id,
      template_id: att.templateId,
      template_name: att.templateName,
      pattern: att.pattern,
      test_type: att.testType,
      attempt_name: att.attemptName,
      date: att.date,
      time_taken_minutes: att.timeTakenMinutes ?? null,
      time_physics: att.timePhysics ?? null,
      time_chemistry: att.timeChemistry ?? null,
      time_maths: att.timeMaths ?? null,
      difficulty_rating: att.difficultyRating ?? null,
      notes: att.notes ?? null,
      papers: att.papers,
      total_score: att.totalScore,
      max_score: att.maxScore,
      percentage: att.percentage,
      accuracy: att.accuracy,
      total_correct: att.totalCorrect,
      total_incorrect: att.totalIncorrect,
      total_unattempted: att.totalUnattempted,
      total_questions: att.totalQuestions,
      marks_lost_to_negative: att.marksLostToNegative,
      percentile: att.percentile ?? null,
      target_achieved: att.targetAchieved,
    };
    await supabase.from('test_attempts').upsert(row).eq('id', att.id);
  }, []);

  const deleteAttemptFromDB = useCallback(async (id: string) => {
    await supabase.from('test_attempts').delete().eq('id', id);
  }, []);

  return {
    templates, attempts, loading,
    setTemplates, saveTemplateToDB, deleteTemplateFromDB,
    setAttempts, saveAttemptToDB, deleteAttemptFromDB,
  };
}
