import { useState, useMemo, memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ClipboardList, TrendingUp, Award, Target, BarChart3, AlertTriangle, Calculator } from 'lucide-react';
import { ExamTemplate, TestAttempt } from '../../types';
import { format, parseISO } from 'date-fns';

const TrendChart = memo(({ data, lines, height }: { data: any[]; lines: { key: string; name: string; color: string }[]; height?: number }) => (
  <div style={{ height: height ?? 200 }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" />
        <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" width={28} />
        <Tooltip content={({ active, payload, label }: any) => active && payload?.length ? (
          <div className="card" style={{ padding: '10px 12px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</p>
            {payload.map((p: any, i: number) => <p key={i} style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</p>)}
          </div>
        ) : null} />
        {lines.map(l => <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2.5} dot={{ r: 3, fill: l.color, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer>
  </div>
));
TrendChart.displayName = 'TrendChart';

type ChartMode = 'total' | 'subject' | 'paper' | 'accuracy' | 'negative';

export function TestAnalytics({ attempts, templates }: { attempts: TestAttempt[]; templates: ExamTemplate[] }) {
  const [filterTemplate, setFilterTemplate] = useState('all');
  const [filterPattern, setFilterPattern] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [chartMode, setChartMode] = useState<ChartMode>('total');

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

  const trendData = useMemo(() => filtered.map(a => ({
    label: format(parseISO(a.date), 'MMM d'), total: a.totalScore, percentage: a.percentage, accuracy: a.accuracy, negative: a.marksLostToNegative,
  })), [filtered]);

  const subjectTrend = useMemo(() => {
    const subjectNames = new Set<string>();
    filtered.forEach(a => a.papers.forEach(p => p.subjects.forEach(s => subjectNames.add(s.subjectName))));
    const colors = ['#4F6BFF', '#38BDF8', '#F5A623', '#22C55E', '#F5455C', '#9A9DAD'];
    const subjectList = Array.from(subjectNames);
    return {
      data: filtered.map(a => {
        const row: any = { label: format(parseISO(a.date), 'MMM d') };
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
      data: dual.map(a => ({ label: format(parseISO(a.date), 'MMM d'), paper1: a.papers[0]?.totalScore ?? 0, paper2: a.papers[1]?.totalScore ?? 0, combined: a.totalScore })),
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
            {chartMode === 'total' && <TrendChart data={trendData} lines={[{ key: 'total', name: 'Score', color: '#4F6BFF' }, { key: 'percentage', name: 'Percentage', color: '#22C55E' }]} />}
            {chartMode === 'subject' && <TrendChart data={subjectTrend.data} lines={subjectTrend.lines} height={240} />}
            {chartMode === 'paper' && paperTrend && <TrendChart data={paperTrend.data} lines={paperTrend.lines} />}
            {chartMode === 'accuracy' && <TrendChart data={trendData} lines={[{ key: 'accuracy', name: 'Accuracy %', color: '#38BDF8' }]} />}
            {chartMode === 'negative' && <TrendChart data={trendData} lines={[{ key: 'negative', name: 'Marks Lost', color: '#F5455C' }]} />}
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
              <TrendChart data={filtered.filter(a => a.percentile).map(a => ({ label: format(parseISO(a.date), 'MMM d'), percentile: a.percentile }))} lines={[{ key: 'percentile', name: 'Percentile', color: '#38BDF8' }]} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
