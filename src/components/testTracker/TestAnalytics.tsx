import { useState, useMemo, memo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Label,
  Legend,
} from 'recharts';
import {
  ClipboardList,
  TrendingUp,
  Award,
  BarChart3,
  AlertTriangle,
  Calculator,
  X,
  Sparkles,
  Lightbulb,
  Clock,
  Flame,
} from 'lucide-react';
import { ExamTemplate, TestAttempt, SubjectScore, Mistake } from '../../types';
import { format, parseISO } from 'date-fns';

interface TrendLine {
  key: string;
  name: string;
  color: string;
  strokeDasharray?: string;
}

interface TrendDatum {
  index: number;
  label: string;
  [key: string]: number | string | null | undefined;
}

interface TrendChartProps {
  data: TrendDatum[];
  lines: TrendLine[];
  height?: number;
  yAxisLabel?: string;
  attempts?: TestAttempt[];
  percentageKeys?: string[];
  highlightMax?: boolean;
  highlightLast?: boolean;
  onClickPoint?: (index: number) => void;
}

const TrendChart = memo(
  ({
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

    let maxPoint: { x: string; y: number; index: number } | null = null;
    if (highlightMax && firstKey) {
      data.forEach((d, i) => {
        const v = d[firstKey];
        if (typeof v === 'number' && (!maxPoint || v > maxPoint.y)) {
          maxPoint = { x: String(d.label), y: v, index: i };
        }
      });
    }

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

    const renderTooltip = (props: {
      active?: boolean;
      payload?: Array<{
        value?: number | string;
        color?: string;
        name?: string;
        dataKey?: string | number;
        payload?: TrendDatum;
      }>;
      label?: string;
    }) => {
      const { active, payload, label } = props;
      if (!active || !payload?.length) return null;

      const idx =
        payload[0]?.payload?.index ?? data.findIndex(d => d.label === label);
      const attempt = attempts && idx >= 0 ? attempts[idx] : undefined;

      return (
        <div className="card-glass" style={{ padding: '10px 12px', minWidth: 175 }}>
          <p className="font-mono" style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginBottom: 3 }}>
            {label}
          </p>
          {attempt && (
            <>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 1 }}>
                {attempt.attemptName}
              </p>
              <p style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                {attempt.pattern === 'dual' ? 'JEE Advanced (P1+P2)' : 'JEE Main (Single)'}
              </p>
            </>
          )}
          {payload.map((p, i: number) => {
            const v = p.value;
            const numVal = typeof v === 'number' ? v : Number(v);
            return (
              <p
                key={i}
                className="tabular-num"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: p.color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: p.color,
                  }}
                />
                {p.name}: {!Number.isNaN(numVal) ? formatValue(String(p.dataKey), numVal) : String(v ?? '')}
              </p>
            );
          })}
        </div>
      );
    };

    return (
      <div style={{ height: height ?? 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ left: -12, right: 14, top: 14, bottom: 0 }}
            onClick={(e: { activeTooltipIndex?: number | null } | null) => {
              if (
                onClickPoint &&
                e &&
                typeof e.activeTooltipIndex === 'number' &&
                e.activeTooltipIndex !== null
              ) {
                onClickPoint(e.activeTooltipIndex);
              }
            }}
          >
            <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              stroke="transparent"
              width={36}
              label={
                yAxisLabel
                  ? {
                      value: yAxisLabel,
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: 'var(--text-tertiary)', fontSize: 10 },
                    }
                  : undefined
              }
            />
            <Tooltip content={renderTooltip} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />

            {lines.map(l => (
              <Line
                key={l.key}
                type="monotone"
                dataKey={l.key}
                name={l.name}
                stroke={l.color}
                strokeWidth={2.5}
                strokeDasharray={l.strokeDasharray}
                connectNulls
                dot={{ r: 3.5, fill: l.color, strokeWidth: 0 }}
                activeDot={{ r: 5, style: { cursor: onClickPoint ? 'pointer' : 'default' } }}
                isAnimationActive={false}
              />
            ))}

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
                  value={`Peak ${formatValue(firstKey, maxPoint.y)}`}
                  position="top"
                  fill={firstLine.color}
                  fontSize={10}
                  fontWeight={700}
                />
              </ReferenceDot>
            )}

            {highlightLast &&
              lastPoint &&
              !(highlightMax && maxPoint && maxPoint.index === lastPoint.index) && (
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
  }
);
TrendChart.displayName = 'TrendChart';

/* ---------- Attempt Detail Modal ---------- */

