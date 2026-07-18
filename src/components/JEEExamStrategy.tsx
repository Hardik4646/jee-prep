import { useState, useMemo, memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, CheckCircle2, Zap, Brain, Calculator } from 'lucide-react';
import { Mistake, Subject, ErrorCategory } from '../types';

interface JEEExamStrategyProps {
  mistakes: Mistake[];
  setMistakes: (m: Mistake[] | ((p: Mistake[]) => Mistake[])) => void;
}

const SUBJECTS: Subject[] = ['Physics', 'Mathematics', 'Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'];
const CARELESS: ErrorCategory[] = ['Calculation', 'Careless/Silly', 'Question Misread'];
const CONCEPTUAL: ErrorCategory[] = ['Conceptual Gap', 'Formula Misapplication'];

const SUBJECT_COLORS: Record<Subject, string> = {
  Physics: '#38BDF8', Mathematics: '#FB923C', 'Physical Chemistry': '#F5A623',
  'Organic Chemistry': '#22C55E', 'Inorganic Chemistry': '#F5455C',
};

const ChartTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return <div className="card" style={{ padding: '10px 12px' }}><p style={{ fontSize: 13, fontWeight: 700, color: payload[0].payload.color }}>{payload[0].name}: {payload[0].value}</p></div>;
};

const SubjectPie = memo(({ data }: { data: { name: string; value: number; color: string }[] }) => (
  <div style={{ width: 140, height: 140, flexShrink: 0 }}>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={2} dataKey="value">
          {data.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
        </Pie>
        <Tooltip content={<ChartTip />} />
      </PieChart>
    </ResponsiveContainer>
  </div>
));
SubjectPie.displayName = 'SubjectPie';

export function JEEExamStrategy({ mistakes, setMistakes }: JEEExamStrategyProps) {
  const [focusSubject, setFocusSubject] = useState<Subject | 'all'>('all');
  const valid = Array.isArray(mistakes) ? mistakes : [];

  const marks = useMemo(() => {
    const careless = valid.filter(m => CARELESS.includes(m.errorCategory) && m.status === 'Active');
    const conceptual = valid.filter(m => CONCEPTUAL.includes(m.errorCategory) && m.status === 'Active');
    return { careless: careless.length, conceptual: conceptual.length, total: valid.filter(m => m.status === 'Active').length };
  }, [valid]);

  const subjectStats = useMemo(() => SUBJECTS.map(s => {
    const sub = valid.filter(m => m.subject === s);
    const active = sub.filter(m => m.status === 'Active').length;
    const mastered = sub.filter(m => m.status === 'Mastered').length;
    const total = sub.length;
    const rate = total > 0 ? Math.round((mastered / total) * 100) : 0;
    const hp = sub.filter(m => m.priority === 'High' && m.status === 'Active').length;
    return { subject: s, total, active, mastered, rate, hp, color: SUBJECT_COLORS[s] };
  }).sort((a, b) => b.active - a.active), [valid]);

  const pieData = useMemo(() => SUBJECTS.map(s => ({ name: s, value: valid.filter(m => m.subject === s && m.status === 'Active').length, color: SUBJECT_COLORS[s] })).filter(d => d.value > 0), [valid]);

  const focusList = useMemo(() => {
    const pool = focusSubject === 'all' ? valid : valid.filter(m => m.subject === focusSubject);
    return pool.filter(m => m.status === 'Active' && m.priority === 'High').sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  }, [valid, focusSubject]);

  const markMastered = (id: string) => setMistakes(prev => (Array.isArray(prev) ? prev : []).map(m => m.id === id ? { ...m, status: 'Mastered', masteredAt: Date.now(), nextReviewAt: Date.now() + 86400000 } : m));

  const markCards = [
    { label: 'Careless Errors', value: marks.careless * 4, sub: `${marks.careless} mistakes at risk`, color: 'var(--warning)', bg: 'var(--warning-bg)', icon: Calculator },
    { label: 'Conceptual Gaps', value: marks.conceptual * 4, sub: `${marks.conceptual} mistakes at risk`, color: 'var(--info)', bg: 'var(--info-bg)', icon: Brain },
    { label: 'Total at Risk', value: marks.total * 4, sub: 'If all repeats in exam', color: 'var(--danger)', bg: 'var(--danger-bg)', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="page-title">Exam Strategy</h2>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Intelligent revision map based on your error log</p>
      </div>

      {/* Marks at risk */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {markCards.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card" style={{ padding: '24px' }}>
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-4" style={{ background: k.bg, border: `1px solid ${k.color}30` }}>
                <Icon size={18} style={{ color: k.color }} />
              </div>
              <div className="stat-number">{k.value}<span style={{ fontSize: 16, fontWeight: 700 }}> pts</span></div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 6, marginBottom: 2 }}>{k.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{k.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Subject breakdown + pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ padding: '24px' }}>
          <p className="card-title" style={{ marginBottom: 18 }}>Subject Breakdown</p>
          <div className="space-y-4">
            {subjectStats.map(s => (
              <div key={s.subject}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.subject}</span>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.mastered}/{s.total}</span>
                    {s.hp > 0 && <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', borderColor: 'rgba(245,69,92,0.2)', fontSize: 10 }}>{s.hp} HP</span>}
                    <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.rate}%</span>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.rate}%`, background: s.color, borderRadius: 999, transition: 'width 700ms ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <p className="card-title" style={{ marginBottom: 4 }}>Active Mistakes by Subject</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>Where to focus revision</p>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <SubjectPie data={pieData} />
              <div className="flex-1 space-y-2">
                {pieData.map(e => (
                  <div key={e.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name.replace(' Chemistry', '')}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 size={28} style={{ color: 'var(--success)' }} />
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>All mistakes mastered!</p>
            </div>
          )}
        </div>
      </div>

      {/* Focus list */}
      <div className="card" style={{ padding: '24px' }}>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,166,35,0.2)' }}>
              <Zap size={13} style={{ color: 'var(--warning)' }} />
            </div>
            <p className="card-title">High Priority — Revise Now</p>
          </div>
          <select value={focusSubject} onChange={e => setFocusSubject(e.target.value as any)} className="field" style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}>
            <option value="all">All Subjects</option>
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {focusList.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2">
            <CheckCircle2 size={28} style={{ color: 'var(--success)' }} />
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No high-priority active mistakes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {focusList.map(m => (
              <div key={m.id} className="flex items-center gap-3 group" style={{ padding: '12px 14px', borderRadius: 'var(--radius-card)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: SUBJECT_COLORS[m.subject], flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.chapter || 'Untitled'}</p>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.subject}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>·</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.errorCategory}</span>
                  </div>
                </div>
                <button onClick={() => markMastered(m.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 'var(--radius-button)', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(34,197,94,0.25)', background: 'var(--success-bg)', color: 'var(--success)', flexShrink: 0, transition: 'all 150ms' }}>
                  <CheckCircle2 size={12} />Done
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
