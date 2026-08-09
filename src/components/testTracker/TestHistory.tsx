import { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronUp, ChevronsUpDown, CheckCircle2, Clock, Trash2, ClipboardList, Pencil } from 'lucide-react';
import { ExamTemplate, TestAttempt } from '../../types';
import { TEST_TYPES } from './helpers';
import { format, parseISO } from 'date-fns';

type SortField = 'date' | 'score' | 'percentage' | 'accuracy';

export function TestHistory({ attempts, templates, onDelete, onEdit }: {
  attempts: TestAttempt[]; templates: ExamTemplate[];
  onDelete: (id: string) => void; onEdit: (attempt: TestAttempt) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPattern, setFilterPattern] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    const list = attempts
      .filter(a => filterTemplate === 'all' || a.templateId === filterTemplate)
      .filter(a => filterType === 'all' || a.testType === filterType)
      .filter(a => filterPattern === 'all' || a.pattern === filterPattern)
      .filter(a => !dateFrom || a.date >= dateFrom)
      .filter(a => !dateTo || a.date <= dateTo)
      .filter(a => !search || a.attemptName.toLowerCase().includes(search.toLowerCase()) || a.templateName.toLowerCase().includes(search.toLowerCase()));
    const dir = sortDir === 'asc' ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      switch (sortField) {
        case 'score': return (a.totalScore - b.totalScore) * dir;
        case 'percentage': return (a.percentage - b.percentage) * dir;
        case 'accuracy': return (a.accuracy - b.accuracy) * dir;
        default: return (a.date.localeCompare(b.date) || a.createdAt - b.createdAt) * dir;
      }
    });
    return sorted;
  }, [attempts, filterTemplate, filterType, filterPattern, dateFrom, dateTo, search, sortField, sortDir]);

  const hasFilters = filterTemplate !== 'all' || filterType !== 'all' || filterPattern !== 'all' || dateFrom || dateTo || search;
  const clearFilters = () => { setFilterTemplate('all'); setFilterType('all'); setFilterPattern('all'); setDateFrom(''); setDateTo(''); setSearch(''); };

  if (attempts.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3" style={{ padding: '64px 24px' }}>
        <div className="w-14 h-14 rounded-[16px] flex items-center justify-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <ClipboardList size={24} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>No tests logged yet</p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Log a test attempt to start tracking your progress</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="flex items-center gap-2.5 flex-wrap" style={{ padding: '14px 18px' }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tests…" className="field" style={{ flex: 1, minWidth: 160 }} />
          <button onClick={() => setShowFilters(!showFilters)} className="btn-ghost" style={{ borderColor: showFilters || hasFilters ? 'rgba(13,148,136,0.4)' : undefined, color: showFilters || hasFilters ? 'var(--accent)' : undefined }}>Filters{hasFilters && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)', display: 'inline-block', marginLeft: 4 }} />}</button>
          {hasFilters && <button onClick={clearFilters} className="btn-ghost" style={{ padding: '9px 12px' }}><X size={13} /></button>}
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{filtered.length}/{attempts.length}</span>
        </div>
        {showFilters && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 18px' }} className="space-y-3 animate-slide-down">
            <div className="flex flex-wrap gap-2">
              <select value={filterTemplate} onChange={e => setFilterTemplate(e.target.value)} className="field" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}><option value="all">All Templates</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="field" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}><option value="all">All Types</option>{TEST_TYPES.map(t => <option key={t}>{t}</option>)}</select>
              <select value={filterPattern} onChange={e => setFilterPattern(e.target.value)} className="field" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}><option value="all">All Patterns</option><option value="single">Single Paper</option><option value="dual">Dual Paper</option></select>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="field" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }} />
              <span style={{ color: 'var(--text-tertiary)', alignSelf: 'center', fontSize: 12 }}>→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="field" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }} />
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="w-full" style={{ minWidth: 600 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {([
                { label: 'Test', field: null, hide: '' },
                { label: 'Template', field: null, hide: 'hidden md:table-cell' },
                { label: 'Date', field: 'date' as SortField, hide: '' },
                { label: 'Score', field: 'score' as SortField, hide: '' },
                { label: '%', field: 'percentage' as SortField, hide: '' },
                { label: 'Accuracy', field: 'accuracy' as SortField, hide: 'hidden md:table-cell' },
                { label: 'Pattern', field: null, hide: 'hidden lg:table-cell' },
                { label: '', field: null, hide: '' },
              ]).map((h, i) => (
                <th key={i} className={h.hide} onClick={h.field ? () => toggleSort(h.field as SortField) : undefined}
                  style={{ padding: '14px 18px', textAlign: i >= 6 ? 'right' : 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: sortField === h.field ? 'var(--accent)' : 'var(--text-tertiary)', cursor: h.field ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  <span className="inline-flex items-center gap-1">
                    {h.label}
                    {h.field && (sortField === h.field ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronsUpDown size={11} style={{ opacity: 0.4 }} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, idx) => {
              const isOpen = expanded === a.id;
              return (
                <RowBlock key={a.id} a={a} idx={idx} isOpen={isOpen} onToggle={() => setExpanded(isOpen ? null : a.id)} onDelete={onDelete} onEdit={onEdit} />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowBlock({ a, idx, isOpen, onToggle, onDelete, onEdit }: { a: TestAttempt; idx: number; isOpen: boolean; onToggle: () => void; onDelete: (id: string) => void; onEdit: (attempt: TestAttempt) => void }) {
  return (
    <>
      <tr onClick={onToggle}
        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = idx % 2 ? 'var(--bg-elevated)' : 'transparent'; }}
        style={{ borderBottom: '1px solid var(--border-subtle)', background: isOpen ? 'var(--accent-muted-bg)' : idx % 2 ? 'var(--bg-elevated)' : 'transparent', cursor: 'pointer', transition: 'background 120ms' }}>
        <td style={{ padding: '14px 18px' }}>
          <div className="flex items-center gap-2">
            {a.targetAchieved && <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />}
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{a.attemptName}</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{a.testType}</span>
        </td>
        <td className="hidden md:table-cell" style={{ padding: '14px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{a.templateName}</td>
        <td style={{ padding: '14px 12px', fontSize: 12, color: 'var(--text-tertiary)' }}>{format(parseISO(a.date), 'MMM d')}</td>
        <td style={{ padding: '14px 12px' }}><span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{a.totalScore.toFixed(1)}</span><span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}> / {a.maxScore}</span></td>
        <td style={{ padding: '14px 12px' }}><span style={{ fontSize: 14, fontWeight: 700, color: a.percentage >= 70 ? 'var(--success)' : a.percentage >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{a.percentage.toFixed(1)}%</span></td>
        <td className="hidden md:table-cell" style={{ padding: '14px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{a.accuracy.toFixed(1)}%</td>
        <td className="hidden lg:table-cell" style={{ padding: '14px 12px' }}><span className="badge" style={{ background: 'var(--accent-muted-bg)', color: 'var(--accent)', borderColor: 'rgba(13,148,136,0.2)' }}>{a.pattern === 'single' ? 'Single' : 'Dual'}</span></td>
        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
          <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
        </td>
      </tr>
      {isOpen && (
        <tr style={{ background: 'var(--bg-elevated)' }}>
          <td colSpan={8} style={{ padding: '16px 18px' }}>
            <div className="space-y-3">
              {a.papers.map((paper, pi) => (
                <div key={pi}>
                  {a.pattern === 'dual' && <p className="section-label" style={{ marginBottom: 8 }}>Paper {pi + 1} — {paper.totalScore.toFixed(1)} / {paper.maxScore} ({((paper.totalScore / paper.maxScore) * 100).toFixed(1)}%)</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {paper.subjects.map((s, si) => (
                      <div key={si} style={{ padding: 12, background: 'var(--bg-surface)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.subjectName}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: s.score >= 0 ? 'var(--success)' : 'var(--danger)' }}>{s.score.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-3" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          <span>{s.correct}C</span><span>{s.incorrect}W</span><span>{s.unattempted}U</span><span>· {s.accuracy.toFixed(0)}% acc</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 flex-wrap" style={{ paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                {a.timeTakenMinutes && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}><Clock size={11} style={{ display: 'inline', marginRight: 4 }} />{a.timeTakenMinutes} min</span>}
                {a.difficultyRating && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{'★'.repeat(a.difficultyRating)}<span style={{ color: 'var(--border-subtle)' }}>{'★'.repeat(5 - a.difficultyRating)}</span></span>}
                {a.percentile && <span style={{ fontSize: 12, color: 'var(--info)' }}>Percentile: {a.percentile}</span>}
                {a.marksLostToNegative > 0 && <span style={{ fontSize: 12, color: 'var(--danger)' }}>Lost -{a.marksLostToNegative.toFixed(1)} to negative marking</span>}
                {a.notes && <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{a.notes}"</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(a)} className="btn-ghost" style={{ fontSize: 12, padding: '7px 12px', borderColor: 'rgba(13,148,136,0.3)', color: 'var(--accent)' }}><Pencil size={12} />Edit</button>
                <button onClick={() => onDelete(a.id)} className="btn-ghost" style={{ fontSize: 12, padding: '7px 12px', borderColor: 'rgba(245,69,92,0.2)', color: 'var(--danger)' }}><Trash2 size={12} />Delete</button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
