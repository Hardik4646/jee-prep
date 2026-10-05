/*
# Create test_templates and test_attempts tables (multi-user, owner-scoped)

## Purpose
Store exam templates and logged test attempts per authenticated user, with time-per-subject
metrics (time_physics, time_chemistry, time_maths) for the "Brutal Truth" analytics dashboard.

## New Tables

### test_templates
- `id` (uuid, primary key)
- `user_id` (uuid, not null, defaults to auth.uid() — owner of the template)
- `name` (text, not null — e.g. "JEE Main Mock")
- `pattern` (text, not null — 'single' or 'dual')
- `papers` (jsonb, not null — array of arrays of TemplateSubject objects)
- `total_questions` (integer, not null)
- `total_max_marks` (numeric, not null)
- `manual_override` (boolean, default false)
- `marks_preset` (jsonb, not null — array of booleans, one per paper)
- `times_used` (integer, default 0)
- `created_at` (timestamptz, default now())

### test_attempts
- `id` (uuid, primary key)
- `user_id` (uuid, not null, defaults to auth.uid() — owner of the attempt)
- `template_id` (uuid, not null — references test_templates.id)
- `template_name` (text, not null)
- `pattern` (text, not null)
- `test_type` (text, not null)
- `attempt_name` (text, not null)
- `date` (date, not null)
- `time_taken_minutes` (integer, nullable)
- `time_physics` (integer, nullable — minutes spent on Physics)
- `time_chemistry` (integer, nullable — minutes spent on Chemistry)
- `time_maths` (integer, nullable — minutes spent on Maths)
- `difficulty_rating` (integer, nullable — 1-5)
- `notes` (text, nullable)
- `papers` (jsonb, not null — array of PaperScore objects)
- `total_score` (numeric, not null)
- `max_score` (numeric, not null)
- `percentage` (numeric, not null)
- `accuracy` (numeric, not null)
- `total_correct` (integer, not null)
- `total_incorrect` (integer, not null)
- `total_unattempted` (integer, not null)
- `total_questions` (integer, not null)
- `marks_lost_to_negative` (numeric, not null)
- `percentile` (numeric, nullable)
- `target_achieved` (boolean, default false)
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on both tables.
- Owner-scoped CRUD: each authenticated user can only access rows they own.
- user_id defaults to auth.uid() so inserts that omit user_id succeed.
- test_attempts.template_id has ON DELETE CASCADE so deleting a template removes its attempts.
- Index on user_id for both tables for fast per-user queries.

## Important Notes
1. The frontend uses @supabase/supabase-js with the anon key. When a user is authenticated,
   auth.uid() resolves to their UUID and all policies enforce ownership.
2. The papers/marks_preset columns are jsonb because they store nested arrays of objects.
3. time_physics, time_chemistry, time_maths are nullable — older attempts may not have them.
*/

-- ─── test_templates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  pattern text NOT NULL CHECK (pattern IN ('single', 'dual')),
  papers jsonb NOT NULL,
  total_questions integer NOT NULL DEFAULT 0,
  total_max_marks numeric NOT NULL DEFAULT 0,
  manual_override boolean NOT NULL DEFAULT false,
  marks_preset jsonb NOT NULL DEFAULT '[true]',
  times_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE test_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_test_templates_user_id ON test_templates(user_id);

DROP POLICY IF EXISTS "select_own_templates" ON test_templates;
CREATE POLICY "select_own_templates"
ON test_templates FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_templates" ON test_templates;
CREATE POLICY "insert_own_templates"
ON test_templates FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_templates" ON test_templates;
CREATE POLICY "update_own_templates"
ON test_templates FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_templates" ON test_templates;
CREATE POLICY "delete_own_templates"
ON test_templates FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ─── test_attempts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES test_templates(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  pattern text NOT NULL,
  test_type text NOT NULL DEFAULT 'Mock Test',
  attempt_name text NOT NULL,
  date date NOT NULL,
  time_taken_minutes integer,
  time_physics integer,
  time_chemistry integer,
  time_maths integer,
  difficulty_rating integer,
  notes text,
  papers jsonb NOT NULL,
  total_score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  accuracy numeric NOT NULL DEFAULT 0,
  total_correct integer NOT NULL DEFAULT 0,
  total_incorrect integer NOT NULL DEFAULT 0,
  total_unattempted integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  marks_lost_to_negative numeric NOT NULL DEFAULT 0,
  percentile numeric,
  target_achieved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_test_attempts_user_id ON test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_template_id ON test_attempts(template_id);

DROP POLICY IF EXISTS "select_own_attempts" ON test_attempts;
CREATE POLICY "select_own_attempts"
ON test_attempts FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_attempts" ON test_attempts;
CREATE POLICY "insert_own_attempts"
ON test_attempts FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_attempts" ON test_attempts;
CREATE POLICY "update_own_attempts"
ON test_attempts FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_attempts" ON test_attempts;
CREATE POLICY "delete_own_attempts"
ON test_attempts FOR DELETE
TO authenticated USING (auth.uid() = user_id);
