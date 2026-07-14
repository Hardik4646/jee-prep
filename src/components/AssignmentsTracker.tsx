import { useState, useMemo, memo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, X, Save, Trash2, ClipboardCheck, TrendingUp, Target, Award } from 'lucide-react';
import { InorganicAssignment, AssignmentType } from '../types';
import { format, parseISO } from 'date-fns';

interface AssignmentsTrackerProps {
  assignments: InorganicAssignment[];
  setAssignments: (a: InorganicAssignment[] | ((p: InorganicAssignment[]) => InorganicAssignment[])) => void;
}

const TYPES: AssignmentType[] = ['CSC', 'TFT', 'Other'];
const TYPE_COLORS: Record<AssignmentType, { hex: string; bg: string; border: string; text: string }> = {
  CSC:   { hex: '#4F6BFF', bg: 'rgba(79,107,255,0.12)',  border: 'rgba(79,107,255,0.25)',  text: '#4F6BFF' },
  TFT:   { hex: '#22C55E', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)',   text: '#22C55E' },
  Other: { hex: '#F5A623', bg: 'rgba(245,166,35,0.12)',  border: 'rgba(245,166,35,0.25)',  text: '#F5A623' },
};
const genId = () => Math.random().toString(36).substr(2, 9);

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: '10px 12px' }}>
      {label && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</p>}
      {payload.map((p: any, i: number) => <p key={i} style={{ fontSize: 13, fontWeight: 700, color: p.color || '#fff' }}>{p.name}: {typeof p.value === 'number' && p.name?.includes('%') ? `${p.value.toFixed(1)}%` : p.value}</p>)}
    </div>
  );
};

