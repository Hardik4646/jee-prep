import { useState, useMemo } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  CheckCircle2,
  Clock,
  Trash2,
  ClipboardList,
  Pencil,
  AlignJustify,
  List,
  Layers,
} from 'lucide-react';
import { ExamTemplate, TestAttempt } from '../../types';
import { TEST_TYPES } from './helpers';
import { format, parseISO } from 'date-fns';

type SortField = 'date' | 'score' | 'percentage' | 'accuracy' | 'negative' | 'time';

export function TestHistory({
  attempts,
  templates,
  onDelete,
  onEdit,
}: {
  attempts: TestAttempt[];
  templates: ExamTemplate[];
  onDelete: (id: string) => void;
  onEdit: (attempt: TestAttempt) => void;
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
  const [denseMode, setDenseMode] = useState(true);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    const list = attempts
      .filter(a => filterTemplate === 'all' || a.templateId === filterTemplate)
      .filter(a => filterType === 'all' || a.testType === filterType)
      .filter(a => filterPattern === 'all' || a.pattern === filterPattern)
      .filter(a => !dateFrom || a.date >= dateFrom)
      .filter(a => !dateTo || a.date <= dateTo)
      .filter(
        a =>
          !search ||
          a.attemptName.toLowerCase().includes(search.toLowerCase()) ||
          a.templateName.toLowerCase().includes(search.toLowerCase())
      );
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortField) {
        case 'score':
          return (a.totalScore - b.totalScore) * dir;
        case 'percentage':
          return (a.percentage - b.percentage) * dir;
        case 'accuracy':
          return (a.accuracy - b.accuracy) * dir;
        case 'negative':
          return (a.marksLostToNegative - b.marksLostToNegative) * dir;
        case 'time':
          return ((a.timeTakenMinutes ?? 0) - (b.timeTakenMinutes ?? 0)) * dir;
        default:
          return (a.date.localeCompare(b.date) || a.createdAt - b.createdAt) * dir;
      }
    });
  }, [
    attempts,
    filterTemplate,
    filterType,
    filterPattern,
    dateFrom,
    dateTo,
    search,
    sortField,
    sortDir,
  ]);

  const hasFilters =
    filterTemplate !== 'all' ||
    filterType !== 'all' ||
    filterPattern !== 'all' ||
    dateFrom ||
    dateTo ||
    search;

  const clearFilters = () => {
    setFilterTemplate('all');
    setFilterType('all');
    setFilterPattern('all');
    setDateFrom('');
    setDateTo('');
    setSearch('');
  };

  if (attempts.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3" style={{ padding: '64px 24px' }}>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <ClipboardList size={22} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>No test events logged yet</p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Log a JEE Main or JEE Advanced test attempt to inspect subject timings and negative mark analytics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="flex items-center gap-2 flex-wrap" style={{ padding: '12px 16px' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by test name or template…"
            className="field"
            style={{ flex: 1, minWidth: 180, padding: '7px 12px' }}
          />
          <div
            className="flex items-center p-0.5 rounded-lg"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            {(['all', 'single', 'dual'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterPattern(p)}
                style={{
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: filterPattern === p ? 'var(--bg-surface)' : 'transparent',
                  color: filterPattern === p ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                {p === 'all' ? 'All Modes' : p === 'single' ? 'JEE Main' : 'JEE Advanced'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDenseMode(!denseMode)}
            className="btn-ghost"
            style={{ padding: '6px 10px', fontSize: 12 }}
            title="Toggle Table Density"
          >
            {denseMode ? <AlignJustify size={13} /> : <List size={13} />}
            <span className="hidden sm:inline">{denseMode ? 'Compact' : 'Comfortable'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="btn-ghost"
            style={{
              padding: '6px 11px',
              fontSize: 12,
              borderColor: showFilters || hasFilters ? 'rgba(13,148,136,0.4)' : undefined,
              color: showFilters || hasFilters ? 'var(--accent)' : undefined,
            }}
          >
            Filters
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="btn-ghost"
              style={{ padding: '6px 9px' }}
              title="Reset Filters"
            >
              <X size={13} />
            </button>
          )}
          <span className="tabular-num" style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
            {filtered.length}/{attempts.length}
          </span>
        </div>

        {showFilters && (
          <div
            style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 16px' }}
            className="flex flex-wrap gap-2 items-center animate-slide-down"
          >
            <select
              value={filterTemplate}
              onChange={e => setFilterTemplate(e.target.value)}
              className="field"
              style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
            >
              <option value="all">All Templates</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="field"
              style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
            >
              <option value="all">All Source Types</option>
              {TEST_TYPES.map(t => (
                <option key={t}>{t}</option>
              ))}
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
        )}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="w-full" style={{ minWidth: 740, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              {([
                { label: 'Test Event', field: null, align: 'left' as const },
                { label: 'Mode', field: null, align: 'left' as const },
                { label: 'Date', field: 'date' as SortField, align: 'left' as const },
                { label: 'Score', field: 'score' as SortField, align: 'right' as const },
                { label: 'Score %', field: 'percentage' as SortField, align: 'right' as const },
                { label: 'Accuracy', field: 'accuracy' as SortField, align: 'right' as const },
                { label: 'Neg Loss', field: 'negative' as SortField, align: 'right' as const },
                { label: 'Time (P/C/M)', field: 'time' as SortField, align: 'right' as const },
                { label: '', field: null, align: 'right' as const },
              ]).map((h, i) => (
                <th
                  key={i}
                  onClick={h.field ? () => toggleSort(h.field as SortField) : undefined}
                  style={{
                    padding: denseMode ? '9px 14px' : '13px 16px',
                    textAlign: h.align,
                    fontSize: 11,
                    fontWeight: 600,
                    color: sortField === h.field ? 'var(--accent)' : 'var(--text-tertiary)',
                    cursor: h.field ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    {h.label}
                    {h.field &&
                      (sortField === h.field ? (
                        sortDir === 'asc' ? (
                          <ChevronUp size={11} />
                        ) : (
                          <ChevronDown size={11} />
                        )
                      ) : (
                        <ChevronsUpDown size={11} style={{ opacity: 0.35 }} />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, idx) => {
              const isOpen = expanded === a.id;
              return (
                <RowBlock
                  key={a.id}
                  a={a}
                  idx={idx}
                  dense={denseMode}
                  isOpen={isOpen}
                  onToggle={() => setExpanded(isOpen ? null : a.id)}
                  onDelete={onDelete}
                  onEdit={onEdit}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowBlock({
  a,
  idx,
  dense,
  isOpen,
  onToggle,
  onDelete,
  onEdit,
}: {
  a: TestAttempt;
  idx: number;
  dense: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onEdit: (attempt: TestAttempt) => void;
}) {
  const cellPad = dense ? '9px 14px' : '14px 16px';
  const attemptedQ = a.totalCorrect + a.totalIncorrect;
  const secPerQ =
    a.timeTakenMinutes && attemptedQ > 0
      ? Math.round((a.timeTakenMinutes * 60) / attemptedQ)
      : null;

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: isOpen
            ? 'var(--accent-muted-bg)'
            : idx % 2 === 1
            ? 'rgba(23, 26, 33, 0.45)'
            : 'transparent',
          cursor: 'pointer',
          transition: 'background 120ms',
        }}
        className="hover:bg-[#1A1E26]"
      >
        <td style={{ padding: cellPad }}>
          <div className="flex items-center gap-2">
            {a.targetAchieved && (
              <CheckCircle2 size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {a.attemptName}
            </span>
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            {a.testType} · {a.templateName}
          </div>
        </td>
        <td style={{ padding: cellPad, whiteSpace: 'nowrap' }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: a.pattern === 'dual' ? 'var(--warning)' : 'var(--info)',
            }}
          >
            {a.pattern === 'dual' ? 'JEE Adv (P1+P2)' : 'JEE Main (1P)'}
          </span>
        </td>
        <td
          className="tabular-num"
          style={{ padding: cellPad, fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}
        >
          {format(parseISO(a.date), 'MMM d, yy')}
        </td>
        <td className="tabular-num" style={{ padding: cellPad, textAlign: 'right', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
            {a.totalScore.toFixed(1)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}> / {a.maxScore}</span>
        </td>
        <td className="tabular-num" style={{ padding: cellPad, textAlign: 'right', whiteSpace: 'nowrap' }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color:
                a.percentage >= 70
                  ? 'var(--success)'
                  : a.percentage >= 50
                  ? 'var(--warning)'
                  : 'var(--danger)',
            }}
          >
            {a.percentage.toFixed(1)}%
          </span>
        </td>
        <td
          className="tabular-num"
          style={{ padding: cellPad, textAlign: 'right', fontSize: 12.5, color: 'var(--text-secondary)' }}
        >
          {a.accuracy.toFixed(1)}%
        </td>
        <td className="tabular-num" style={{ padding: cellPad, textAlign: 'right', whiteSpace: 'nowrap' }}>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: a.marksLostToNegative > 0 ? 'var(--danger)' : 'var(--text-tertiary)',
            }}
          >
            -{a.marksLostToNegative.toFixed(1)}
          </span>
          {(a.totalSillyMistakes ?? 0) > 0 && (
            <span
              style={{
                display: 'block',
                fontSize: 10,
                color: 'var(--warning)',
                fontWeight: 600,
              }}
            >
              {a.totalSillyMistakes} silly Q
            </span>
          )}
        </td>
        <td
          className="tabular-num"
          style={{ padding: cellPad, textAlign: 'right', fontSize: 11.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}
        >
          {a.timePhysics || a.timeChemistry || a.timeMaths ? (
            <span>
              {a.timePhysics ?? 0}m / {a.timeChemistry ?? 0}m / {a.timeMaths ?? 0}m
            </span>
          ) : a.timeTakenMinutes ? (
            <span>{a.timeTakenMinutes}m total</span>
          ) : (
            <span style={{ color: 'var(--text-tertiary)' }}>—</span>
          )}
        </td>
        <td style={{ padding: cellPad, textAlign: 'right' }}>
          <ChevronDown
            size={14}
            style={{
              color: 'var(--text-tertiary)',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 180ms',
              display: 'inline-block',
            }}
          />
        </td>
      </tr>

      {isOpen && (
        <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
          <td colSpan={9} style={{ padding: '16px 18px' }}>
            <div className="space-y-4">
              {/* Paper-by-Paper & Subject-by-Subject Unified Event Breakdown */}
              {a.papers.map((paper, pi) => {
                const pt = a.paperTimings?.[pi];
                const pPhy = paper.timePhysics ?? pt?.physics;
                const pChem = paper.timeChemistry ?? pt?.chemistry;
                const pMath = paper.timeMaths ?? pt?.maths;
                const pTotTime = paper.timeTakenMinutes ?? ((pPhy ?? 0) + (pChem ?? 0) + (pMath ?? 0));

                return (
                  <div key={pi}>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Layers size={13} style={{ color: 'var(--accent)' }} />
                        <span className="section-label">
                          {a.pattern === 'dual'
                            ? `Paper ${pi + 1} — ${paper.totalScore.toFixed(1)} / ${paper.maxScore} (${((paper.totalScore / Math.max(1, paper.maxScore)) * 100).toFixed(1)}%)`
                            : `Single Paper — ${paper.totalScore.toFixed(1)} / ${paper.maxScore}`}
                        </span>
                      </div>
                      {pTotTime > 0 && (
                        <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                          Paper Time: {pTotTime} / 180m (P: {pPhy ?? 0}m · C: {pChem ?? 0}m · M: {pMath ?? 0}m)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {paper.subjects.map((s, si) => {
                        const subjTime =
                          s.timeSpentMinutes ??
                          (s.subjectName.toLowerCase().includes('phys')
                            ? pPhy
                            : s.subjectName.toLowerCase().includes('chem')
                            ? pChem
                            : pMath);
                        const subjAttempted = s.correct + s.incorrect;
                        const subjSecPerQ =
                          subjTime && subjAttempted > 0
                            ? Math.round((subjTime * 60) / subjAttempted)
                            : null;
                        const idealMin = s.subjectName.toLowerCase().includes('phys')
                          ? 50
                          : s.subjectName.toLowerCase().includes('chem')
                          ? 40
                          : 90;

                        return (
                          <div
                            key={si}
                            style={{
                              padding: '10px 12px',
                              background: 'var(--bg-surface)',
                              borderRadius: 'var(--radius-button)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {s.subjectName}
                              </span>
                              <span
                                className="tabular-num"
                                style={{
                                  fontSize: 13.5,
                                  fontWeight: 700,
                                  color: s.score >= 0 ? 'var(--success)' : 'var(--danger)',
                                }}
                              >
                                {s.score.toFixed(1)}{' '}
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                  / {s.maxScore.toFixed(0)}
                                </span>
                              </span>
                            </div>
                            <div
                              className="flex items-center justify-between text-[11px] font-mono flex-wrap gap-1"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              <span>
                                {s.correct}C · {s.incorrect}W · {s.unattempted}U · {s.accuracy.toFixed(0)}% acc
                                {(s.sillyMistakes ?? 0) > 0 && (
                                  <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                                    {' '}· {s.sillyMistakes} silly
                                  </span>
                                )}
                              </span>
                              {subjTime ? (
                                <span
                                  style={{
                                    color: subjTime > idealMin + 8 ? 'var(--warning)' : 'var(--text-secondary)',
                                  }}
                                >
                                  {subjTime}m/{idealMin}m{subjSecPerQ ? ` (${subjSecPerQ}s/Q)` : ''}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div
                className="flex items-center justify-between flex-wrap gap-3 pt-2"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {a.timeTakenMinutes && (
                    <span className="tabular-num flex items-center gap-1">
                      <Clock size={12} />
                      {a.timeTakenMinutes} / {a.pattern === 'dual' ? 360 : 180} min
                    </span>
                  )}
                  {secPerQ && <span className="tabular-num">· Avg {secPerQ}s / attempted Q</span>}
                  {a.percentile && (
                    <span className="tabular-num" style={{ color: 'var(--info)', fontWeight: 600 }}>
                      · {a.percentile}%ile
                    </span>
                  )}
                  {a.marksLostToNegative > 0 && (
                    <span className="tabular-num" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                      · -{a.marksLostToNegative.toFixed(1)} pts lost to negative marking
                    </span>
                  )}
                  {a.notes && (
                    <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      · "{a.notes}"
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(a)}
                    className="btn-ghost"
                    style={{ fontSize: 12, padding: '6px 11px' }}
                  >
                    <Pencil size={12} />
                    Edit Event
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(a.id)}
                    className="btn-ghost"
                    style={{
                      fontSize: 12,
                      padding: '6px 11px',
                      borderColor: 'rgba(244,63,94,0.2)',
                      color: 'var(--danger)',
                    }}
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
