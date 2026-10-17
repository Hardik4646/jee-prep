import { useMemo, useState, memo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  ReferenceLine,
  LabelList,
  ReferenceDot,
  Label,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Flame,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { Mistake, Subject, ErrorCategory } from '../types';
import {
  format,
  subWeeks,
  subMonths,
  eachWeekOfInterval,
  eachMonthOfInterval,
  addDays,
} from 'date-fns';

interface AnalyticsDashboardProps {
  mistakes: Mistake[];
  onFilterLedger?: (subject: Subject | null, category: ErrorCategory | null) => void;
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

const SUBJECT_HEX: Record<Subject, string> = {
  Physics: '#38BDF8',
  Mathematics: '#FB923C',
  'Physical Chemistry': '#F59E0B',
  'Organic Chemistry': '#10B981',
  'Inorganic Chemistry': '#F43F5E',
};

const CATEGORY_HEX: Record<ErrorCategory, string> = {
  Calculation: '#F59E0B',
  'Conceptual Gap': '#38BDF8',
  'Formula Misapplication': '#F43F5E',
  'Question Misread': '#FB923C',
  'Careless/Silly': '#10B981',
};

const CATEGORY_SHORT: Record<ErrorCategory, string> = {
  Calculation: 'Calc',
  'Conceptual Gap': 'Concept',
  'Formula Misapplication': 'Formula',
  'Question Misread': 'Misread',
  'Careless/Silly': 'Silly',
};

const SUBJECT_SHORT: Record<Subject, string> = {
  Physics: 'Phys',
  Mathematics: 'Math',
  'Physical Chemistry': 'PChem',
  'Organic Chemistry': 'OChem',
  'Inorganic Chemistry': 'IChem',
};

interface ChartTipProps {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string }>;
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
    <div className="card-glass" style={{ padding: '10px 12px', minWidth: 145 }}>
      {label && (
        <p className="font-mono" style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginBottom: 4 }}>
          {label}
        </p>
      )}
      <p className="tabular-num" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)' }}>
        {count} {payload[0]?.name === 'Negative Marks' ? 'pts lost' : `mistake${count === 1 ? '' : 's'}`}
        {diff !== undefined && diff !== 0 && prevLabel && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: diff > 0 ? 'var(--danger)' : 'var(--success)',
            }}
          >
            {' '}
            ({diff > 0 ? '+' : ''}
            {diff} vs {prevLabel})
          </span>
        )}
      </p>
    </div>
  );
};

type TrendMode = 'weekly' | 'monthly';

interface TrendChartProps {
  data: { date: string; count: number }[];
  filtered: Mistake[];
  trendMode: TrendMode;
  onPointClick?: (date: string, mistakes: Mistake[]) => void;
}

