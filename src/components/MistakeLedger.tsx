import { useState, useMemo, useEffect } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import {
  Plus, X, Save, Search, SlidersHorizontal, Tag, CheckCircle2, Clock,
  Trash2, Edit3, Circle, Inbox,
} from 'lucide-react';
import { Mistake, Subject, ErrorCategory, Priority, MistakeStatus } from '../types';
import { PomodoroTimer } from './PomodoroTimer';

interface MistakeLedgerProps {
  mistakes: Mistake[];
  setMistakes: (m: Mistake[] | ((p: Mistake[]) => Mistake[])) => void;
  onXP: (amount: number) => void;
}

const SUBJECTS: Subject[] = ['Physics', 'Mathematics', 'Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'];
const ERROR_CATEGORIES: ErrorCategory[] = ['Calculation', 'Conceptual Gap', 'Formula Misapplication', 'Question Misread', 'Careless/Silly'];
const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

const SUBJECT_COLORS: Record<Subject, { hex: string; bg: string; border: string; text: string }> = {
  Physics:               { hex: '#38BDF8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.25)',  text: '#38BDF8' },
  Mathematics:           { hex: '#4F6BFF', bg: 'rgba(79,107,255,0.12)',  border: 'rgba(79,107,255,0.25)',  text: '#4F6BFF' },
  'Physical Chemistry':  { hex: '#F5A623', bg: 'rgba(245,166,35,0.12)',  border: 'rgba(245,166,35,0.25)',  text: '#F5A623' },
  'Organic Chemistry':   { hex: '#22C55E', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)',   text: '#22C55E' },
  'Inorganic Chemistry': { hex: '#F5455C', bg: 'rgba(245,69,92,0.12)',   border: 'rgba(245,69,92,0.25)',   text: '#F5455C' },
};

const CATEGORY_COLORS: Record<ErrorCategory, { bg: string; text: string; border: string }> = {
  'Calculation':            { bg: 'rgba(245,166,35,0.12)',  text: '#F5A623', border: 'rgba(245,166,35,0.25)' },
  'Conceptual Gap':         { bg: 'rgba(56,189,248,0.12)',  text: '#38BDF8', border: 'rgba(56,189,248,0.25)' },
  'Formula Misapplication': { bg: 'rgba(245,69,92,0.12)',   text: '#F5455C', border: 'rgba(245,69,92,0.25)' },
  'Question Misread':       { bg: 'rgba(79,107,255,0.12)',  text: '#4F6BFF', border: 'rgba(79,107,255,0.25)' },
  'Careless/Silly':         { bg: 'rgba(34,197,94,0.12)',   text: '#22C55E', border: 'rgba(34,197,94,0.25)' },
};

const PRIORITY_COLORS: Record<Priority, string> = { High: '#F5455C', Medium: '#F5A623', Low: '#5C5F70' };

const genId = () => Math.random().toString(36).substr(2, 9);
const emptyForm = () => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  subject: 'Physics' as Subject, chapter: '', errorCategory: 'Calculation' as ErrorCategory,
  priority: 'Medium' as Priority, notes: '', tags: '', status: 'Active' as MistakeStatus,
});

function MasteredFlash({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div className="animate-ping-once">
        <CheckCircle2 size={44} style={{ color: 'var(--success)' }} />
      </div>
    </div>
  );
}

const PAGE_SIZE = 50;

