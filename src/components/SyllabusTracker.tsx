import { useState, useMemo } from 'react';
import {
  GraduationCap, Plus, Trash2, RotateCcw, Search, X, BookMarked,
  CheckCircle2, Circle, TrendingUp, AlertTriangle, Award, BarChart3, Lightbulb,
} from 'lucide-react';
import { SyllabusChapter, Subject, ChapterClass, Weightage } from '../types';
import { SUPPLEMENT_BOOKS, SEED_SYLLABUS } from '../data/syllabus';

interface Props {
  chapters: SyllabusChapter[];
  setChapters: (v: SyllabusChapter[] | ((prev: SyllabusChapter[]) => SyllabusChapter[])) => void;
  onXP: (amount: number) => void;
}

const SUBJECTS: Subject[] = ['Physics', 'Mathematics', 'Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'];
const SUBJECT_COLORS: Record<Subject, string> = {
  Physics: '#38BDF8', Mathematics: '#FB923C', 'Physical Chemistry': '#F5A623',
  'Organic Chemistry': '#22C55E', 'Inorganic Chemistry': '#F5455C',
};
const WEIGHTAGE_COLORS: Record<Weightage, string> = { High: '#F5455C', Medium: '#F5A623', Low: '#5C5F70' };

type Tab = 'chapters' | 'books' | 'analytics';
const STAGES: { key: keyof Pick<SyllabusChapter, 'lectureDone' | 'notesDone' | 'moduleDone' | 'supplementDone'>; label: string; short: string }[] = [
  { key: 'lectureDone', label: 'Lecture', short: 'L' },
  { key: 'notesDone', label: 'Short Notes', short: 'N' },
  { key: 'moduleDone', label: 'Module (DPPs)', short: 'M' },
  { key: 'supplementDone', label: 'Supplement Book', short: 'S' },
];

function chapterProgress(c: SyllabusChapter) {
  const done = [c.lectureDone, c.notesDone, c.moduleDone, c.supplementDone].filter(Boolean).length;
  return done / 4;
}