const TrendChart = memo(({ data, filtered, trendMode, onPointClick }: TrendChartProps) => {
  const last = data[data.length - 1];
  const handleClick = (e: { activeLabel?: string } | null) => {
    if (!e || !e.activeLabel) return;
    const dateLabel = e.activeLabel;
    const idx = data.findIndex(d => d.date === dateLabel);
    if (idx < 0) return;
    const now = new Date();
    let dayMistakes: Mistake[] = [];
    if (trendMode === 'weekly') {
      const weeks = eachWeekOfInterval({ start: subWeeks(now, 7), end: now }, { weekStartsOn: 1 }).slice(
        -8
      );
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
        <AreaChart data={data} margin={{ left: 4, right: 12, top: 4, bottom: 0 }} onClick={handleClick}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            stroke="transparent"
            allowDecimals={false}
            width={34}
          />
          <Tooltip content={<ChartTip data={data} />} />
          <Area
            type="monotoneX"
            dataKey="count"
            name="Mistakes"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill="url(#trendGrad)"
            dot={false}
            activeDot={{ r: 5, fill: 'var(--accent)', strokeWidth: 0 }}
            isAnimationActive={false}
          />
          {last && (
            <ReferenceDot
              x={last.date}
              y={last.count}
              r={5}
              fill="var(--accent)"
              stroke="var(--bg-surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              <Label
                value={last.count}
                position="right"
                style={{ fill: 'var(--accent)', fontSize: 11, fontWeight: 700 }}
              />
            </ReferenceDot>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
TrendChart.displayName = 'TrendChart';

const ChapterBarChart = memo(
  ({
    data,
    metric,
  }: {
    data: { name: string; active: number; mastered: number; marksLost: number }[];
    metric: 'count' | 'marksLost';
  }) => (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            stroke="transparent"
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
            stroke="transparent"
            width={92}
          />
          <Tooltip content={<ChartTip />} />
          {metric === 'marksLost' ? (
            <Bar
              dataKey="marksLost"
              name="Negative Marks"
              fill="var(--danger)"
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="marksLost"
                position="right"
                style={{ fill: 'var(--danger)', fontSize: 10, fontWeight: 700 }}
                formatter={(v: unknown) => (typeof v === 'number' && v > 0 ? `-${v}m` : '')}
              />
            </Bar>
          ) : (
            <>
              <Bar
                dataKey="active"
                name="Active"
                stackId="a"
                fill="var(--warning)"
                radius={[0, 0, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="mastered"
                name="Mastered"
                stackId="a"
                fill="var(--success)"
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
);
ChapterBarChart.displayName = 'ChapterBarChart';

const ScatterPlot = memo(
  ({ data }: { data: { name: string; x: number; y: number; marksLost: number; color: string }[] }) => (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ left: 0, right: 12, top: 6, bottom: 0 }}>
          <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" />
          <XAxis
            type="number"
            dataKey="x"
            name="Mistakes"
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            stroke="transparent"
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0.5, 3.5]}
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            stroke="transparent"
            width={24}
            tickFormatter={(v: number) => (v === 3 ? 'H' : v === 2 ? 'M' : v === 1 ? 'L' : '')}
          />
          <ReferenceLine
            x={Math.max(1, Math.round(data.reduce((s, d) => s + d.x, 0) / Math.max(data.length, 1)))}
            stroke="var(--border-subtle)"
          />
          <ReferenceLine y={2} stroke="var(--border-subtle)" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="card-glass" style={{ padding: '10px 12px' }}>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: d.color }}>{d.name}</p>
                  <p className="tabular-num" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {d.x} errors · -{d.marksLost} marks cost ·{' '}
                    {d.y >= 2.5 ? 'High' : d.y >= 1.5 ? 'Medium' : 'Low'} priority
                  </p>
                </div>
              );
            }}
          />
          <Scatter data={data} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
);
ScatterPlot.displayName = 'ScatterPlot';

export function AnalyticsDashboard({ mistakes, onFilterLedger }: AnalyticsDashboardProps) {
  const [trendMode, setTrendMode] = useState<TrendMode>('weekly');
  const [subjectFilter, setSubjectFilter] = useState<Subject | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [heatmapMetric, setHeatmapMetric] = useState<'marksLost' | 'count'>('marksLost');
  const [chapterMetric, setChapterMetric] = useState<'marksLost' | 'count'>('marksLost');
  const [popover, setPopover] = useState<{ date: string; mistakes: Mistake[] } | null>(null);

  const valid = Array.isArray(mistakes) ? mistakes : [];
  const filtered = useMemo(
    () => (subjectFilter === 'all' ? valid : valid.filter(m => m.subject === subjectFilter)),
    [valid, subjectFilter]
  );

  const stats = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter(m => m.status === 'Active').length;
    const mastered = filtered.filter(m => m.status === 'Mastered').length;
    const rate = total > 0 ? Math.round((mastered / total) * 100) : 0;
    const due = valid.filter(
      m => m.status === 'Mastered' && m.nextReviewAt && m.nextReviewAt <= Date.now()
    ).length;
    const totalMarksLost = filtered
      .filter(m => m.status === 'Active')
      .reduce(
        (sum, m) => sum + (m.marksLost ?? (m.priority === 'High' ? 5 : m.priority === 'Medium' ? 4 : 1)),
        0
      );
    return { total, active, mastered, rate, due, totalMarksLost };
  }, [filtered, valid]);

  const heatmap = useMemo(() => {
    const grid = {} as Record<Subject, Record<ErrorCategory, { count: number; marksLost: number }>>;
    SUBJECTS.forEach(s => {
      grid[s] = {} as Record<ErrorCategory, { count: number; marksLost: number }>;
      ERROR_CATEGORIES.forEach(c => {
        grid[s][c] = { count: 0, marksLost: 0 };
      });
    });
    valid
      .filter(m => m.status === 'Active')
      .forEach(m => {
        const cost = m.marksLost ?? (m.priority === 'High' ? 5 : m.priority === 'Medium' ? 4 : 1);
        grid[m.subject][m.errorCategory].count += 1;
        grid[m.subject][m.errorCategory].marksLost += cost;
      });
    const maxCount = Math.max(
      1,
      ...SUBJECTS.flatMap(s => ERROR_CATEGORIES.map(c => grid[s][c].count))
    );
    const maxMarks = Math.max(
      1,
      ...SUBJECTS.flatMap(s => ERROR_CATEGORIES.map(c => grid[s][c].marksLost))
    );
    return { grid, maxCount, maxMarks };
  }, [valid]);

  const categoryData = useMemo(() => {
    const counts: Partial<Record<ErrorCategory, number>> = {};
    filtered.forEach(m => {
      counts[m.errorCategory] = (counts[m.errorCategory] ?? 0) + 1;
    });
    return ERROR_CATEGORIES.map(cat => ({
      name: cat,
      value: counts[cat] ?? 0,
      color: CATEGORY_HEX[cat],
    }));
  }, [filtered]);

  const chapterData = useMemo(() => {
    const map: Record<string, { active: number; mastered: number; marksLost: number }> = {};
    filtered.forEach(m => {
      const k = m.chapter || '(Untitled)';
      if (!map[k]) map[k] = { active: 0, mastered: 0, marksLost: 0 };
      const cost = m.marksLost ?? (m.priority === 'High' ? 5 : m.priority === 'Medium' ? 4 : 1);
      if (m.status === 'Active') {
        map[k].active++;
        map[k].marksLost += cost;
      } else {
        map[k].mastered++;
      }
    });
    return Object.entries(map)
      .map(([name, v]) => ({
        name: name.length > 14 ? name.slice(0, 12) + '…' : name,
        ...v,
        total: v.active + v.mastered,
      }))
      .sort((a, b) =>
        chapterMetric === 'marksLost' ? b.marksLost - a.marksLost : b.total - a.total
      )
      .slice(0, 8);
  }, [filtered, chapterMetric]);

  const trendData = useMemo(() => {
    const now = new Date();
    if (trendMode === 'weekly') {
      const weeks = eachWeekOfInterval({ start: subWeeks(now, 7), end: now }, { weekStartsOn: 1 }).slice(
        -8
      );
      return weeks.map(ws => ({
        date: format(ws, 'MMM d'),
        count: filtered.filter(
          m =>
            m.date >= format(ws, 'yyyy-MM-dd') && m.date <= format(addDays(ws, 6), 'yyyy-MM-dd')
        ).length,
      }));
    }
    return eachMonthOfInterval({ start: subMonths(now, 5), end: now }).map(ms => ({
      date: format(ms, 'MMM yy'),
      count: filtered.filter(m => m.date.startsWith(format(ms, 'yyyy-MM'))).length,
    }));
  }, [filtered, trendMode]);

  const scatterData = useMemo(() => {
    const pScore: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    const map: Record<
      string,
      { count: number; pSum: number; marksLost: number; subject: Subject }
    > = {};
    filtered
      .filter(m => m.status === 'Active')
      .forEach(m => {
        const k = m.chapter || 'Untitled';
        if (!map[k]) map[k] = { count: 0, pSum: 0, marksLost: 0, subject: m.subject };
        map[k].count++;
        map[k].pSum += pScore[m.priority] ?? 2;
        map[k].marksLost +=
          m.marksLost ?? (m.priority === 'High' ? 5 : m.priority === 'Medium' ? 4 : 1);
      });
    return Object.entries(map).map(([name, v]) => ({
      name: name.length > 14 ? name.slice(0, 12) + '…' : name,
      x: v.count,
      y: parseFloat((v.pSum / v.count).toFixed(2)),
      marksLost: v.marksLost,
      color: SUBJECT_HEX[v.subject],
    }));
  }, [filtered]);

  const decayData = useMemo(
    () =>
      valid
        .filter(m => m.status === 'Mastered' && m.masteredAt)
        .map(m => ({
          chapter: m.chapter || 'Untitled',
          subject: m.subject,
          daysSince: Math.floor((Date.now() - m.masteredAt!) / 86400000),
          daysUntilReview: m.nextReviewAt
            ? Math.floor((m.nextReviewAt - Date.now()) / 86400000)
            : 0,
          overdue: !!m.nextReviewAt && m.nextReviewAt < Date.now(),
          color: SUBJECT_HEX[m.subject],
        }))
        .sort((a, b) => a.daysUntilReview - b.daysUntilReview)
        .slice(0, 10),
    [valid]
  );

  function cellColor(v: number, max: number) {
    if (v === 0)
      return { bg: 'var(--bg-elevated)', text: 'transparent', border: 'var(--border-subtle)' };
    const r = v / max;
    if (r < 0.33)
      return {
        bg: 'rgba(16, 185, 129, 0.12)',
        text: 'var(--success)',
        border: 'rgba(16, 185, 129, 0.28)',
      };
    if (r < 0.67)
      return {
        bg: 'rgba(245, 158, 11, 0.14)',
        text: 'var(--warning)',
        border: 'rgba(245, 158, 11, 0.3)',
      };
    return {
      bg: 'rgba(244, 63, 94, 0.18)',
      text: 'var(--danger)',
      border: 'rgba(244, 63, 94, 0.38)',
    };
  }

  const kpis = [
    {
      label: 'Total Logged',
      value: stats.total,
      sub: 'Cumulative ledger entries',
      color: 'var(--info)',
      icon: AlertTriangle,
    },
    {
      label: 'Active Bottlenecks',
      value: stats.active,
      sub: `-${stats.totalMarksLost} marks at risk`,
      color: 'var(--warning)',
      icon: TrendingUp,
    },
    {
      label: 'Mastered',
      value: `${stats.mastered} (${stats.rate}%)`,
      sub: 'Resolved concepts',
      color: 'var(--success)',
      icon: CheckCircle2,
    },
    {
      label: 'Spaced Review Due',
      value: stats.due,
      sub: 'Requires recall check',
      color: 'var(--danger)',
      icon: Flame,
    },
  ];

  const hasData = filtered.length > 0;
  const nonZeroCategories = categoryData.filter(c => c.value > 0);

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Root-Cause & Negative-Mark Analytics</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Negative mark heatmap · Topic vulnerability ranking · Spaced repetition queue
          </p>
        </div>
        <div style={{ position: 'relative' }}>
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value as Subject | 'all')}
            className="field"
            style={{ width: 'auto', paddingRight: 32, fontSize: 12.5 }}
          >
            <option value="all">All Subjects</option>
            {SUBJECTS.map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <ChevronDown
            size={12}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card" style={{ padding: 20 }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {k.label}
                </span>
                <Icon size={16} style={{ color: k.color }} />
              </div>
              <div className="stat-number" style={{ fontSize: 26 }}>
                {k.value}
              </div>
              <div className="tabular-num" style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                {k.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Heatmap + Chapter Negative Marks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ padding: 22 }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="card-title">Mistake Heatmap (Subject × Error Category)</p>
              <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Click any cell to filter the Mistake Ledger
              </p>
            </div>
            <div
              className="flex gap-1"
              style={{
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-button)',
                padding: 2,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setHeatmapMetric('marksLost')}
                style={{
                  padding: '4px 9px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: heatmapMetric === 'marksLost' ? 'var(--accent)' : 'transparent',
                  color: heatmapMetric === 'marksLost' ? '#fff' : 'var(--text-tertiary)',
                }}
              >
                Marks Cost (-pts)
              </button>
              <button
                type="button"
                onClick={() => setHeatmapMetric('count')}
                style={{
                  padding: '4px 9px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: heatmapMetric === 'count' ? 'var(--accent)' : 'transparent',
                  color: heatmapMetric === 'count' ? '#fff' : 'var(--text-tertiary)',
                }}
              >
                Error Count
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px', minWidth: 320 }}>
              <thead>
                <tr>
                  <td style={{ width: 52 }} />
                  {ERROR_CATEGORIES.map(cat => (
                    <th key={cat} style={{ textAlign: 'center', paddingBottom: 6 }}>
                      <div
                        title={cat}
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {CATEGORY_SHORT[cat]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUBJECTS.map(subject => (
                  <tr key={subject}>
                    <td
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        paddingRight: 8,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {SUBJECT_SHORT[subject]}
                    </td>
                    {ERROR_CATEGORIES.map(cat => {
                      const cell = heatmap.grid[subject][cat];
                      const val = heatmapMetric === 'marksLost' ? cell.marksLost : cell.count;
                      const maxVal =
                        heatmapMetric === 'marksLost' ? heatmap.maxMarks : heatmap.maxCount;
                      const c = cellColor(val, maxVal);
                      return (
                        <td key={cat} style={{ padding: 2 }}>
                          <button
                            type="button"
                            onClick={() => onFilterLedger?.(subject, cat)}
                            title={`${subject} × ${cat}: ${cell.count} mistakes (-${cell.marksLost} marks)`}
                            className="tabular-num"
                            style={{
                              width: '100%',
                              height: 38,
                              minWidth: 42,
                              borderRadius: 'var(--radius-badge)',
                              background: c.bg,
                              border: `1px solid ${c.border}`,
                              color: c.text,
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 150ms',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {val > 0 ? (heatmapMetric === 'marksLost' ? `-${val}` : val) : ''}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="card-title">High-Penalty Chapters</p>
              <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Topics costing the most negative marks or active errors
              </p>
            </div>
            <div
              className="flex gap-1"
              style={{
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-button)',
                padding: 2,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setChapterMetric('marksLost')}
                style={{
                  padding: '4px 9px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: chapterMetric === 'marksLost' ? 'var(--accent)' : 'transparent',
                  color: chapterMetric === 'marksLost' ? '#fff' : 'var(--text-tertiary)',
                }}
              >
                By Marks Lost
              </button>
              <button
                type="button"
                onClick={() => setChapterMetric('count')}
                style={{
                  padding: '4px 9px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: chapterMetric === 'count' ? 'var(--accent)' : 'transparent',
                  color: chapterMetric === 'count' ? '#fff' : 'var(--text-tertiary)',
                }}
              >
                Active vs Mastered
              </button>
            </div>
          </div>
          {chapterData.length > 0 ? (
            <ChapterBarChart data={chapterData} metric={chapterMetric} />
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No chapter data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Trend + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2" style={{ padding: 22 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="card-title">Error Logging Cadence</p>
              <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Click any week or month to inspect logged mistakes
              </p>
            </div>
            <div
              className="flex gap-1"
              style={{
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-button)',
                padding: 2,
                border: '1px solid var(--border-subtle)',
              }}
            >
              {(['weekly', 'monthly'] as TrendMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTrendMode(m)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: trendMode === m ? 'var(--accent)' : 'transparent',
                    color: trendMode === m ? '#fff' : 'var(--text-tertiary)',
                  }}
                >
                  {m === 'weekly' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>
          {hasData ? (
            <TrendChart
              data={trendData}
              filtered={filtered}
              trendMode={trendMode}
              onPointClick={(date, ms) => setPopover({ date, mistakes: ms })}
            />
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Log mistakes to see trends</p>
            </div>
          )}
        </div>

        {/* Error Breakdown */}
        <div className="card" style={{ padding: 22 }}>
          <p className="card-title" style={{ marginBottom: 2 }}>
            Root-Cause Distribution
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 14 }}>
            Breakdown by cognitive error type
          </p>
          {nonZeroCategories.length > 0 ? (
            <>
              <div style={{ height: 135 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={nonZeroCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={nonZeroCategories.length === 1 ? 0 : 3}
                      dataKey="value"
                      onClick={(_, i) => {
                        const cat = nonZeroCategories[i];
                        setSelectedCategory(selectedCategory === cat.name ? null : cat.name);
                      }}
                      cursor="pointer"
                    >
                      {nonZeroCategories.map((e, i) => (
                        <Cell
                          key={i}
                          fill={e.color}
                          stroke={selectedCategory === e.name ? 'var(--text-primary)' : 'transparent'}
                          strokeWidth={selectedCategory === e.name ? 2 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-3">
                {categoryData.map(e => (
                  <div
                    key={e.name}
                    onClick={() => {
                      if (e.value > 0)
                        setSelectedCategory(selectedCategory === e.name ? null : e.name);
                    }}
                    style={{
                      cursor: e.value > 0 ? 'pointer' : 'default',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-button)',
                      background:
                        selectedCategory === e.name ? 'var(--accent-muted-bg)' : 'transparent',
                    }}
                    className="flex items-center justify-between gap-2"
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: e.value > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                      }}
                    >
                      {e.name}
                    </span>
                    <span
                      className="tabular-num"
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: e.value > 0 ? e.color : 'var(--text-tertiary)',
                      }}
                    >
                      {e.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No mistakes logged</p>
            </div>
          )}
        </div>
      </div>

      {/* Scatter + Spaced Repetition Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ padding: 22 }}>
          <p className="card-title" style={{ marginBottom: 2 }}>
            Priority vs. Frequency Matrix
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 14 }}>
            Top-right quadrant indicates highest-urgency revision targets
          </p>
          {scatterData.length > 0 ? (
            <ScatterPlot data={scatterData} />
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No active mistakes</p>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 22 }}>
          <p className="card-title" style={{ marginBottom: 2 }}>
            Spaced Repetition Queue
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 14 }}>
            Mastered concepts scheduled by forgetting-curve interval
          </p>
          {decayData.length > 0 ? (
            <div className="space-y-2" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {decayData.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-button)',
                    background: d.overdue
                      ? 'var(--danger-bg)'
                      : d.daysUntilReview <= 2
                      ? 'var(--warning-bg)'
                      : 'var(--bg-elevated)',
                    border: `1px solid ${
                      d.overdue
                        ? 'rgba(244,63,94,0.25)'
                        : d.daysUntilReview <= 2
                        ? 'rgba(245,158,11,0.2)'
                        : 'var(--border-subtle)'
                    }`,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d.chapter}
                    </p>
                    <p style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{d.subject}</p>
                  </div>
                  <span
                    className="tabular-num"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                      color: d.overdue
                        ? 'var(--danger)'
                        : d.daysUntilReview <= 2
                        ? 'var(--warning)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {d.overdue
                      ? `${Math.abs(d.daysUntilReview)}d overdue`
                      : d.daysUntilReview === 0
                      ? 'Due Today'
                      : `In ${d.daysUntilReview}d`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                height: 220,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Clock size={22} style={{ color: 'var(--text-tertiary)' }} />
              <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                Master mistakes to populate the spaced repetition schedule
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Period Popover */}
      {popover && (
        <div
          onClick={() => setPopover(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className="card"
            onClick={e => e.stopPropagation()}
            style={{ padding: 22, maxWidth: 460, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="card-title">{popover.date}</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {popover.mistakes.length} mistake{popover.mistakes.length === 1 ? '' : 's'} logged
                </p>
              </div>
              <button
                onClick={() => setPopover(null)}
                className="btn-ghost"
                style={{ padding: '6px 10px', fontSize: 12 }}
              >
                Close
              </button>
            </div>
            {popover.mistakes.length > 0 ? (
              <div className="space-y-2">
                {popover.mistakes.map(m => (
                  <div
                    key={m.id}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-button)',
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {m.chapter || 'Untitled'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {m.subject} · {m.errorCategory}
                      {m.marksLost ? ` · -${m.marksLost}m` : ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-tertiary)',
                  textAlign: 'center',
                  padding: '24px 0',
                }}
              >
                No mistakes logged in this period
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
