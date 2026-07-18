import { useMemo, useState, memo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, ReferenceLine, LabelList,
  ReferenceDot, Label,
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle2, Flame, ChevronDown, Clock } from 'lucide-react';
import { Mistake, Subject, ErrorCategory } from '../types';
import { format, subWeeks, subMonths, eachWeekOfInterval, eachMonthOfInterval, addDays } from 'date-fns';

interface AnalyticsDashboardProps {
  mistakes: Mistake[];
  onFilterLedger?: (subject: Subject | null, category: ErrorCategory | null) => void;
}

const SUBJECTS: Subject[] = ['Physics', 'Mathematics', 'Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'];
const ERROR_CATEGORIES: ErrorCategory[] = ['Calculation', 'Conceptual Gap', 'Formula Misapplication', 'Question Misread', 'Careless/Silly'];

const SUBJECT_HEX: Record<Subject, string> = {
  Physics: '#38BDF8', Mathematics: '#FB923C', 'Physical Chemistry': '#F5A623',
  'Organic Chemistry': '#22C55E', 'Inorganic Chemistry': '#F5455C',
};
const CATEGORY_HEX: Record<ErrorCategory, string> = {
  'Calculation': '#F5A623', 'Conceptual Gap': '#38BDF8',
  'Formula Misapplication': '#F5455C', 'Question Misread': '#FB923C', 'Careless/Silly': '#22C55E',
};

const CATEGORY_SHORT: Record<ErrorCategory, string> = {
  'Calculation': 'Calc', 'Conceptual Gap': 'Concept',
  'Formula Misapplication': 'Formula', 'Question Misread': 'Misread', 'Careless/Silly': 'Silly',
};

const SUBJECT_SHORT: Record<Subject, string> = {
  Physics: 'Phys', Mathematics: 'Math', 'Physical Chemistry': 'PChem',
  'Organic Chemistry': 'OChem', 'Inorganic Chemistry': 'IChem',
};

interface ChartTipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  data?: { date: string; count: number }[];
}

const ChartTip = ({ active, payload, label, data }: ChartTipProps) => {
  if (!active || !payload?.length) return null;
  const count = payload[0]?.value ?? 0;
  const idx = data?.findIndex(d => d.date === label);
  const prevCount = idx !== undefined && idx > 0 ? data![idx - 1].count : undefined;
  const prevLabel = idx !== undefined && idx > 0 ? data![idx - 1].date : undefined;
  const diff = prevCount !== undefined ? count - prevCount : undefined;
  return (
    <div className="card" style={{ padding: '10px 12px', minWidth: 140 }}>
      {label && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</p>}
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
        {count} mistake{count === 1 ? '' : 's'} logged
        {diff !== undefined && diff !== 0 && prevLabel && (
          <span style={{ fontSize: 11, fontWeight: 600, color: diff > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {' '}({diff > 0 ? '+' : ''}{diff} vs {prevLabel})
          </span>
        )}
        {diff === 0 && prevLabel && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}> (same as {prevLabel})</span>
        )}
      </p>
    </div>
  );
};

interface TrendChartProps {
  data: { date: string; count: number }[];
  mistakes: Mistake[];
  filtered: Mistake[];
  trendMode: TrendMode;
  onPointClick?: (date: string, mistakes: Mistake[]) => void;
}

