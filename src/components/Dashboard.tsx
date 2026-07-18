import { useMemo, useState, memo } from 'react';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  ReferenceDot, Label,
} from 'recharts';
import { Flame, Star, TrendingUp, CheckCircle2, Clock, AlertTriangle, RefreshCw, Sparkles, ArrowRight, Zap, Sun, Sunrise, Sunset } from 'lucide-react';
import { Mistake, GamificationState, View, Subject, ErrorCategory, Priority, MistakeStatus } from '../types';
import { getLevelFromXP, getXPToNextLevel } from '../data/gamification';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface DashboardProps {
  mistakes: Mistake[];
  gamification: GamificationState;
  setCurrentView: (v: View) => void;
}

const SUBJECT_COLORS: Record<Subject, string> = {
  Physics: '#38BDF8', Mathematics: '#FB923C', 'Physical Chemistry': '#F5A623',
  'Organic Chemistry': '#22C55E', 'Inorganic Chemistry': '#F5455C',
};

const CATEGORY_COLORS: Record<ErrorCategory, string> = {
  'Calculation': '#F5A623', 'Conceptual Gap': '#38BDF8',
  'Formula Misapplication': '#F5455C', 'Question Misread': '#FB923C', 'Careless/Silly': '#22C55E',
};

const PRIORITY_COLORS: Record<Priority, string> = { High: '#F5455C', Medium: '#F5A623', Low: '#5C5F70' };
const STATUS_COLORS: Record<MistakeStatus, string> = { Active: '#F5A623', Mastered: '#22C55E' };

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  data?: { date: string; count: number }[];
}

const ChartTooltip = ({ active, payload, label, data }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  const count = payload[0]?.value ?? 0;
  const idx = data?.findIndex(d => d.date === label);
  const prevCount = idx && idx > 0 ? data![idx - 1].count : undefined;
  const diff = prevCount !== undefined ? count - prevCount : undefined;
  const prevLabel = idx && idx > 0 ? data![idx - 1].date : undefined;
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
  onPointClick?: (date: string, mistakes: Mistake[]) => void;
}

