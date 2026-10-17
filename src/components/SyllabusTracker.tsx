import { useState, useMemo } from 'react';
import {
  GraduationCap,
  Plus,
  Trash2,
  RotateCcw,
  Search,
  X,
  BookMarked,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Award,
  BarChart3,
  Lightbulb,
  ChevronDown,
  PlayCircle,
  FileEdit,
  Zap,
  BookOpenCheck,
  ListChecks,
  CalendarClock,
} from 'lucide-react';
import { SyllabusChapter, Subject, ChapterClass, Weightage } from '../types';
import { SUPPLEMENT_BOOKS, SEED_SYLLABUS } from '../data/syllabus';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { generateSafeId, sanitizeText } from '../utils/security';

interface Props {
  chapters: SyllabusChapter[];
  setChapters: (
    v: SyllabusChapter[] | ((prev: SyllabusChapter[]) => SyllabusChapter[])
  ) => void;
  onXP: (amount: number) => void;
}

const SUBJECTS: Subject[] = [
  'Physics',
  'Mathematics',
  'Physical Chemistry',
  'Organic Chemistry',
  'Inorganic Chemistry',
];
const SUBJECT_COLORS: Record<Subject, string> = {
  Physics: '#38BDF8',
  Mathematics: '#FB923C',
  'Physical Chemistry': '#F59E0B',
  'Organic Chemistry': '#10B981',
  'Inorganic Chemistry': '#F43F5E',
};
const WEIGHTAGE_COLORS: Record<Weightage, string> = {
  High: '#F43F5E',
  Medium: '#F59E0B',
  Low: '#64748B',
};
const WEIGHTAGE_RANK: Record<Weightage, number> = { High: 0, Medium: 1, Low: 2 };

type Tab = 'chapters' | 'books' | 'analytics';
type StageKey = 'lectureDone' | 'notesDone' | 'moduleDone' | 'supplementDone';
type SortKey = 'default' | 'weightage' | 'progress' | 'alpha';

const STAGES: { key: StageKey; label: string; icon: typeof PlayCircle }[] = [
  { key: 'lectureDone', label: 'Lecture', icon: PlayCircle },
  { key: 'notesDone', label: 'Short Notes', icon: FileEdit },
  { key: 'moduleDone', label: 'Module (DPPs)', icon: Zap },
  { key: 'supplementDone', label: 'Supplement Book', icon: BookOpenCheck },
];

function chapterProgress(c: SyllabusChapter) {
  return (
    [c.lectureDone, c.notesDone, c.moduleDone, c.supplementDone].filter(Boolean)
      .length / 4
  );
}

