import { useState, useMemo, useEffect } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import {
  Plus,
  X,
  Save,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Inbox,
  AlignJustify,
  List,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Mistake, Subject, ErrorCategory, Priority, MistakeStatus } from '../types';
import { PomodoroTimer } from './PomodoroTimer';
import { generateSafeId, sanitizeText } from '../utils/security';

interface MistakeLedgerProps {
  mistakes: Mistake[];
  setMistakes: (m: Mistake[] | ((p: Mistake[]) => Mistake[])) => void;
  onXP: (amount: number) => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  autoOpenForm?: boolean;
  onAutoOpenConsumed?: () => void;
  initialSubjectFilter?: Subject | null;
  initialCategoryFilter?: ErrorCategory | null;
}

const SUBJECTS: Subject[] = [
  'Physics',
  'Mathematics',
  'Physical Chemistry',
  'Organic Chemistry',
  'Inorganic Chemistry',
];
const ERROR_CATEGORIES: ErrorCategory[] = [
  'Calculation',
  'Conceptual Gap',
  'Formula Misapplication',
  'Question Misread',
  'Careless/Silly',
];
const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

const SUBJECT_COLORS: Record<Subject, { hex: string; bg: string; border: string; text: string }> = {
  Physics: {
    hex: '#38BDF8',
    bg: 'rgba(56,189,248,0.12)',
    border: 'rgba(56,189,248,0.25)',
    text: '#38BDF8',
  },
  Mathematics: {
    hex: '#FB923C',
    bg: 'rgba(251,146,60,0.12)',
    border: 'rgba(251,146,60,0.25)',
    text: '#FB923C',
  },
  'Physical Chemistry': {
    hex: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
    text: '#F59E0B',
  },
  'Organic Chemistry': {
    hex: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
    text: '#10B981',
  },
  'Inorganic Chemistry': {
    hex: '#F43F5E',
    bg: 'rgba(244,63,94,0.12)',
    border: 'rgba(244,63,94,0.25)',
    text: '#F43F5E',
  },
};

const CATEGORY_COLORS: Record<ErrorCategory, { bg: string; text: string; border: string }> = {
  Calculation: { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
  'Conceptual Gap': {
    bg: 'rgba(56,189,248,0.12)',
    text: '#38BDF8',
    border: 'rgba(56,189,248,0.25)',
  },
  'Formula Misapplication': {
    bg: 'rgba(244,63,94,0.12)',
    text: '#F43F5E',
    border: 'rgba(244,63,94,0.25)',
  },
  'Question Misread': {
    bg: 'rgba(251,146,60,0.12)',
    text: '#FB923C',
    border: 'rgba(251,146,60,0.25)',
  },
  'Careless/Silly': {
    bg: 'rgba(16,185,129,0.12)',
    text: '#10B981',
    border: 'rgba(16,185,129,0.25)',
  },
};

const PRIORITY_COLORS: Record<Priority, string> = {
  High: '#F43F5E',
  Medium: '#F59E0B',
  Low: '#646B78',
};

const emptyForm = () => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  subject: 'Physics' as Subject,
  chapter: '',
  errorCategory: 'Conceptual Gap' as ErrorCategory,
  priority: 'High' as Priority,
  notes: '',
  tags: '',
  status: 'Active' as MistakeStatus,
  marksLost: '5',
  questionTimeSeconds: '180',
});

function MasteredFlash({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div className="animate-ping-once">
        <CheckCircle2 size={38} style={{ color: 'var(--success)' }} />
      </div>
    </div>
  );
}

const PAGE_SIZE = 50;

