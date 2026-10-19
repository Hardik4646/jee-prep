import { useState, useMemo, memo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
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
  Sliders,
  Check,
  Edit3,
  Layers,
} from 'lucide-react';
import {
  ExamTemplate,
  TestAttempt,
  SubjectScore,
  Mistake,
  TestSourceType,
} from '../../types';
import {
  subjectMaxScore,
  getSubjectIdealMinutes,
  normalizeCanonicalSubject,
  TEST_TYPES,
} from './helpers';
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

interface ReferenceCeiling {
  y: number;
  label: string;
  color: string;
}

interface TrendChartProps {
  data: TrendDatum[];
  lines: TrendLine[];
  height?: number;
  yAxisLabel?: string;
  yDomain?: [number | 'auto', number | 'auto'];
  attempts?: TestAttempt[];
  percentageKeys?: string[];
  referenceCeilings?: ReferenceCeiling[];
  chartStyle?: 'line' | 'area' | 'bar';
  highlightMax?: boolean;
  highlightLast?: boolean;
  onClickPoint?: (index: number) => void;
}

const SUBJECT_PALETTE: Record<string, string> = {
  Physics: '#38BDF8',
  Chemistry: '#F59E0B',
  Mathematics: '#10B981',
};

function getSubjectColor(name: string, index = 0): string {
  const canonical = normalizeCanonicalSubject(name);
  if (canonical === 'physics') return '#38BDF8';
  if (canonical === 'chemistry') return '#F59E0B';
  if (canonical === 'maths') return '#10B981';
  const fallback = ['#38BDF8', '#F59E0B', '#10B981', '#F43F5E', '#A855F7', '#0D9488'];
  return SUBJECT_PALETTE[name] ?? fallback[index % fallback.length];
}

/**
 * Computes the per-subject max score from an ExamTemplate across the selected paper scope.
 */
function getTemplateSubjectMaxScore(
  template: ExamTemplate | undefined,
  subjectName: string,
  paperScope: 'combined' | 'paper1' | 'paper2' = 'combined'
): number {
  if (!template) return 100;
  const canonical = normalizeCanonicalSubject(subjectName);
  const papersToSum =
    paperScope === 'paper1'
      ? [template.papers[0]].filter(Boolean)
      : paperScope === 'paper2'
      ? [template.papers[1] ?? template.papers[0]].filter(Boolean)
      : template.papers;

  let sum = 0;
  let matched = false;
  for (const paper of papersToSum) {
    for (const s of paper) {
      const sCanon = normalizeCanonicalSubject(s.name);
      if (s.name === subjectName || (canonical && sCanon === canonical)) {
        sum += subjectMaxScore(s, template);
        matched = true;
      }
    }
  }
  if (matched && sum > 0) return Number(sum.toFixed(1));
  return Number((template.totalMaxMarks / 3).toFixed(1));
}