export function SyllabusTracker({ chapters, setChapters, onXP }: Props) {
  const [tab, setTab] = useState<Tab>('chapters');
  const [filterSubject, setFilterSubject] = useState<'all' | Subject>('all');
  const [filterClass, setFilterClass] = useState<'all' | ChapterClass>('all');
  const [filterWeightage, setFilterWeightage] = useState<'all' | Weightage>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'incomplete'>(
    'all'
  );
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [newChapter, setNewChapter] = useState({
    name: '',
    subject: 'Physics' as Subject,
    classLevel: '11' as ChapterClass,
    weightage: 'Medium' as Weightage,
  });
  const [collapsed, setCollapsed] = useState<Set<Subject>>(new Set());
  const [targetDate, setTargetDate] = useLocalStorage<string>(
    'jee-target-exam-date',
    ''
  );

  const toggleStage = (id: string, stage: StageKey) => {
    const target = chapters.find(c => c.id === id);
    const willTurnOn = target ? !target[stage] : false;
    setChapters(prev =>
      prev.map(c => (c.id === id ? { ...c, [stage]: !c[stage] } : c))
    );
    if (willTurnOn) onXP(5);
  };

  const bulkMarkVisible = (stage: StageKey, ids: string[]) => {
    const newlyMarked = chapters.filter(c => ids.includes(c.id) && !c[stage]).length;
    setChapters(prev =>
      prev.map(c => (ids.includes(c.id) && !c[stage] ? { ...c, [stage]: true } : c))
    );
    if (newlyMarked > 0) onXP(newlyMarked * 5);
  };

  const addChapter = () => {
    const cleanedName = sanitizeText(newChapter.name, 120);
    if (!cleanedName) return;
    setChapters(prev => [
      ...prev,
      {
        id: generateSafeId('custom-ch'),
        name: cleanedName,
        subject: newChapter.subject,
        classLevel: newChapter.classLevel,
        weightage: newChapter.weightage,
        lectureDone: false,
        notesDone: false,
        moduleDone: false,
        supplementDone: false,
        isCustom: true,
      },
    ]);
    setNewChapter({
      name: '',
      subject: 'Physics',
      classLevel: '11',
      weightage: 'Medium',
    });
    setShowAddModal(false);
  };

  const deleteChapter = (id: string) =>
    setChapters(prev => prev.filter(c => c.id !== id));

  const resetToDefault = () => {
    setChapters(SEED_SYLLABUS.map(c => ({ ...c })));
    setConfirmReset(false);
  };

  const toggleCollapse = (s: Subject) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(s)) {
        next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = chapters
      .filter(c => filterSubject === 'all' || c.subject === filterSubject)
      .filter(c => filterClass === 'all' || c.classLevel === filterClass)
      .filter(c => filterWeightage === 'all' || c.weightage === filterWeightage)
      .filter(
        c =>
          filterStatus === 'all' ||
          (filterStatus === 'complete' ? c.moduleDone : !c.moduleDone)
      )
      .filter(c => !q || c.name.toLowerCase().includes(q));
    const sorted = [...list];
    if (sortKey === 'weightage')
      sorted.sort((a, b) => WEIGHTAGE_RANK[a.weightage] - WEIGHTAGE_RANK[b.weightage]);
    else if (sortKey === 'progress')
      sorted.sort((a, b) => chapterProgress(a) - chapterProgress(b));
    else if (sortKey === 'alpha') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [
    chapters,
    filterSubject,
    filterClass,
    filterWeightage,
    filterStatus,
    search,
    sortKey,
  ]);

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
    const pendingAll = chapters.filter(c => !c.moduleDone).length;
    const stageAvg = (key: StageKey) =>
      (chapters.filter(c => c[key]).length / total) * 100;
    const bySubject = SUBJECTS.map(s => {
      const subCh = chapters.filter(c => c.subject === s);
      const done = subCh.filter(c => c.moduleDone).length;
      return {
        subject: s,
        total: subCh.length,
        done,
        pct: subCh.length ? (done / subCh.length) * 100 : 0,
      };
    });
    const byClass = (['11', '12'] as ChapterClass[]).map(cl => {
      const cc = chapters.filter(c => c.classLevel === cl);
      const done = cc.filter(c => c.moduleDone).length;
      return {
        classLevel: cl,
        total: cc.length,
        done,
        pct: cc.length ? (done / cc.length) * 100 : 0,
      };
    });
    const weight = { High: 3, Medium: 2, Low: 1 } as Record<Weightage, number>;
    const weightedTotal = chapters.reduce((s, c) => s + weight[c.weightage], 0) || 1;
    const weightedDone = chapters.reduce(
      (s, c) => s + (c.moduleDone ? weight[c.weightage] : 0),
      0
    );
    const readiness = (weightedDone / weightedTotal) * 100;

    let daysLeft: number | null = null;
    let chaptersPerDay: number | null = null;
    if (targetDate) {
      const diffMs =
        new Date(targetDate).getTime() - new Date(new Date().toDateString()).getTime();
      daysLeft = Math.ceil(diffMs / 86400000);
      if (daysLeft > 0) chaptersPerDay = pendingAll / daysLeft;
    }

    return {
      total,
      moduleComplete,
      pct: (moduleComplete / total) * 100,
      highTotal,
      highDone,
      highPct: (highDone / highTotal) * 100,
      highPending,
      pendingAll,
      lecturePct: stageAvg('lectureDone'),
      notesPct: stageAvg('notesDone'),
      modulePct: stageAvg('moduleDone'),
      supplementPct: stageAvg('supplementDone'),
      bySubject,
      byClass,
      readiness,
      daysLeft,
      chaptersPerDay,
    };
  }, [chapters, targetDate]);

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Syllabus Tracker</h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {overall.moduleComplete} / {overall.total} chapters complete ·{' '}
            {overall.readiness.toFixed(0)}% weighted readiness
          </p>
        </div>
        <div className="flex items-center gap-2">
          {confirmReset ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={resetToDefault}
                className="btn-danger !py-1.5 !px-3 text-[12px]"
              >
                Confirm Reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="btn-ghost !py-1.5 !px-2.5 text-[12px]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="btn-ghost"
              style={{ fontSize: 12, padding: '8px 12px' }}
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={15} /> Add Chapter
          </button>
        </div>
      </div>

      <div
        className="flex gap-1"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-button)',
          padding: 3,
          border: '1px solid var(--border-subtle)',
        }}
      >
        {(
          [
            { id: 'chapters' as const, label: 'Chapters', icon: BookMarked },
            { id: 'books' as const, label: 'Supplement Books', icon: GraduationCap },
            { id: 'analytics' as const, label: 'Readiness Analytics', icon: BarChart3 },
          ] as const
        ).map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 'var(--radius-button)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: tab === t.id ? 'var(--accent)' : 'transparent',
                color: tab === t.id ? '#06130E' : 'var(--text-tertiary)',
                transition: 'all 150ms',
              }}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'chapters' && (
        <ChaptersTab
          grouped={grouped}
          filtered={filtered}
          filterSubject={filterSubject}
          setFilterSubject={setFilterSubject}
          filterClass={filterClass}
          setFilterClass={setFilterClass}
          filterWeightage={filterWeightage}
          setFilterWeightage={setFilterWeightage}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          sortKey={sortKey}
          setSortKey={setSortKey}
          search={search}
          setSearch={setSearch}
          toggleStage={toggleStage}
          deleteChapter={deleteChapter}
          collapsed={collapsed}
          toggleCollapse={toggleCollapse}
          bulkMarkVisible={bulkMarkVisible}
        />
      )}

      {tab === 'books' && <BooksTab chapters={chapters} toggleStage={toggleStage} />}

      {tab === 'analytics' && (
        <AnalyticsTab
          overall={overall}
          targetDate={targetDate}
          setTargetDate={setTargetDate}
        />
      )}

      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="card animate-slide-up"
            style={{ maxWidth: 420, width: '100%', padding: 24 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="card-title">Add Custom Chapter</p>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-ghost"
                style={{ padding: '6px 8px' }}
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label
                  className="section-label"
                  style={{ display: 'block', marginBottom: 6 }}
                >
                  Chapter Name
                </label>
                <input
                  className="field"
                  value={newChapter.name}
                  onChange={e =>
                    setNewChapter(s => ({ ...s, name: e.target.value }))
                  }
                  placeholder="e.g. Rotational Mechanics"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="section-label"
                    style={{ display: 'block', marginBottom: 6 }}
                  >
                    Subject
                  </label>
                  <select
                    className="field"
                    value={newChapter.subject}
                    onChange={e =>
                      setNewChapter(s => ({
                        ...s,
                        subject: e.target.value as Subject,
                      }))
                    }
                  >
                    {SUBJECTS.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="section-label"
                    style={{ display: 'block', marginBottom: 6 }}
                  >
                    Class
                  </label>
                  <select
                    className="field"
                    value={newChapter.classLevel}
                    onChange={e =>
                      setNewChapter(s => ({
                        ...s,
                        classLevel: e.target.value as ChapterClass,
                      }))
                    }
                  >
                    <option value="11">11th</option>
                    <option value="12">12th</option>
                  </select>
                </div>
              </div>
              <div>
                <label
                  className="section-label"
                  style={{ display: 'block', marginBottom: 6 }}
                >
                  Weightage
                </label>
                <select
                  className="field"
                  value={newChapter.weightage}
                  onChange={e =>
                    setNewChapter(s => ({
                      ...s,
                      weightage: e.target.value as Weightage,
                    }))
                  }
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <button
                onClick={addChapter}
                className="btn-primary w-full"
                style={{ justifyContent: 'center', marginTop: 4 }}
              >
                Add Chapter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const STAGE_ON_COLOR: Record<StageKey, string> = {
  lectureDone: 'var(--info)',
  notesDone: 'var(--warning)',
  moduleDone: 'var(--accent)',
  supplementDone: 'var(--success)',
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function SegmentRing({
  chapter,
  onToggle,
  size = 58,
}: {
  chapter: SyllabusChapter;
  onToggle: (stage: StageKey) => void;
  size?: number;
}) {
  const cx = size / 2,
    cy = size / 2,
    r = size / 2 - 7;
  const gap = 10;
  const span = 90 - gap;
  const doneCount = STAGES.filter(s => chapter[s.key]).length;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {STAGES.map((s, i) => {
          const start = i * 90 + gap / 2;
          const end = start + span;
          const on = chapter[s.key];
          return (
            <path
              key={s.key}
              d={describeArc(cx, cy, r, start, end)}
              fill="none"
              stroke={on ? STAGE_ON_COLOR[s.key] : 'var(--bg-surface)'}
              strokeWidth={6.5}
              strokeLinecap="round"
              style={{ cursor: 'pointer', transition: 'stroke 200ms' }}
              onClick={e => {
                e.stopPropagation();
                onToggle(s.key);
              }}
            >
              <title>
                {s.label}
                {on ? ' — done (click to undo)' : ' — click to mark done'}
              </title>
            </path>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none font-mono">
        <span
          style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-primary)' }}
        >
          {doneCount}
          <span
            style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 700 }}
          >
            /4
          </span>
        </span>
      </div>
    </div>
  );
}

function MiniRing({
  pct,
  color,
  size = 34,
}: {
  pct: number;
  color: string;
  size?: number;
}) {
  const r = (size - 5) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--bg-surface)"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono">
        <span
          style={{
            fontSize: size > 30 ? 9.5 : 8.5,
            fontWeight: 800,
            color: 'var(--text-primary)',
          }}
        >
          {Math.round(pct * 100)}
        </span>
      </div>
    </div>
  );
}

interface ChaptersTabProps {
  grouped: Map<Subject, SyllabusChapter[]>;
  filtered: SyllabusChapter[];
  filterSubject: 'all' | Subject;
  setFilterSubject: (v: 'all' | Subject) => void;
  filterClass: 'all' | ChapterClass;
  setFilterClass: (v: 'all' | ChapterClass) => void;
  filterWeightage: 'all' | Weightage;
  setFilterWeightage: (v: 'all' | Weightage) => void;
  filterStatus: 'all' | 'complete' | 'incomplete';
  setFilterStatus: (v: 'all' | 'complete' | 'incomplete') => void;
  sortKey: SortKey;
  setSortKey: (v: SortKey) => void;
  search: string;
  setSearch: (v: string) => void;
  toggleStage: (id: string, stage: StageKey) => void;
  deleteChapter: (id: string) => void;
  collapsed: Set<Subject>;
  toggleCollapse: (s: Subject) => void;
  bulkMarkVisible: (stage: StageKey, ids: string[]) => void;
}

function ChaptersTab({
  grouped,
  filtered,
  filterSubject,
  setFilterSubject,
  filterClass,
  setFilterClass,
  filterWeightage,
  setFilterWeightage,
  filterStatus,
  setFilterStatus,
  sortKey,
  setSortKey,
  search,
  setSearch,
  toggleStage,
  deleteChapter,
  collapsed,
  toggleCollapse,
  bulkMarkVisible,
}: ChaptersTabProps) {
  return (
    <>
      <div
        className="card flex items-center gap-2 flex-wrap"
        style={{ padding: '12px 16px' }}
      >
        <div className="relative" style={{ flex: 1, minWidth: 160 }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
            }}
          />
          <input
            className="field"
            style={{ paddingLeft: 30 }}
            placeholder="Search chapters..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value as 'all' | Subject)}
          className="field"
          style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}
        >
          <option value="all">All Subjects</option>
          {SUBJECTS.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filterClass}
          onChange={e => setFilterClass(e.target.value as 'all' | ChapterClass)}
          className="field"
          style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}
        >
          <option value="all">11th & 12th</option>
          <option value="11">11th</option>
          <option value="12">12th</option>
        </select>
        <select
          value={filterWeightage}
          onChange={e => setFilterWeightage(e.target.value as 'all' | Weightage)}
          className="field"
          style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}
        >
          <option value="all">All Weightage</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select
          value={filterStatus}
          onChange={e =>
            setFilterStatus(e.target.value as 'all' | 'complete' | 'incomplete')
          }
          className="field"
          style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}
        >
          <option value="all">All Status</option>
          <option value="complete">Module Complete</option>
          <option value="incomplete">Module Pending</option>
        </select>
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          className="field"
          style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}
        >
          <option value="default">Default Order</option>
          <option value="weightage">Sort: Weightage</option>
          <option value="progress">Sort: Least Progress</option>
          <option value="alpha">Sort: A-Z</option>
        </select>
      </div>

      {filtered.length > 0 && (
        <div
          className="card flex items-center justify-between gap-4 flex-wrap"
          style={{ padding: '10px 16px' }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              Ring segments
            </span>
            {STAGES.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.key} className="flex items-center gap-1.5">
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: STAGE_ON_COLOR[s.key],
                    }}
                  />
                  <Icon size={11} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <ListChecks size={13} style={{ color: 'var(--accent)' }} />
            <span className="text-[11px] font-semibold text-emerald-400 mr-1">
              Bulk mark ({filtered.length}):
            </span>
            {STAGES.map((s: (typeof STAGES)[number]) => (
              <button
                key={s.key}
                onClick={() =>
                  bulkMarkVisible(
                    s.key,
                    filtered.map((c: SyllabusChapter) => c.id)
                  )
                }
                className="btn-ghost !py-1 !px-2 text-[11px]"
              >
                {s.label} ✓
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div
          className="card flex flex-col items-center justify-center gap-2"
          style={{ padding: '48px 24px' }}
        >
          <AlertTriangle size={22} style={{ color: 'var(--text-tertiary)' }} />
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            No chapters match these filters
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {SUBJECTS.filter(s => (grouped.get(s) ?? []).length > 0).map(subject => {
            const subCh: SyllabusChapter[] = grouped.get(subject) ?? [];
            const subjPct =
              subCh.reduce((s, c) => s + chapterProgress(c), 0) / subCh.length;
            const isCollapsed = collapsed.has(subject);
            return (
              <div
                key={subject}
                className="card"
                style={{ padding: 0, overflow: 'hidden' }}
              >
                <button
                  onClick={() => toggleCollapse(subject)}
                  className="flex items-center gap-3 w-full text-left"
                  style={{
                    padding: '13px 18px',
                    background: 'var(--bg-elevated)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <MiniRing pct={subjPct} color={SUBJECT_COLORS[subject]} />
                  <div style={{ flex: 1 }}>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {subject}
                    </span>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        marginLeft: 8,
                      }}
                    >
                      {subCh.filter(c => c.moduleDone).length} / {subCh.length} modules
                      complete
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    style={{
                      color: 'var(--text-tertiary)',
                      transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                      transition: 'transform 200ms',
                      flexShrink: 0,
                    }}
                  />
                </button>
                {!isCollapsed && (
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                    style={{ padding: 14 }}
                  >
                    {subCh.map(c => (
                      <ChapterCard
                        key={c.id}
                        c={c}
                        subjectColor={SUBJECT_COLORS[subject]}
                        toggleStage={toggleStage}
                        deleteChapter={deleteChapter}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function ChapterCard({
  c,
  subjectColor,
  toggleStage,
  deleteChapter,
}: {
  c: SyllabusChapter;
  subjectColor: string;
  toggleStage: (id: string, stage: StageKey) => void;
  deleteChapter: (id: string) => void;
}) {
  const progress = chapterProgress(c);
  const isComplete = progress === 1;
  return (
    <div
      className="group relative"
      style={{
        padding: '14px',
        borderRadius: 'var(--radius-card)',
        background: 'var(--bg-elevated)',
        border: `1px solid ${
          isComplete ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'
        }`,
        transition: 'border-color 150ms',
      }}
    >
      <button
        onClick={() => deleteChapter(c.id)}
        className="opacity-0 group-hover:opacity-100"
        title="Delete chapter"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          padding: 4,
          borderRadius: 6,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'opacity 150ms',
        }}
      >
        <Trash2 size={12} style={{ color: 'var(--danger)' }} />
      </button>

      <div className="flex items-start gap-3">
        <SegmentRing
          chapter={c}
          onToggle={stage => toggleStage(c.id, stage)}
        />
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: isComplete ? 'var(--text-secondary)' : 'var(--text-primary)',
              lineHeight: 1.35,
            }}
          >
            {c.name}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-1.5 font-mono text-[11px]">
            <span style={{ color: subjectColor }}>Class {c.classLevel}</span>
            <span className="text-slate-600">·</span>
            <span style={{ color: WEIGHTAGE_COLORS[c.weightage] }}>
              {c.weightage} Wt
            </span>
            {isComplete && (
              <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BooksTab({
  chapters,
  toggleStage,
}: {
  chapters: SyllabusChapter[];
  toggleStage: (id: string, stage: StageKey) => void;
}) {
  return (
    <div className="space-y-4">
      {SUPPLEMENT_BOOKS.map(book => {
        const subjectChapters = chapters.filter(c => c.subject === book.subject);
        const doneCount = subjectChapters.filter(c => c.supplementDone).length;
        return (
          <div key={book.subject} className="card" style={{ padding: 22 }}>
            <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${SUBJECT_COLORS[book.subject]}15`,
                    border: `1px solid ${SUBJECT_COLORS[book.subject]}30`,
                  }}
                >
                  <GraduationCap
                    size={16}
                    style={{ color: SUBJECT_COLORS[book.subject] }}
                  />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: SUBJECT_COLORS[book.subject],
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {book.subject}
                  </p>
                  <p className="card-title" style={{ marginTop: 2 }}>
                    {book.title}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-tertiary)',
                      marginTop: 2,
                    }}
                  >
                    {book.author}
                  </p>
                </div>
              </div>
              <span
                className="text-[11px] font-mono font-bold uppercase"
                style={{
                  color: book.essential ? 'var(--success)' : 'var(--warning)',
                }}
              >
                {book.essential ? 'Core Reference' : 'Advanced Rank Booster'}
              </span>
            </div>

            <div
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-card)',
                padding: 14,
                marginBottom: 14,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={13} style={{ color: 'var(--warning)' }} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  Execution Protocol
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {book.howTo.map((step, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 12.5,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.7,
                    }}
                  >
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            {subjectChapters.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="section-label">
                    Track chapters via this book
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {doneCount} / {subjectChapters.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {subjectChapters.map(c => (
                    <button
                      key={c.id}
                      onClick={() => toggleStage(c.id, 'supplementDone')}
                      className="flex items-center gap-2.5 w-full text-left"
                      style={{
                        padding: '7px 10px',
                        borderRadius: 'var(--radius-button)',
                        background: c.supplementDone
                          ? 'var(--success-bg)'
                          : 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                      }}
                    >
                      <CheckCircle2
                        size={14}
                        style={{
                          color: c.supplementDone
                            ? 'var(--success)'
                            : 'var(--text-tertiary)',
                          flexShrink: 0,
                          opacity: c.supplementDone ? 1 : 0.4,
                        }}
                      />
                      <span
                        className="truncate"
                        style={{
                          fontSize: 12,
                          color: c.supplementDone
                            ? 'var(--text-primary)'
                            : 'var(--text-secondary)',
                        }}
                      >
                        {c.name}
                      </span>
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

interface OverallStats {
  total: number;
  moduleComplete: number;
  pct: number;
  highTotal: number;
  highDone: number;
  highPct: number;
  highPending: SyllabusChapter[];
  pendingAll: number;
  lecturePct: number;
  notesPct: number;
  modulePct: number;
  supplementPct: number;
  bySubject: Array<{ subject: Subject; total: number; done: number; pct: number }>;
  byClass: Array<{ classLevel: ChapterClass; total: number; done: number; pct: number }>;
  readiness: number;
  daysLeft: number | null;
  chaptersPerDay: number | null;
}

function AnalyticsTab({
  overall,
  targetDate,
  setTargetDate,
}: {
  overall: OverallStats;
  targetDate: string;
  setTargetDate: (v: string) => void;
}) {
  const stageBars = [
    { label: 'Lecture', pct: overall.lecturePct, color: 'var(--info)' },
    { label: 'Short Notes', pct: overall.notesPct, color: 'var(--warning)' },
    { label: 'Module (DPPs)', pct: overall.modulePct, color: 'var(--accent)' },
    {
      label: 'Supplement Book',
      pct: overall.supplementPct,
      color: 'var(--success)',
    },
  ];
  return (
    <div className="space-y-4">
      <div className="card" style={{ padding: 22 }}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <div className="flex items-center gap-2">
            <CalendarClock size={14} style={{ color: 'var(--accent)' }} />
            <p className="card-title">Target Exam Date Pacing</p>
          </div>
          <input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            className="field"
            style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}
          />
        </div>
        {targetDate && overall.daysLeft !== null ? (
          overall.daysLeft > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 font-mono">
              <div>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  {overall.daysLeft}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  days remaining
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  {overall.pendingAll}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  chapters pending
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color:
                      (overall.chaptersPerDay ?? 0) > 0.5
                        ? 'var(--warning)'
                        : 'var(--success)',
                  }}
                >
                  {overall.chaptersPerDay?.toFixed(2)}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  chapters/day needed
                </p>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 8 }}>
              This date has already passed — update it to your upcoming target exam.
            </p>
          )
        ) : (
          <p
            style={{
              fontSize: 12.5,
              color: 'var(--text-tertiary)',
              marginTop: 8,
            }}
          >
            Set your target JEE Main / Advanced exam date to compute required daily
            chapter velocity.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Weighted Readiness',
            value: `${overall.readiness.toFixed(0)}%`,
            sub: 'High-weightage counts 3×',
            icon: Award,
            color: 'var(--accent)',
            bg: 'var(--accent-muted-bg)',
          },
          {
            label: 'Chapters Complete',
            value: `${overall.moduleComplete}/${overall.total}`,
            sub: `${overall.pct.toFixed(0)}% overall`,
            icon: CheckCircle2,
            color: 'var(--success)',
            bg: 'var(--success-bg)',
          },
          {
            label: 'High-Weightage Done',
            value: `${overall.highDone}/${overall.highTotal}`,
            sub: `${overall.highPct.toFixed(0)}% of critical chapters`,
            icon: TrendingUp,
            color: 'var(--warning)',
            bg: 'var(--warning-bg)',
          },
          {
            label: 'High-Weightage Pending',
            value: overall.highPending.length,
            sub: 'chapters still need Module done',
            icon: AlertTriangle,
            color: 'var(--danger)',
            bg: 'var(--danger-bg)',
          },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card" style={{ padding: 20 }}>
              <div
                className="w-9 h-9 rounded-[8px] flex items-center justify-center mb-3"
                style={{ background: k.bg, border: `1px solid ${k.color}30` }}
              >
                <Icon size={16} style={{ color: k.color }} />
              </div>
              <div className="stat-number text-[24px]">{k.value}</div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginTop: 6,
                }}
              >
                {k.label}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  marginTop: 3,
                }}
              >
                {k.sub}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ padding: 22 }}>
          <p className="card-title" style={{ marginBottom: 16 }}>
            Progress by Completion Stage
          </p>
          <div className="space-y-4">
            {stageBars.map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    {s.label}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {s.pct.toFixed(0)}%
                  </span>
                </div>
                <div
                  className="relative h-2 rounded-full overflow-hidden"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{ width: `${s.pct}%`, background: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <p className="card-title" style={{ marginBottom: 16 }}>
            Completion by Subject
          </p>
          <div className="space-y-4">
            {overall.bySubject.map(s => (
              <div key={s.subject}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    {s.subject}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {s.done}/{s.total} · {s.pct.toFixed(0)}%
                  </span>
                </div>
                <div
                  className="relative h-2 rounded-full overflow-hidden"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{
                      width: `${s.pct}%`,
                      background: SUBJECT_COLORS[s.subject as Subject],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