export function MistakeLedger({
  mistakes,
  setMistakes,
  onXP,
  focusMode = false,
  onToggleFocusMode,
  autoOpenForm = false,
  onAutoOpenConsumed,
  initialSubjectFilter,
  initialCategoryFilter,
}: MistakeLedgerProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubjects, setFilterSubjects] = useState<Subject[]>(
    initialSubjectFilter ? [initialSubjectFilter] : []
  );
  const [filterCategories, setFilterCategories] = useState<ErrorCategory[]>(
    initialCategoryFilter ? [initialCategoryFilter] : []
  );
  const [filterPriorities, setFilterPriorities] = useState<Priority[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | MistakeStatus>('all');
  const [datePreset, setDatePreset] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [drawerMistake, setDrawerMistake] = useState<Mistake | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Mistake> & { tagsStr?: string }>({});
  const [masteredFlash, setMasteredFlash] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [denseMode, setDenseMode] = useState(true);

  useEffect(() => {
    if (autoOpenForm) {
      setShowForm(true);
      onAutoOpenConsumed?.();
    }
  }, [autoOpenForm, onAutoOpenConsumed]);

  useEffect(() => {
    if (initialSubjectFilter) setFilterSubjects([initialSubjectFilter]);
    if (initialCategoryFilter) setFilterCategories([initialCategoryFilter]);
  }, [initialSubjectFilter, initialCategoryFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput);
      setVisibleCount(PAGE_SIZE);
    }, 220);
    return () => clearTimeout(t);
  }, [searchInput]);

  const valid = Array.isArray(mistakes) ? mistakes : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanChapter = sanitizeText(formData.chapter, 160);
    const cleanNotes = sanitizeText(formData.notes, 4000);
    if (!cleanChapter && !cleanNotes) return;

    const m: Mistake = {
      id: generateSafeId('mst'),
      date: formData.date,
      subject: formData.subject,
      chapter: cleanChapter,
      errorCategory: formData.errorCategory,
      priority: formData.priority,
      notes: cleanNotes,
      tags: formData.tags
        .split(',')
        .map(t => sanitizeText(t, 48))
        .filter(Boolean),
      status: formData.status,
      createdAt: Date.now(),
      reviewCount: 0,
      marksLost: Math.max(0, parseFloat(formData.marksLost) || 0),
      questionTimeSeconds: Math.max(0, parseInt(formData.questionTimeSeconds) || 0) || undefined,
    };
    setMistakes(prev => [m, ...(Array.isArray(prev) ? prev : [])]);
    onXP(10);
    setFormData(emptyForm());
    setShowForm(false);
  };

  const toggleStatus = (id: string) => {
    setMistakes(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map(m => {
        if (m.id !== id) return m;
        const going = m.status === 'Active';
        if (going) {
          setMasteredFlash(id);
          setTimeout(() => setMasteredFlash(null), 700);
          onXP(50);
        }
        return {
          ...m,
          status: going ? 'Mastered' : 'Active',
          masteredAt: going ? Date.now() : undefined,
          nextReviewAt: going ? Date.now() + 86400000 : undefined,
          reviewCount: going ? (m.reviewCount ?? 0) + 1 : m.reviewCount,
        };
      });
    });
    if (drawerMistake?.id === id) {
      setDrawerMistake(p =>
        p ? { ...p, status: p.status === 'Active' ? 'Mastered' : 'Active' } : null
      );
    }
  };

  const handleDelete = (id: string) => {
    setMistakes(prev => (Array.isArray(prev) ? prev : []).filter(m => m.id !== id));
    if (drawerMistake?.id === id) setDrawerMistake(null);
  };

  const saveEdit = () => {
    if (!drawerMistake) return;
    const updated: Mistake = {
      ...drawerMistake,
      ...editData,
      chapter:
        editData.chapter !== undefined
          ? sanitizeText(editData.chapter, 160)
          : drawerMistake.chapter,
      notes:
        editData.notes !== undefined ? sanitizeText(editData.notes, 4000) : drawerMistake.notes,
      tags:
        editData.tagsStr !== undefined
          ? editData.tagsStr
              .split(',')
              .map(t => sanitizeText(t, 48))
              .filter(Boolean)
          : editData.tags ?? drawerMistake.tags,
    };
    setMistakes(prev => (Array.isArray(prev) ? prev : []).map(m => (m.id === updated.id ? updated : m)));
    setDrawerMistake(updated);
    setEditMode(false);
    setEditData({});
  };

  const tog = <T,>(arr: T[], val: T, set: (a: T[]) => void) =>
    set(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);

  const clearFilters = () => {
    setFilterSubjects([]);
    setFilterCategories([]);
    setFilterPriorities([]);
    setFilterStatus('all');
    setDatePreset(null);
    setDateFrom('');
    setDateTo('');
    setSearchInput('');
  };

  const hasFilters =
    filterSubjects.length > 0 ||
    filterCategories.length > 0 ||
    filterPriorities.length > 0 ||
    filterStatus !== 'all' ||
    datePreset !== null ||
    dateFrom !== '' ||
    dateTo !== '' ||
    searchQuery !== '';

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return valid
      .filter(m => !filterSubjects.length || filterSubjects.includes(m.subject))
      .filter(m => !filterCategories.length || filterCategories.includes(m.errorCategory))
      .filter(m => !filterPriorities.length || filterPriorities.includes(m.priority))
      .filter(m => filterStatus === 'all' || m.status === filterStatus)
      .filter(m => {
        if (datePreset) return m.date >= format(subDays(new Date(), datePreset), 'yyyy-MM-dd');
        if (dateFrom && m.date < dateFrom) return false;
        if (dateTo && m.date > dateTo) return false;
        return true;
      })
      .filter(
        m =>
          !q ||
          [m.chapter, m.notes, m.subject, m.errorCategory, ...(m.tags ?? [])].some(s =>
            s?.toLowerCase().includes(q)
          )
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [
    valid,
    filterSubjects,
    filterCategories,
    filterPriorities,
    filterStatus,
    datePreset,
    dateFrom,
    dateTo,
    searchQuery,
  ]);

  const visibleMistakes = filtered.slice(0, visibleCount);
  const S = (s: Subject) => SUBJECT_COLORS[s];
  const C = (c: ErrorCategory) => CATEGORY_COLORS[c];

  const totalNegRisk = filtered
    .filter(m => m.status === 'Active')
    .reduce((acc, m) => acc + (m.marksLost ?? 4), 0);

  return (
    <div className="flex gap-4 relative animate-slide-up">
      <div
        className={`flex-1 min-w-0 space-y-4 transition-all duration-200 ${
          drawerMistake ? 'md:mr-[400px]' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="page-title">Mistake Ledger</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {valid.length} total entries · {valid.filter(m => m.status === 'Active').length} active
              bottlenecks · -{totalNegRisk} marks at risk
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onToggleFocusMode && (
              <button
                type="button"
                onClick={onToggleFocusMode}
                className="btn-ghost"
                style={{
                  borderColor: focusMode ? 'rgba(13,148,136,0.45)' : undefined,
                  color: focusMode ? 'var(--accent)' : undefined,
                }}
                title="Toggle Distraction-Free Analysis Mode (F)"
              >
                {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span className="hidden sm:inline">
                  {focusMode ? 'Exit Focus' : 'Distraction-Free'}
                </span>
                <span className="kbd-shortcut">F</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowForm(!showForm);
                setShowFilters(false);
              }}
              className={showForm ? 'btn-ghost' : 'btn-primary'}
            >
              {showForm ? (
                <>
                  <X size={14} />
                  Cancel
                </>
              ) : (
                <>
                  <Plus size={14} />
                  Log Mistake
                  <span
                    className="kbd-shortcut ml-1"
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.2)',
                    }}
                  >
                    N
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="card animate-slide-down" style={{ padding: 20 }}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div>
                  <label className="field-label">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="field tabular-num"
                  />
                </div>
                <div>
                  <label className="field-label">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value as Subject })}
                    className="field"
                  >
                    {SUBJECTS.map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Error Category</label>
                  <select
                    value={formData.errorCategory}
                    onChange={e =>
                      setFormData({ ...formData, errorCategory: e.target.value as ErrorCategory })
                    }
                    className="field"
                  >
                    {ERROR_CATEGORIES.map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e =>
                      setFormData({ ...formData, priority: e.target.value as Priority })
                    }
                    className="field"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Marks Lost (-pts)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={25}
                    value={formData.marksLost}
                    onChange={e => setFormData({ ...formData, marksLost: e.target.value })}
                    className="field tabular-num"
                  />
                </div>
                <div>
                  <label className="field-label">Time Spent (sec)</label>
                  <input
                    type="number"
                    min={0}
                    max={3600}
                    value={formData.questionTimeSeconds}
                    onChange={e =>
                      setFormData({ ...formData, questionTimeSeconds: e.target.value })
                    }
                    className="field tabular-num"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Chapter / Topic</label>
                  <input
                    type="text"
                    value={formData.chapter}
                    onChange={e => setFormData({ ...formData, chapter: e.target.value })}
                    placeholder="e.g. Rotational Mechanics — Rolling with Slipping"
                    className="field"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="field-label">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="torque, angular-momentum, sign-error"
                    className="field"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Root-Cause Analysis & Corrective Takeaway</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Why did the error happen? Write the exact formula or condition to verify next time..."
                  className="field"
                  style={{ resize: 'none' }}
                />
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3">
                <PomodoroTimer compact />
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1.5">
                    {(['Active', 'Mastered'] as MistakeStatus[]).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: s })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 12px',
                          borderRadius: 'var(--radius-button)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor:
                            formData.status === s
                              ? s === 'Mastered'
                                ? 'rgba(16,185,129,0.35)'
                                : 'rgba(245,158,11,0.35)'
                              : 'var(--border-subtle)',
                          background:
                            formData.status === s
                              ? s === 'Mastered'
                                ? 'var(--success-bg)'
                                : 'var(--warning-bg)'
                              : 'var(--bg-elevated)',
                          color:
                            formData.status === s
                              ? s === 'Mastered'
                                ? 'var(--success)'
                                : 'var(--warning)'
                              : 'var(--text-tertiary)',
                        }}
                      >
                        {s === 'Mastered' ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                        {s}
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ background: 'var(--success)' }}
                  >
                    <Save size={14} />
                    Save Mistake (+10 XP)
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Search + Filter Controls */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="flex items-center gap-2 flex-wrap" style={{ padding: '12px 16px' }}>
            <div className="relative flex-1 min-w-[180px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search chapters, notes, error types, tags…"
                className="field"
                style={{ paddingLeft: 34, paddingTop: 7, paddingBottom: 7 }}
              />
            </div>
            <button
              type="button"
              onClick={() => setDenseMode(!denseMode)}
              className="btn-ghost"
              style={{ padding: '6px 10px', fontSize: 12 }}
              title="Toggle Table Density"
            >
              {denseMode ? <AlignJustify size={13} /> : <List size={13} />}
              <span className="hidden sm:inline">{denseMode ? 'Compact' : 'Comfortable'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="btn-ghost"
              style={{
                padding: '6px 11px',
                fontSize: 12,
                borderColor: showFilters || hasFilters ? 'rgba(13,148,136,0.4)' : undefined,
                color: showFilters || hasFilters ? 'var(--accent)' : undefined,
              }}
            >
              <SlidersHorizontal size={13} />
              Filters
            </button>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn-ghost"
                style={{ padding: '6px 9px' }}
              >
                <X size={13} />
              </button>
            )}
            <span className="tabular-num" style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
              {filtered.length}/{valid.length}
            </span>
          </div>

          {showFilters && (
            <div
              style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 16px' }}
              className="space-y-3 animate-slide-down"
            >
              <div className="flex flex-wrap gap-2 items-center">
                {[
                  { l: '7 Days', v: 7 },
                  { l: '30 Days', v: 30 },
                  { l: '1 Year', v: 365 },
                ].map(p => (
                  <button
                    key={p.v}
                    type="button"
                    onClick={() => {
                      setDatePreset(datePreset === p.v ? null : p.v);
                      setDateFrom('');
                      setDateTo('');
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-badge)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor:
                        datePreset === p.v ? 'rgba(13,148,136,0.4)' : 'var(--border-subtle)',
                      background:
                        datePreset === p.v ? 'var(--accent-muted-bg)' : 'var(--bg-elevated)',
                      color: datePreset === p.v ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {p.l}
                  </button>
                ))}
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => {
                    setDateFrom(e.target.value);
                    setDatePreset(null);
                  }}
                  className="field tabular-num"
                  style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}
                />
                <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>→</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => {
                    setDateTo(e.target.value);
                    setDatePreset(null);
                  }}
                  className="field tabular-num"
                  style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {SUBJECTS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => tog(filterSubjects, s, setFilterSubjects)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-badge)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: filterSubjects.includes(s) ? S(s).border : 'var(--border-subtle)',
                      background: filterSubjects.includes(s) ? S(s).bg : 'var(--bg-elevated)',
                      color: filterSubjects.includes(s) ? S(s).text : 'var(--text-secondary)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ERROR_CATEGORIES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => tog(filterCategories, c, setFilterCategories)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-badge)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: filterCategories.includes(c)
                        ? C(c).border
                        : 'var(--border-subtle)',
                      background: filterCategories.includes(c) ? C(c).bg : 'var(--bg-elevated)',
                      color: filterCategories.includes(c) ? C(c).text : 'var(--text-secondary)',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="flex gap-1.5">
                  {PRIORITIES.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => tog(filterPriorities, p, setFilterPriorities)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 'var(--radius-badge)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: filterPriorities.includes(p)
                          ? `${PRIORITY_COLORS[p]}40`
                          : 'var(--border-subtle)',
                        background: filterPriorities.includes(p)
                          ? `${PRIORITY_COLORS[p]}15`
                          : 'var(--bg-elevated)',
                        color: filterPriorities.includes(p)
                          ? PRIORITY_COLORS[p]
                          : 'var(--text-secondary)',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {(['all', 'Active', 'Mastered'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFilterStatus(s)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 'var(--radius-badge)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor:
                          filterStatus === s ? 'rgba(13,148,136,0.4)' : 'var(--border-subtle)',
                        background:
                          filterStatus === s ? 'var(--accent-muted-bg)' : 'var(--bg-elevated)',
                        color: filterStatus === s ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      {s === 'all' ? 'All Status' : s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* High-Density Mistake Table */}
        {filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-3" style={{ padding: '64px 24px' }}>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              {valid.length === 0 ? (
                <Plus size={22} style={{ color: 'var(--text-tertiary)' }} />
              ) : (
                <Inbox size={22} style={{ color: 'var(--text-tertiary)' }} />
              )}
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {valid.length === 0 ? 'No mistakes logged yet' : 'No entries match your filters'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {valid.length === 0
                ? 'Press N or click "Log Mistake" to record your first root-cause entry'
                : 'Try adjusting or clearing your active filters'}
            </p>
          </div>
        ) : (
          <>
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="w-full" style={{ minWidth: 680, borderCollapse: 'collapse' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: 'var(--bg-elevated)',
                    }}
                  >
                    {[
                      { label: 'Chapter & Takeaway', align: 'left' as const },
                      { label: 'Subject', align: 'left' as const },
                      { label: 'Root Cause', align: 'left' as const },
                      { label: 'Cost', align: 'right' as const },
                      { label: 'Priority', align: 'left' as const },
                      { label: 'Date', align: 'right' as const },
                      { label: 'Status', align: 'right' as const },
                    ].map(h => (
                      <th
                        key={h.label}
                        style={{
                          padding: denseMode ? '9px 14px' : '13px 16px',
                          textAlign: h.align,
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text-tertiary)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleMistakes.map((m, idx) => {
                    const sc = S(m.subject);
                    const cc = C(m.errorCategory);
                    const isOpen = drawerMistake?.id === m.id;
                    const mastered = m.status === 'Mastered';
                    const cellPad = denseMode ? '9px 14px' : '13px 16px';
                    const lost =
                      m.marksLost ?? (m.priority === 'High' ? 5 : m.priority === 'Medium' ? 4 : 1);

                    return (
                      <tr
                        key={m.id}
                        onClick={() => {
                          setDrawerMistake(m);
                          setEditMode(false);
                          setEditData({});
                        }}
                        className="relative hover:bg-[#1A1E26]"
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: isOpen
                            ? 'var(--accent-muted-bg)'
                            : idx % 2 === 1
                            ? 'rgba(23, 26, 33, 0.45)'
                            : 'transparent',
                          opacity: mastered && !isOpen ? 0.58 : 1,
                          cursor: 'pointer',
                          transition: 'background 100ms, opacity 200ms',
                        }}
                      >
                        {masteredFlash === m.id && <MasteredFlash show />}
                        <td style={{ padding: cellPad, maxWidth: 260 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {m.chapter || 'Untitled Concept'}
                          </div>
                          {m.notes && (
                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--text-tertiary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                marginTop: 1,
                              }}
                            >
                              {m.notes}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: cellPad, whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: sc.text }}>
                            {m.subject}
                          </span>
                        </td>
                        <td style={{ padding: cellPad, whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: cc.text }}>
                            {m.errorCategory}
                          </span>
                        </td>
                        <td
                          className="tabular-num"
                          style={{ padding: cellPad, textAlign: 'right', whiteSpace: 'nowrap' }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: lost >= 5 ? 'var(--danger)' : 'var(--warning)',
                            }}
                          >
                            -{lost}m
                          </span>
                        </td>
                        <td style={{ padding: cellPad, whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: PRIORITY_COLORS[m.priority],
                            }}
                          >
                            {m.priority}
                          </span>
                        </td>
                        <td
                          className="tabular-num"
                          style={{
                            padding: cellPad,
                            textAlign: 'right',
                            fontSize: 11.5,
                            color: 'var(--text-tertiary)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {format(parseISO(m.date), 'MMM d')}
                        </td>
                        <td
                          style={{ padding: cellPad, textAlign: 'right', whiteSpace: 'nowrap' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => toggleStatus(m.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '5px 10px',
                              borderRadius: 'var(--radius-badge)',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: '1px solid',
                              borderColor: mastered
                                ? 'rgba(16,185,129,0.28)'
                                : 'rgba(245,158,11,0.28)',
                              background: mastered ? 'var(--success-bg)' : 'var(--warning-bg)',
                              color: mastered ? 'var(--success)' : 'var(--warning)',
                            }}
                          >
                            {mastered ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                            <span>{mastered ? 'Mastered' : 'Active'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visibleCount < filtered.length && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  className="btn-ghost"
                >
                  Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more (
                  {filtered.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Slide-out Inspection Drawer */}
      {drawerMistake && (
        <div className="fixed md:absolute top-0 right-0 h-full z-50 animate-slide-right">
          <div
            style={{
              width: 390,
              maxWidth: '100vw',
              height: '100vh',
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '16px 18px',
                borderBottom: '1px solid var(--border-subtle)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div className="flex items-center gap-2 text-xs">
                <span style={{ fontWeight: 700, color: S(drawerMistake.subject).text }}>
                  {drawerMistake.subject}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-num" style={{ color: 'var(--text-tertiary)' }}>
                  {format(parseISO(drawerMistake.date), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditMode(!editMode)}
                  className="btn-ghost"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                >
                  <Edit3 size={12} />
                  {editMode ? 'Cancel' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerMistake(null);
                    setEditMode(false);
                  }}
                  className="btn-ghost"
                  style={{ padding: '6px 8px' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 18 }} className="space-y-4">
              {editMode ? (
                <div className="space-y-3">
                  <div>
                    <label className="field-label">Chapter</label>
                    <input
                      defaultValue={drawerMistake.chapter}
                      onChange={e => setEditData(p => ({ ...p, chapter: e.target.value }))}
                      className="field"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="field-label">Category</label>
                      <select
                        defaultValue={drawerMistake.errorCategory}
                        onChange={e =>
                          setEditData(p => ({
                            ...p,
                            errorCategory: e.target.value as ErrorCategory,
                          }))
                        }
                        className="field"
                      >
                        {ERROR_CATEGORIES.map(c => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Priority</label>
                      <select
                        defaultValue={drawerMistake.priority}
                        onChange={e =>
                          setEditData(p => ({ ...p, priority: e.target.value as Priority }))
                        }
                        className="field"
                      >
                        {PRIORITIES.map(p => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Marks Lost</label>
                      <input
                        type="number"
                        step="0.5"
                        defaultValue={drawerMistake.marksLost ?? 4}
                        onChange={e =>
                          setEditData(p => ({ ...p, marksLost: parseFloat(e.target.value) || 0 }))
                        }
                        className="field tabular-num"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Notes</label>
                    <textarea
                      defaultValue={drawerMistake.notes}
                      onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))}
                      rows={5}
                      className="field"
                      style={{ resize: 'none' }}
                    />
                  </div>
                  <div>
                    <label className="field-label">Tags</label>
                    <input
                      defaultValue={drawerMistake.tags?.join(', ')}
                      onChange={e => setEditData(p => ({ ...p, tagsStr: e.target.value }))}
                      placeholder="comma-separated"
                      className="field"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="btn-primary w-full"
                    style={{ justifyContent: 'center' }}
                  >
                    <Save size={14} />
                    Save Changes
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {drawerMistake.chapter || 'Untitled'}
                    </h3>
                    <div
                      className="flex items-center gap-2 text-xs mt-1.5"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <span style={{ color: C(drawerMistake.errorCategory).text, fontWeight: 600 }}>
                        {drawerMistake.errorCategory}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        style={{
                          color: PRIORITY_COLORS[drawerMistake.priority],
                          fontWeight: 600,
                        }}
                      >
                        {drawerMistake.priority} Priority
                      </span>
                      {drawerMistake.marksLost !== undefined && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-num" style={{ color: 'var(--danger)', fontWeight: 700 }}>
                            -{drawerMistake.marksLost} marks
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {drawerMistake.notes && (
                    <div>
                      <p className="field-label" style={{ marginBottom: 6 }}>
                        Root Cause & Solution Note
                      </p>
                      <div
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-button)',
                          padding: 14,
                          fontSize: 13.5,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.65,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {drawerMistake.notes}
                      </div>
                    </div>
                  )}

                  {drawerMistake.tags?.length > 0 && (
                    <div>
                      <p className="field-label" style={{ marginBottom: 6 }}>
                        Tags
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {drawerMistake.tags.map(t => (
                          <span key={t} className="font-mono">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      {
                        label: 'Status',
                        value: drawerMistake.status,
                        color:
                          drawerMistake.status === 'Mastered' ? 'var(--success)' : 'var(--warning)',
                      },
                      {
                        label: 'Reviews',
                        value: `${drawerMistake.reviewCount ?? 0}×`,
                        color: 'var(--text-primary)',
                      },
                      ...(drawerMistake.questionTimeSeconds
                        ? [
                            {
                              label: 'Question Time',
                              value: `${drawerMistake.questionTimeSeconds}s`,
                              color: 'var(--info)',
                            },
                          ]
                        : []),
                      ...(drawerMistake.timeSpentMinutes
                        ? [
                            {
                              label: 'Revision Time',
                              value: `${drawerMistake.timeSpentMinutes}m`,
                              color: 'var(--text-primary)',
                            },
                          ]
                        : []),
                    ].map(item => (
                      <div
                        key={item.label}
                        style={{
                          padding: 12,
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-button)',
                        }}
                      >
                        <p style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginBottom: 2 }}>
                          {item.label}
                        </p>
                        <p
                          className="tabular-num"
                          style={{ fontSize: 14, fontWeight: 700, color: item.color }}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="field-label" style={{ marginBottom: 6 }}>
                      Drill Timer
                    </p>
                    <PomodoroTimer
                      onComplete={mins => {
                        const u = {
                          ...drawerMistake,
                          timeSpentMinutes: (drawerMistake.timeSpentMinutes ?? 0) + mins,
                        };
                        setMistakes(prev =>
                          (Array.isArray(prev) ? prev : []).map(m => (m.id === u.id ? u : m))
                        );
                        setDrawerMistake(u);
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                flexShrink: 0,
                borderTop: '1px solid var(--border-subtle)',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <button
                type="button"
                onClick={() => handleDelete(drawerMistake.id)}
                className="btn-ghost"
                style={{ borderColor: 'rgba(244,63,94,0.2)', color: 'var(--danger)' }}
              >
                <Trash2 size={13} />
                Delete
              </button>
              <button
                type="button"
                onClick={() => toggleStatus(drawerMistake.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-button)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor:
                    drawerMistake.status === 'Mastered'
                      ? 'rgba(245,158,11,0.3)'
                      : 'rgba(16,185,129,0.3)',
                  background:
                    drawerMistake.status === 'Mastered'
                      ? 'var(--warning-bg)'
                      : 'var(--success-bg)',
                  color:
                    drawerMistake.status === 'Mastered' ? 'var(--warning)' : 'var(--success)',
                }}
              >
                {drawerMistake.status === 'Mastered' ? (
                  <>
                    <Clock size={13} />
                    Mark Active
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    Mark Mastered (+50 XP)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
