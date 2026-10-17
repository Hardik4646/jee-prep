import { useMemo, useState, memo } from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceDot,
  Label,
} from 'recharts';
import {
  Flame,
  Star,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Zap,
  Sun,
  Sunrise,
  Sunset,
  ClipboardList,
  Layers,
} from 'lucide-react';
import {
  Mistake,
  GamificationState,
  View,
  Subject,
  Priority,
  MistakeStatus,
  TestAttempt,
} from '../types';
import { getLevelFromXP, getXPToNextLevel } from '../data/gamification';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface DashboardProps {
  mistakes: Mistake[];
  testAttempts?: TestAttempt[];
  gamification: GamificationState;
  setCurrentView: (v: View) => void;
  onQuickLogTest?: () => void;
}

const SUBJECT_COLORS: Record<Subject, string> = {
  Physics: '#38BDF8',
  Mathematics: '#FB923C',
  'Physical Chemistry': '#F59E0B',
  'Organic Chemistry': '#10B981',
  'Inorganic Chemistry': '#F43F5E',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  High: '#F43F5E',
  Medium: '#F59E0B',
  Low: '#64748B',
};
const STATUS_COLORS: Record<MistakeStatus, string> = {
  Active: '#F59E0B',
  Mastered: '#10B981',
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  data?: { date: string; count: number; negMarks: number }[];
}

const ChartTooltip = ({ active, payload, label, data }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  const count = payload[0]?.value ?? 0;
  const idx = data?.findIndex(d => d.date === label);
  const negMarks = idx !== undefined && idx >= 0 ? data![idx].negMarks : 0;
  const prevCount = idx && idx > 0 ? data![idx - 1].count : undefined;
  const diff = prevCount !== undefined ? count - prevCount : undefined;
  const prevLabel = idx && idx > 0 ? data![idx - 1].date : undefined;
  return (
    <div className="card" style={{ padding: '10px 12px', minWidth: 160 }}>
      {label && (
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>
          {label}
        </p>
      )}
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
        {count} mistake{count === 1 ? '' : 's'} logged
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
      {negMarks > 0 && (
        <p className="font-mono text-[11px] text-rose-400 mt-1">
          -{negMarks.toFixed(1)} negative marks cost
        </p>
      )}
    </div>
  );
};

interface TrendChartProps {
  data: { date: string; count: number; negMarks: number }[];
  mistakes: Mistake[];
  onPointClick?: (date: string, mistakes: Mistake[]) => void;
}