const TrendChart = memo(
  ({
    data,
    lines,
    height,
    yAxisLabel,
    yDomain,
    attempts,
    percentageKeys = [],
    referenceCeilings = [],
    chartStyle = 'line',
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

      const rowPayload = payload[0]?.payload;
      const idx =
        rowPayload?.index ?? data.findIndex(d => d.label === label);
      const attempt = attempts && idx >= 0 ? attempts[idx] : undefined;

      return (
        <div className="card-glass" style={{ padding: '11px 14px', minWidth: 195 }}>
          <p
            className="font-mono"
            style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginBottom: 3 }}
          >
            {label}
          </p>
          {attempt && (
            <>
              <p
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 1,
                }}
              >
                {attempt.attemptName}
              </p>
              <p
                style={{
                  fontSize: 10.5,
                  color: 'var(--text-tertiary)',
                  marginBottom: 6,
                }}
              >
                {attempt.templateName} ·{' '}
                {attempt.pattern === 'dual'
                  ? 'JEE Advanced (P1+P2)'
                  : 'JEE Main (Single)'}
              </p>
            </>
          )}
          <div className="space-y-1">
            {payload.map((p, i: number) => {
              const v = p.value;
              const numVal = typeof v === 'number' ? v : Number(v);
              const dKey = String(p.dataKey);
              const maxMeta = rowPayload?.[`${dKey}__max`];
              const qMeta = rowPayload?.[`${dKey}__qSplit`];
              return (
                <div key={i}>
                  <p
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
                    {p.name}:{' '}
                    {!Number.isNaN(numVal)
                      ? formatValue(dKey, numVal)
                      : String(v ?? '')}
                    {typeof maxMeta === 'number' && maxMeta > 0 && (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 500,
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        / {maxMeta} max
                      </span>
                    )}
                  </p>
                  {typeof qMeta === 'string' && qMeta && (
                    <p
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                        paddingLeft: 14,
                      }}
                    >
                      {qMeta}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    const handleChartClick = (e: { activeTooltipIndex?: number | null } | null) => {
      if (
        onClickPoint &&
        e &&
        typeof e.activeTooltipIndex === 'number' &&
        e.activeTooltipIndex !== null
      ) {
        onClickPoint(e.activeTooltipIndex);
      }
    };

    return (
      <div style={{ height: height ?? 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartStyle === 'bar' ? (
            <BarChart
              data={data}
              margin={{ left: -8, right: 16, top: 14, bottom: 0 }}
              onClick={handleChartClick}
            >
              <CartesianGrid
                strokeDasharray="0"
                stroke="var(--border-subtle)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10.5, fill: 'var(--text-tertiary)' }}
                stroke="transparent"
              />
              <YAxis
                domain={yDomain ?? ['auto', 'auto']}
                tick={{ fontSize: 10.5, fill: 'var(--text-tertiary)' }}
                stroke="transparent"
                width={40}
              />
              <Tooltip content={renderTooltip} />
              <Legend wrapperStyle={{ fontSize: 11.5, paddingTop: 6 }} />
              {referenceCeilings.map((rc, idx) => (
                <ReferenceLine
                  key={idx}
                  y={rc.y}
                  stroke={rc.color}
                  strokeDasharray="4 4"
                  label={{
                    value: rc.label,
                    position: 'insideTopRight',
                    fill: rc.color,
                    fontSize: 10,
                  }}
                />
              ))}
              {lines.map(l => (
                <Bar
                  key={l.key}
                  dataKey={l.key}
                  name={l.name}
                  fill={l.color}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          ) : chartStyle === 'area' ? (
            <AreaChart
              data={data}
              margin={{ left: -8, right: 16, top: 14, bottom: 0 }}
              onClick={handleChartClick}
            >
              <defs>
                {lines.map(l => (
                  <linearGradient
                    key={l.key}
                    id={`grad-${l.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={l.color} stopOpacity={0.26} />
                    <stop offset="100%" stopColor={l.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="0"
                stroke="var(--border-subtle)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10.5, fill: 'var(--text-tertiary)' }}
                stroke="transparent"
              />
              <YAxis
                domain={yDomain ?? ['auto', 'auto']}
                tick={{ fontSize: 10.5, fill: 'var(--text-tertiary)' }}
                stroke="transparent"
                width={40}
              />
              <Tooltip content={renderTooltip} />
              <Legend wrapperStyle={{ fontSize: 11.5, paddingTop: 6 }} />
              {referenceCeilings.map((rc, idx) => (
                <ReferenceLine
                  key={idx}
                  y={rc.y}
                  stroke={rc.color}
                  strokeDasharray="4 4"
                  label={{
                    value: rc.label,
                    position: 'insideTopRight',
                    fill: rc.color,
                    fontSize: 10,
                  }}
                />
              ))}
              {lines.map(l => (
                <Area
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  name={l.name}
                  stroke={l.color}
                  strokeWidth={2.5}
                  fill={`url(#grad-${l.key})`}
                  connectNulls
                  dot={{ r: 3.5, fill: l.color, strokeWidth: 0 }}
                  activeDot={{
                    r: 5,
                    style: { cursor: onClickPoint ? 'pointer' : 'default' },
                  }}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart
              data={data}
              margin={{ left: -8, right: 16, top: 14, bottom: 0 }}
              onClick={handleChartClick}
            >
              <CartesianGrid
                strokeDasharray="0"
                stroke="var(--border-subtle)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10.5, fill: 'var(--text-tertiary)' }}
                stroke="transparent"
              />
              <YAxis
                domain={yDomain ?? ['auto', 'auto']}
                tick={{ fontSize: 10.5, fill: 'var(--text-tertiary)' }}
                stroke="transparent"
                width={40}
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
              <Legend wrapperStyle={{ fontSize: 11.5, paddingTop: 6 }} />

              {referenceCeilings.map((rc, idx) => (
                <ReferenceLine
                  key={idx}
                  y={rc.y}
                  stroke={rc.color}
                  strokeDasharray="4 4"
                  label={{
                    value: rc.label,
                    position: 'insideTopRight',
                    fill: rc.color,
                    fontSize: 10,
                  }}
                />
              ))}

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
                  activeDot={{
                    r: 5,
                    style: { cursor: onClickPoint ? 'pointer' : 'default' },
                  }}
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
          )}
        </ResponsiveContainer>
      </div>
    );
  }
);
TrendChart.displayName = 'TrendChart';

/* ---------- Attempt Detail Modal ---------- */

function AttemptDetailPopover({
  attempt,
  template,
  onClose,
}: {
  attempt: TestAttempt | null;
  template?: ExamTemplate;
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
          maxWidth: 620,
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
              label: 'Score vs Template Max',
              value: `${attempt.totalScore.toFixed(1)}/${template?.totalMaxMarks ?? attempt.maxScore}`,
              color: 'var(--accent)',
            },
            {
              label: 'Accuracy',
              value: `${attempt.accuracy.toFixed(1)}%`,
              color: 'var(--info)',
            },
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
              <p
                className="tabular-num"
                style={{ fontSize: 16, fontWeight: 700, color: s.color }}
              >
                {s.value}
              </p>
              <p
                style={{
                  fontSize: 10.5,
                  color: 'var(--text-tertiary)',
                  marginTop: 2,
                }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {attempt.papers.map((paper, pi) => (
          <div key={pi} style={{ marginBottom: 14 }}>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                {attempt.papers.length > 1 ? `Paper ${pi + 1}` : 'Paper Breakdown'} ·
                Score {paper.totalScore.toFixed(1)} / {paper.maxScore.toFixed(0)} · Acc{' '}
                {paper.accuracy.toFixed(1)}%
              </p>
              {paper.timeTakenMinutes && (
                <span
                  className="text-xs font-mono"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {paper.timeTakenMinutes} / 180m
                </span>
              )}
            </div>
            <div className="space-y-2">
              {paper.subjects.map((s: SubjectScore, si: number) => {
                const idealMin = getSubjectIdealMinutes(s.subjectName);
                return (
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
                      <p
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {s.subjectName}
                      </p>
                      <span
                        className="tabular-num"
                        style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}
                      >
                        {s.score.toFixed(1)} / {s.maxScore.toFixed(0)}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-3 flex-wrap font-mono"
                      style={{
                        marginTop: 4,
                        fontSize: 10.5,
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      <span style={{ color: 'var(--success)' }}>✓ {s.correct}</span>
                      <span style={{ color: 'var(--danger)' }}>✗ {s.incorrect}</span>
                      <span>— {s.unattempted}</span>
                      <span style={{ color: 'var(--info)' }}>
                        Acc {s.accuracy.toFixed(1)}%
                      </span>
                      {s.timeSpentMinutes && (
                        <span>
                          Time: {s.timeSpentMinutes}m / {idealMin}m ideal
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Main TestAnalytics Component ---------- */

type AnalyticsSectionView = 'all' | 'subjectTrends' | 'overallTrajectory' | 'pacingHeatmap';

type OverallChartMode =
  | 'mainVsAdv'
  | 'total'
  | 'paper'
  | 'negative'
  | 'attemptRate'
  | 'efficiency';

type SubjectAspect =
  | 'score'
  | 'scorePct'
  | 'accuracy'
  | 'negative'
  | 'timeSpent'
  | 'attemptRate'
  | 'efficiency';

export function TestAnalytics({
  attempts,
  templates,
  mistakes = [],
  onUpdateTemplate,
  onEditTemplateInBuilder,
}: {
  attempts: TestAttempt[];
  templates: ExamTemplate[];
  mistakes?: Mistake[];
  onUpdateTemplate?: (updated: ExamTemplate) => void;
  onEditTemplateInBuilder?: (template: ExamTemplate) => void;
}) {
  // Global Filter State
  const [sectionView, setSectionView] = useState<AnalyticsSectionView>('all');
  const [filterTemplate, setFilterTemplate] = useState('all');
  const [filterPattern, setFilterPattern] = useState('all');
  const [filterTestType, setFilterTestType] = useState<'all' | TestSourceType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState<number | null>(null);

  // Overall Trajectory Chart Mode
  const [chartMode, setChartMode] = useState<OverallChartMode>('mainVsAdv');

  // Dedicated Subject-Wise Trends State
  const [subjectChartTemplateId, setSubjectChartTemplateId] = useState<string>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [subjectAspect, setSubjectAspect] = useState<SubjectAspect>('score');
  const [subjectPaperScope, setSubjectPaperScope] = useState<
    'combined' | 'paper1' | 'paper2'
  >('combined');
  const [subjectChartStyle, setSubjectChartStyle] = useState<'line' | 'area' | 'bar'>(
    'line'
  );
  const [showTemplateMaxEditor, setShowTemplateMaxEditor] = useState(false);

  // Inline Template Max Score Editor draft state
  const activeSubjectTemplate = useMemo(() => {
    const targetId =
      subjectChartTemplateId !== 'all'
        ? subjectChartTemplateId
        : filterTemplate !== 'all'
        ? filterTemplate
        : templates[0]?.id;
    return templates.find(t => t.id === targetId) ?? templates[0];
  }, [subjectChartTemplateId, filterTemplate, templates]);

  const [draftNumQ, setDraftNumQ] = useState<Record<string, number>>({});
  const [draftMarksPerCorrect, setDraftMarksPerCorrect] = useState<
    Record<string, number>
  >({});
  const [draftManualTotalMax, setDraftManualTotalMax] = useState<string>('');
  const [savedTemplateBanner, setSavedTemplateBanner] = useState(false);

  const openInlineTemplateEditor = (tpl: ExamTemplate | undefined) => {
    if (!tpl) return;
    const qMap: Record<string, number> = {};
    const mMap: Record<string, number> = {};
    const firstPaper = tpl.papers[0] ?? [];
    firstPaper.forEach(s => {
      qMap[s.name] = s.numQuestions;
      mMap[s.name] = s.marksPerCorrect;
    });
    setDraftNumQ(qMap);
    setDraftMarksPerCorrect(mMap);
    setDraftManualTotalMax(
      tpl.manualOverride ? String(tpl.totalMaxMarks) : ''
    );
    setShowTemplateMaxEditor(prev => !prev);
  };

  const handleSaveInlineTemplateMax = () => {
    if (!activeSubjectTemplate || !onUpdateTemplate) return;
    const updatedPapers = activeSubjectTemplate.papers.map(paper =>
      paper.map(s => ({
        ...s,
        numQuestions:
          draftNumQ[s.name] !== undefined && draftNumQ[s.name] > 0
            ? draftNumQ[s.name]
            : s.numQuestions,
        marksPerCorrect:
          draftMarksPerCorrect[s.name] !== undefined &&
          draftMarksPerCorrect[s.name] > 0
            ? draftMarksPerCorrect[s.name]
            : s.marksPerCorrect,
      }))
    );

    let autoQ = 0;
    let autoM = 0;
    for (const p of updatedPapers) {
      for (const s of p) {
        autoQ += s.numQuestions;
        autoM += s.numQuestions * s.marksPerCorrect;
      }
    }

    const customMax = parseFloat(draftManualTotalMax);
    const useManual = !Number.isNaN(customMax) && customMax > 0;

    const updatedTemplate: ExamTemplate = {
      ...activeSubjectTemplate,
      papers: updatedPapers,
      manualOverride: useManual,
      totalQuestions: autoQ,
      totalMaxMarks: useManual ? Math.round(customMax) : Math.round(autoM),
    };

    onUpdateTemplate(updatedTemplate);
    setSavedTemplateBanner(true);
    setTimeout(() => setSavedTemplateBanner(false), 2500);
  };

  // Filtered Attempts (Global)
  const filtered = useMemo(() => {
    return attempts
      .filter(a => filterTemplate === 'all' || a.templateId === filterTemplate)
      .filter(a => filterPattern === 'all' || a.pattern === filterPattern)
      .filter(a => filterTestType === 'all' || a.testType === filterTestType)
      .filter(a => !dateFrom || a.date >= dateFrom)
      .filter(a => !dateTo || a.date <= dateTo)
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  }, [attempts, filterTemplate, filterPattern, filterTestType, dateFrom, dateTo]);

  // Filtered Attempts specifically for the Subject Score Chart (respects subjectChartTemplateId)
  const subjectFilteredAttempts = useMemo(() => {
    if (subjectChartTemplateId === 'all') return filtered;
    return filtered.filter(a => a.templateId === subjectChartTemplateId);
  }, [filtered, subjectChartTemplateId]);

  const templateMap = useMemo(() => {
    const map = new Map<string, ExamTemplate>();
    templates.forEach(t => map.set(t.id, t));
    return map;
  }, [templates]);

  const stats = useMemo(() => {
    if (!filtered.length)
      return {
        total: 0,
        avgPct: 0,
        best: 0,
        avgAcc: 0,
        targetRate: 0,
        totalNegLost: 0,
        avgSecPerQ: 0,
      };
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
    const avgSecPerQ =
      totalAttemptedQ > 0 ? Math.round(totalSeconds / totalAttemptedQ) : 0;

    return { total, avgPct, best, avgAcc, targetRate, totalNegLost, avgSecPerQ };
  }, [filtered]);

  // Discover all subjects across templates and attempts
  const allSubjectNames = useMemo(() => {
    const set = new Set<string>(['Physics', 'Chemistry', 'Mathematics']);
    if (activeSubjectTemplate) {
      activeSubjectTemplate.papers.forEach(p =>
        p.forEach(s => set.add(s.name))
      );
    }
    subjectFilteredAttempts.forEach(a =>
      a.papers.forEach(p => p.subjects.forEach(s => set.add(s.subjectName)))
    );
    return Array.from(set);
  }, [activeSubjectTemplate, subjectFilteredAttempts]);

  // Compute Template Max Scores per Subject for the active template & paper scope
  const templateSubjectMaxMap = useMemo(() => {
    const map: Record<string, number> = {};
    allSubjectNames.forEach(sn => {
      map[sn] = getTemplateSubjectMaxScore(
        activeSubjectTemplate,
        sn,
        subjectPaperScope
      );
    });
    return map;
  }, [allSubjectNames, activeSubjectTemplate, subjectPaperScope]);

  // Multi-Aspect Subject-Wise Trend Data & Lines
  const subjectMultiAspectTrend = useMemo(() => {
    const activeSubjects =
      selectedSubjectFilter === 'all'
        ? allSubjectNames
        : allSubjectNames.filter(s => s === selectedSubjectFilter);

    const data: TrendDatum[] = subjectFilteredAttempts.map((a, i) => {
      const tpl = templateMap.get(a.templateId) ?? activeSubjectTemplate;
      const row: TrendDatum = {
        index: i,
        label: format(parseISO(a.date), 'MMM d'),
      };

      const papersToRead =
        subjectPaperScope === 'paper1'
          ? [a.papers[0]].filter(Boolean)
          : subjectPaperScope === 'paper2'
          ? [a.papers[1]].filter(Boolean)
          : a.papers;

      activeSubjects.forEach(sn => {
        const canon = normalizeCanonicalSubject(sn);
        const matchingScores = papersToRead
          .flatMap(p => p?.subjects ?? [])
          .filter(
            s =>
              s.subjectName === sn ||
              (canon && normalizeCanonicalSubject(s.subjectName) === canon)
          );

        if (matchingScores.length === 0) {
          row[sn] = null;
          return;
        }

        const rawScore = matchingScores.reduce((sum, s) => sum + s.score, 0);
        const tplSubjMax = getTemplateSubjectMaxScore(
          tpl,
          sn,
          a.pattern === 'single' ? 'paper1' : subjectPaperScope
        );
        const effectiveMax =
          tplSubjMax > 0
            ? tplSubjMax
            : matchingScores.reduce((sum, s) => sum + s.maxScore, 0) || 100;

        const totalC = matchingScores.reduce((sum, s) => sum + s.correct, 0);
        const totalI = matchingScores.reduce((sum, s) => sum + s.incorrect, 0);
        const totalU = matchingScores.reduce((sum, s) => sum + s.unattempted, 0);
        const totalQ =
          matchingScores.reduce(
            (sum, s) => sum + (s.totalQuestions ?? s.correct + s.incorrect + s.unattempted),
            0
          ) || 25;
        const attempted = totalC + totalI;
        const acc = attempted > 0 ? (totalC / attempted) * 100 : 0;
        const negLost = matchingScores.reduce(
          (sum, s) => sum + (s.marksLostToNegative ?? s.incorrect),
          0
        );

        // Subject time spent
        let timeMin = matchingScores.reduce(
          (sum, s) => sum + (s.timeSpentMinutes ?? 0),
          0
        );
        if (timeMin === 0 && subjectPaperScope === 'combined') {
          if (canon === 'physics') timeMin = a.timePhysics ?? 0;
          else if (canon === 'chemistry') timeMin = a.timeChemistry ?? 0;
          else if (canon === 'maths') timeMin = a.timeMaths ?? 0;
        } else if (timeMin === 0 && subjectPaperScope !== 'combined') {
          const pIdx = subjectPaperScope === 'paper1' ? 0 : 1;
          const pt = a.paperTimings?.[pIdx];
          if (pt && canon) timeMin = pt[canon] ?? 0;
        }

        row[`${sn}__max`] = effectiveMax;
        row[`${sn}__qSplit`] = `✓${totalC} · ✗${totalI} · —${totalU} (${attempted}/${totalQ} Q)`;

        if (subjectAspect === 'score') {
          row[sn] = Number(rawScore.toFixed(1));
        } else if (subjectAspect === 'scorePct') {
          row[sn] = Number(((rawScore / effectiveMax) * 100).toFixed(1));
        } else if (subjectAspect === 'accuracy') {
          row[sn] = Number(acc.toFixed(1));
        } else if (subjectAspect === 'negative') {
          row[sn] = Number(negLost.toFixed(1));
        } else if (subjectAspect === 'timeSpent') {
          row[sn] = timeMin > 0 ? Number(timeMin.toFixed(1)) : null;
        } else if (subjectAspect === 'attemptRate') {
          row[sn] = Number(((attempted / totalQ) * 100).toFixed(1));
        } else if (subjectAspect === 'efficiency') {
          row[sn] =
            timeMin > 0 ? Number((rawScore / timeMin).toFixed(2)) : null;
        }
      });

      return row;
    });

    const lines: TrendLine[] = activeSubjects.map((sn, idx) => ({
      key: sn,
      name:
        subjectAspect === 'score'
          ? `${sn} (Max ${templateSubjectMaxMap[sn] ?? 100}m)`
          : sn,
      color: getSubjectColor(sn, idx),
    }));

    // Build Reference Ceilings when viewing Raw Marks or Time Spent
    const ceilings: ReferenceCeiling[] = [];
    if (subjectAspect === 'score' && activeSubjectTemplate) {
      if (selectedSubjectFilter !== 'all') {
        const mx = templateSubjectMaxMap[selectedSubjectFilter];
        if (mx) {
          ceilings.push({
            y: mx,
            label: `${selectedSubjectFilter} Template Max: ${mx}m`,
            color: getSubjectColor(selectedSubjectFilter),
          });
        }
      } else {
        // Deduplicate max scores if all subjects share the same max (e.g. 100m in JEE Main)
        const uniqueMaxes = Array.from(
          new Set(activeSubjects.map(s => templateSubjectMaxMap[s]))
        ).filter(Boolean);
        if (uniqueMaxes.length === 1) {
          ceilings.push({
            y: uniqueMaxes[0],
            label: `Template Subject Max (${activeSubjectTemplate.name.split('—')[0].trim()}): ${uniqueMaxes[0]}m`,
            color: '#10B981',
          });
        } else {
          activeSubjects.forEach((sn, i) => {
            const mx = templateSubjectMaxMap[sn];
            if (mx) {
              ceilings.push({
                y: mx,
                label: `${sn} Max: ${mx}m`,
                color: getSubjectColor(sn, i),
              });
            }
          });
        }
      }
    } else if (subjectAspect === 'timeSpent') {
      const paperMultiplier =
        subjectPaperScope === 'combined' &&
        activeSubjectTemplate?.pattern === 'dual'
          ? 2
          : 1;
      activeSubjects.forEach((sn, i) => {
        const ideal = getSubjectIdealMinutes(sn) * paperMultiplier;
        ceilings.push({
          y: ideal,
          label: `${sn} Ideal: ${ideal}m`,
          color: getSubjectColor(sn, i),
        });
      });
    }

    const isPctAspect =
      subjectAspect === 'scorePct' ||
      subjectAspect === 'accuracy' ||
      subjectAspect === 'attemptRate';

    return {
      data,
      lines,
      ceilings,
      percentageKeys: isPctAspect ? activeSubjects : [],
    };
  }, [
    allSubjectNames,
    selectedSubjectFilter,
    subjectFilteredAttempts,
    templateMap,
    activeSubjectTemplate,
    subjectPaperScope,
    subjectAspect,
    templateSubjectMaxMap,
  ]);

  // Separate Individual Subject Score Cards (Physics, Chemistry, Mathematics)
  const separateSubjectCards = useMemo(() => {
    return allSubjectNames.map((sn, idx) => {
      const color = getSubjectColor(sn, idx);
      const canon = normalizeCanonicalSubject(sn);
      const templateMax = templateSubjectMaxMap[sn] ?? 100;
      const idealMinPerPaper = getSubjectIdealMinutes(sn);

      const points: Array<{
        index: number;
        label: string;
        attemptName: string;
        score: number;
        maxScore: number;
        scorePct: number;
        accuracy: number;
        negative: number;
        attemptRate: number;
        timeMin: number;
      }> = [];

      subjectFilteredAttempts.forEach((a, i) => {
        const tpl = templateMap.get(a.templateId) ?? activeSubjectTemplate;
        const papersToRead =
          subjectPaperScope === 'paper1'
            ? [a.papers[0]].filter(Boolean)
            : subjectPaperScope === 'paper2'
            ? [a.papers[1]].filter(Boolean)
            : a.papers;

        const matching = papersToRead
          .flatMap(p => p?.subjects ?? [])
          .filter(
            s =>
              s.subjectName === sn ||
              (canon && normalizeCanonicalSubject(s.subjectName) === canon)
          );

        if (!matching.length) return;

        const score = Number(
          matching.reduce((sum, s) => sum + s.score, 0).toFixed(1)
        );
        const maxScore =
          getTemplateSubjectMaxScore(
            tpl,
            sn,
            a.pattern === 'single' ? 'paper1' : subjectPaperScope
          ) ||
          matching.reduce((sum, s) => sum + s.maxScore, 0) ||
          100;
        const c = matching.reduce((sum, s) => sum + s.correct, 0);
        const inc = matching.reduce((sum, s) => sum + s.incorrect, 0);
        const totQ =
          matching.reduce(
            (sum, s) =>
              sum + (s.totalQuestions ?? s.correct + s.incorrect + s.unattempted),
            0
          ) || 25;
        const att = c + inc;
        const accuracy = att > 0 ? Number(((c / att) * 100).toFixed(1)) : 0;
        const negative = Number(
          matching
            .reduce((sum, s) => sum + (s.marksLostToNegative ?? s.incorrect), 0)
            .toFixed(1)
        );
        const attemptRate = Number(((att / totQ) * 100).toFixed(1));

        let timeMin = matching.reduce(
          (sum, s) => sum + (s.timeSpentMinutes ?? 0),
          0
        );
        if (timeMin === 0 && subjectPaperScope === 'combined') {
          if (canon === 'physics') timeMin = a.timePhysics ?? 0;
          else if (canon === 'chemistry') timeMin = a.timeChemistry ?? 0;
          else if (canon === 'maths') timeMin = a.timeMaths ?? 0;
        }
        // Normalize per paper for comparison against 50m/40m/90m ideal
        const normPaperTime =
          timeMin > 0
            ? Number(
                (
                  timeMin /
                  (a.pattern === 'dual' && subjectPaperScope === 'combined'
                    ? 2
                    : 1)
                ).toFixed(1)
              )
            : 0;

        points.push({
          index: i,
          label: format(parseISO(a.date), 'MMM d'),
          attemptName: a.attemptName,
          score,
          maxScore,
          scorePct: maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(1)) : 0,
          accuracy,
          negative,
          attemptRate,
          timeMin: normPaperTime,
        });
      });

      const count = points.length;
      const avgScore =
        count > 0 ? points.reduce((s, p) => s + p.score, 0) / count : 0;
      const peakScore =
        count > 0 ? Math.max(...points.map(p => p.score)) : 0;
      const avgAcc =
        count > 0 ? points.reduce((s, p) => s + p.accuracy, 0) / count : 0;
      const avgAttemptRate =
        count > 0 ? points.reduce((s, p) => s + p.attemptRate, 0) / count : 0;
      const totalNeg = points.reduce((s, p) => s + p.negative, 0);
      const timedPts = points.filter(p => p.timeMin > 0);
      const avgTimeMin =
        timedPts.length > 0
          ? timedPts.reduce((s, p) => s + p.timeMin, 0) / timedPts.length
          : 0;
      const delta =
        count >= 2
          ? Number((points[count - 1].score - points[0].score).toFixed(1))
          : 0;

      return {
        subject: sn,
        color,
        templateMax,
        idealMinPerPaper,
        points,
        avgScore: Number(avgScore.toFixed(1)),
        peakScore: Number(peakScore.toFixed(1)),
        avgAcc: Number(avgAcc.toFixed(1)),
        avgAttemptRate: Number(avgAttemptRate.toFixed(1)),
        totalNeg: Number(totalNeg.toFixed(1)),
        avgTimeMin: Number(avgTimeMin.toFixed(1)),
        delta,
      };
    });
  }, [
    allSubjectNames,
    templateSubjectMaxMap,
    subjectFilteredAttempts,
    templateMap,
    activeSubjectTemplate,
    subjectPaperScope,
  ]);

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
      a =>
        (a.timePhysics ?? 0) > 0 ||
        (a.timeChemistry ?? 0) > 0 ||
        (a.timeMaths ?? 0) > 0
    );
    if (!timed.length) return null;

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
      {
        chapter: string;
        subject: string;
        marksLost: number;
        count: number;
        avgTimeSec: number;
      }
    > = {};

    mistakes.forEach(m => {
      const ch = m.chapter?.trim() || 'General Concept';
      const lost =
        m.marksLost ??
        (m.priority === 'High' ? 5 : m.priority === 'Medium' ? 4 : 1);
      if (!topicMap[ch]) {
        topicMap[ch] = {
          chapter: ch,
          subject: m.subject,
          marksLost: 0,
          count: 0,
          avgTimeSec: 0,
        };
      }
      topicMap[ch].marksLost += lost;
      topicMap[ch].count += 1;
      if (m.questionTimeSeconds) {
        topicMap[ch].avgTimeSec = Math.round(
          (topicMap[ch].avgTimeSec * (topicMap[ch].count - 1) +
            m.questionTimeSeconds) /
            topicMap[ch].count
        );
      }
    });

    const list = Object.values(topicMap)
      .sort((a, b) => b.marksLost - a.marksLost)
      .slice(0, 9);
    const maxLost = Math.max(1, ...list.map(x => x.marksLost));
    return { list, maxLost };
  }, [mistakes]);

  const trendData = useMemo(
    () =>
      filtered.map((a, i) => {
        const tpl = templateMap.get(a.templateId);
        return {
          index: i,
          label: format(parseISO(a.date), 'MMM d'),
          total: a.totalScore,
          total__max: tpl?.totalMaxMarks ?? a.maxScore,
          percentage: a.percentage,
          accuracy: a.accuracy,
          negative: a.marksLostToNegative,
          attemptRate:
            a.totalQuestions > 0
              ? ((a.totalCorrect + a.totalIncorrect) / a.totalQuestions) * 100
              : 0,
          marksPerMinute: a.timeTakenMinutes
            ? Number((a.totalScore / a.timeTakenMinutes).toFixed(2))
            : null,
        };
      }),
    [filtered, templateMap]
  );

  const hasTimingData = useMemo(
    () => filtered.some(a => !!a.timeTakenMinutes),
    [filtered]
  );

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
      a.papers.forEach(p =>
        p.subjects.forEach(s => subjectNames.add(s.subjectName))
      )
    );
    const subjectStats: Record<
      string,
      { scores: number[]; accuracies: number[] }
    > = {};
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
    const entries = Object.entries(subjectStats).filter(
      ([, v]) => v.scores.length > 0
    );
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
        [...ranked]
          .filter(r => r.attempts >= 2)
          .sort((a, b) => b.slope - a.slope)[0] ?? null,
      mostConsistent:
        [...ranked]
          .filter(r => r.attempts >= 2)
          .sort((a, b) => a.variance - b.variance)[0] ?? null,
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
      den === 0
        ? 0
        : xs.reduce((s, x, i) => s + (x - mx) * (pctArr[i] - my), 0) / den;

    const direction: 'up' | 'down' | 'flat' =
      overallSlope > 0.4 ? 'up' : overallSlope < -0.4 ? 'down' : 'flat';
    const gap = insights.strongest.avgScore - insights.weakest.avgScore;

    const totalNegLost = filtered.reduce(
      (s, a) => s + a.marksLostToNegative,
      0
    );
    const totalMax = filtered.reduce((s, a) => s + a.maxScore, 0);
    const negPctOfMax = totalMax > 0 ? (totalNegLost / totalMax) * 100 : 0;

    const last = filtered[n - 1];
    const prev = filtered[n - 2];
    const lastDelta = last.percentage - prev.percentage;

    return {
      direction,
      slope: overallSlope,
      gap,
      totalNegLost,
      negPctOfMax,
      lastDelta,
      last,
      n,
    };
  }, [filtered, insights]);

  const overallChartModes: { id: OverallChartMode; label: string }[] = [
    { id: 'mainVsAdv', label: 'JEE Main vs Advanced' },
    { id: 'total', label: 'Score vs Template Max' },
    { id: 'paper', label: 'Adv Paper 1 vs 2' },
    { id: 'negative', label: 'Negative Marks' },
    { id: 'attemptRate', label: 'Attempt Rate %' },
    { id: 'efficiency', label: 'Marks / Min' },
  ];

  const subjectAspectOptions: {
    id: SubjectAspect;
    label: string;
    yLabel: string;
    desc: string;
  }[] = [
    {
      id: 'score',
      label: 'Marks vs Template Max',
      yLabel: 'Marks',
      desc: 'Raw marks obtained per subject plotted against the exact Subject Max Score fetched from your Exam Template.',
    },
    {
      id: 'scorePct',
      label: '% of Subject Max',
      yLabel: '% of Max',
      desc: 'Normalized percentage of available subject marks captured across templates of different total marks.',
    },
    {
      id: 'accuracy',
      label: 'Accuracy %',
      yLabel: 'Accuracy %',
      desc: 'Percentage of attempted questions answered correctly per subject.',
    },
    {
      id: 'negative',
      label: 'Negative Marks',
      yLabel: 'Marks Lost',
      desc: 'Marks lost to negative marking per subject in each test attempt.',
    },
    {
      id: 'timeSpent',
      label: 'Time Spent (min)',
      yLabel: 'Minutes',
      desc: 'Subject minutes spent compared against ideal per-paper allocations (50m Physics · 40m Chemistry · 90m Maths).',
    },
    {
      id: 'attemptRate',
      label: 'Attempt Rate %',
      yLabel: 'Attempt %',
      desc: 'Percentage of total template questions attempted per subject (hover any point for ✓ Correct / ✗ Incorrect / — Unattempted split).',
    },
    {
      id: 'efficiency',
      label: 'Marks / Minute',
      yLabel: 'Marks / Min',
      desc: 'Scoring velocity (marks earned per minute spent) for each subject.',
    },
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
      <div
        className="card flex flex-col items-center justify-center gap-3"
        style={{ padding: '64px 24px' }}
      >
        <BarChart3 size={28} style={{ color: 'var(--text-tertiary)' }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
          No test analytics yet
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Log at least one JEE Main or JEE Advanced test to unlock telemetry
        </p>
      </div>
    );
  }

  const currentAspectMeta =
    subjectAspectOptions.find(o => o.id === subjectAspect) ??
    subjectAspectOptions[0];

  return (
    <div className="space-y-6">
      {/* Top Global Filter & Workspace Section Bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-slate-800/80">
          <div>
            <p className="text-[13px] font-bold text-slate-100">
              Analytics Workspace View
            </p>
            <p className="text-[11px] text-slate-400">
              Switch between focused analytical suites or view all modules in a spacious layout
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
            {(
              [
                { id: 'all' as const, label: 'All Sections (Spacious)' },
                { id: 'subjectTrends' as const, label: 'Subject Score & Aspect Trends' },
                { id: 'overallTrajectory' as const, label: 'Overall & Mode Trajectory' },
                { id: 'pacingHeatmap' as const, label: 'Pacing & Topic Heatmap' },
              ] as const
            ).map(sec => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSectionView(sec.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background:
                    sectionView === sec.id ? 'var(--accent)' : 'transparent',
                  color:
                    sectionView === sec.id ? '#06130E' : 'var(--text-secondary)',
                  transition: 'all 140ms',
                }}
              >
                {sec.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global Filters Row */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={filterTemplate}
            onChange={e => {
              setFilterTemplate(e.target.value);
              setSubjectChartTemplateId(e.target.value);
            }}
            className="field"
            style={{ width: 'auto', padding: '6px 11px', fontSize: 12 }}
          >
            <option value="all">All Exam Templates</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.totalMaxMarks}M)
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

          <select
            value={filterTestType}
            onChange={e =>
              setFilterTestType(e.target.value as 'all' | TestSourceType)
            }
            className="field"
            style={{ width: 'auto', padding: '6px 11px', fontSize: 12 }}
          >
            <option value="all">All Test Sources</option>
            {TEST_TYPES.map(tt => (
              <option key={tt} value={tt}>
                {tt}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 ml-auto">
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
            {(filterTemplate !== 'all' ||
              filterPattern !== 'all' ||
              filterTestType !== 'all' ||
              dateFrom ||
              dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setFilterTemplate('all');
                  setSubjectChartTemplateId('all');
                  setFilterPattern('all');
                  setFilterTestType('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="btn-ghost !py-1.5 !px-2.5 text-[11.5px]"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
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
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {k.label}
                </span>
                <Icon size={15} style={{ color: k.color }} />
              </div>
              <div className="stat-number" style={{ fontSize: 24 }}>
                {k.value}
              </div>
              <div
                className="tabular-num"
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  marginTop: 4,
                }}
              >
                {k.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          SECTION 1: SUBJECT-WISE SCORE & MULTI-ASPECT TRENDS SUITE (NEW)
         ===================================================================== */}
      {(sectionView === 'all' || sectionView === 'subjectTrends') && (
        <div className="space-y-5">
          {/* Interactive Multi-Aspect Subject Explorer */}
          <div className="card" style={{ padding: 24 }}>
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 mb-4 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <Layers size={16} style={{ color: 'var(--accent)' }} />
                  <h3 className="card-title text-[16px]">
                    Subject-Wise Score & Multi-Aspect Trend Explorer
                  </h3>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-tertiary)',
                    marginTop: 3,
                  }}
                >
                  {currentAspectMeta.desc}
                </p>
              </div>

              {/* Template Selector & Inline Template Max Score Editor Trigger */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Blueprint:
                  </span>
                  <select
                    value={subjectChartTemplateId}
                    onChange={e => setSubjectChartTemplateId(e.target.value)}
                    className="field"
                    style={{ width: 'auto', padding: '6px 11px', fontSize: 12 }}
                  >
                    <option value="all">
                      All Templates (Ref:{' '}
                      {activeSubjectTemplate
                        ? `${activeSubjectTemplate.name.split('—')[0].trim()} · ${activeSubjectTemplate.totalMaxMarks}M`
                        : 'Auto'}
                      )
                    </option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Max {t.totalMaxMarks}M)
                      </option>
                    ))}
                  </select>
                </div>

                {activeSubjectTemplate && (
                  <button
                    type="button"
                    onClick={() => openInlineTemplateEditor(activeSubjectTemplate)}
                    className={showTemplateMaxEditor ? 'btn-primary' : 'btn-ghost'}
                    style={{ padding: '6px 11px', fontSize: 11.5 }}
                    title="View or modify subject max scores in the active template"
                  >
                    <Sliders size={13} />
                    Template Max Scores (
                    {allSubjectNames
                      .slice(0, 3)
                      .map(
                        sn =>
                          `${sn.slice(0, 3)} ${templateSubjectMaxMap[sn] ?? 100}m`
                      )
                      .join(' · ')}
                    )
                  </button>
                )}
              </div>
            </div>

            {/* Inline Template Max Score Editor Drawer */}
            {showTemplateMaxEditor && activeSubjectTemplate && (
              <div
                className="mb-5 p-4 rounded-[10px] animate-slide-down"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-[13px] font-bold text-slate-100">
                      Configure Template Max Scores — {activeSubjectTemplate.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {activeSubjectTemplate.pattern === 'dual'
                        ? 'Dual-Paper Event (Paper 1 + Paper 2 combined max score is 2× per-paper subject marks)'
                        : 'Single-Paper Event (Subject Max Score = Questions × Marks per Correct)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onEditTemplateInBuilder && (
                      <button
                        type="button"
                        onClick={() =>
                          onEditTemplateInBuilder(activeSubjectTemplate)
                        }
                        className="btn-ghost !py-1.5 !px-2.5 text-[11.5px]"
                      >
                        <Edit3 size={12} /> Open Full Template Builder
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowTemplateMaxEditor(false)}
                      className="btn-ghost !p-1.5"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {(activeSubjectTemplate.papers[0] ?? []).map(s => {
                    const qVal = draftNumQ[s.name] ?? s.numQuestions;
                    const mVal = draftMarksPerCorrect[s.name] ?? s.marksPerCorrect;
                    const paperCount =
                      activeSubjectTemplate.pattern === 'dual' ? 2 : 1;
                    const computedSubjMax = Number(
                      (qVal * mVal * paperCount).toFixed(1)
                    );
                    return (
                      <div
                        key={s.id}
                        className="p-3 rounded-[8px]"
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-[12px] font-bold"
                            style={{ color: getSubjectColor(s.name) }}
                          >
                            {s.name}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-emerald-400">
                            Max: {computedSubjMax}m
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="field-label !text-[10px]">
                              Questions / Paper
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={qVal}
                              onChange={e =>
                                setDraftNumQ(prev => ({
                                  ...prev,
                                  [s.name]: parseInt(e.target.value, 10) || 1,
                                }))
                              }
                              className="field font-mono !py-1 !px-2 !text-[12px]"
                            />
                          </div>
                          <div>
                            <label className="field-label !text-[10px]">
                              Marks / Correct
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min={0.5}
                              max={20}
                              value={mVal}
                              onChange={e =>
                                setDraftMarksPerCorrect(prev => ({
                                  ...prev,
                                  [s.name]: parseFloat(e.target.value) || 1,
                                }))
                              }
                              className="field font-mono !py-1 !px-2 !text-[12px]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div
                    className="p-3 rounded-[8px] flex flex-col justify-between"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <label className="field-label !text-[10px]">
                        Override Total Exam Max (Optional)
                      </label>
                      <input
                        type="number"
                        min={0}
                        placeholder="Auto-sum subjects"
                        value={draftManualTotalMax}
                        onChange={e => setDraftManualTotalMax(e.target.value)}
                        className="field font-mono !py-1.5 !px-2.5 !text-[12px] mt-1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveInlineTemplateMax}
                      className="btn-primary w-full justify-center !py-1.5 !text-[12px] mt-2"
                    >
                      <Check size={13} /> Update Template Max Scores
                    </button>
                  </div>
                </div>

                {savedTemplateBanner && (
                  <p className="text-[11.5px] font-mono text-emerald-400 mt-2.5 flex items-center gap-1.5">
                    <Check size={13} /> Template max scores updated! Chart ceilings
                    and percentages recalculated.
                  </p>
                )}
              </div>
            )}

            {/* Multi-Row Filter Controls: Subject Filter + Aspect Filter + Paper Scope + Chart Style */}
            <div className="flex flex-col gap-3 mb-5">
              {/* Row A: Subject Filter + Paper Scope + Chart Style */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Subject Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mr-1">
                    Subject:
                  </span>
                  {['all', ...allSubjectNames].map((subj, idx) => {
                    const active = selectedSubjectFilter === subj;
                    const col =
                      subj === 'all' ? 'var(--accent)' : getSubjectColor(subj, idx);
                    return (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => setSelectedSubjectFilter(subj)}
                        style={{
                          padding: '5px 11px',
                          borderRadius: 'var(--radius-button)',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor: active ? col : 'var(--border-subtle)',
                          background: active
                            ? 'rgba(16, 185, 129, 0.12)'
                            : 'var(--bg-elevated)',
                          color: active ? col : 'var(--text-secondary)',
                          transition: 'all 140ms',
                        }}
                      >
                        {subj === 'all'
                          ? 'All Subjects (Overlay)'
                          : `${subj} (Max ${templateSubjectMaxMap[subj] ?? 100}m)`}
                      </button>
                    );
                  })}
                </div>

                {/* Paper Scope (for JEE Advanced) & Chart Type Switcher */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div
                    className="flex gap-1"
                    style={{
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-button)',
                      padding: 2,
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {(
                      [
                        { id: 'combined' as const, label: 'Combined Event' },
                        { id: 'paper1' as const, label: 'Paper 1' },
                        { id: 'paper2' as const, label: 'Paper 2' },
                      ] as const
                    ).map(ps => (
                      <button
                        key={ps.id}
                        type="button"
                        onClick={() => setSubjectPaperScope(ps.id)}
                        style={{
                          padding: '4px 9px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          background:
                            subjectPaperScope === ps.id
                              ? 'var(--accent)'
                              : 'transparent',
                          color:
                            subjectPaperScope === ps.id
                              ? '#06130E'
                              : 'var(--text-tertiary)',
                        }}
                      >
                        {ps.label}
                      </button>
                    ))}
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
                    {(
                      [
                        { id: 'line' as const, label: 'Line' },
                        { id: 'area' as const, label: 'Area' },
                        { id: 'bar' as const, label: 'Bars' },
                      ] as const
                    ).map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSubjectChartStyle(st.id)}
                        style={{
                          padding: '4px 9px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          background:
                            subjectChartStyle === st.id
                              ? 'var(--accent)'
                              : 'transparent',
                          color:
                            subjectChartStyle === st.id
                              ? '#06130E'
                              : 'var(--text-tertiary)',
                        }}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row B: Aspect / Dimension Selector (7 Aspects) */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mr-1">
                  Aspect:
                </span>
                {subjectAspectOptions.map(opt => {
                  const active = subjectAspect === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSubjectAspect(opt.id)}
                      style={{
                        padding: '5px 11px',
                        borderRadius: 'var(--radius-button)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: active
                          ? 'var(--accent)'
                          : 'var(--border-subtle)',
                        background: active
                          ? 'var(--accent)'
                          : 'var(--bg-elevated)',
                        color: active ? '#06130E' : 'var(--text-secondary)',
                        transition: 'all 140ms',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Subject Multi-Aspect Chart */}
            {subjectFilteredAttempts.length > 0 ? (
              <TrendChart
                data={subjectMultiAspectTrend.data}
                lines={subjectMultiAspectTrend.lines}
                height={290}
                yAxisLabel={currentAspectMeta.yLabel}
                attempts={subjectFilteredAttempts}
                percentageKeys={subjectMultiAspectTrend.percentageKeys}
                referenceCeilings={subjectMultiAspectTrend.ceilings}
                chartStyle={subjectChartStyle}
                highlightMax={selectedSubjectFilter !== 'all'}
                highlightLast={selectedSubjectFilter !== 'all'}
                onClickPoint={i => setSelectedAttemptIdx(i)}
              />
            ) : (
              <div
                style={{
                  height: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                  No test attempts logged for the selected template/filter
                </p>
              </div>
            )}
          </div>

          {/* Separate Individual Subject Score Trend Cards (Physics, Chemistry, Mathematics) */}
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <h4 className="text-[14.5px] font-bold text-slate-100">
                  Separate Subject Score Trend Cards (vs. Template Max Score)
                </h4>
                <p className="text-[11.5px] text-slate-400">
                  Independent subject trajectories with template max ceilings, accuracy, negative marks, and pacing vs. ideal time
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {separateSubjectCards.map(sc => (
                <div
                  key={sc.subject}
                  className="card"
                  style={{
                    padding: 20,
                    borderTop: `3px solid ${sc.color}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[15px] font-bold"
                          style={{ color: sc.color }}
                        >
                          {sc.subject}
                        </span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800/90 text-slate-300">
                          Template Max: {sc.templateMax}m
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        Ideal Time: {sc.idealMinPerPaper}m / paper · Avg Pace:{' '}
                        {sc.avgTimeMin > 0 ? `${sc.avgTimeMin}m` : '—'}
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <span
                        className="text-[16px] font-extrabold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {sc.avgScore}
                        <span className="text-[11.5px] text-slate-400 font-normal">
                          /{sc.templateMax}
                        </span>
                      </span>
                      <p
                        className="text-[10.5px] font-bold"
                        style={{
                          color:
                            sc.delta > 0
                              ? 'var(--success)'
                              : sc.delta < 0
                              ? 'var(--danger)'
                              : 'var(--text-tertiary)',
                        }}
                      >
                        {sc.delta >= 0 ? `+${sc.delta}m` : `${sc.delta}m`} net trend
                      </p>
                    </div>
                  </div>

                  {/* Mini Dedicated Subject Score Chart */}
                  {sc.points.length > 0 ? (
                    <div style={{ height: 155 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={sc.points}
                          margin={{ left: -18, right: 8, top: 8, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id={`sep-subj-${sc.subject}`}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor={sc.color}
                                stopOpacity={0.28}
                              />
                              <stop
                                offset="100%"
                                stopColor={sc.color}
                                stopOpacity={0.0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="0"
                            stroke="var(--border-subtle)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 9.5, fill: 'var(--text-tertiary)' }}
                            stroke="transparent"
                          />
                          <YAxis
                            domain={[0, Math.ceil(sc.templateMax * 1.08)]}
                            tick={{ fontSize: 9.5, fill: 'var(--text-tertiary)' }}
                            stroke="transparent"
                            width={34}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const p = payload[0].payload;
                              return (
                                <div
                                  className="card-glass"
                                  style={{ padding: '9px 11px' }}
                                >
                                  <p
                                    style={{
                                      fontSize: 11.5,
                                      fontWeight: 700,
                                      color: 'var(--text-primary)',
                                    }}
                                  >
                                    {p.attemptName} ({p.label})
                                  </p>
                                  <p
                                    className="font-mono"
                                    style={{
                                      fontSize: 11.5,
                                      fontWeight: 700,
                                      color: sc.color,
                                      marginTop: 2,
                                    }}
                                  >
                                    Score: {p.score} / {p.maxScore}m ({p.scorePct}%)
                                  </p>
                                  <p className="font-mono text-[10.5px] text-slate-300">
                                    Acc: {p.accuracy}% · Attempt: {p.attemptRate}% ·
                                    Neg: -{p.negative}m
                                  </p>
                                </div>
                              );
                            }}
                          />
                          <ReferenceLine
                            y={sc.templateMax}
                            stroke={sc.color}
                            strokeDasharray="3 3"
                            strokeOpacity={0.55}
                          />
                          <Area
                            type="monotone"
                            dataKey="score"
                            name={`${sc.subject} Score`}
                            stroke={sc.color}
                            strokeWidth={2.2}
                            fill={`url(#sep-subj-${sc.subject})`}
                            dot={{ r: 3, fill: sc.color, strokeWidth: 0 }}
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div
                      style={{
                        height: 155,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <p className="text-xs text-slate-500">No subject data</p>
                    </div>
                  )}

                  {/* Per-Subject Aspect Telemetry Footer */}
                  <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-slate-800/80 font-mono text-center">
                    <div>
                      <p className="text-[9.5px] uppercase text-slate-400">Peak</p>
                      <p className="text-[12px] font-bold text-slate-100">
                        {sc.peakScore}m
                      </p>
                    </div>
                    <div>
                      <p className="text-[9.5px] uppercase text-slate-400">
                        Accuracy
                      </p>
                      <p className="text-[12px] font-bold text-sky-400">
                        {sc.avgAcc}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[9.5px] uppercase text-slate-400">
                        Attempt %
                      </p>
                      <p className="text-[12px] font-bold text-amber-400">
                        {sc.avgAttemptRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[9.5px] uppercase text-slate-400">
                        Neg Cost
                      </p>
                      <p className="text-[12px] font-bold text-rose-400">
                        -{sc.totalNeg}m
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 2: OVERALL EXAM TRAJECTORY & MODE COMPARISON
         ===================================================================== */}
      {(sectionView === 'all' || sectionView === 'overallTrajectory') && (
        <div className="card" style={{ padding: 24 }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <p className="card-title text-[16px]">
                Overall Exam Trajectory & Mode Comparison
              </p>
              <p
                style={{
                  fontSize: 11.5,
                  color: 'var(--text-tertiary)',
                  marginTop: 2,
                }}
              >
                Click any data point to inspect full paper-wise and subject-wise
                telemetry
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
              {overallChartModes.map(m => {
                const disabled =
                  (m.id === 'paper' && !paperTrend) ||
                  (m.id === 'efficiency' && !hasTimingData);
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
                      background:
                        chartMode === m.id ? 'var(--accent)' : 'transparent',
                      color:
                        chartMode === m.id ? '#06130E' : 'var(--text-tertiary)',
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
                      {
                        key: 'jeeMainAcc',
                        name: 'JEE Main Accuracy %',
                        color: '#38BDF8',
                      },
                      {
                        key: 'jeeAdvAcc',
                        name: 'JEE Advanced Accuracy %',
                        color: '#F59E0B',
                      },
                      {
                        key: 'jeeMainPct',
                        name: 'JEE Main Score %',
                        color: '#10B981',
                        strokeDasharray: '4 4',
                      },
                      {
                        key: 'jeeAdvPct',
                        name: 'JEE Advanced Score %',
                        color: '#F43F5E',
                        strokeDasharray: '4 4',
                      },
                    ]}
                    height={260}
                    yAxisLabel="Percentage %"
                    attempts={filtered}
                    percentageKeys={[
                      'jeeMainAcc',
                      'jeeAdvAcc',
                      'jeeMainPct',
                      'jeeAdvPct',
                    ]}
                    highlightMax={false}
                    highlightLast={false}
                    onClickPoint={i => setSelectedAttemptIdx(i)}
                  />
                  <p
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-tertiary)',
                      marginTop: 8,
                    }}
                  >
                    Solid lines compare accuracy % between JEE Main (Single 3-Hr)
                    and JEE Advanced (Dual 2×3-Hr) events; dashed lines track
                    overall score percentage.
                  </p>
                </>
              )}
              {chartMode === 'total' && (
                <TrendChart
                  data={trendData}
                  lines={[
                    { key: 'total', name: 'Total Score', color: '#10B981' },
                    { key: 'percentage', name: 'Score %', color: '#38BDF8' },
                  ]}
                  height={260}
                  yAxisLabel="Score"
                  attempts={filtered}
                  percentageKeys={['percentage']}
                  referenceCeilings={
                    activeSubjectTemplate
                      ? [
                          {
                            y: activeSubjectTemplate.totalMaxMarks,
                            label: `Template Max: ${activeSubjectTemplate.totalMaxMarks}M`,
                            color: '#F59E0B',
                          },
                        ]
                      : []
                  }
                  highlightMax
                  highlightLast
                  onClickPoint={i => setSelectedAttemptIdx(i)}
                />
              )}
              {chartMode === 'paper' && paperTrend && (
                <TrendChart
                  data={paperTrend.data}
                  lines={paperTrend.lines}
                  height={260}
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
                  lines={[
                    {
                      key: 'negative',
                      name: 'Negative Marks Lost',
                      color: '#F43F5E',
                    },
                  ]}
                  height={260}
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
                    {
                      key: 'attemptRate',
                      name: 'Attempt Rate %',
                      color: '#F59E0B',
                    },
                    { key: 'accuracy', name: 'Accuracy %', color: '#38BDF8' },
                  ]}
                  height={260}
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
                  lines={[
                    {
                      key: 'marksPerMinute',
                      name: 'Marks / Minute',
                      color: '#38BDF8',
                    },
                  ]}
                  height={260}
                  yAxisLabel="Marks / Min"
                  attempts={filtered.filter(a => !!a.timeTakenMinutes)}
                  highlightMax
                  highlightLast
                  onClickPoint={i => setSelectedAttemptIdx(i)}
                />
              )}
            </>
          ) : (
            <div
              style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                No data for selected filters
              </p>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SECTION 3: PACING VS IDEAL TIME (50m/40m/90m) & TOPIC HEATMAP
         ===================================================================== */}
      {(sectionView === 'all' || sectionView === 'pacingHeatmap') && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Single Unified Subject-wise Time Spent vs Ideal Time Graph */}
            <div className="card" style={{ padding: 24 }}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <p className="card-title">Subject Time Spent vs. Ideal Time</p>
                  <p
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-tertiary)',
                      marginTop: 2,
                    }}
                  >
                    Normalized per 3-hour paper (Ideal: 50m Physics · 40m Chemistry
                    · 90m Maths)
                  </p>
                </div>
              </div>

              {subjectTimeComparison ? (
                <>
                  <div style={{ height: 230 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={subjectTimeComparison.bars}
                        margin={{ left: -12, right: 12, top: 10, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="0"
                          stroke="var(--border-subtle)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="subject"
                          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                          stroke="transparent"
                        />
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
                              <div
                                className="card-glass"
                                style={{ padding: '10px 12px' }}
                              >
                                <p
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    marginBottom: 4,
                                  }}
                                >
                                  {label}
                                </p>
                                <p
                                  className="tabular-num"
                                  style={{
                                    fontSize: 11.5,
                                    color: '#10B981',
                                    fontWeight: 700,
                                  }}
                                >
                                  Actual Avg: {row.actualMin} min / paper
                                </p>
                                <p
                                  className="tabular-num"
                                  style={{
                                    fontSize: 11.5,
                                    color: '#F59E0B',
                                    fontWeight: 600,
                                  }}
                                >
                                  Ideal Time: {row.targetMin} min / paper
                                </p>
                                {row.secPerQ > 0 && (
                                  <p
                                    className="tabular-num"
                                    style={{
                                      fontSize: 11,
                                      color: '#38BDF8',
                                      marginTop: 2,
                                    }}
                                  >
                                    Avg Question Speed: {row.secPerQ}s / Q
                                  </p>
                                )}
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar
                          dataKey="actualMin"
                          name="Actual Time (min)"
                          fill="#10B981"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
                        <Bar
                          dataKey="targetMin"
                          name="Ideal Time (50m / 40m / 90m)"
                          fill="#F59E0B"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 mt-3">
                    {subjectTimeComparison.bars.map(b => {
                      const diff = Number((b.actualMin - b.targetMin).toFixed(1));
                      return (
                        <div
                          key={b.subject}
                          style={{
                            padding: '9px 11px',
                            background: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-button)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <p
                            style={{
                              fontSize: 11,
                              color: 'var(--text-secondary)',
                              fontWeight: 600,
                            }}
                          >
                            {b.subject}
                          </p>
                          <p
                            className="tabular-num"
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color:
                                diff > 5 ? 'var(--warning)' : 'var(--text-primary)',
                            }}
                          >
                            {b.actualMin}m{' '}
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 500,
                                color: 'var(--text-tertiary)',
                              }}
                            >
                              ({diff >= 0 ? `+${diff}m` : `${diff}m`} vs{' '}
                              {b.targetMin}m)
                            </span>
                          </p>
                          <p
                            className="tabular-num"
                            style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
                          >
                            {b.secPerQ > 0
                              ? `${b.secPerQ}s / Q · Ideal ${b.targetMin}m`
                              : `Ideal ${b.targetMin}m`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    height: 220,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                    Log subject timings in a test attempt to compare against ideal
                    times (50m / 40m / 90m)
                  </p>
                </div>
              )}
            </div>

            {/* Mistake Heatmap: Topics Costing the Most Negative Marks */}
            <div className="card" style={{ padding: 24 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="card-title flex items-center gap-2">
                    <Flame size={15} style={{ color: 'var(--danger)' }} />
                    Mistake Heatmap — Negative Marks Cost by Topic
                  </p>
                  <p
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-tertiary)',
                      marginTop: 2,
                    }}
                  >
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
                        : 'rgba(16, 185, 129, 0.12)';
                    const border =
                      intensity >= 0.66
                        ? 'rgba(244, 63, 94, 0.35)'
                        : intensity >= 0.35
                        ? 'rgba(245, 158, 11, 0.3)'
                        : 'rgba(16, 185, 129, 0.25)';
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
                          <p
                            style={{
                              fontSize: 10.5,
                              color: 'var(--text-secondary)',
                              marginTop: 2,
                            }}
                          >
                            {item.subject}
                          </p>
                        </div>
                        <div
                          className="flex items-end justify-between mt-3 pt-2"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <span
                            className="tabular-num"
                            style={{
                              fontSize: 16,
                              fontWeight: 800,
                              color: accentColor,
                            }}
                          >
                            -{item.marksLost.toFixed(1)}m
                          </span>
                          <span
                            className="tabular-num"
                            style={{
                              fontSize: 10.5,
                              color: 'var(--text-tertiary)',
                            }}
                          >
                            {item.count} err
                            {item.avgTimeSec > 0 ? ` · ${item.avgTimeSec}s` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    height: 220,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                    Log mistakes to populate the negative-mark topic heatmap
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Coach's Synthesis & Subject Ranking */}
          {narrative && insights && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="card lg:col-span-2" style={{ padding: 24 }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={15} style={{ color: 'var(--accent)' }} />
                  <p className="card-title">
                    Analytical Diagnostics & Pacing Synthesis
                  </p>
                </div>
                <div
                  className="space-y-2.5 text-sm"
                  style={{ color: 'var(--text-secondary)', lineHeight: 1.65 }}
                >
                  <p>
                    Across your last{' '}
                    <strong className="tabular-num">{narrative.n}</strong> test
                    events, your trajectory is{' '}
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
                    . Your latest attempt (
                    <strong>{narrative.last.attemptName}</strong>) shifted by{' '}
                    <strong
                      className="tabular-num"
                      style={{
                        color:
                          narrative.lastDelta >= 0
                            ? 'var(--success)'
                            : 'var(--danger)',
                      }}
                    >
                      {narrative.lastDelta >= 0
                        ? `+${narrative.lastDelta.toFixed(1)}%`
                        : `${narrative.lastDelta.toFixed(1)}%`}
                    </strong>{' '}
                    compared to the preceding test.
                  </p>
                  <p>
                    <strong style={{ color: 'var(--success)' }}>
                      {insights.strongest.name}
                    </strong>{' '}
                    leads in accuracy at{' '}
                    <span className="tabular-num">
                      {insights.strongest.avgAccuracy.toFixed(1)}%
                    </span>
                    , whereas{' '}
                    <strong style={{ color: 'var(--danger)' }}>
                      {insights.weakest.name}
                    </strong>{' '}
                    sits at{' '}
                    <span className="tabular-num">
                      {insights.weakest.avgAccuracy.toFixed(1)}%
                    </span>{' '}
                    (a <span className="tabular-num">{narrative.gap.toFixed(1)}</span>
                    -point accuracy delta).
                  </p>
                  <p>
                    Cumulative negative marking has cost{' '}
                    <strong
                      className="tabular-num"
                      style={{ color: 'var(--danger)' }}
                    >
                      -{narrative.totalNegLost.toFixed(1)} marks
                    </strong>{' '}
                    (
                    <span className="tabular-num">
                      {narrative.negPctOfMax.toFixed(1)}%
                    </span>{' '}
                    of total maximum marks). Eliminating low-probability 50/50
                    guesses in <strong>{insights.weakest.name}</strong> offers the
                    fastest immediate rank jump.
                  </p>
                </div>
              </div>

              <div className="card" style={{ padding: 24 }}>
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
                          <Icon
                            size={14}
                            style={{ color: item.color, flexShrink: 0 }}
                          />
                          <div className="min-w-0">
                            <p
                              style={{
                                fontSize: 10.5,
                                color: 'var(--text-tertiary)',
                              }}
                            >
                              {item.label}
                            </p>
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                              }}
                            >
                              {item.value}
                            </p>
                          </div>
                        </div>
                        <span
                          className="tabular-num"
                          style={{ fontSize: 11, color: 'var(--text-secondary)' }}
                        >
                          {item.sub}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <AttemptDetailPopover
        attempt={selectedAttempt}
        template={
          selectedAttempt
            ? templateMap.get(selectedAttempt.templateId)
            : undefined
        }
        onClose={() => setSelectedAttemptIdx(null)}
      />
    </div>
  );
}