export function SyllabusTracker({ chapters, setChapters, onXP }: Props) {
  const [tab, setTab] = useState<Tab>('chapters');
  const [filterSubject, setFilterSubject] = useState<'all' | Subject>('all');
  const [filterClass, setFilterClass] = useState<'all' | ChapterClass>('all');
  const [filterWeightage, setFilterWeightage] = useState<'all' | Weightage>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChapter, setNewChapter] = useState({ name: '', subject: 'Physics' as Subject, classLevel: '11' as ChapterClass, weightage: 'Medium' as Weightage });

  const toggleStage = (id: string, stage: typeof STAGES[number]['key']) => {
    setChapters(prev => prev.map(c => {
      if (c.id !== id) return c;
      const wasOn = c[stage];
      if (!wasOn) onXP(5);
      return { ...c, [stage]: !wasOn };
    }));
  };

  const addChapter = () => {
    if (!newChapter.name.trim()) return;
    setChapters(prev => [...prev, {
      id: `custom-${Date.now()}`, name: newChapter.name.trim(), subject: newChapter.subject,
      classLevel: newChapter.classLevel, weightage: newChapter.weightage,
      lectureDone: false, notesDone: false, moduleDone: false, supplementDone: false, isCustom: true,
    }]);
    setNewChapter({ name: '', subject: 'Physics', classLevel: '11', weightage: 'Medium' });
    setShowAddModal(false);
  };

  const deleteChapter = (id: string) => setChapters(prev => prev.filter(c => c.id !== id));

  const resetToDefault = () => {
    if (!confirm('Reset the entire syllabus to the default list? This clears all your progress ticks and any chapters you added.')) return;
    setChapters(SEED_SYLLABUS.map(c => ({ ...c })));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chapters
      .filter(c => filterSubject === 'all' || c.subject === filterSubject)
      .filter(c => filterClass === 'all' || c.classLevel === filterClass)
      .filter(c => filterWeightage === 'all' || c.weightage === filterWeightage)
      .filter(c => filterStatus === 'all' || (filterStatus === 'complete' ? c.moduleDone : !c.moduleDone))
      .filter(c => !q || c.name.toLowerCase().includes(q));
  }, [chapters, filterSubject, filterClass, filterWeightage, filterStatus, search]);

  const grouped = useMemo(() => {
    const map = new Map<Subject, SyllabusChapter[]>();
    SUBJECTS.forEach(s => map.set(s, []));
    filtered.forEach(c => map.get(c.subject)?.push(c));
    return map;
  }, [filtered]);

  const overall = useMemo(() => {
    const total = chapters.length || 1;
    const moduleComplete = chapters.filter(c => c.moduleDone).length;
    const highTotal = chapters.filter(c => c.weightage === 'High').length || 1;
    const highDone = chapters.filter(c => c.weightage === 'High' && c.moduleDone).length;
    const highPending = chapters.filter(c => c.weightage === 'High' && !c.moduleDone);
    const stageAvg = (key: typeof STAGES[number]['key']) => (chapters.filter(c => c[key]).length / total) * 100;
    const bySubject = SUBJECTS.map(s => {
      const subCh = chapters.filter(c => c.subject === s);
      const done = subCh.filter(c => c.moduleDone).length;
      return { subject: s, total: subCh.length, done, pct: subCh.length ? (done / subCh.length) * 100 : 0 };
    });
    const byClass = (['11', '12'] as ChapterClass[]).map(cl => {
      const cc = chapters.filter(c => c.classLevel === cl);
      const done = cc.filter(c => c.moduleDone).length;
      return { classLevel: cl, total: cc.length, done, pct: cc.length ? (done / cc.length) * 100 : 0 };
    });
    // Weighted readiness: High-weightage chapters count 3x, Medium 2x, Low 1x toward the score.
    const weight = { High: 3, Medium: 2, Low: 1 } as Record<Weightage, number>;
    const weightedTotal = chapters.reduce((s, c) => s + weight[c.weightage], 0) || 1;
    const weightedDone = chapters.reduce((s, c) => s + (c.moduleDone ? weight[c.weightage] : 0), 0);
    const readiness = (weightedDone / weightedTotal) * 100;
    return {
      total, moduleComplete, pct: (moduleComplete / total) * 100,
      highTotal, highDone, highPct: (highDone / highTotal) * 100, highPending,
      lecturePct: stageAvg('lectureDone'), notesPct: stageAvg('notesDone'), modulePct: stageAvg('moduleDone'), supplementPct: stageAvg('supplementDone'),
      bySubject, byClass, readiness,
    };
  }, [chapters]);

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Syllabus Tracker</h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>{overall.moduleComplete} / {overall.total} chapters complete · {overall.readiness.toFixed(0)}% weighted readiness</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetToDefault} className="btn-ghost" style={{ fontSize: 12, padding: '8px 12px' }}><RotateCcw size={13} />Reset</button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary"><Plus size={15} />Add Chapter</button>
        </div>
      </div>

      <div className="flex gap-1" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-button)', padding: 3, border: '1px solid var(--border-subtle)' }}>
        {([
          { id: 'chapters' as const, label: 'Chapters', icon: BookMarked },
          { id: 'books' as const, label: 'Supplement Books', icon: GraduationCap },
          { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
        ]).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 'var(--radius-button)', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: tab === t.id ? 'var(--accent)' : 'transparent', color: tab === t.id ? '#fff' : 'var(--text-tertiary)', transition: 'all 150ms' }}>
              <Icon size={14} />{t.label}
            </button>
          );
        })}
      </div>

      {tab === 'chapters' && (
        <ChaptersTab
          grouped={grouped} filtered={filtered}
          filterSubject={filterSubject} setFilterSubject={setFilterSubject}
          filterClass={filterClass} setFilterClass={setFilterClass}
          filterWeightage={filterWeightage} setFilterWeightage={setFilterWeightage}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          search={search} setSearch={setSearch}
          toggleStage={toggleStage} deleteChapter={deleteChapter}
        />
      )}

      {tab === 'books' && <BooksTab chapters={chapters} toggleStage={toggleStage} />}

      {tab === 'analytics' && <AnalyticsTab overall={overall} />}

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowAddModal(false)}>
          <div className="card animate-slide-up" style={{ maxWidth: 420, width: '100%', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="card-title">Add Chapter</p>
              <button onClick={() => setShowAddModal(false)} className="btn-ghost" style={{ padding: '6px 8px' }}><X size={14} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Chapter Name</label>
                <input className="field" value={newChapter.name} onChange={e => setNewChapter(s => ({ ...s, name: e.target.value }))} placeholder="e.g. Rotational Mechanics" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Subject</label>
                  <select className="field" value={newChapter.subject} onChange={e => setNewChapter(s => ({ ...s, subject: e.target.value as Subject }))}>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Class</label>
                  <select className="field" value={newChapter.classLevel} onChange={e => setNewChapter(s => ({ ...s, classLevel: e.target.value as ChapterClass }))}>
                    <option value="11">11th</option><option value="12">12th</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Weightage</label>
                <select className="field" value={newChapter.weightage} onChange={e => setNewChapter(s => ({ ...s, weightage: e.target.value as Weightage }))}>
                  <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                </select>
              </div>
              <button onClick={addChapter} className="btn-primary w-full" style={{ justifyContent: 'center', marginTop: 4 }}>Add Chapter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChaptersTab({ grouped, filtered, filterSubject, setFilterSubject, filterClass, setFilterClass, filterWeightage, setFilterWeightage, filterStatus, setFilterStatus, search, setSearch, toggleStage, deleteChapter }: any) {
  return (
    <>
      <div className="card flex items-center gap-2 flex-wrap" style={{ padding: '14px 18px' }}>
        <div className="relative" style={{ flex: 1, minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input className="field" style={{ paddingLeft: 30 }} placeholder="Search chapters..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterSubject} onChange={(e: any) => setFilterSubject(e.target.value)} className="field" style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}>
          <option value="all">All Subjects</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterClass} onChange={(e: any) => setFilterClass(e.target.value)} className="field" style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}>
          <option value="all">11th & 12th</option><option value="11">11th</option><option value="12">12th</option>
        </select>
        <select value={filterWeightage} onChange={(e: any) => setFilterWeightage(e.target.value)} className="field" style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}>
          <option value="all">All Weightage</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
        </select>
        <select value={filterStatus} onChange={(e: any) => setFilterStatus(e.target.value)} className="field" style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}>
          <option value="all">All Status</option><option value="complete">Module Complete</option><option value="incomplete">Module Pending</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2" style={{ padding: '48px 24px' }}>
          <AlertTriangle size={22} style={{ color: 'var(--text-tertiary)' }} />
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No chapters match these filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {SUBJECTS.filter(s => (grouped.get(s) ?? []).length > 0).map(subject => (
            <div key={subject} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="flex items-center gap-2" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: SUBJECT_COLORS[subject] }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{subject}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>({(grouped.get(subject) ?? []).length})</span>
              </div>
              <div>
                {(grouped.get(subject) ?? []).map((c: SyllabusChapter) => (
                  <ChapterRow key={c.id} c={c} toggleStage={toggleStage} deleteChapter={deleteChapter} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ChapterRow({ c, toggleStage, deleteChapter }: { c: SyllabusChapter; toggleStage: (id: string, stage: any) => void; deleteChapter: (id: string) => void }) {
  const progress = chapterProgress(c);
  return (
    <div className="flex items-center gap-3 flex-wrap" style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
          <span className="badge" style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg-elevated)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>Class {c.classLevel}</span>
          <span className="badge" style={{ fontSize: 10, padding: '2px 6px', background: `${WEIGHTAGE_COLORS[c.weightage]}15`, color: WEIGHTAGE_COLORS[c.weightage], borderColor: `${WEIGHTAGE_COLORS[c.weightage]}30` }}>{c.weightage}</span>
        </div>
        <div className="relative h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)', marginTop: 6, width: 140 }}>
          <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${progress * 100}%`, background: progress === 1 ? 'var(--success)' : 'var(--accent)' }} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {STAGES.map(s => (
          <button key={s.key} onClick={() => toggleStage(c.id, s.key)} title={s.label}
            style={{
              width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${c[s.key] ? 'transparent' : 'var(--border-subtle)'}`,
              background: c[s.key] ? 'var(--success)' : 'var(--bg-elevated)', color: c[s.key] ? '#fff' : 'var(--text-tertiary)',
              transition: 'all 150ms',
            }}>
            {s.short}
          </button>
        ))}
      </div>
      <button onClick={() => deleteChapter(c.id)} className="btn-ghost" style={{ padding: '6px 8px', flexShrink: 0 }}><Trash2 size={12} style={{ color: 'var(--danger)' }} /></button>
    </div>
  );
}

function BooksTab({ chapters, toggleStage }: { chapters: SyllabusChapter[]; toggleStage: (id: string, stage: any) => void }) {
  return (
    <div className="space-y-4">
      {SUPPLEMENT_BOOKS.map(book => {
        const subjectChapters = chapters.filter(c => c.subject === book.subject);
        const doneCount = subjectChapters.filter(c => c.supplementDone).length;
        return (
          <div key={book.subject} className="card" style={{ padding: 24 }}>
            <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: `${SUBJECT_COLORS[book.subject]}15`, border: `1px solid ${SUBJECT_COLORS[book.subject]}30` }}>
                  <GraduationCap size={16} style={{ color: SUBJECT_COLORS[book.subject] }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: SUBJECT_COLORS[book.subject], textTransform: 'uppercase', letterSpacing: '0.04em' }}>{book.subject}</p>
                  <p className="card-title" style={{ marginTop: 2 }}>{book.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{book.author}</p>
                </div>
              </div>
              <span className="badge" style={{ background: book.essential ? 'var(--success-bg)' : 'var(--warning-bg)', color: book.essential ? 'var(--success)' : 'var(--warning)', borderColor: book.essential ? 'rgba(34,197,94,0.25)' : 'rgba(245,166,35,0.25)' }}>
                {book.essential ? 'Recommended' : 'Optional / High-rank'}
              </span>
            </div>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-card)', padding: 16, marginBottom: 14 }}>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={13} style={{ color: 'var(--warning)' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>How to follow</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {book.howTo.map((step, i) => (
                  <li key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{step}</li>
                ))}
              </ul>
            </div>

            {subjectChapters.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="section-label">Track chapters via this book</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{doneCount} / {subjectChapters.length}</span>
                </div>
                <div className="space-y-1">
                  {subjectChapters.map(c => (
                    <button key={c.id} onClick={() => toggleStage(c.id, 'supplementDone')}
                      className="flex items-center gap-2.5 w-full text-left"
                      style={{ padding: '8px 10px', borderRadius: 'var(--radius-button)', background: c.supplementDone ? 'var(--success-bg)' : 'transparent', cursor: 'pointer' }}>
                      {c.supplementDone ? <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /> : <Circle size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
                      <span style={{ fontSize: 12.5, color: c.supplementDone ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsTab({ overall }: { overall: any }) {
  const stageBars = [
    { label: 'Lecture', pct: overall.lecturePct, color: 'var(--info)' },
    { label: 'Short Notes', pct: overall.notesPct, color: 'var(--warning)' },
    { label: 'Module (DPPs)', pct: overall.modulePct, color: 'var(--accent)' },
    { label: 'Supplement Book', pct: overall.supplementPct, color: 'var(--success)' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Weighted Readiness', value: `${overall.readiness.toFixed(0)}%`, sub: 'High-weightage counts 3×', icon: Award, color: 'var(--accent)', bg: 'var(--accent-muted-bg)' },
          { label: 'Chapters Complete', value: `${overall.moduleComplete}/${overall.total}`, sub: `${overall.pct.toFixed(0)}% overall`, icon: CheckCircle2, color: 'var(--success)', bg: 'var(--success-bg)' },
          { label: 'High-Weightage Done', value: `${overall.highDone}/${overall.highTotal}`, sub: `${overall.highPct.toFixed(0)}% of critical chapters`, icon: TrendingUp, color: 'var(--warning)', bg: 'var(--warning-bg)' },
          { label: 'High-Weightage Pending', value: overall.highPending.length, sub: 'chapters still need Module done', icon: AlertTriangle, color: 'var(--danger)', bg: 'var(--danger-bg)' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card" style={{ padding: 24 }}>
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-4" style={{ background: k.bg, border: `1px solid ${k.color}30` }}><Icon size={18} style={{ color: k.color }} /></div>
              <div className="stat-number">{k.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 6 }}>{k.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ padding: 24 }}>
          <p className="card-title" style={{ marginBottom: 16 }}>Progress by Stage</p>
          <div className="space-y-4">
            {stageBars.map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{s.pct.toFixed(0)}%</span>
                </div>
                <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${s.pct}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <p className="card-title" style={{ marginBottom: 16 }}>Completion by Subject</p>
          <div className="space-y-4">
            {overall.bySubject.map((s: any) => (
              <div key={s.subject}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{s.subject}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{s.done}/{s.total} · {s.pct.toFixed(0)}%</span>
                </div>
                <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${s.pct}%`, background: SUBJECT_COLORS[s.subject as Subject] }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-5 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {overall.byClass.map((c: any) => (
              <div key={c.classLevel} style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Class {c.classLevel}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{c.pct.toFixed(0)}%</p>
                <p style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{c.done}/{c.total} chapters</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {overall.highPending.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
            <p className="card-title">High-Priority Pending Chapters</p>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>High-weightage chapters where the Module isn't done yet — tackle these first.</p>
          <div className="space-y-1.5">
            {overall.highPending.map((c: SyllabusChapter) => (
              <div key={c.id} className="flex items-center justify-between" style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: SUBJECT_COLORS[c.subject], flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>{c.subject} · Class {c.classLevel}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