const TrendChart = memo(({ data, mistakes, filtered, trendMode, onPointClick }: TrendChartProps) => {
  const last = data[data.length - 1];
  const handleClick = (e: any) => {
    if (!e || !e.activeLabel) return;
    const dateLabel = e.activeLabel;
    const idx = data.findIndex(d => d.date === dateLabel);
    if (idx < 0) return;
    const now = new Date();
    let dayMistakes: Mistake[] = [];
    if (trendMode === 'weekly') {
      const weeks = eachWeekOfInterval({ start: subWeeks(now, 7), end: now }, { weekStartsOn: 1 }).slice(-8);
      const ws = weeks[idx];
      const wsStr = format(ws, 'yyyy-MM-dd');
      const weStr = format(addDays(ws, 6), 'yyyy-MM-dd');
      dayMistakes = filtered.filter(m => m.date >= wsStr && m.date <= weStr);
    } else {
      const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
      const ms = months[idx];
      const prefix = format(ms, 'yyyy-MM');
      dayMistakes = filtered.filter(m => m.date.startsWith(prefix));
    }
    onPointClick?.(dateLabel, dayMistakes);
  };
  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 12, top: 4, bottom: 0 }} onClick={handleClick}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" allowDecimals={false} width={36}
            label={{ value: 'Mistakes logged', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-tertiary)', fontSize: 10 } }} />
          <Tooltip content={<ChartTip data={data} />} />
          <Area type="monotoneX" dataKey="count" name="Mistakes" stroke="var(--accent)" strokeWidth={3} fill="url(#trendGrad)"
            dot={false} activeDot={{ r: 5, fill: 'var(--accent)', strokeWidth: 0 }} isAnimationActive={false} />
          {last && (
            <ReferenceDot x={last.date} y={last.count} r={5} fill="var(--accent)" stroke="var(--bg-surface)" strokeWidth={2} isAnimationActive={false}>
              <Label value={last.count} position="right" style={{ fill: 'var(--accent)', fontSize: 11, fontWeight: 700 }} />
            </ReferenceDot>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
TrendChart.displayName = 'TrendChart';

const ChapterBarChart = memo(({ data }: { data: { name: string; active: number; mastered: number }[] }) => (
  <div style={{ height: 220 }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" width={72}
          label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-tertiary)', fontSize: 10 } }} />
        <Tooltip content={<ChartTip />} />
        <Bar dataKey="active" name="Active" stackId="a" fill="var(--warning)" radius={[0, 0, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="mastered" name="Mastered" stackId="a" fill="var(--success)" radius={[0, 6, 6, 0]} isAnimationActive={false}>
          <LabelList dataKey="mastered" position="right" style={{ fill: 'var(--text-tertiary)', fontSize: 10, fontWeight: 600 }} formatter={(v: any) => (typeof v === 'number' && v > 0 ? `+${v}` : '') } />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
));
ChapterBarChart.displayName = 'ChapterBarChart';

const ScatterPlot = memo(({ data }: { data: { name: string; x: number; y: number; color: string }[] }) => (
  <div style={{ height: 220 }}>
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ left: 0, right: 10, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" />
        <XAxis type="number" dataKey="x" name="Mistakes" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" label={{ value: 'Error Count', position: 'insideBottom', offset: -2, style: { fill: 'var(--text-tertiary)', fontSize: 10 } }} />
        <YAxis type="number" dataKey="y" domain={[0.5, 3.5]} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" width={24} tickFormatter={(v: number) => v === 3 ? 'H' : v === 2 ? 'M' : v === 1 ? 'L' : ''}
          label={{ value: 'Priority', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-tertiary)', fontSize: 10 } }} />
        <ReferenceLine x={Math.max(1, Math.round(data.reduce((s, d) => s + d.x, 0) / Math.max(data.length, 1)))} stroke="var(--border-subtle)" />
        <ReferenceLine y={2} stroke="var(--border-subtle)" />
        <Tooltip content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const d = payload[0].payload;
          return <div className="card" style={{ padding: '10px 12px' }}><p style={{ fontSize: 13, fontWeight: 700, color: d.color }}>{d.name}</p><p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{d.x} mistakes · {d.y >= 3 ? 'High' : d.y >= 2 ? 'Med' : 'Low'} priority</p></div>;
        }} />
        <Scatter data={data} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  </div>
));
ScatterPlot.displayName = 'ScatterPlot';

type TrendMode = 'weekly' | 'monthly';

export function AnalyticsDashboard({ mistakes, onFilterLedger }: AnalyticsDashboardProps) {
  const [trendMode, setTrendMode] = useState<TrendMode>('weekly');
  const [subjectFilter, setSubjectFilter] = useState<Subject | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ date: string; mistakes: Mistake[] } | null>(null);

  const valid = Array.isArray(mistakes) ? mistakes : [];
  const filtered = useMemo(() => subjectFilter === 'all' ? valid : valid.filter(m => m.subject === subjectFilter), [valid, subjectFilter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter(m => m.status === 'Active').length;
    const mastered = filtered.filter(m => m.status === 'Mastered').length;
    const rate = total > 0 ? Math.round((mastered / total) * 100) : 0;
    const due = valid.filter(m => m.status === 'Mastered' && m.nextReviewAt && m.nextReviewAt <= Date.now()).length;
    return { total, active, mastered, rate, due };
  }, [filtered, valid]);

  const heatmap = useMemo(() => {
    const grid: Record<Subject, Record<ErrorCategory, number>> = {} as any;
    SUBJECTS.forEach(s => { grid[s] = {} as any; ERROR_CATEGORIES.forEach(c => { grid[s][c] = 0; }); });
    valid.filter(m => m.status === 'Active').forEach(m => { grid[m.subject][m.errorCategory]++; });
    const max = Math.max(1, ...SUBJECTS.flatMap(s => ERROR_CATEGORIES.map(c => grid[s][c])));
    return { grid, max };
  }, [valid]);

  const categoryData = useMemo(() => {
    const counts: Partial<Record<ErrorCategory, number>> = {};
    filtered.forEach(m => { counts[m.errorCategory] = (counts[m.errorCategory] ?? 0) + 1; });
    return ERROR_CATEGORIES.map(cat => ({ name: cat, value: counts[cat] ?? 0, color: CATEGORY_HEX[cat] }));
  }, [filtered]);

  const chapterData = useMemo(() => {
    const map: Record<string, { active: number; mastered: number }> = {};
    filtered.forEach(m => {
      const k = m.chapter || '(Untitled)';
      if (!map[k]) map[k] = { active: 0, mastered: 0 };
      if (m.status === 'Active') map[k].active++;
      else map[k].mastered++;
    });
    return Object.entries(map).map(([name, v]) => ({ name: name.length > 12 ? name.slice(0, 10) + '…' : name, ...v, total: v.active + v.mastered })).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [filtered]);

  const trendData = useMemo(() => {
    const now = new Date();
    if (trendMode === 'weekly') {
      const weeks = eachWeekOfInterval({ start: subWeeks(now, 7), end: now }, { weekStartsOn: 1 }).slice(-8);
      return weeks.map(ws => ({ date: format(ws, 'MMM d'), count: filtered.filter(m => m.date >= format(ws, 'yyyy-MM-dd') && m.date <= format(addDays(ws, 6), 'yyyy-MM-dd')).length }));
    }
    return eachMonthOfInterval({ start: subMonths(now, 5), end: now }).map(ms => ({ date: format(ms, 'MMM yy'), count: filtered.filter(m => m.date.startsWith(format(ms, 'yyyy-MM'))).length }));
  }, [filtered, trendMode]);

  const scatterData = useMemo(() => {
    const pScore: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    const map: Record<string, { count: number; pSum: number; subject: Subject }> = {};
    filtered.filter(m => m.status === 'Active').forEach(m => {
      const k = m.chapter || 'Untitled';
      if (!map[k]) map[k] = { count: 0, pSum: 0, subject: m.subject };
      map[k].count++;
      map[k].pSum += pScore[m.priority] ?? 2;
    });
    return Object.entries(map).map(([name, v]) => ({ name: name.length > 12 ? name.slice(0, 10) + '…' : name, x: v.count, y: parseFloat((v.pSum / v.count).toFixed(2)), color: SUBJECT_HEX[v.subject] }));
  }, [filtered]);

  const decayData = useMemo(() =>
    valid.filter(m => m.status === 'Mastered' && m.masteredAt).map(m => ({
      chapter: m.chapter || 'Untitled', subject: m.subject,
      daysSince: Math.floor((Date.now() - m.masteredAt!) / 86400000),
      daysUntilReview: m.nextReviewAt ? Math.floor((m.nextReviewAt - Date.now()) / 86400000) : 0,
      overdue: !!m.nextReviewAt && m.nextReviewAt < Date.now(),
      color: SUBJECT_HEX[m.subject],
    })).sort((a, b) => a.daysUntilReview - b.daysUntilReview).slice(0, 10),
  [valid]);

  function cellColor(v: number, max: number) {
    if (v === 0) return { bg: 'var(--bg-elevated)', text: 'transparent', border: 'var(--border-subtle)' };
    const r = v / max;
    if (r < 0.33) return { bg: 'rgba(34,197,94,0.12)', text: 'var(--success)', border: 'rgba(34,197,94,0.25)' };
    if (r < 0.67) return { bg: 'rgba(245,166,35,0.12)', text: 'var(--warning)', border: 'rgba(245,166,35,0.25)' };
    return { bg: 'rgba(245,69,92,0.15)', text: 'var(--danger)', border: 'rgba(245,69,92,0.3)' };
  }

  const kpis = [
    { label: 'Total Logged', value: stats.total, color: 'var(--info)', bg: 'var(--info-bg)', icon: AlertTriangle },
    { label: 'Active', value: stats.active, color: 'var(--warning)', bg: 'var(--warning-bg)', icon: TrendingUp },
    { label: 'Mastered', value: stats.mastered, color: 'var(--success)', bg: 'var(--success-bg)', icon: CheckCircle2 },
    { label: 'Due for Review', value: stats.due, color: 'var(--danger)', bg: 'var(--danger-bg)', icon: Flame },
  ];

  const hasData = filtered.length > 0;
  const nonZeroCategories = categoryData.filter(c => c.value > 0);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Analytics Engine</h2>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Root-cause analysis · Spaced repetition · Effort mapping</p>
        </div>
        <div style={{ position: 'relative' }}>
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value as any)} className="field" style={{ width: 'auto', paddingRight: 32, fontSize: 13 }}>
            <option value="all">All Subjects</option>
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card" style={{ padding: '24px' }}>
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-4" style={{ background: k.bg, border: `1px solid ${k.color}30` }}>
                <Icon size={18} style={{ color: k.color }} />
              </div>
              <div className="stat-number">{k.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 6 }}>{k.label}</div>
              {k.label === 'Mastered' && (
                <div style={{ marginTop: 10, height: 3, background: 'var(--bg-elevated)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${stats.rate}%`, background: 'var(--success)', transition: 'width 1s ease' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Trend + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2" style={{ padding: '24px' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="card-title">Error Volume Trend</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Study intensity over time</p>
            </div>
            <div className="flex gap-1" style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-button)', padding: 3 }}>
              {(['weekly', 'monthly'] as TrendMode[]).map(m => (
                <button key={m} onClick={() => setTrendMode(m)}
                  style={{ padding: '6px 12px', borderRadius: 'var(--radius-button)', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: trendMode === m ? 'var(--accent)' : 'transparent', color: trendMode === m ? '#fff' : 'var(--text-tertiary)', transition: 'all 150ms' }}>
                  {m === 'weekly' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>
          {hasData ? <TrendChart data={trendData} mistakes={mistakes} filtered={filtered} trendMode={trendMode} onPointClick={(date, ms) => setPopover({ date, mistakes: ms })} /> : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Log mistakes to see trends</p>
            </div>
          )}
        </div>

        {/* Error Breakdown */}
        <div className="card" style={{ padding: '24px' }}>
          <p className="card-title" style={{ marginBottom: 4 }}>Error Breakdown</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>What's costing you marks?</p>
          {nonZeroCategories.length > 0 ? (
            <>
              <div style={{ height: nonZeroCategories.length === 1 ? 100 : 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={nonZeroCategories} cx="50%" cy="50%" innerRadius={nonZeroCategories.length === 1 ? 32 : 42} outerRadius={nonZeroCategories.length === 1 ? 48 : 64} paddingAngle={nonZeroCategories.length === 1 ? 0 : 3} dataKey="value" onClick={(_, i) => { const cat = nonZeroCategories[i]; setSelectedCategory(selectedCategory === cat.name ? null : cat.name); }} cursor="pointer">
                      {nonZeroCategories.map((e, i) => <Cell key={i} fill={e.color} stroke={selectedCategory === e.name ? 'var(--text-primary)' : 'transparent'} strokeWidth={selectedCategory === e.name ? 2 : 0} style={{ opacity: selectedCategory && selectedCategory !== e.name ? 0.4 : 1, transition: 'opacity 200ms' }} />)}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3">
                {categoryData.map(e => (
                  <div key={e.name} onClick={() => { if (e.value > 0) setSelectedCategory(selectedCategory === e.name ? null : e.name); }} style={{ cursor: e.value > 0 ? 'pointer' : 'default', padding: '4px 8px', borderRadius: 'var(--radius-button)', background: selectedCategory === e.name ? 'var(--accent-muted-bg)' : 'transparent', border: '1px solid', borderColor: selectedCategory === e.name ? 'rgba(13,148,136,0.2)' : 'transparent', transition: 'all 150ms' }} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.color, opacity: e.value > 0 ? 1 : 0.3 }} />
                      <span style={{ fontSize: 12, color: e.value > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: e.value > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)', flexShrink: 0 }}>{e.value}</span>
                  </div>
                ))}
              </div>
              {selectedCategory && (
                <div className="flex items-center justify-between mt-3" style={{ padding: '8px 12px', background: 'var(--accent-muted-bg)', borderRadius: 'var(--radius-button)', border: '1px solid rgba(13,148,136,0.2)' }}>
                  <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Filtered: {selectedCategory}</span>
                  <button onClick={() => setSelectedCategory(null)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }}>Clear</button>
                </div>
              )}
            </>
          ) : (
            <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <AlertTriangle size={24} style={{ color: 'var(--text-tertiary)' }} />
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>Log more mistakes to see a breakdown</p>
            </div>
          )}
        </div>
      </div>

      {/* Heatmap + Chapter bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ padding: '24px' }}>
          <p className="card-title" style={{ marginBottom: 4 }}>Root-Cause Heatmap</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 18 }}>Click a red cell to focus ledger</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px', minWidth: 320 }}>
              <thead>
                <tr>
                  <td style={{ width: 48 }} />
                  {ERROR_CATEGORIES.map(cat => (
                    <th key={cat} style={{ textAlign: 'center', paddingBottom: 8 }}>
                      <div title={cat} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>
                        {CATEGORY_SHORT[cat]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUBJECTS.map(subject => (
                  <tr key={subject}>
                    <td style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', paddingRight: 8, whiteSpace: 'nowrap' }}>{SUBJECT_SHORT[subject]}</td>
                    {ERROR_CATEGORIES.map(cat => {
                      const v = heatmap.grid[subject][cat];
                      const c = cellColor(v, heatmap.max);
                      return (
                        <td key={cat} style={{ padding: 2 }}>
                          <button onClick={() => onFilterLedger?.(subject, cat)} title={`${subject} × ${cat}: ${v} mistakes`}
                            style={{ width: '100%', aspectRatio: '1', minWidth: 32, borderRadius: 'var(--radius-badge)', background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 150ms', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {v > 0 ? v : ''}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-3 mt-3">
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Low</span>
              {['var(--bg-elevated)', 'rgba(34,197,94,0.15)', 'rgba(245,166,35,0.15)', 'rgba(245,69,92,0.2)'].map((bg, i) => (
                <div key={i} style={{ width: 20, height: 8, borderRadius: 4, background: bg }} />
              ))}
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>High</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <p className="card-title" style={{ marginBottom: 4 }}>Weakest Chapters</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>Active vs Mastered per chapter</p>
          {chapterData.length > 0 ? <ChapterBarChart data={chapterData} /> : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No data yet</p>
            </div>
          )}
          {chapterData.length > 0 && (
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1.5"><div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--warning)' }} /><span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Active</span></div>
              <div className="flex items-center gap-1.5"><div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--success)' }} /><span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Mastered</span></div>
            </div>
          )}
        </div>
      </div>

      {/* Scatter + Forgetting curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ padding: '24px' }}>
          <p className="card-title" style={{ marginBottom: 4 }}>Effort vs Priority</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>Top-right = study first</p>
          {scatterData.length > 0 ? <ScatterPlot data={scatterData} /> : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No active mistakes</p>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <p className="card-title" style={{ marginBottom: 4 }}>Spaced Repetition Queue</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>Mastered mistakes sorted by review date</p>
          {decayData.length > 0 ? (
            <div className="space-y-2" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {decayData.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-card)', background: d.overdue ? 'var(--danger-bg)' : d.daysUntilReview <= 2 ? 'var(--warning-bg)' : 'var(--bg-elevated)', border: `1px solid ${d.overdue ? 'rgba(245,69,92,0.2)' : d.daysUntilReview <= 2 ? 'rgba(245,166,35,0.15)' : 'var(--border-subtle)'}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.chapter}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{d.subject}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, flexShrink: 0, color: d.overdue ? 'var(--danger)' : d.daysUntilReview <= 2 ? 'var(--warning)' : 'var(--text-tertiary)' }}>
                    {d.overdue ? `${Math.abs(d.daysUntilReview)}d overdue` : d.daysUntilReview === 0 ? 'Today' : `In ${d.daysUntilReview}d`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Clock size={24} style={{ color: 'var(--text-tertiary)' }} />
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Master mistakes to see review schedule</p>
            </div>
          )}
        </div>
      </div>

      {/* Trend point detail popover */}
      {popover && (
        <div onClick={() => setPopover(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ padding: 24, maxWidth: 460, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="card-title">{popover.date}</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{popover.mistakes.length} mistake{popover.mistakes.length === 1 ? '' : 's'} logged</p>
              </div>
              <button onClick={() => setPopover(null)} className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>Close</button>
            </div>
            {popover.mistakes.length > 0 ? (
              <div className="space-y-2">
                {popover.mistakes.map(m => (
                  <div key={m.id} className="flex items-center gap-3" style={{ padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-card)' }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SUBJECT_HEX[m.subject] }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.chapter || 'Untitled'}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="badge" style={{ background: `${SUBJECT_HEX[m.subject]}15`, color: SUBJECT_HEX[m.subject], borderColor: `${SUBJECT_HEX[m.subject]}30` }}>{m.subject}</span>
                        <span className="badge" style={{ background: `${CATEGORY_HEX[m.errorCategory]}15`, color: CATEGORY_HEX[m.errorCategory], borderColor: `${CATEGORY_HEX[m.errorCategory]}25` }}>{m.errorCategory}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>No mistakes logged in this period</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