const MarksChart = memo(({ data }: { data: { name: string; marks: number }[] }) => (
  <div style={{ height: 180 }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="marksGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" />
        <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" width={24} />
        <Tooltip content={<ChartTip />} />
        <Area type="monotoneX" dataKey="marks" name="Marks" stroke="var(--accent)" strokeWidth={3} fill="url(#marksGrad)" dot={false} activeDot={{ r: 5, fill: 'var(--accent)', strokeWidth: 0 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
));
MarksChart.displayName = 'MarksChart';

const AccuracyBarChart = memo(({ data }: { data: { type: string; accuracy: number; color: string }[] }) => (
  <div style={{ height: 180 }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" vertical={false} />
        <XAxis dataKey="type" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} stroke="transparent" />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} stroke="transparent" width={24} />
        <Tooltip content={<ChartTip />} />
        <Bar dataKey="accuracy" name="Accuracy %" radius={[6, 6, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
));
AccuracyBarChart.displayName = 'AccuracyBarChart';

function emptyForm() {
  return { type: 'CSC' as AssignmentType, name: '', date: format(new Date(), 'yyyy-MM-dd'), totalQ: '', attempted: '', correct: '', marks: '' };
}

export function AssignmentsTracker({ assignments, setAssignments }: AssignmentsTrackerProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const valid = Array.isArray(assignments) ? assignments : [];

  const stats = useMemo(() => {
    if (!valid.length) return { total: 0, avgAccuracy: 0, avgCompletion: 0, totalMarks: 0 };
    const total = valid.length;
    const avgAccuracy = valid.reduce((s, a) => s + (a.totalAttempted > 0 ? (a.totalCorrect / a.totalAttempted) * 100 : 0), 0) / total;
    const avgCompletion = valid.reduce((s, a) => s + (a.totalQuestions > 0 ? (a.totalAttempted / a.totalQuestions) * 100 : 0), 0) / total;
    const totalMarks = valid.reduce((s, a) => s + a.marksObtained, 0);
    return { total, avgAccuracy, avgCompletion, totalMarks };
  }, [valid]);

  const marksData = useMemo(() => [...valid].sort((a, b) => a.date.localeCompare(b.date)).slice(-10).map(a => ({ name: a.assignmentName.slice(0, 10), marks: a.marksObtained })), [valid]);

  const typeData = useMemo(() => TYPES.map(t => {
    const items = valid.filter(a => a.assignmentType === t);
    const avg = items.length > 0 ? items.reduce((s, a) => s + (a.totalAttempted > 0 ? (a.totalCorrect / a.totalAttempted) * 100 : 0), 0) / items.length : 0;
    return { type: t, accuracy: parseFloat(avg.toFixed(1)), count: items.length, color: TYPE_COLORS[t].hex };
  }), [valid]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setAssignments(prev => [{
      id: genId(), assignmentType: form.type, assignmentName: form.name,
      totalQuestions: parseInt(form.totalQ) || 0, totalAttempted: parseInt(form.attempted) || 0,
      totalCorrect: parseInt(form.correct) || 0, marksObtained: parseFloat(form.marks) || 0,
      date: form.date, createdAt: Date.now(),
    }, ...(Array.isArray(prev) ? prev : [])]);
    setForm(emptyForm());
    setShowForm(false);
  };

  const liveAccuracy = form.attempted && form.correct ? ((parseInt(form.correct) / parseInt(form.attempted)) * 100).toFixed(1) : null;
  const liveCompletion = form.totalQ && form.attempted ? ((parseInt(form.attempted) / parseInt(form.totalQ)) * 100).toFixed(1) : null;

  const kpis = [
    { label: 'Total Assignments', value: stats.total, color: 'var(--accent)', bg: 'var(--accent-muted-bg)', icon: ClipboardCheck },
    { label: 'Avg Accuracy', value: `${stats.avgAccuracy.toFixed(1)}%`, color: 'var(--success)', bg: 'var(--success-bg)', icon: Target },
    { label: 'Avg Completion', value: `${stats.avgCompletion.toFixed(1)}%`, color: 'var(--warning)', bg: 'var(--warning-bg)', icon: TrendingUp },
    { label: 'Total Marks', value: stats.totalMarks, color: 'var(--danger)', bg: 'var(--danger-bg)', icon: Award },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Assignments</h2>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{valid.length} logged</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className={showForm ? 'btn-ghost' : 'btn-primary'}>
          {showForm ? <><X size={15} />Cancel</> : <><Plus size={15} />Add Assignment</>}
        </button>
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
            </div>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <div className="card animate-slide-down" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="field-label">Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as AssignmentType })} className="field">{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="col-span-2"><label className="field-label">Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Assignment name" className="field" /></div>
              <div><label className="field-label">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="field" /></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[['Total Questions', 'totalQ'], ['Attempted', 'attempted'], ['Correct', 'correct'], ['Marks', 'marks']].map(([label, key]) => (
                <div key={key}><label className="field-label">{label}</label><input type="number" value={form[key as keyof typeof form]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="field" min={0} /></div>
              ))}
            </div>
            {(liveAccuracy || liveCompletion) && (
              <div className="flex gap-3 flex-wrap">
                {liveAccuracy && <div style={{ padding: '8px 14px', borderRadius: 'var(--radius-button)', background: 'var(--success-bg)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>Accuracy: {liveAccuracy}%</div>}
                {liveCompletion && <div style={{ padding: '8px 14px', borderRadius: 'var(--radius-button)', background: 'var(--warning-bg)', border: '1px solid rgba(245,166,35,0.2)', fontSize: 12, fontWeight: 700, color: 'var(--warning)' }}>Completion: {liveCompletion}%</div>}
              </div>
            )}
            <div className="flex justify-end">
              <button type="submit" className="btn-primary"><Save size={14} />Save Assignment</button>
            </div>
          </form>
        </div>
      )}

      {/* Charts */}
      {valid.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card" style={{ padding: '24px' }}>
            <p className="card-title" style={{ marginBottom: 16 }}>Marks Trend (Last 10)</p>
            <MarksChart data={marksData} />
          </div>
          <div className="card" style={{ padding: '24px' }}>
            <p className="card-title" style={{ marginBottom: 16 }}>Accuracy by Type</p>
            <AccuracyBarChart data={typeData} />
          </div>
        </div>
      )}

      {/* History */}
      {valid.length > 0 && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
            <p className="card-title">History</p>
          </div>
          <table className="w-full" style={{ minWidth: 500 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Name', 'Type', 'Acc %', 'Marks', 'Date', ''].map((h, i) => (
                  <th key={i} className={i === 2 || i === 3 ? 'hidden sm:table-cell' : ''} style={{ padding: '12px 18px', textAlign: i >= 4 ? 'right' : 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...valid].sort((a, b) => b.date.localeCompare(a.date)).map((a, i) => {
                const acc = a.totalAttempted > 0 ? (a.totalCorrect / a.totalAttempted) * 100 : 0;
                const tc = TYPE_COLORS[a.assignmentType];
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 ? 'var(--bg-elevated)' : 'transparent' }}>
                    <td style={{ padding: '12px 18px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.assignmentName}</td>
                    <td style={{ padding: '12px 12px' }}>
                      <span className="badge" style={{ background: tc.bg, color: tc.text, borderColor: tc.border, fontSize: 10 }}>{a.assignmentType}</span>
                    </td>
                    <td className="hidden sm:table-cell" style={{ padding: '12px 12px', fontSize: 14, fontWeight: 700, color: acc >= 70 ? 'var(--success)' : acc >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{acc.toFixed(1)}%</td>
                    <td className="hidden sm:table-cell" style={{ padding: '12px 12px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{a.marksObtained}</td>
                    <td style={{ padding: '12px 12px', fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'right' }}>{format(parseISO(a.date), 'MMM d')}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <button onClick={() => setAssignments(prev => (Array.isArray(prev) ? prev : []).filter(x => x.id !== a.id))}
                        style={{ padding: '5px 8px', borderRadius: 'var(--radius-button)', background: 'var(--danger-bg)', border: '1px solid rgba(245,69,92,0.15)', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, opacity: 0.6, transition: 'opacity 150ms' }}
                        className="hover:!opacity-100">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