function AttemptDetailPopover({
  attempt,
  onClose,
}: {
  attempt: TestAttempt | null;
  onClose: () => void;
}) {
  if (!attempt) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        className="card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 600,
          width: '100%',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: 22,
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="btn-ghost"
          style={{ position: 'absolute', top: 14, right: 14, padding: '6px 8px' }}
        >
          <X size={14} />
        </button>

        <div style={{ marginBottom: 16, paddingRight: 36 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
            {attempt.attemptName}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {format(parseISO(attempt.date), 'MMM d, yyyy')} · {attempt.templateName} ·{' '}
            {attempt.pattern === 'dual' ? 'JEE Advanced (2 × 3h)' : 'JEE Main (1 × 3h)'}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2.5" style={{ marginBottom: 16 }}>
          {[
            {
              label: 'Score',
              value: `${attempt.totalScore.toFixed(1)}/${attempt.maxScore}`,
              color: 'var(--accent)',
            },
            { label: 'Accuracy', value: `${attempt.accuracy.toFixed(1)}%`, color: 'var(--info)' },
            {
              label: 'Neg Lost',
              value: `-${attempt.marksLostToNegative.toFixed(1)}`,
              color: 'var(--danger)',
            },
            {
              label: 'Total Time',
              value: attempt.timeTakenMinutes ? `${attempt.timeTakenMinutes}m` : '—',
              color: 'var(--text-primary)',
            },
          ].map(s => (
            <div
              key={s.label}
              style={{
                textAlign: 'center',
                padding: '10px 6px',
                borderRadius: 'var(--radius-button)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <p className="tabular-num" style={{ fontSize: 16, fontWeight: 700, color: s.color }}>
                {s.value}
              </p>
              <p style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {attempt.papers.map((paper, pi) => (
          <div key={pi} style={{ marginBottom: 14 }}>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                {attempt.papers.length > 1 ? `Paper ${pi + 1}` : 'Paper Breakdown'} · Score{' '}
                {paper.totalScore.toFixed(1)} / {paper.maxScore.toFixed(0)} · Acc{' '}
                {paper.accuracy.toFixed(1)}%
              </p>
              {paper.timeTakenMinutes && (
                <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  {paper.timeTakenMinutes} / 180m
                </span>
              )}
            </div>
            <div className="space-y-2">
              {paper.subjects.map((s: SubjectScore, si: number) => (
                <div
                  key={si}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-button)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.subjectName}
                    </p>
                    <span className="tabular-num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                      {s.score.toFixed(1)} / {s.maxScore.toFixed(0)}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-3 flex-wrap font-mono"
                    style={{ marginTop: 4, fontSize: 10.5, color: 'var(--text-tertiary)' }}
                  >
                    <span style={{ color: 'var(--success)' }}>✓ {s.correct}</span>
                    <span style={{ color: 'var(--danger)' }}>✗ {s.incorrect}</span>
                    <span>— {s.unattempted}</span>
                    <span style={{ color: 'var(--info)' }}>Acc {s.accuracy.toFixed(1)}%</span>
                    {s.timeSpentMinutes && <span>Time: {s.timeSpentMinutes}m / 60m</span>}
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

/* ---------- Main TestAnalytics Component ---------- */

type ChartMode =
  | 'mainVsAdv'
  | 'total'
  | 'subject'
  | 'paper'
  | 'negative'
  | 'attemptRate'
  | 'efficiency';

export function TestAnalytics({
  attempts,
  templates,
  mistakes = [],
}: {
  attempts: TestAttempt[];
  templates: ExamTemplate[];
  mistakes?: Mistake[];
}) {
  const [filterTemplate, setFilterTemplate] = useState('all');
  const [filterPattern, setFilterPattern] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [chartMode, setChartMode] = useState<ChartMode>('mainVsAdv');
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return attempts
      .filter(a => filterTemplate === 'all' || a.templateId === filterTemplate)
      .filter(a => filterPattern === 'all' || a.pattern === filterPattern)
      .filter(a => !dateFrom || a.date >= dateFrom)
      .filter(a => !dateTo || a.date <= dateTo)
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  }, [attempts, filterTemplate, filterPattern, dateFrom, dateTo]);

  const stats = useMemo(() => {
    if (!filtered.length)
      return { total: 0, avgPct: 0, best: 0, avgAcc: 0, targetRate: 0, totalNegLost: 0, avgSecPerQ: 0 };
    const total = filtered.length;
    const avgPct = filtered.reduce((s, a) => s + a.percentage, 0) / total;
    const best = Math.max(...filtered.map(a => a.percentage));
    const avgAcc = filtered.reduce((s, a) => s + a.accuracy, 0) / total;
    const totalNegLost = filtered.reduce((s, a) => s + a.marksLostToNegative, 0);
    const withTargets = filtered.filter(a => a.targetAchieved !== undefined);
    const targetRate =
      withTargets.length > 0
        ? (withTargets.filter(a => a.targetAchieved).length / withTargets.length) * 100
        : 0;

    let totalSeconds = 0;
    let totalAttemptedQ = 0;
    filtered.forEach(a => {
      if (a.timeTakenMinutes && a.totalCorrect + a.totalIncorrect > 0) {
        totalSeconds += a.timeTakenMinutes * 60;
        totalAttemptedQ += a.totalCorrect + a.totalIncorrect;
      }
    });
    const avgSecPerQ = totalAttemptedQ > 0 ? Math.round(totalSeconds / totalAttemptedQ) : 0;

    return { total, avgPct, best, avgAcc, targetRate, totalNegLost, avgSecPerQ };
  }, [filtered]);

  // 1. Accuracy & Score Trends over time for JEE Main vs. JEE Advanced
  const mainVsAdvTrend = useMemo(() => {
    return filtered.map((a, i) => ({
      index: i,
      label: `${format(parseISO(a.date), 'MMM d')}`,
      jeeMainAcc: a.pattern === 'single' ? Number(a.accuracy.toFixed(1)) : null,
      jeeAdvAcc: a.pattern === 'dual' ? Number(a.accuracy.toFixed(1)) : null,
      jeeMainPct: a.pattern === 'single' ? Number(a.percentage.toFixed(1)) : null,
      jeeAdvPct: a.pattern === 'dual' ? Number(a.percentage.toFixed(1)) : null,
    }));
  }, [filtered]);

  // 2. Subject-wise Time Spent vs. Ideal Time (Normalized per 3-hour paper: 50m Physics, 40m Chemistry, 90m Maths)
  const subjectTimeComparison = useMemo(() => {
    const timed = filtered.filter(
      a => (a.timePhysics ?? 0) > 0 || (a.timeChemistry ?? 0) > 0 || (a.timeMaths ?? 0) > 0
    );
    if (!timed.length) return null;

    // Normalize per 3-hour paper (1 paper for Main, 2 papers for Advanced)
    let phyPaperSum = 0;
    let chemPaperSum = 0;
    let mathPaperSum = 0;
    let paperCount = 0;

    let phyQ = 0;
    let chemQ = 0;
    let mathQ = 0;
    let phyTotalMin = 0;
    let chemTotalMin = 0;
    let mathTotalMin = 0;

    timed.forEach(a => {
      const pFactor = a.pattern === 'dual' ? 2 : 1;
      paperCount += pFactor;
      phyPaperSum += a.timePhysics ?? 0;
      chemPaperSum += a.timeChemistry ?? 0;
      mathPaperSum += a.timeMaths ?? 0;

      phyTotalMin += a.timePhysics ?? 0;
      chemTotalMin += a.timeChemistry ?? 0;
      mathTotalMin += a.timeMaths ?? 0;

      a.papers.forEach(p => {
        p.subjects.forEach(s => {
          const att = s.correct + s.incorrect;
          const lower = s.subjectName.toLowerCase();
          if (lower.includes('phys')) phyQ += att;
          else if (lower.includes('chem')) chemQ += att;
          else if (lower.includes('math')) mathQ += att;
        });
      });
    });

    const bars = [
      {
        subject: 'Physics',
        actualMin: Number((phyPaperSum / paperCount).toFixed(1)),
        targetMin: 50,
        secPerQ: phyQ > 0 ? Math.round((phyTotalMin * 60) / phyQ) : 0,
      },
      {
        subject: 'Chemistry',
        actualMin: Number((chemPaperSum / paperCount).toFixed(1)),
        targetMin: 40,
        secPerQ: chemQ > 0 ? Math.round((chemTotalMin * 60) / chemQ) : 0,
      },
      {
        subject: 'Mathematics',
        actualMin: Number((mathPaperSum / paperCount).toFixed(1)),
        targetMin: 90,
        secPerQ: mathQ > 0 ? Math.round((mathTotalMin * 60) / mathQ) : 0,
      },
    ];

    return { bars };
  }, [filtered]);

  // 3. Topic & Subject Negative-Mark Cost Heatmap
  const negativeMarkTopics = useMemo(() => {
    const topicMap: Record<
      string,
      { chapter: string; subject: string; marksLost: number; count: number; avgTimeSec: number }
    > = {};

    mistakes.forEach(m => {
      const ch = m.chapter?.trim() || 'General Concept';
      const lost = m.marksLost ?? (m.priority === 'High' ? 5 : m.priority === 'Medium' ? 4 : 1);
      if (!topicMap[ch]) {
        topicMap[ch] = { chapter: ch, subject: m.subject, marksLost: 0, count: 0, avgTimeSec: 0 };
      }
      topicMap[ch].marksLost += lost;
      topicMap[ch].count += 1;
      if (m.questionTimeSeconds) {
        topicMap[ch].avgTimeSec = Math.round(
          (topicMap[ch].avgTimeSec * (topicMap[ch].count - 1) + m.questionTimeSeconds) /
            topicMap[ch].count
        );
      }
    });

    const list = Object.values(topicMap).sort((a, b) => b.marksLost - a.marksLost).slice(0, 9);
    const maxLost = Math.max(1, ...list.map(x => x.marksLost));
    return { list, maxLost };
  }, [mistakes]);

  const trendData = useMemo(
    () =>
      filtered.map((a, i) => ({
        index: i,
        label: format(parseISO(a.date), 'MMM d'),
        total: a.totalScore,
        percentage: a.percentage,
        accuracy: a.accuracy,
        negative: a.marksLostToNegative,
        attemptRate:
          a.totalQuestions > 0
            ? ((a.totalCorrect + a.totalIncorrect) / a.totalQuestions) * 100
            : 0,
        marksPerMinute: a.timeTakenMinutes ? a.totalScore / a.timeTakenMinutes : null,
      })),
    [filtered]
  );

  const hasTimingData = useMemo(() => filtered.some(a => !!a.timeTakenMinutes), [filtered]);

  const subjectTrend = useMemo(() => {
    const subjectNames = new Set<string>();
    filtered.forEach(a =>
      a.papers.forEach(p => p.subjects.forEach(s => subjectNames.add(s.subjectName)))
    );
    const colors = ['#0D9488', '#38BDF8', '#F59E0B', '#10B981', '#F43F5E', '#9CA3AF'];
    const subjectList = Array.from(subjectNames);
    return {
      data: filtered.map((a, i) => {
        const row: TrendDatum = { index: i, label: format(parseISO(a.date), 'MMM d') };
        subjectList.forEach(sn => {
          const matching = a.papers.flatMap(p => p.subjects).filter(s => s.subjectName === sn);
          if (matching.length > 0) {
            const avgSubjAcc =
              matching.reduce((sum, item) => sum + item.accuracy, 0) / matching.length;
            row[sn] = Number(avgSubjAcc.toFixed(1));
          } else {
            row[sn] = null;
          }
        });
        return row;
      }),
      lines: subjectList.map((sn, i) => ({
        key: sn,
        name: sn,
        color: colors[i % colors.length],
      })),
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
        { key: 'paper1', name: 'Paper 1 Score', color: '#38BDF8' },
        { key: 'paper2', name: 'Paper 2 Score', color: '#F59E0B' },
        { key: 'combined', name: 'Unified Event Total', color: '#10B981' },
      ],
    };
  }, [filtered]);

  const insights = useMemo(() => {
    if (filtered.length < 2) return null;
    const subjectNames = new Set<string>();
    filtered.forEach(a =>
      a.papers.forEach(p => p.subjects.forEach(s => subjectNames.add(s.subjectName)))
    );
    const subjectStats: Record<string, { scores: number[]; accuracies: number[] }> = {};
    subjectNames.forEach(sn => {
      subjectStats[sn] = { scores: [], accuracies: [] };
    });
    filtered.forEach(a =>
      a.papers.forEach(p =>
        p.subjects.forEach(s => {
          if (subjectStats[s.subjectName]) {
            subjectStats[s.subjectName].scores.push(s.score);
            subjectStats[s.subjectName].accuracies.push(s.accuracy);
          }
        })
      )
    );
    const entries = Object.entries(subjectStats).filter(([, v]) => v.scores.length > 0);
    if (!entries.length) return null;
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = (arr: number[]) => {
      const m = avg(arr);
      return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
    };
    const slope = (arr: number[]) => {
      const n = arr.length;
      if (n < 2) return 0;
      const xs = arr.map((_, i) => i);
      const mx = avg(xs),
        my = avg(arr);
      return (
        xs.reduce((s, x, i) => s + (x - mx) * (arr[i] - my), 0) /
        xs.reduce((s, x) => s + (x - mx) ** 2, 0)
      );
    };
    const ranked = entries.map(([name, v]) => ({
      name,
      avgScore: avg(v.accuracies),
      avgAccuracy: avg(v.accuracies),
      variance: variance(v.accuracies),
      slope: slope(v.accuracies),
      attempts: v.accuracies.length,
    }));
    return {
      strongest: [...ranked].sort((a, b) => b.avgScore - a.avgScore)[0],
      weakest: [...ranked].sort((a, b) => a.avgScore - b.avgScore)[0],
      mostImproved:
        [...ranked].filter(r => r.attempts >= 2).sort((a, b) => b.slope - a.slope)[0] ?? null,
      mostConsistent:
        [...ranked].filter(r => r.attempts >= 2).sort((a, b) => a.variance - b.variance)[0] ?? null,
    };
  }, [filtered]);

  const narrative = useMemo(() => {
    if (filtered.length < 2 || !insights) return null;
    const pctArr = filtered.map(a => a.percentage);
    const n = pctArr.length;
    const xs = pctArr.map((_, i) => i);
    const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const mx = avg(xs),
      my = avg(pctArr);
    const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    const overallSlope =
      den === 0 ? 0 : xs.reduce((s, x, i) => s + (x - mx) * (pctArr[i] - my), 0) / den;

    const direction: 'up' | 'down' | 'flat' =
      overallSlope > 0.4 ? 'up' : overallSlope < -0.4 ? 'down' : 'flat';
    const gap = insights.strongest.avgScore - insights.weakest.avgScore;

    const totalNegLost = filtered.reduce((s, a) => s + a.marksLostToNegative, 0);
    const totalMax = filtered.reduce((s, a) => s + a.maxScore, 0);
    const negPctOfMax = totalMax > 0 ? (totalNegLost / totalMax) * 100 : 0;

    const last = filtered[n - 1];
    const prev = filtered[n - 2];
    const lastDelta = last.percentage - prev.percentage;

    return { direction, slope: overallSlope, gap, totalNegLost, negPctOfMax, lastDelta, last, n };
  }, [filtered, insights]);

  const chartModes: { id: ChartMode; label: string }[] = [
    { id: 'mainVsAdv', label: 'JEE Main vs Advanced' },
    { id: 'total', label: 'Score & %' },
    { id: 'subject', label: 'Subject Accuracy' },
    { id: 'paper', label: 'Adv Paper 1 vs 2' },
    { id: 'negative', label: 'Negative Marks' },
    { id: 'attemptRate', label: 'Attempt Rate' },
    { id: 'efficiency', label: 'Marks / Min' },
  ];

  const selectedAttempt = useMemo(() => {
    if (selectedAttemptIdx === null) return null;
    if (chartMode === 'paper' && paperTrend) {
      const dual = filtered.filter(a => a.pattern === 'dual');
      return dual[selectedAttemptIdx] ?? null;
    }
    if (chartMode === 'efficiency') {
      const timed = filtered.filter(a => !!a.timeTakenMinutes);
      return timed[selectedAttemptIdx] ?? null;
    }
    return filtered[selectedAttemptIdx] ?? null;
  }, [selectedAttemptIdx, chartMode, paperTrend, filtered]);

  if (attempts.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3" style={{ padding: '64px 24px' }}>
        <BarChart3 size={28} style={{ color: 'var(--text-tertiary)' }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>No test analytics yet</p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Log at least one JEE Main or JEE Advanced test to unlock telemetry
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="card flex items-center gap-2 flex-wrap" style={{ padding: '12px 16px' }}>
        <select
          value={filterTemplate}
          onChange={e => setFilterTemplate(e.target.value)}
          className="field"
          style={{ width: 'auto', padding: '6px 11px', fontSize: 12 }}
        >
          <option value="all">All Exam Templates</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={filterPattern}
          onChange={e => setFilterPattern(e.target.value)}
          className="field"
          style={{ width: 'auto', padding: '6px 11px', fontSize: 12 }}
        >
          <option value="all">All Modes (Main + Advanced)</option>
          <option value="single">JEE Main (Single 3-Hr)</option>
          <option value="dual">JEE Advanced (Dual 2×3-Hr)</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="field tabular-num"
          style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
        />
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>→</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="field tabular-num"
          style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
        />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            label: 'Test Events',
            value: stats.total,
            sub: `${filtered.filter(a => a.pattern === 'single').length} Main · ${filtered.filter(a => a.pattern === 'dual').length} Adv`,
            color: 'var(--accent)',
            icon: ClipboardList,
          },
          {
            label: 'Avg Score %',
            value: `${stats.avgPct.toFixed(1)}%`,
            sub: `Peak: ${stats.best.toFixed(1)}%`,
            color: 'var(--info)',
            icon: TrendingUp,
          },
          {
            label: 'Avg Accuracy',
            value: `${stats.avgAcc.toFixed(1)}%`,
            sub: 'Correct / Attempted',
            color: 'var(--success)',
            icon: Award,
          },
          {
            label: 'Neg Marks Lost',
            value: `-${stats.totalNegLost.toFixed(1)}`,
            sub: `${(stats.totalNegLost / Math.max(1, stats.total)).toFixed(1)} pts / test`,
            color: 'var(--danger)',
            icon: AlertTriangle,
          },
          {
            label: 'Avg Pace / Q',
            value: stats.avgSecPerQ > 0 ? `${stats.avgSecPerQ}s` : '—',
            sub: 'Per attempted question',
            color: 'var(--warning)',
            icon: Clock,
          },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card" style={{ padding: 18 }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {k.label}
                </span>
                <Icon size={15} style={{ color: k.color }} />
              </div>
              <div className="stat-number" style={{ fontSize: 24 }}>
                {k.value}
              </div>
              <div className="tabular-num" style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                {k.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Interactive Chart Suite */}
      <div className="card" style={{ padding: 22 }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <p className="card-title">Interactive Performance & Accuracy Telemetry</p>
            <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Click any data point to inspect full paper-wise and subject-wise telemetry
            </p>
          </div>
          <div
            className="flex gap-1 flex-wrap"
            style={{
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-button)',
              padding: 3,
              border: '1px solid var(--border-subtle)',
            }}
          >
            {chartModes.map(m => {
              const disabled =
                (m.id === 'paper' && !paperTrend) || (m.id === 'efficiency' && !hasTimingData);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setChartMode(m.id)}
                  disabled={disabled}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-badge)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: disabled ? 'default' : 'pointer',
                    border: 'none',
                    background: chartMode === m.id ? 'var(--accent)' : 'transparent',
                    color: chartMode === m.id ? '#fff' : 'var(--text-tertiary)',
                    opacity: disabled ? 0.35 : 1,
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length > 0 ? (
          <>
            {chartMode === 'mainVsAdv' && (
              <>
                <TrendChart
                  data={mainVsAdvTrend}
                  lines={[
                    { key: 'jeeMainAcc', name: 'JEE Main Accuracy %', color: '#38BDF8' },
                    { key: 'jeeAdvAcc', name: 'JEE Advanced Accuracy %', color: '#F59E0B' },
                    { key: 'jeeMainPct', name: 'JEE Main Score %', color: '#10B981', strokeDasharray: '4 4' },
                    { key: 'jeeAdvPct', name: 'JEE Advanced Score %', color: '#F43F5E', strokeDasharray: '4 4' },
                  ]}
                  height={250}
                  yAxisLabel="Percentage %"
                  attempts={filtered}
                  percentageKeys={['jeeMainAcc', 'jeeAdvAcc', 'jeeMainPct', 'jeeAdvPct']}
                  highlightMax={false}
                  highlightLast={false}
                  onClickPoint={i => setSelectedAttemptIdx(i)}
                />
                <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 8 }}>
                  Solid lines compare accuracy % between JEE Main (Single 3-Hr) and JEE Advanced (Dual 2×3-Hr) events; dashed lines track overall score percentage.
                </p>
              </>
            )}
            {chartMode === 'total' && (
              <TrendChart
                data={trendData}
                lines={[
                  { key: 'total', name: 'Total Score', color: '#0D9488' },
                  { key: 'percentage', name: 'Score %', color: '#10B981' },
                ]}
                height={240}
                yAxisLabel="Score"
                attempts={filtered}
                percentageKeys={['percentage']}
                highlightMax
                highlightLast
                onClickPoint={i => setSelectedAttemptIdx(i)}
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
                onClickPoint={i => setSelectedAttemptIdx(i)}
              />
            )}
            {chartMode === 'paper' && paperTrend && (
              <TrendChart
                data={paperTrend.data}
                lines={paperTrend.lines}
                height={240}
                yAxisLabel="Score"
                attempts={filtered.filter(a => a.pattern === 'dual')}
                highlightMax
                highlightLast
                onClickPoint={i => setSelectedAttemptIdx(i)}
              />
            )}
            {chartMode === 'negative' && (
              <TrendChart
                data={trendData}
                lines={[{ key: 'negative', name: 'Negative Marks Lost', color: '#F43F5E' }]}
                height={240}
                yAxisLabel="Marks Lost"
                attempts={filtered}
                highlightMax
                highlightLast
                onClickPoint={i => setSelectedAttemptIdx(i)}
              />
            )}
            {chartMode === 'attemptRate' && (
              <TrendChart
                data={trendData}
                lines={[
                  { key: 'attemptRate', name: 'Attempt Rate %', color: '#F59E0B' },
                  { key: 'accuracy', name: 'Accuracy %', color: '#38BDF8' },
                ]}
                height={240}
                yAxisLabel="%"
                attempts={filtered}
                percentageKeys={['attemptRate', 'accuracy']}
                highlightMax
                highlightLast
                onClickPoint={i => setSelectedAttemptIdx(i)}
              />
            )}
            {chartMode === 'efficiency' && hasTimingData && (
              <TrendChart
                data={trendData.filter(d => d.marksPerMinute !== null)}
                lines={[{ key: 'marksPerMinute', name: 'Marks / Minute', color: '#38BDF8' }]}
                height={240}
                yAxisLabel="Marks / Min"
                attempts={filtered.filter(a => !!a.timeTakenMinutes)}
                highlightMax
                highlightLast
                onClickPoint={i => setSelectedAttemptIdx(i)}
              />
            )}
          </>
        ) : (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No data for selected filters</p>
          </div>
        )}
      </div>

      {/* Subject-wise Time Spent vs. Target Time + Negative Marking Topic Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Single Unified Subject-wise Time Spent vs Ideal Time Graph */}
        <div className="card" style={{ padding: 22 }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <p className="card-title">Subject Time Spent vs. Ideal Time</p>
              <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Normalized per 3-hour paper (Ideal: 50m Physics · 40m Chemistry · 90m Maths)
              </p>
            </div>
          </div>

          {subjectTimeComparison ? (
            <>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subjectTimeComparison.bars}
                    margin={{ left: -12, right: 12, top: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} stroke="transparent" />
                    <YAxis
                      domain={[0, 105]}
                      tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                      stroke="transparent"
                      width={36}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload;
                        return (
                          <div className="card-glass" style={{ padding: '10px 12px' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                              {label}
                            </p>
                            <p className="tabular-num" style={{ fontSize: 11.5, color: '#0D9488', fontWeight: 700 }}>
                              Actual Avg: {row.actualMin} min / paper
                            </p>
                            <p className="tabular-num" style={{ fontSize: 11.5, color: '#F59E0B', fontWeight: 600 }}>
                              Ideal Time: {row.targetMin} min / paper
                            </p>
                            {row.secPerQ > 0 && (
                              <p className="tabular-num" style={{ fontSize: 11, color: '#38BDF8', marginTop: 2 }}>
                                Avg Question Speed: {row.secPerQ}s / Q
                              </p>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="actualMin" name="Actual Time (min)" fill="#0D9488" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="targetMin" name="Ideal Time (50m / 40m / 90m)" fill="#F59E0B" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {subjectTimeComparison.bars.map(b => {
                  const diff = Number((b.actualMin - b.targetMin).toFixed(1));
                  return (
                    <div
                      key={b.subject}
                      style={{
                        padding: '8px 10px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-button)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {b.subject}
                      </p>
                      <p
                        className="tabular-num"
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: diff > 5 ? 'var(--warning)' : 'var(--text-primary)',
                        }}
                      >
                        {b.actualMin}m{' '}
                        <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--text-tertiary)' }}>
                          ({diff >= 0 ? `+${diff}m` : `${diff}m`} vs {b.targetMin}m)
                        </span>
                      </p>
                      <p className="tabular-num" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        {b.secPerQ > 0 ? `${b.secPerQ}s / Q · Ideal ${b.targetMin}m` : `Ideal ${b.targetMin}m`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                Log subject timings in a test attempt to compare against ideal times (50m / 40m / 90m)
              </p>
            </div>
          )}
        </div>

        {/* Mistake Heatmap: Topics Costing the Most Negative Marks */}
        <div className="card" style={{ padding: 22 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="card-title flex items-center gap-2">
                <Flame size={15} style={{ color: 'var(--danger)' }} />
                Mistake Heatmap — Negative Marks Cost by Topic
              </p>
              <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Chapters ranked by cumulative negative marks & penalty impact
              </p>
            </div>
          </div>

          {negativeMarkTopics.list.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {negativeMarkTopics.list.map(item => {
                const intensity = item.marksLost / negativeMarkTopics.maxLost;
                const bg =
                  intensity >= 0.66
                    ? 'rgba(244, 63, 94, 0.16)'
                    : intensity >= 0.35
                    ? 'rgba(245, 158, 11, 0.14)'
                    : 'rgba(13, 148, 136, 0.12)';
                const border =
                  intensity >= 0.66
                    ? 'rgba(244, 63, 94, 0.35)'
                    : intensity >= 0.35
                    ? 'rgba(245, 158, 11, 0.3)'
                    : 'rgba(13, 148, 136, 0.25)';
                const accentColor =
                  intensity >= 0.66
                    ? 'var(--danger)'
                    : intensity >= 0.35
                    ? 'var(--warning)'
                    : 'var(--accent)';

                return (
                  <div
                    key={item.chapter}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-button)',
                      background: bg,
                      border: `1px solid ${border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          lineHeight: 1.3,
                        }}
                        className="line-clamp-2"
                      >
                        {item.chapter}
                      </p>
                      <p style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {item.subject}
                      </p>
                    </div>
                    <div className="flex items-end justify-between mt-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="tabular-num" style={{ fontSize: 16, fontWeight: 800, color: accentColor }}>
                        -{item.marksLost.toFixed(1)}m
                      </span>
                      <span className="tabular-num" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                        {item.count} err{item.avgTimeSec > 0 ? ` · ${item.avgTimeSec}s` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                Log mistakes to populate the negative-mark topic heatmap
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Coach's Synthesis & Subject Ranking */}
      {narrative && insights && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card lg:col-span-2" style={{ padding: 22 }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} style={{ color: 'var(--accent)' }} />
              <p className="card-title">Analytical Diagnostics & Pacing Synthesis</p>
            </div>
            <div className="space-y-2.5 text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              <p>
                Across your last <strong className="tabular-num">{narrative.n}</strong> test events, your trajectory is{' '}
                <strong
                  style={{
                    color:
                      narrative.direction === 'up'
                        ? 'var(--success)'
                        : narrative.direction === 'down'
                        ? 'var(--danger)'
                        : 'var(--text-primary)',
                  }}
                >
                  {narrative.direction === 'up'
                    ? 'climbing steadily'
                    : narrative.direction === 'down'
                    ? 'experiencing a dip'
                    : 'stabilizing'}
                </strong>
                . Your latest attempt (<strong>{narrative.last.attemptName}</strong>) shifted by{' '}
                <strong
                  className="tabular-num"
                  style={{ color: narrative.lastDelta >= 0 ? 'var(--success)' : 'var(--danger)' }}
                >
                  {narrative.lastDelta >= 0 ? `+${narrative.lastDelta.toFixed(1)}%` : `${narrative.lastDelta.toFixed(1)}%`}
                </strong>{' '}
                compared to the preceding test.
              </p>
              <p>
                <strong style={{ color: 'var(--success)' }}>{insights.strongest.name}</strong> leads in accuracy at{' '}
                <span className="tabular-num">{insights.strongest.avgAccuracy.toFixed(1)}%</span>, whereas{' '}
                <strong style={{ color: 'var(--danger)' }}>{insights.weakest.name}</strong> sits at{' '}
                <span className="tabular-num">{insights.weakest.avgAccuracy.toFixed(1)}%</span> (a{' '}
                <span className="tabular-num">{narrative.gap.toFixed(1)}</span>-point accuracy delta).
              </p>
              <p>
                Cumulative negative marking has cost{' '}
                <strong className="tabular-num" style={{ color: 'var(--danger)' }}>
                  -{narrative.totalNegLost.toFixed(1)} marks
                </strong>{' '}
                (<span className="tabular-num">{narrative.negPctOfMax.toFixed(1)}%</span> of total maximum marks). Eliminating low-probability 50/50 guesses in{' '}
                <strong>{insights.weakest.name}</strong> offers the fastest immediate rank jump.
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={15} style={{ color: 'var(--warning)' }} />
              <p className="card-title">Subject Telemetry</p>
            </div>
            <div className="space-y-2.5">
              {[
                {
                  label: 'Highest Accuracy',
                  value: insights.strongest.name,
                  sub: `${insights.strongest.avgAccuracy.toFixed(1)}% avg`,
                  color: 'var(--success)',
                  icon: Award,
                },
                {
                  label: 'Primary Bottleneck',
                  value: insights.weakest.name,
                  sub: `${insights.weakest.avgAccuracy.toFixed(1)}% avg`,
                  color: 'var(--danger)',
                  icon: AlertTriangle,
                },
                ...(insights.mostImproved
                  ? [
                      {
                        label: 'Fastest Growth',
                        value: insights.mostImproved.name,
                        sub: `${insights.mostImproved.slope >= 0 ? '+' : ''}${insights.mostImproved.slope.toFixed(1)} pts/test`,
                        color: 'var(--accent)',
                        icon: TrendingUp,
                      },
                    ]
                  : []),
                ...(insights.mostConsistent
                  ? [
                      {
                        label: 'Most Consistent',
                        value: insights.mostConsistent.name,
                        sub: `±${Math.sqrt(insights.mostConsistent.variance).toFixed(1)}% var`,
                        color: 'var(--info)',
                        icon: Calculator,
                      },
                    ]
                  : []),
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                    style={{
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-button)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={14} style={{ color: item.color, flexShrink: 0 }} />
                      <div className="min-w-0">
                        <p style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{item.label}</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.value}
                        </p>
                      </div>
                    </div>
                    <span className="tabular-num" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {item.sub}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AttemptDetailPopover
        attempt={selectedAttempt}
        onClose={() => setSelectedAttemptIdx(null)}
      />
    </div>
  );
}