const TrendChart = memo(({ data, mistakes, onPointClick }: TrendChartProps) => {
  const last = data[data.length - 1];
  const handleClick = (e: { activeLabel?: string } | null) => {
    if (!e || !e.activeLabel) return;
    const dateLabel = e.activeLabel;
    const idx = data.findIndex(d => d.date === dateLabel);
    if (idx < 0) return;
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
    const ds = format(days[idx], 'yyyy-MM-dd');
    const dayMistakes = mistakes.filter(m => m.date === ds);
    onPointClick?.(dateLabel, dayMistakes);
  };
  return (
    <div style={{ height: 185 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ left: 4, right: 14, top: 6, bottom: 0 }}
          onClick={handleClick}
        >
          <defs>
            <linearGradient id="areaAccent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            stroke="transparent"
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            stroke="transparent"
            allowDecimals={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip data={data} />} />
          <Area
            type="monotoneX"
            dataKey="count"
            name="Mistakes"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill="url(#areaAccent)"
            dot={false}
            activeDot={{ r: 5, fill: 'var(--accent)', strokeWidth: 0 }}
            isAnimationActive={false}
          />
          {last && (
            <ReferenceDot
              x={last.date}
              y={last.count}
              r={4.5}
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

function FlashCard({ mistake, onNext }: { mistake: Mistake; onNext: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const subjectColor = SUBJECT_COLORS[mistake.subject];

  return (
    <div>
      <div
        onClick={() => setFlipped(f => !f)}
        style={{ perspective: 1200, cursor: 'pointer' }}
      >
        <div
          style={{
            position: 'relative',
            minHeight: 172,
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* FRONT */}
          <div
            style={{
              position: flipped ? 'absolute' : 'relative',
              inset: 0,
              backfaceVisibility: 'hidden',
              borderRadius: 'var(--radius-card)',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
            }}
          >
            <div style={{ height: 3, background: subjectColor }} />
            <div style={{ padding: '16px 18px' }}>
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: subjectColor }}
                  >
                    {mistake.subject}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: PRIORITY_COLORS[mistake.priority] }}
                  >
                    {mistake.priority} Priority
                  </span>
                </div>
                {(mistake.marksLost ?? 0) > 0 && (
                  <span className="font-mono text-[11px] font-bold text-rose-400">
                    -{mistake.marksLost}m
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.35,
                }}
              >
                {mistake.chapter || 'Untitled Topic'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                {mistake.errorCategory}
                {mistake.sourceTestName ? ` · ${mistake.sourceTestName}` : ''}
              </p>
              <div
                className="flex items-center gap-1.5"
                style={{ marginTop: 22, color: 'var(--accent)' }}
              >
                <Sparkles size={13} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  Click to reveal root-cause diagnosis
                </span>
              </div>
            </div>
          </div>

          {/* BACK */}
          <div
            style={{
              position: flipped ? 'relative' : 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderRadius: 'var(--radius-card)',
              overflow: 'hidden',
              border: `1px solid ${subjectColor}40`,
              background: 'var(--bg-elevated)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ height: 3, background: subjectColor }} />
            <div
              style={{
                padding: '16px 18px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: subjectColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Diagnostic Note
                </span>
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: STATUS_COLORS[mistake.status] }}
                >
                  {mistake.status}
                </span>
              </div>
              <p
                className="line-clamp-4"
                style={{
                  fontSize: 13.5,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  flex: 1,
                }}
              >
                {mistake.notes ||
                  'No notes added for this mistake — open it in the Ledger to add detail.'}
              </p>
              <div
                className="flex items-center justify-between"
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  Logged {format(new Date(mistake.createdAt), 'MMM d, yyyy')}
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  Reviewed {mistake.reviewCount ?? 0}×
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center" style={{ marginTop: 10 }}>
        <button
          onClick={e => {
            e.stopPropagation();
            setFlipped(false);
            onNext();
          }}
          className="btn-ghost"
          style={{ fontSize: 12, padding: '6px 12px' }}
        >
          <RefreshCw size={12} /> Next Recall Card
        </button>
      </div>
    </div>
  );
}

export function Dashboard({
  mistakes,
  testAttempts = [],
  gamification,
  setCurrentView,
  onQuickLogTest,
}: DashboardProps) {
  const validMistakes = Array.isArray(mistakes) ? mistakes : [];
  const validAttempts = Array.isArray(testAttempts) ? testAttempts : [];

  const [randomIndex, setRandomIndex] = useState(() =>
    validMistakes.length > 0 ? Math.floor(Math.random() * validMistakes.length) : 0
  );
  const [popover, setPopover] = useState<{ date: string; mistakes: Mistake[] } | null>(null);
  const nextRandom = () =>
    setRandomIndex(i => (i + 1) % Math.max(validMistakes.length, 1));
  const randomMistake =
    validMistakes.length > 0 ? validMistakes[randomIndex % validMistakes.length] : null;

  const stats = useMemo(() => {
    const total = validMistakes.length;
    const active = validMistakes.filter(m => m.status === 'Active').length;
    const mastered = validMistakes.filter(m => m.status === 'Mastered').length;
    const rate = total > 0 ? Math.round((mastered / total) * 100) : 0;
    const highPri = validMistakes.filter(m => m.priority === 'High' && m.status === 'Active');
    const due = validMistakes.filter(
      m => m.status === 'Mastered' && m.nextReviewAt && m.nextReviewAt <= Date.now()
    ).length;
    const totalNegativeMarks = validMistakes.reduce((s, m) => s + (m.marksLost ?? 1), 0);
    return { total, active, mastered, rate, highPri, due, totalNegativeMarks };
  }, [validMistakes]);

  const latestTestStats = useMemo(() => {
    if (validAttempts.length === 0) return null;
    const sorted = [...validAttempts].sort((a, b) => b.date.localeCompare(a.date));
    const latest = sorted[0];
    const mainCount = validAttempts.filter(a => a.pattern === 'single').length;
    const advCount = validAttempts.filter(a => a.pattern === 'dual').length;
    const avgPct =
      validAttempts.reduce((s, a) => s + a.percentage, 0) / validAttempts.length;
    return { latest, mainCount, advCount, avgPct };
  }, [validAttempts]);

  const level = getLevelFromXP(gamification.xp);
  const xpProgress = getXPToNextLevel(gamification.xp);

  const trendData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
    return days.map(day => {
      const ds = format(day, 'yyyy-MM-dd');
      const dayMistakes = validMistakes.filter(m => m.date === ds);
      return {
        date: format(day, 'MMM d'),
        count: dayMistakes.length,
        negMarks: dayMistakes.reduce((s, m) => s + (m.marksLost ?? 1), 0),
      };
    });
  }, [validMistakes]);

  const subjectData = useMemo(
    () =>
      (Object.keys(SUBJECT_COLORS) as Subject[])
        .map(s => {
          const subMistakes = validMistakes.filter(m => m.subject === s);
          const total = subMistakes.length;
          const mastered = subMistakes.filter(m => m.status === 'Mastered').length;
          const negCost = subMistakes.reduce((acc, m) => acc + (m.marksLost ?? 1), 0);
          return {
            subject: s,
            total,
            mastered,
            negCost,
            pct: total > 0 ? Math.round((mastered / total) * 100) : 0,
            color: SUBJECT_COLORS[s],
          };
        })
        .sort((a, b) => b.total - a.total),
    [validMistakes]
  );

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const GreetingIcon = hour < 12 ? Sunrise : hour < 17 ? Sun : Sunset;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Top Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            {greeting}
            <GreetingIcon size={20} style={{ color: 'var(--accent)' }} />
          </h1>
          <p
            className="body-text"
            style={{ marginTop: 3, fontSize: 12.5, color: 'var(--text-tertiary)' }}
          >
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · Precision JEE Main & Advanced Workspace
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {gamification.streakDays > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px]"
              style={{
                background: 'var(--warning-bg)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
              }}
            >
              <Flame size={15} style={{ color: 'var(--warning)' }} />
              <span
                className="font-mono"
                style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)' }}
              >
                {gamification.streakDays}d streak
              </span>
            </div>
          )}

          {onQuickLogTest && (
            <button onClick={onQuickLogTest} className="btn-primary">
              <ClipboardList size={14} /> Log Mock Test
              <span className="kbd-key ml-1 !bg-slate-900/40 !text-slate-950 !border-slate-900/30">
                ⌘L
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Unified Telemetry Strip: Level + Core KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* XP / Progression Card */}
        <div className="card lg:col-span-5" style={{ padding: '20px' }}>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div
                className="w-12 h-12 rounded-[10px] flex items-center justify-center font-mono"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#06130E',
                  fontSize: 19,
                  fontWeight: 800,
                }}
              >
                {level}
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                style={{
                  background: 'var(--warning)',
                  border: '2px solid var(--bg-surface)',
                }}
              >
                <Star size={8} fill="white" stroke="none" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="card-title text-[14px]">Preparation Level {level}</span>
                <span className="font-mono text-[12px] font-bold text-emerald-400">
                  {gamification.xp.toLocaleString()} XP
                </span>
              </div>
              <div
                className="relative h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${xpProgress.progress}%`,
                    background: 'var(--accent)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[11px] text-slate-400 font-mono">
                <span>
                  {xpProgress.current}/{xpProgress.required} XP to Lvl {level + 1}
                </span>
                <span>+10 log · +50 master</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Compact Telemetry Metrics */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setCurrentView('ledger')}
            className="card text-left p-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="section-label">Mistakes</span>
              <AlertTriangle size={14} className="text-sky-400" />
            </div>
            <div className="stat-number text-[24px]">{stats.total}</div>
            <div className="text-[11px] font-mono text-rose-400 mt-1">
              -{stats.totalNegativeMarks.toFixed(0)}m total cost
            </div>
          </button>

          <button
            onClick={() => setCurrentView('ledger')}
            className="card text-left p-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="section-label">Active Queue</span>
              <Clock size={14} className="text-amber-400" />
            </div>
            <div className="stat-number text-[24px] text-amber-400">{stats.active}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stats.due} spaced review due
            </div>
          </button>

          <button
            onClick={() => setCurrentView('ledger')}
            className="card text-left p-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="section-label">Mastery</span>
              <CheckCircle2 size={14} className="text-emerald-400" />
            </div>
            <div className="stat-number text-[24px] text-emerald-400">{stats.rate}%</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stats.mastered} resolved
            </div>
          </button>

          <button
            onClick={() => setCurrentView('tests')}
            className="card text-left p-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="section-label">Mock Tests</span>
              <Layers size={14} className="text-indigo-400" />
            </div>
            <div className="stat-number text-[24px]">{validAttempts.length}</div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              {latestTestStats
                ? `${latestTestStats.mainCount}M · ${latestTestStats.advCount}A`
                : 'Log first test'}
            </div>
          </button>
        </div>
      </div>

      {/* Latest Test Event Banner (if tests exist) */}
      {latestTestStats && (
        <div
          className="card flex flex-wrap items-center justify-between gap-4"
          style={{
            padding: '14px 20px',
            background:
              'linear-gradient(90deg, rgba(16, 185, 129, 0.07) 0%, rgba(17, 20, 27, 0.95) 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--accent-muted-bg)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <Zap size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Latest Mock Event ·{' '}
                  {latestTestStats.latest.pattern === 'dual'
                    ? 'JEE Advanced (Paper 1 + Paper 2)'
                    : 'JEE Main (Single 3-Hr)'}
                </span>
              </div>
              <p className="text-[14px] font-bold text-slate-100 mt-0.5">
                {latestTestStats.latest.attemptName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Score</p>
              <p className="font-mono text-[14px] font-bold text-slate-100">
                {latestTestStats.latest.totalScore} /{' '}
                {latestTestStats.latest.maxScore}{' '}
                <span className="text-emerald-400">
                  ({latestTestStats.latest.percentage.toFixed(1)}%)
                </span>
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Accuracy</p>
              <p className="font-mono text-[14px] font-bold text-sky-400">
                {latestTestStats.latest.accuracy.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Duration</p>
              <p className="font-mono text-[14px] font-bold text-slate-200">
                {latestTestStats.latest.timeTakenMinutes}m /{' '}
                {latestTestStats.latest.pattern === 'dual' ? '360m' : '180m'}
              </p>
            </div>
            <button
              onClick={() => setCurrentView('tests')}
              className="btn-ghost !py-1.5 !px-3 text-[12px]"
            >
              Open Telemetry <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 14-Day Activity + Active Recall Flashcard */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="card lg:col-span-3" style={{ padding: '22px' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="card-title">14-Day Diagnostic Velocity</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Daily mistakes logged & negative marks impact (click a point to inspect)
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-[12px] text-emerald-400">
              <TrendingUp size={13} />
              <span>{trendData.reduce((s, d) => s + d.count, 0)} logged (14d)</span>
            </div>
          </div>
          <TrendChart
            data={trendData}
            mistakes={validMistakes}
            onPointClick={(date, ms) => setPopover({ date, mistakes: ms })}
          />
        </div>

        {/* Active Recall Flashcard */}
        <div className="card lg:col-span-2" style={{ padding: '22px' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: 'var(--accent)' }} />
              <span className="section-label">Active Recall Deck</span>
              {validMistakes.length > 0 && (
                <span className="font-mono text-[11px] text-slate-500">
                  {(randomIndex % validMistakes.length) + 1}/{validMistakes.length}
                </span>
              )}
            </div>
            <button
              onClick={nextRandom}
              className="btn-ghost"
              style={{ padding: '5px 10px', fontSize: 11.5 }}
            >
              <RefreshCw size={11} /> Shuffle
            </button>
          </div>

          {randomMistake ? (
            <FlashCard
              key={randomMistake.id}
              mistake={randomMistake}
              onNext={nextRandom}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Sparkles size={20} style={{ color: 'var(--text-tertiary)' }} />
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-tertiary)',
                  textAlign: 'center',
                }}
              >
                Log your first mistake to unlock active recall cards
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Subject Mastery + High Priority Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card" style={{ padding: '22px' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="card-title">Subject Mastery & Negative Cost</p>
            <span className="section-label">Mastered / Logged</span>
          </div>
          <div className="space-y-3.5">
            {subjectData.map(s => (
              <div key={s.subject}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>
                    {s.subject}
                  </span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-[11px] text-rose-400">-{s.negCost}m</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {s.mastered}/{s.total}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>
                      {s.pct}%
                    </span>
                  </div>
                </div>
                <div
                  className="relative h-2 rounded-full overflow-hidden"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                    style={{ width: `${s.pct}%`, background: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '22px' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="card-title">High-Priority Remediation Queue</p>
            <button
              onClick={() => setCurrentView('ledger')}
              className="btn-ghost"
              style={{ padding: '5px 10px', fontSize: 11.5 }}
            >
              Open Ledger <ArrowRight size={12} />
            </button>
          </div>
          {stats.highPri.length > 0 ? (
            <div className="space-y-2">
              {stats.highPri.slice(0, 5).map(m => (
                <div
                  key={m.id}
                  onClick={() => setCurrentView('ledger')}
                  className="flex items-center gap-3 cursor-pointer hover:border-slate-700 transition-colors"
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-card)',
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: SUBJECT_COLORS[m.subject] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.chapter || 'Untitled'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {m.subject} · {m.errorCategory}
                    </p>
                  </div>
                  <span className="font-mono text-[11.5px] font-bold text-rose-400">
                    -{m.marksLost ?? 1}m
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 size={26} style={{ color: 'var(--success)' }} />
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                Zero high-priority active mistakes remaining
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trend point detail modal */}
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
            style={{
              padding: 22,
              maxWidth: 460,
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="card-title">{popover.date}</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {popover.mistakes.length} mistake
                  {popover.mistakes.length === 1 ? '' : 's'} logged
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
                    className="flex items-center gap-3"
                    style={{
                      padding: '10px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-card)',
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: SUBJECT_COLORS[m.subject] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.chapter || 'Untitled'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {m.subject} · {m.errorCategory}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-rose-400">
                      -{m.marksLost ?? 1}m
                    </span>
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
                No mistakes logged on this day
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
