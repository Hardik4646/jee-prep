import { useState, useMemo, memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Label } from 'recharts';
import type { TooltipContentProps, ValueType, NameType } from 'recharts';
import { ClipboardList, TrendingUp, Award, Target, BarChart3, AlertTriangle, Calculator, X } from 'lucide-react';
import { ExamTemplate, TestAttempt, SubjectScore } from '../../types';
import { format, parseISO } from 'date-fns';

/* ---------- Types ---------- */

interface TrendLine {
  key: string;
  name: string;
  color: string;
}

interface TrendDatum {
  index: number;
  label: string;
  [key: string]: number | string | null;
}

interface TrendChartProps {
  data: TrendDatum[];
  lines: TrendLine[];
  height?: number;
  yAxisLabel?: string;
  attempts?: TestAttempt[];
  /** Lines whose values are percentages/accuracy (rendered with a % suffix in tooltip & annotations). */
  percentageKeys?: string[];
  /** Highlight the highest point of the first line with a ReferenceDot + label. */
  highlightMax?: boolean;
  /** Highlight the latest point of the first line with a ReferenceDot + label. */
  highlightLast?: boolean;
  onClickPoint?: (index: number) => void;
}

/* ---------- TrendChart ---------- */

const TrendChart = memo(({
  data,
  lines,
  height,
  yAxisLabel,
  attempts,
  percentageKeys = [],
  highlightMax = false,
  highlightLast = true,
  onClickPoint,
}: TrendChartProps) => {
  const firstLine = lines[0];
  const firstKey = firstLine?.key;

  // Highest point of the first line (ignoring nulls)
  let maxPoint: { x: string; y: number; index: number } | null = null;
  if (highlightMax && firstKey) {
    data.forEach((d, i) => {
      const v = d[firstKey];
      if (typeof v === 'number' && (!maxPoint || v > maxPoint.y)) {
        maxPoint = { x: String(d.label), y: v, index: i };
      }
    });
  }

  // Latest point of the first line (last non-null)
  let lastPoint: { x: string; y: number; index: number } | null = null;
  if (highlightLast && firstKey) {
    for (let i = data.length - 1; i >= 0; i--) {
      const v = data[i][firstKey];
      if (typeof v === 'number') {
        lastPoint = { x: String(data[i].label), y: v, index: i };
        break;
      }
    }
  }

  const formatValue = (key: string, value: number) => {
    if (percentageKeys.includes(key)) return `${value.toFixed(1)}%`;
    return value.toFixed(1);
  };

  const renderTooltip = (props: TooltipContentProps<ValueType, NameType>) => {
    const { active, payload, label } = props;
    if (!active || !payload?.length) return null;

    // Look up the attempt for richer info
    const idx = (payload[0]?.payload as TrendDatum | undefined)?.index ?? data.findIndex(d => d.label === label);
    const attempt = attempts && idx >= 0 ? attempts[idx] : undefined;

    return (
      <div className="card" style={{ padding: '10px 12px', minWidth: 160 }}>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</p>
        {attempt && (
          <>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{attempt.attemptName}</p>
            <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 6 }}>{attempt.templateName}</p>
          </>
        )}
        {payload.map((p, i) => {
          const v = p.value;
          const numVal = typeof v === 'number' ? v : Number(v);
          return (
            <p key={i} style={{ fontSize: 12, fontWeight: 700, color: p.color, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: p.color }} />
              {p.name}: {!Number.isNaN(numVal) ? formatValue(String(p.dataKey), numVal) : String(v ?? '')}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ height: height ?? 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ left: -20, right: 12, top: 12, bottom: 0 }}
          onClick={(e: { activeTooltipIndex?: number | null }) => {
            if (onClickPoint && e && typeof e.activeTooltipIndex === 'number' && e.activeTooltipIndex !== null) {
              onClickPoint(e.activeTooltipIndex);
            }
          }}
        >
          <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            stroke="transparent"
            width={32}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fill: 'var(--text-tertiary)', fontSize: 10 } } : undefined}
          />
          <Tooltip content={renderTooltip} />

          {lines.map(l => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.name}
              stroke={l.color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: l.color, strokeWidth: 0 }}
              activeDot={{ r: 5, style: { cursor: onClickPoint ? 'pointer' : 'default' } }}
              isAnimationActive={false}
            />
          ))}

          {/* Highlight the highest point of the first line */}
          {highlightMax && maxPoint && (
            <ReferenceDot
              x={maxPoint.x}
              y={maxPoint.y}
              r={5}
              fill={firstLine.color}
              stroke="#fff"
              strokeWidth={1.5}
              isFront
            >
              <Label
                value={`Max ${formatValue(firstKey, maxPoint.y)}`}
                position="top"
                fill={firstLine.color}
                fontSize={10}
                fontWeight={700}
              />
            </ReferenceDot>
          )}

          {/* Highlight the latest point of the first line */}
          {highlightLast && lastPoint && !(highlightMax && maxPoint && maxPoint.index === lastPoint.index) && (
            <ReferenceDot
              x={lastPoint.x}
              y={lastPoint.y}
              r={5}
              fill={firstLine.color}
              stroke="#fff"
              strokeWidth={1.5}
              isFront
            >
              <Label
                value={formatValue(firstKey, lastPoint.y)}
                position="top"
                fill={firstLine.color}
                fontSize={10}
                fontWeight={700}
              />
            </ReferenceDot>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
TrendChart.displayName = 'TrendChart';

/* ---------- Attempt detail popover ---------- */

interface AttemptDetailProps {
  attempt: TestAttempt | null;
  onClose: () => void;
}

function AttemptDetailPopover({ attempt, onClose }: AttemptDetailProps) {
  if (!attempt) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 560,
          width: '100%',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: 20,
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-button)',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: 16, paddingRight: 32 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{attempt.attemptName}</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {format(parseISO(attempt.date), 'MMM d, yyyy')} · {attempt.templateName}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
            <span className="badge" style={{ background: 'var(--accent-muted-bg)', color: 'var(--accent)' }}>
              Score {attempt.totalScore.toFixed(1)} / {attempt.maxScore.toFixed(0)}
            </span>
            <span className="badge" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              {attempt.percentage.toFixed(1)}%
            </span>
            <span className="badge" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
              Accuracy {attempt.accuracy.toFixed(1)}%
            </span>
            {attempt.targetAchieved !== undefined && (
              <span
                className="badge"
                style={{
                  background: attempt.targetAchieved ? 'var(--success-bg)' : 'var(--danger-bg)',
                  color: attempt.targetAchieved ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {attempt.targetAchieved ? 'Target Met' : 'Target Missed'}
              </span>
            )}
          </div>
        </div>

        {/* Totals summary */}
        <div className="grid grid-cols-3 gap-2" style={{ marginBottom: 16 }}>
          {[
            { label: 'Correct', value: attempt.totalCorrect, color: 'var(--success)' },
            { label: 'Incorrect', value: attempt.totalIncorrect, color: 'var(--danger)' },
            { label: 'Unattempted', value: attempt.totalUnattempted, color: 'var(--text-tertiary)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 'var(--radius-card)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {attempt.marksLostToNegative > 0 && (
          <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 'var(--radius-card)', background: 'var(--danger-bg)', border: '1px solid var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)' }}>
              Negative marks lost: {attempt.marksLostToNegative.toFixed(1)}
            </p>
          </div>
        )}

        {/* Per-paper, per-subject breakdown */}
        {attempt.papers.map((paper, pi) => (
          <div key={pi} style={{ marginBottom: 14 }}>
            {attempt.papers.length > 1 && (
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Paper {pi + 1} · Score {paper.totalScore.toFixed(1)} / {paper.maxScore.toFixed(0)} · Acc {paper.accuracy.toFixed(1)}%
              </p>
            )}
            <div className="space-y-2">
              {paper.subjects.map((s: SubjectScore, si: number) => (
                <div key={si} style={{ padding: '10px 12px', borderRadius: 'var(--radius-card)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.subjectName}</p>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                      {s.score.toFixed(1)} / {s.maxScore.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--success)' }}>✓ {s.correct}</span>
                    <span style={{ fontSize: 10, color: 'var(--danger)' }}>✗ {s.incorrect}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>— {s.unattempted}</span>
                    <span style={{ fontSize: 10, color: 'var(--info)' }}>Acc {s.accuracy.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Main component ---------- */

type ChartMode = 'total' | 'subject' | 'paper' | 'accuracy' | 'negative';

export function TestAnalytics({ attempts, templates }: { attempts: TestAttempt[]; templates: ExamTemplate[] }) {
  const [filterTemplate, setFilterTemplate] = useState('all');
  const [filterPattern, setFilterPattern] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [chartMode, setChartMode] = useState<ChartMode>('total');
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return attempts
      .filter(a => filterTemplate === 'all' || a.templateId === filterTemplate)
      .filter(a => filterPattern === 'all' || a.pattern === filterPattern)
      .filter(a => !dateFrom || a.date >= dateFrom)
      .filter(a => !dateTo || a.date <= dateTo)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [attempts, filterTemplate, filterPattern, dateFrom, dateTo]);

  const stats = useMemo(() => {
    if (!filtered.length) return { total: 0, avgPct: 0, best: 0, avgAcc: 0, targetRate: 0 };
    const total = filtered.length;
    const avgPct = filtered.reduce((s, a) => s + a.percentage, 0) / total;
    const best = Math.max(...filtered.map(a => a.percentage));
    const avgAcc = filtered.reduce((s, a) => s + a.accuracy, 0) / total;
    const withTargets = filtered.filter(a => a.targetAchieved !== undefined);
    const targetRate = withTargets.length > 0 ? (withTargets.filter(a => a.targetAchieved).length / withTargets.length) * 100 : 0;
    return { total, avgPct, best, avgAcc, targetRate };
  }, [filtered]);

  const trendData = useMemo(() => filtered.map((a, i) => ({
    index: i,
    label: format(parseISO(a.date), 'MMM d'),
    total: a.totalScore,
    percentage: a.percentage,
    accuracy: a.accuracy,
    negative: a.marksLostToNegative,
  })), [filtered]);

  const subjectTrend = useMemo(() => {
    const subjectNames = new Set<string>();
    filtered.forEach(a => a.papers.forEach(p => p.subjects.forEach(s => subjectNames.add(s.subjectName))));
    const colors = ['#4F6BFF', '#38BDF8', '#F5A623', '#22C55E', '#F5455C', '#9A9DAD'];
    const subjectList = Array.from(subjectNames);
    return {
      data: filtered.map((a, i) => {
        const row: TrendDatum = { index: i, label: format(parseISO(a.date), 'MMM d') };
        subjectList.forEach(sn => {
          const subjScore = a.papers.flatMap(p => p.subjects).find(s => s.subjectName === sn);
          row[sn] = subjScore ? subjScore.accuracy : null;
        });
        return row;
      }),
      lines: subjectList.map((sn, i) => ({ key: sn, name: sn, color: colors[i % colors.length] })),
    };
  }, [filtered]);

  const paperTrend = useMemo(() => {
    const dual = filtered.filter(a => a.pattern === 'dual');
    if (!dual.length) return null;
    return {
      data: dual.map((a, i) => ({
        index: i,
        label: format(parseISO(a.date), 'MMM d'),
        paper1: a.papers[0]?.totalScore ?? 0,
        paper2: a.papers[1]?.totalScore ?? 0,
        combined: a.totalScore,
      })),
      lines: [
        { key: 'paper1', name: 'Paper 1', color: '#4F6BFF' },
        { key: 'paper2', name: 'Paper 2', color: '#F5A623' },
        { key: 'combined', name: 'Combined', color: '#22C55E' },
      ],
    };
  }, [filtered]);

  const insights = useMemo(() => {
    if (filtered.length < 2) return null;
    const subjectNames = new Set<string>();
    filtered.forEach(a => a.papers.forEach(p => p.subjects.forEach(s => subjectNames.add(s.subjectName))));
    const subjectStats: Record<string, { scores: number[]; accuracies: number[] }> = {};
    subjectNames.forEach(sn => { subjectStats[sn] = { scores: [], accuracies: [] }; });
    filtered.forEach(a => a.papers.forEach(p => p.subjects.forEach(s => {
      if (subjectStats[s.subjectName]) { subjectStats[s.subjectName].scores.push(s.score); subjectStats[s.subjectName].accuracies.push(s.accuracy); }
    })));
    const entries = Object.entries(subjectStats).filter(([, v]) => v.scores.length > 0);
    if (!entries.length) return null;
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = (arr: number[]) => { const m = avg(arr); return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length; };
    const slope = (arr: number[]) => { const n = arr.length; if (n < 2) return 0; const xs = arr.map((_, i) => i); const mx = avg(xs), my = avg(arr); return xs.reduce((s, x, i) => s + (x - mx) * (arr[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0); };
    const ranked = entries.map(([name, v]) => ({ name, avgScore: avg(v.scores), variance: variance(v.scores), slope: slope(v.scores) }));
    return {
      strongest: [...ranked].sort((a, b) => b.avgScore - a.avgScore)[0],
      weakest: [...ranked].sort((a, b) => a.avgScore - b.avgScore)[0],
      mostImproved: [...ranked].sort((a, b) => b.slope - a.slope)[0],
      mostConsistent: [...ranked].sort((a, b) => a.variance - b.variance)[0],
    };
  }, [filtered]);

  const kpis = [
    { label: 'Tests Taken', value: stats.total, color: 'var(--accent)', bg: 'var(--accent-muted-bg)', icon: ClipboardList },
    { label: 'Avg Percentage', value: `${stats.avgPct.toFixed(1)}%`, color: 'var(--info)', bg: 'var(--info-bg)', icon: TrendingUp },
    { label: 'Best Score', value: `${stats.best.toFixed(1)}%`, color: 'var(--success)', bg: 'var(--success-bg)', icon: Award },
    { label: 'Target Rate', value: `${stats.targetRate.toFixed(0)}%`, color: 'var(--warning)', bg: 'var(--warning-bg)', icon: Target },
  ];

  const chartModes: { id: ChartMode; label: string }[] = [
    { id: 'total', label: 'Score Trend' },
    { id: 'subject', label: 'Subject Accuracy' },
    { id: 'paper', label: 'Paper-wise' },
    { id: 'accuracy', label: 'Accuracy' },
    { id: 'negative', label: 'Neg. Loss' },
  ];

  // Resolve the attempt for the popover. For 'paper' mode the data is filtered to dual-only,
  // so the index maps into the dual subset; otherwise it maps directly into `filtered`.
  const selectedAttempt = useMemo(() => {
    if (selectedAttemptIdx === null) return null;
    if (chartMode === 'paper' && paperTrend) {
      const dual = filtered.filter(a => a.pattern === 'dual');
      return dual[selectedAttemptIdx] ?? null;
    }
    return filtered[selectedAttemptIdx] ?? null;
  }, [selectedAttemptIdx, chartMode, paperTrend, filtered]);

  if (attempts.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3" style={{ padding: '64px 24px' }}>
        <BarChart3 size={28} style={{ color: 'var(--text-tertiary)' }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>No analytics yet</p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Log at least one test to see trends and insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card flex items-center gap-2 flex-wrap" style={{ padding: '14px 18px' }}>
        <select value={filterTemplate} onChange={e => setFilterTemplate(e.target.value)} className="field" style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}><option value="all">All Templates</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <select value={filterPattern} onChange={e => setFilterPattern(e.target.value)} className="field" style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}><option value="all">All Patterns</option><option value="single">Single</option><option value="dual">Dual</option></select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="field" style={{ width: 'auto', padding: '7px 10px', fontSize: 12 }} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="field" style={{ width: 'auto', padding: '7px 10px', fontSize: 12 }} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card" style={{ padding: 24 }}>
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-4" style={{ background: k.bg, border: `1px solid ${k.color}30` }}><Icon size={18} style={{ color: k.color }} /></div>
              <div className="stat-number">{k.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 6 }}>{k.label}</div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <p className="card-title">Performance Trend</p>
          <div className="flex gap-1 flex-wrap" style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-button)', padding: 3 }}>
            {chartModes.map(m => (
              <button key={m.id} onClick={() => setChartMode(m.id)} disabled={m.id === 'paper' && !paperTrend} style={{ padding: '6px 10px', borderRadius: 'var(--radius-button)', fontSize: 11, fontWeight: 600, cursor: m.id === 'paper' && !paperTrend ? 'default' : 'pointer', border: 'none', background: chartMode === m.id ? 'var(--accent)' : 'transparent', color: chartMode === m.id ? '#fff' : 'var(--text-tertiary)', opacity: m.id === 'paper' && !paperTrend ? 0.3 : 1 }}>{m.label}</button>
            ))}
          </div>
        </div>
        {filtered.length > 0 ? (
          <>
            {chartMode === 'total' && (
              <TrendChart
                data={trendData}
                lines={[{ key: 'total', name: 'Score', color: '#4F6BFF' }, { key: 'percentage', name: 'Percentage', color: '#22C55E' }]}
                yAxisLabel="Score"
                attempts={filtered}
                percentageKeys={['percentage']}
                highlightMax
                highlightLast
                onClickPoint={(i) => setSelectedAttemptIdx(i)}
              />
            )}
            {chartMode === 'subject' && (
              <TrendChart
                data={subjectTrend.data}
                lines={subjectTrend.lines}
                height={240}
                yAxisLabel="Accuracy %"
                attempts={filtered}
                percentageKeys={subjectTrend.lines.map(l => l.key)}
                highlightMax={false}
                highlightLast={false}
                onClickPoint={(i) => setSelectedAttemptIdx(i)}
              />
            )}
            {chartMode === 'paper' && paperTrend && (
              <TrendChart
                data={paperTrend.data}
                lines={paperTrend.lines}
                yAxisLabel="Score"
                attempts={filtered.filter(a => a.pattern === 'dual')}
                highlightMax
                highlightLast
                onClickPoint={(i) => setSelectedAttemptIdx(i)}
              />
            )}
            {chartMode === 'accuracy' && (
              <TrendChart
                data={trendData}
                lines={[{ key: 'accuracy', name: 'Accuracy %', color: '#38BDF8' }]}
                yAxisLabel="Accuracy %"
                attempts={filtered}
                percentageKeys={['accuracy']}
                highlightMax
                highlightLast
                onClickPoint={(i) => setSelectedAttemptIdx(i)}
              />
            )}
            {chartMode === 'negative' && (
              <TrendChart
                data={trendData}
                lines={[{ key: 'negative', name: 'Marks Lost', color: '#F5455C' }]}
                yAxisLabel="Marks Lost"
                attempts={filtered}
                highlightMax
                highlightLast
                onClickPoint={(i) => setSelectedAttemptIdx(i)}
              />
            )}
          </>
        ) : (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No data for selected filters</p></div>
        )}
      </div>

      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card" style={{ padding: 24 }}>
            <p className="card-title" style={{ marginBottom: 16 }}>Comparative Insights</p>
            <div className="space-y-3">
              {[
                { label: 'Strongest Subject', value: insights.strongest.name, sub: `${insights.strongest.avgScore.toFixed(1)} avg`, color: 'var(--success)', bg: 'var(--success-bg)', icon: Award },
                { label: 'Weakest Subject', value: insights.weakest.name, sub: `${insights.weakest.avgScore.toFixed(1)} avg`, color: 'var(--danger)', bg: 'var(--danger-bg)', icon: AlertTriangle },
                { label: 'Most Improved', value: insights.mostImproved.name, sub: `slope +${insights.mostImproved.slope.toFixed(2)}`, color: 'var(--accent)', bg: 'var(--accent-muted-bg)', icon: TrendingUp },
                { label: 'Most Consistent', value: insights.mostConsistent.name, sub: `variance ${insights.mostConsistent.variance.toFixed(1)}`, color: 'var(--info)', bg: 'var(--info-bg)', icon: Calculator },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3" style={{ padding: '12px 14px', borderRadius: 'var(--radius-card)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: item.bg, border: `1px solid ${item.color}30` }}><Icon size={16} style={{ color: item.color }} /></div>
                    <div className="flex-1 min-w-0"><p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{item.label}</p><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</p></div>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>{item.sub}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {filtered.some(a => a.percentile) && (
            <div className="card" style={{ padding: 24 }}>
              <p className="card-title" style={{ marginBottom: 16 }}>Percentile Trend</p>
              <TrendChart
                data={filtered.filter(a => a.percentile).map((a, i) => ({ index: i, label: format(parseISO(a.date), 'MMM d'), percentile: a.percentile as number }))}
                lines={[{ key: 'percentile', name: 'Percentile', color: '#38BDF8' }]}
                yAxisLabel="Percentile"
                attempts={filtered.filter(a => a.percentile)}
                highlightMax
                highlightLast
                onClickPoint={(i) => {
                  // percentile data is a subset; map back to the filtered index
                  const pctFiltered = filtered.filter(a => a.percentile);
                  const attempt = pctFiltered[i];
                  if (attempt) {
                    const realIdx = filtered.indexOf(attempt);
                    setSelectedAttemptIdx(realIdx);
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      <AttemptDetailPopover
        attempt={selectedAttempt}
        onClose={() => setSelectedAttemptIdx(null)}
      />
    </div>
  );
}