const TrendChart = memo(({ data, mistakes, onPointClick }: TrendChartProps) => {
  const last = data[data.length - 1];
  const handleClick = (e: any) => {
    if (!e || !e.activeLabel) return;
    const dateLabel = e.activeLabel;
    // trendData dates are formatted "MMM d"; map back to yyyy-MM-dd via index
    const idx = data.findIndex(d => d.date === dateLabel);
    if (idx < 0) return;
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
    const ds = format(days[idx], 'yyyy-MM-dd');
    const dayMistakes = mistakes.filter(m => m.date === ds);
    onPointClick?.(dateLabel, dayMistakes);
  };
  return (
    <div style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 12, top: 4, bottom: 0 }} onClick={handleClick}>
          <defs>
            <linearGradient id="areaAccent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" interval={3} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" allowDecimals={false} width={36}
            label={{ value: 'Mistakes logged', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-tertiary)', fontSize: 10 } }} />
          <Tooltip content={<ChartTooltip data={data} />} />
          <Area type="monotoneX" dataKey="count" name="Mistakes" stroke="var(--accent)" strokeWidth={3} fill="url(#areaAccent)"
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

function KPICard({ label, value, sub, icon: Icon, iconColor, iconBg, onClick }: {
  label: string; value: string | number; sub?: string;
  icon: any; iconColor: string; iconBg: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="card text-left w-full"
      style={{ padding: '24px', transition: 'border-color 150ms', cursor: onClick ? 'pointer' : 'default' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, border: `1px solid ${iconColor}30` }}>
          <Icon size={18} style={{ color: iconColor }} />
        </div>
        {onClick && <ArrowRight size={14} style={{ color: 'var(--text-tertiary)', marginTop: 4 }} />}
      </div>
      <div className="stat-number">{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{sub}</div>}
    </button>
  );
}

function MasteryGauge({ rate }: { rate: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - rate / 100);
  return (
    <div className="card text-center" style={{ padding: '24px' }}>
      <div className="section-label" style={{ marginBottom: 12 }}>Mastery Rate</div>
      <div className="relative inline-flex items-center justify-center">
        <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={50} cy={50} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={7} />
          <circle cx={50} cy={50} r={r} fill="none"
            stroke="var(--accent)" strokeWidth={7}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="stat-number" style={{ fontSize: 24 }}>{rate}%</span>
        </div>
      </div>
    </div>
  );
}

export function Dashboard({ mistakes, gamification, setCurrentView }: DashboardProps) {
  const validMistakes = Array.isArray(mistakes) ? mistakes : [];

  const [randomIndex, setRandomIndex] = useState(() =>
    validMistakes.length > 0 ? Math.floor(Math.random() * validMistakes.length) : 0
  );
  const [popover, setPopover] = useState<{ date: string; mistakes: Mistake[] } | null>(null);
  const nextRandom = () => setRandomIndex(i => (i + 1) % Math.max(validMistakes.length, 1));
  const randomMistake = validMistakes.length > 0 ? validMistakes[randomIndex % validMistakes.length] : null;

  const stats = useMemo(() => {
    const total = validMistakes.length;
    const active = validMistakes.filter(m => m.status === 'Active').length;
    const mastered = validMistakes.filter(m => m.status === 'Mastered').length;
    const rate = total > 0 ? Math.round((mastered / total) * 100) : 0;
    const highPri = validMistakes.filter(m => m.priority === 'High' && m.status === 'Active');
    const due = validMistakes.filter(m => m.status === 'Mastered' && m.nextReviewAt && m.nextReviewAt <= Date.now()).length;
    return { total, active, mastered, rate, highPri, due };
  }, [validMistakes]);

  const level = getLevelFromXP(gamification.xp);
  const xpProgress = getXPToNextLevel(gamification.xp);

  const trendData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
    return days.map(day => {
      const ds = format(day, 'yyyy-MM-dd');
      return { date: format(day, 'MMM d'), count: validMistakes.filter(m => m.date === ds).length };
    });
  }, [validMistakes]);

  const subjectData = useMemo(() =>
    (Object.keys(SUBJECT_COLORS) as Subject[]).map(s => {
      const total = validMistakes.filter(m => m.subject === s).length;
      const mastered = validMistakes.filter(m => m.subject === s && m.status === 'Mastered').length;
      return { subject: s, total, mastered, pct: total > 0 ? Math.round((mastered / total) * 100) : 0, color: SUBJECT_COLORS[s] };
    }).sort((a, b) => b.total - a.total),
  [validMistakes]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const GreetingIcon = hour < 12 ? Sunrise : hour < 17 ? Sun : Sunset;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            {greeting}
            <GreetingIcon size={22} style={{ color: 'var(--accent)' }} />
          </h1>
          <p className="body-text" style={{ marginTop: 4, fontSize: 13, color: 'var(--text-tertiary)' }}>{format(new Date(), 'EEEE, MMMM d')} · Let's conquer today</p>
        </div>
        {gamification.streakDays > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full"
            style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,166,35,0.25)' }}>
            <Flame size={16} style={{ color: 'var(--warning)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)' }}>{gamification.streakDays}d</span>
          </div>
        )}
      </div>

      {/* XP Level Bar — the ONE element allowed to have glow */}
      <div className="card" style={{ padding: '24px' }}>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-[16px] flex items-center justify-center"
              style={{ background: 'var(--accent)' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{level}</span>
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'var(--warning)', border: '2px solid var(--bg-surface)' }}>
              <Star size={10} fill="white" stroke="none" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="card-title">Level {level}</span>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{gamification.xp.toLocaleString()} XP</span>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-[6px]"
                  style={{ background: 'var(--accent-muted-bg)', border: '1px solid rgba(13,148,136,0.2)' }}>
                  <Zap size={10} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)' }}>+10 log · +50 master</span>
                </div>
              </div>
            </div>
            <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{ width: `${xpProgress.progress}%`, background: 'var(--accent)', boxShadow: '0 0 12px rgba(13,148,136,0.2)' }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{xpProgress.current} / {xpProgress.required} XP to Level {level + 1}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{xpProgress.progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Total Logged" value={stats.total} icon={AlertTriangle} iconColor="var(--info)" iconBg="var(--info-bg)" onClick={() => setCurrentView('ledger')} />
        <KPICard label="Active" value={stats.active} sub={`${stats.due} due for review`} icon={Clock} iconColor="var(--warning)" iconBg="var(--warning-bg)" onClick={() => setCurrentView('ledger')} />
        <KPICard label="Mastered" value={stats.mastered} icon={CheckCircle2} iconColor="var(--success)" iconBg="var(--success-bg)" onClick={() => setCurrentView('ledger')} />
        <MasteryGauge rate={stats.rate} />
      </div>

      {/* Trend + Random Mistake */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="card lg:col-span-3" style={{ padding: '24px' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="card-title">14-Day Activity</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Mistakes logged per day</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px]"
              style={{ background: 'var(--accent-muted-bg)', border: '1px solid rgba(13,148,136,0.2)' }}>
              <TrendingUp size={13} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{trendData.reduce((s, d) => s + d.count, 0)} total</span>
            </div>
          </div>
          <TrendChart data={trendData} mistakes={validMistakes} onPointClick={(date, ms) => setPopover({ date, mistakes: ms })} />
        </div>

        {/* Random Mistake */}
        <div className="card lg:col-span-2" style={{ padding: '24px' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[10px] flex items-center justify-center"
                style={{ background: 'var(--accent-muted-bg)', border: '1px solid rgba(13,148,136,0.2)' }}>
                <Sparkles size={13} style={{ color: 'var(--accent)' }} />
              </div>
              <span className="section-label">Review This</span>
            </div>
            <button onClick={nextRandom} className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
              <RefreshCw size={12} />Next
            </button>
          </div>

          {randomMistake ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <span className="badge" style={{ background: `${SUBJECT_COLORS[randomMistake.subject]}15`, color: SUBJECT_COLORS[randomMistake.subject], borderColor: `${SUBJECT_COLORS[randomMistake.subject]}30` }}>{randomMistake.subject}</span>
                <span className="badge" style={{ background: `${CATEGORY_COLORS[randomMistake.errorCategory]}15`, color: CATEGORY_COLORS[randomMistake.errorCategory], borderColor: `${CATEGORY_COLORS[randomMistake.errorCategory]}25` }}>{randomMistake.errorCategory}</span>
                <span className="badge" style={{ background: `${PRIORITY_COLORS[randomMistake.priority]}15`, color: PRIORITY_COLORS[randomMistake.priority], borderColor: `${PRIORITY_COLORS[randomMistake.priority]}25` }}>{randomMistake.priority}</span>
              </div>
              <div>
                <p className="card-title" style={{ marginBottom: 6 }}>{randomMistake.chapter || 'Untitled'}</p>
                {randomMistake.notes && (
                  <div className="line-clamp-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-card)', padding: 14, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {randomMistake.notes}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{format(new Date(randomMistake.createdAt), 'MMM d, yyyy')}</span>
                <span className="badge" style={{ background: `${STATUS_COLORS[randomMistake.status]}15`, color: STATUS_COLORS[randomMistake.status], borderColor: `${STATUS_COLORS[randomMistake.status]}25` }}>
                  {randomMistake.status === 'Mastered' ? 'Mastered' : 'Active'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-12 h-12 rounded-[16px] flex items-center justify-center"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <Sparkles size={20} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>Log your first mistake to see reviews here</p>
            </div>
          )}
        </div>
      </div>

      {/* Subject bars + High Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card" style={{ padding: '24px' }}>
          <p className="card-title" style={{ marginBottom: 18 }}>Subject Mastery</p>
          <div className="space-y-4">
            {subjectData.map(s => (
              <div key={s.subject}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.subject}</span>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.mastered}/{s.total}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.pct}%</span>
                  </div>
                </div>
                <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                    style={{ width: `${s.pct}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="card-title">High Priority</p>
            <button onClick={() => setCurrentView('ledger')} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>View all <ArrowRight size={12} /></button>
          </div>
          {stats.highPri.length > 0 ? (
            <div className="space-y-2">
              {stats.highPri.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center gap-3" style={{ padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-card)' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SUBJECT_COLORS[m.subject] }} />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.chapter || 'Untitled'}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.subject}</p>
                  </div>
                  <span className="badge" style={{ background: `${CATEGORY_COLORS[m.errorCategory]}15`, color: CATEGORY_COLORS[m.errorCategory], borderColor: `${CATEGORY_COLORS[m.errorCategory]}25` }}>
                    {m.errorCategory.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 size={28} style={{ color: 'var(--success)' }} />
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No high-priority mistakes active</p>
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
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SUBJECT_COLORS[m.subject] }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.chapter || 'Untitled'}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="badge" style={{ background: `${SUBJECT_COLORS[m.subject]}15`, color: SUBJECT_COLORS[m.subject], borderColor: `${SUBJECT_COLORS[m.subject]}30` }}>{m.subject}</span>
                        <span className="badge" style={{ background: `${CATEGORY_COLORS[m.errorCategory]}15`, color: CATEGORY_COLORS[m.errorCategory], borderColor: `${CATEGORY_COLORS[m.errorCategory]}25` }}>{m.errorCategory}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>No mistakes logged on this day</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