export function MistakeLedger({ mistakes, setMistakes, onXP }: MistakeLedgerProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubjects, setFilterSubjects] = useState<Subject[]>([]);
  const [filterCategories, setFilterCategories] = useState<ErrorCategory[]>([]);
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

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => { setSearchQuery(searchInput); setVisibleCount(PAGE_SIZE); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const valid = Array.isArray(mistakes) ? mistakes : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.chapter.trim() && !formData.notes.trim()) return;
    const m: Mistake = {
      id: genId(), date: formData.date, subject: formData.subject, chapter: formData.chapter,
      errorCategory: formData.errorCategory, priority: formData.priority, notes: formData.notes,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      status: formData.status, createdAt: Date.now(), reviewCount: 0,
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
        if (going) { setMasteredFlash(id); setTimeout(() => setMasteredFlash(null), 900); onXP(50); }
        return { ...m, status: going ? 'Mastered' : 'Active', masteredAt: going ? Date.now() : undefined, nextReviewAt: going ? Date.now() + 86400000 : undefined, reviewCount: going ? (m.reviewCount ?? 0) + 1 : m.reviewCount };
      });
    });
    if (drawerMistake?.id === id) setDrawerMistake(p => p ? { ...p, status: p.status === 'Active' ? 'Mastered' : 'Active' } : null);
  };

  const handleDelete = (id: string) => {
    setMistakes(prev => (Array.isArray(prev) ? prev : []).filter(m => m.id !== id));
    if (drawerMistake?.id === id) setDrawerMistake(null);
  };

  const saveEdit = () => {
    if (!drawerMistake) return;
    const updated: Mistake = { ...drawerMistake, ...editData, tags: editData.tagsStr !== undefined ? editData.tagsStr.split(',').map(t => t.trim()).filter(Boolean) : (editData.tags ?? drawerMistake.tags) };
    setMistakes(prev => (Array.isArray(prev) ? prev : []).map(m => m.id === updated.id ? updated : m));
    setDrawerMistake(updated);
    setEditMode(false);
    setEditData({});
  };

  const tog = <T,>(arr: T[], val: T, set: (a: T[]) => void) => set(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  const clearFilters = () => { setFilterSubjects([]); setFilterCategories([]); setFilterPriorities([]); setFilterStatus('all'); setDatePreset(null); setDateFrom(''); setDateTo(''); setSearchInput(''); };
  const hasFilters = filterSubjects.length > 0 || filterCategories.length > 0 || filterPriorities.length > 0 || filterStatus !== 'all' || datePreset !== null || dateFrom !== '' || dateTo !== '' || searchQuery !== '';

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
      .filter(m => !q || [m.chapter, m.notes, m.subject, m.errorCategory, ...(m.tags ?? [])].some(s => s?.toLowerCase().includes(q)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [valid, filterSubjects, filterCategories, filterPriorities, filterStatus, datePreset, dateFrom, dateTo, searchQuery]);

  const visibleMistakes = filtered.slice(0, visibleCount);

  const S = (s: Subject) => SUBJECT_COLORS[s];
  const C = (c: ErrorCategory) => CATEGORY_COLORS[c];

  return (
    <div className="flex gap-4 relative animate-slide-up">
      <div className={`flex-1 min-w-0 space-y-6 transition-all duration-300 ${drawerMistake ? 'md:mr-[420px]' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">Mistake Ledger</h2>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{valid.length} logged · {valid.filter(m => m.status === 'Active').length} active</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setShowFilters(false); }} className={showForm ? 'btn-ghost' : 'btn-primary'}>
            {showForm ? <><X size={15} />Cancel</> : <><Plus size={15} />Log Mistake<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginLeft: 2 }}>+10 XP</span></>}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="card animate-slide-down" style={{ padding: 24 }}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="field-label">Date</label><input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="field" /></div>
                <div><label className="field-label">Subject</label><select value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value as Subject })} className="field">{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select></div>
                <div><label className="field-label">Error Type</label><select value={formData.errorCategory} onChange={e => setFormData({ ...formData, errorCategory: e.target.value as ErrorCategory })} className="field">{ERROR_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label className="field-label">Priority</label><select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as Priority })} className="field">{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="field-label">Chapter / Topic</label><input type="text" value={formData.chapter} onChange={e => setFormData({ ...formData, chapter: e.target.value })} placeholder="e.g. Projectile Motion" className="field" /></div>
                <div><label className="field-label">Tags</label><input type="text" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} placeholder="kinematics, velocity, units" className="field" /></div>
              </div>
              <div><label className="field-label">Notes / Solution</label>
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={4} placeholder="What went wrong? Paste solution here..." className="field" style={{ resize: 'none' }} />
              </div>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <PomodoroTimer compact />
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    {(['Active', 'Mastered'] as MistakeStatus[]).map(s => (
                      <button key={s} type="button" onClick={() => setFormData({ ...formData, status: s })}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-button)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms', border: '1px solid', borderColor: formData.status === s ? (s === 'Mastered' ? 'rgba(34,197,94,0.3)' : 'rgba(245,166,35,0.3)') : 'var(--border-subtle)', background: formData.status === s ? (s === 'Mastered' ? 'var(--success-bg)' : 'var(--warning-bg)') : 'var(--bg-elevated)', color: formData.status === s ? (s === 'Mastered' ? 'var(--success)' : 'var(--warning)') : 'var(--text-tertiary)' }}>
                        {s === 'Mastered' ? <CheckCircle2 size={13} /> : <Clock size={13} />}{s}
                      </button>
                    ))}
                  </div>
                  <button type="submit" className="btn-primary" style={{ background: 'var(--success)' }}>
                    <Save size={14} />Save Entry
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Search + Filters */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="flex items-center gap-2.5 flex-wrap" style={{ padding: '14px 18px' }}>
            <div className="relative flex-1 min-w-[160px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
              <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search chapters, notes, tags…"
                className="field" style={{ paddingLeft: 36, paddingTop: 9, paddingBottom: 9 }} />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className="btn-ghost"
              style={{ borderColor: showFilters || hasFilters ? 'rgba(79,107,255,0.4)' : undefined, color: showFilters || hasFilters ? 'var(--accent)' : undefined, gap: 7 }}>
              <SlidersHorizontal size={14} />Filters{hasFilters && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)', display: 'inline-block' }} />}
            </button>
            {hasFilters && <button onClick={clearFilters} className="btn-ghost" style={{ padding: '9px 12px' }}><X size={13} /></button>}
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{filtered.length}/{valid.length}</span>
          </div>

          {showFilters && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 18px' }} className="space-y-3 animate-slide-down">
              <div className="flex flex-wrap gap-2">
                {[{ l: '7 Days', v: 7 }, { l: '30 Days', v: 30 }, { l: '1 Year', v: 365 }].map(p => (
                  <button key={p.v} onClick={() => { setDatePreset(datePreset === p.v ? null : p.v); setDateFrom(''); setDateTo(''); }}
                    style={{ padding: '6px 12px', borderRadius: 'var(--radius-badge)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: datePreset === p.v ? 'rgba(79,107,255,0.4)' : 'var(--border-subtle)', background: datePreset === p.v ? 'var(--accent-muted-bg)' : 'var(--bg-elevated)', color: datePreset === p.v ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {p.l}
                  </button>
                ))}
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setDatePreset(null); }} className="field" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }} />
                <span style={{ color: 'var(--text-tertiary)', alignSelf: 'center', fontSize: 12 }}>→</span>
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setDatePreset(null); }} className="field" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECTS.map(s => (
                  <button key={s} onClick={() => tog(filterSubjects, s, setFilterSubjects)}
                    style={{ padding: '6px 12px', borderRadius: 'var(--radius-badge)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: filterSubjects.includes(s) ? S(s).border : 'var(--border-subtle)', background: filterSubjects.includes(s) ? S(s).bg : 'var(--bg-elevated)', color: filterSubjects.includes(s) ? S(s).text : 'var(--text-secondary)' }}>{s}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ERROR_CATEGORIES.map(c => (
                  <button key={c} onClick={() => tog(filterCategories, c, setFilterCategories)}
                    style={{ padding: '6px 12px', borderRadius: 'var(--radius-badge)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: filterCategories.includes(c) ? C(c).border : 'var(--border-subtle)', background: filterCategories.includes(c) ? C(c).bg : 'var(--bg-elevated)', color: filterCategories.includes(c) ? C(c).text : 'var(--text-secondary)' }}>{c}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex gap-1.5">
                  {PRIORITIES.map(p => (
                    <button key={p} onClick={() => tog(filterPriorities, p, setFilterPriorities)}
                      style={{ padding: '6px 12px', borderRadius: 'var(--radius-badge)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: filterPriorities.includes(p) ? `${PRIORITY_COLORS[p]}40` : 'var(--border-subtle)', background: filterPriorities.includes(p) ? `${PRIORITY_COLORS[p]}15` : 'var(--bg-elevated)', color: filterPriorities.includes(p) ? PRIORITY_COLORS[p] : 'var(--text-secondary)' }}>{p}</button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {['all', 'Active', 'Mastered'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s as any)}
                      style={{ padding: '6px 12px', borderRadius: 'var(--radius-badge)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: filterStatus === s ? (s === 'Mastered' ? 'rgba(34,197,94,0.3)' : s === 'Active' ? 'rgba(245,166,35,0.3)' : 'rgba(79,107,255,0.3)') : 'var(--border-subtle)', background: filterStatus === s ? (s === 'Mastered' ? 'var(--success-bg)' : s === 'Active' ? 'var(--warning-bg)' : 'var(--accent-muted-bg)') : 'var(--bg-elevated)', color: filterStatus === s ? (s === 'Mastered' ? 'var(--success)' : s === 'Active' ? 'var(--warning)' : 'var(--accent)') : 'var(--text-secondary)' }}>
                      {s === 'all' ? 'All' : s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table or Empty State */}
        {filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-3" style={{ padding: '64px 24px' }}>
            <div className="w-14 h-14 rounded-[16px] flex items-center justify-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              {valid.length === 0 ? <Plus size={24} style={{ color: 'var(--text-tertiary)' }} /> : <Inbox size={24} style={{ color: 'var(--text-tertiary)' }} />}
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {valid.length === 0 ? 'No mistakes logged yet' : 'No entries match your filters'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {valid.length === 0 ? 'Click "Log Mistake" to add your first entry' : 'Try adjusting or clearing your filters'}
            </p>
            {valid.length === 0 && (
              <button onClick={() => setShowForm(true)} className="btn-primary" style={{ marginTop: 8 }}>
                <Plus size={15} />Log Your First Mistake
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="w-full" style={{ minWidth: 500 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Subject · Chapter', 'Error Type', 'Priority', 'Date', 'Status'].map((h, i) => (
                      <th key={h} className={i >= 2 ? (i === 2 ? 'hidden lg:table-cell' : i === 3 ? 'hidden md:table-cell' : '') : i === 1 ? 'hidden md:table-cell' : ''}
                        style={{ padding: '14px 18px', textAlign: i === 4 ? 'right' : 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                        {h}
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
                    return (
                      <tr key={m.id} onClick={() => { setDrawerMistake(m); setEditMode(false); setEditData({}); }}
                        className="relative"
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: isOpen ? 'var(--accent-muted-bg)' : idx % 2 === 1 ? 'var(--bg-elevated)' : 'transparent',
                          opacity: mastered && !isOpen ? 0.5 : 1,
                          cursor: 'pointer',
                          transition: 'background 100ms, opacity 200ms',
                        }}>
                        {masteredFlash === m.id && <MasteredFlash show />}
                        <td style={{ padding: '14px 18px' }}>
                          <div className="flex items-center gap-2">
                            <span className="badge hidden sm:inline-flex" style={{ background: sc.bg, color: sc.text, borderColor: sc.border, fontSize: 10 }}>{m.subject.split(' ')[0]}</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                              {m.chapter || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Untitled</span>}
                            </span>
                          </div>
                          {m.tags?.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {m.tags.slice(0, 3).map(t => (
                                <span key={t} className="flex items-center gap-0.5" style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', padding: '2px 7px', borderRadius: 'var(--radius-badge)' }}>
                                  <Tag size={8} />{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="hidden md:table-cell" style={{ padding: '14px 12px' }}>
                          <span className="badge" style={{ background: cc.bg, color: cc.text, borderColor: cc.border, fontSize: 10 }}>{m.errorCategory}</span>
                        </td>
                        <td className="hidden lg:table-cell" style={{ padding: '14px 12px' }}>
                          <span className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 700, color: PRIORITY_COLORS[m.priority] }}>
                            <Circle size={6} fill="currentColor" />{m.priority}
                          </span>
                        </td>
                        <td className="hidden md:table-cell" style={{ padding: '14px 12px', fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {format(parseISO(m.date), 'MMM d')}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => toggleStatus(m.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 'var(--radius-button)', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid', transition: 'all 150ms', borderColor: mastered ? 'rgba(34,197,94,0.25)' : 'rgba(245,166,35,0.25)', background: mastered ? 'var(--success-bg)' : 'var(--warning-bg)', color: mastered ? 'var(--success)' : 'var(--warning)' }}>
                            {mastered ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            <span className="hidden sm:inline">{mastered ? 'Mastered' : 'Active'}</span>
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
                <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)} className="btn-ghost">
                  Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more ({filtered.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Slide-out Drawer */}
      {drawerMistake && (
        <div className="fixed md:absolute top-0 right-0 h-full z-50 animate-slide-right">
          <div style={{ width: 400, maxWidth: '100vw', height: '100vh', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="flex items-center gap-2">
                <span className="badge" style={{ background: S(drawerMistake.subject).bg, color: S(drawerMistake.subject).text, borderColor: S(drawerMistake.subject).border }}>{drawerMistake.subject}</span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{format(parseISO(drawerMistake.date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditMode(!editMode)} className="btn-ghost" style={{ padding: '7px 12px', fontSize: 12, borderColor: editMode ? 'rgba(79,107,255,0.4)' : undefined, color: editMode ? 'var(--accent)' : undefined }}>
                  <Edit3 size={12} />{editMode ? 'Editing' : 'Edit'}
                </button>
                <button onClick={() => { setDrawerMistake(null); setEditMode(false); }} className="btn-ghost" style={{ padding: '7px 9px' }}>
                  <X size={15} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }} className="space-y-5">
              {editMode ? (
                <div className="space-y-3">
                  <div><label className="field-label">Chapter</label><input defaultValue={drawerMistake.chapter} onChange={e => setEditData(p => ({ ...p, chapter: e.target.value }))} className="field" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="field-label">Category</label><select defaultValue={drawerMistake.errorCategory} onChange={e => setEditData(p => ({ ...p, errorCategory: e.target.value as ErrorCategory }))} className="field">{ERROR_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                    <div><label className="field-label">Priority</label><select defaultValue={drawerMistake.priority} onChange={e => setEditData(p => ({ ...p, priority: e.target.value as Priority }))} className="field">{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>
                  </div>
                  <div><label className="field-label">Notes</label><textarea defaultValue={drawerMistake.notes} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} rows={5} className="field" style={{ resize: 'none' }} /></div>
                  <div><label className="field-label">Tags</label><input defaultValue={drawerMistake.tags?.join(', ')} onChange={e => setEditData(p => ({ ...p, tagsStr: e.target.value }))} placeholder="comma-separated" className="field" /></div>
                  <button onClick={saveEdit} className="btn-primary w-full" style={{ justifyContent: 'center' }}><Save size={14} />Save Changes</button>
                </div>
              ) : (
                <>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>{drawerMistake.chapter || 'Untitled'}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="badge" style={{ background: C(drawerMistake.errorCategory).bg, color: C(drawerMistake.errorCategory).text, borderColor: C(drawerMistake.errorCategory).border }}>{drawerMistake.errorCategory}</span>
                      <span className="badge" style={{ background: `${PRIORITY_COLORS[drawerMistake.priority]}15`, color: PRIORITY_COLORS[drawerMistake.priority], borderColor: `${PRIORITY_COLORS[drawerMistake.priority]}30` }}>
                        <Circle size={6} fill="currentColor" />{drawerMistake.priority} Priority
                      </span>
                    </div>
                  </div>
                  {drawerMistake.notes && (
                    <div>
                      <p className="field-label" style={{ marginBottom: 8 }}>Notes & Solution</p>
                      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-card)', padding: 16, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {drawerMistake.notes}
                      </div>
                    </div>
                  )}
                  {drawerMistake.tags?.length > 0 && (
                    <div>
                      <p className="field-label" style={{ marginBottom: 8 }}>Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {drawerMistake.tags.map(t => (
                          <span key={t} className="flex items-center gap-1" style={{ padding: '5px 10px', borderRadius: 'var(--radius-badge)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-secondary)' }}>
                            <Tag size={10} />{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Status', value: drawerMistake.status, color: drawerMistake.status === 'Mastered' ? 'var(--success)' : 'var(--warning)' },
                      { label: 'Reviews', value: `${drawerMistake.reviewCount ?? 0}×`, color: 'var(--text-primary)' },
                      ...(drawerMistake.timeSpentMinutes ? [{ label: 'Time Spent', value: `${drawerMistake.timeSpentMinutes}m`, color: 'var(--text-primary)' }] : []),
                      ...(drawerMistake.masteredAt ? [{ label: 'Mastered', value: format(new Date(drawerMistake.masteredAt), 'MMM d'), color: 'var(--success)' }] : []),
                    ].map(item => (
                      <div key={item.label} style={{ padding: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-card)' }}>
                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{item.label}</p>
                        <p style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="field-label" style={{ marginBottom: 8 }}>Focus Timer</p>
                    <PomodoroTimer onComplete={mins => {
                      const u = { ...drawerMistake, timeSpentMinutes: (drawerMistake.timeSpentMinutes ?? 0) + mins };
                      setMistakes(prev => (Array.isArray(prev) ? prev : []).map(m => m.id === u.id ? u : m));
                      setDrawerMistake(u);
                    }} />
                  </div>
                </>
              )}
            </div>

            <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-subtle)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={() => handleDelete(drawerMistake.id)} className="btn-ghost" style={{ borderColor: 'rgba(245,69,92,0.2)', color: 'var(--danger)' }}>
                <Trash2 size={13} />Delete
              </button>
              <button onClick={() => toggleStatus(drawerMistake.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 'var(--radius-button)', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid', transition: 'all 150ms', borderColor: drawerMistake.status === 'Mastered' ? 'rgba(245,166,35,0.25)' : 'rgba(34,197,94,0.25)', background: drawerMistake.status === 'Mastered' ? 'var(--warning-bg)' : 'var(--success-bg)', color: drawerMistake.status === 'Mastered' ? 'var(--warning)' : 'var(--success)' }}>
                {drawerMistake.status === 'Mastered' ? <><Clock size={13} />Mark Active</> : <><CheckCircle2 size={13} />Mastered +50 XP</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
