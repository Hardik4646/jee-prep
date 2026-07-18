import { useState, useMemo } from 'react';
import { Plus, X, Trash2, Search, BookMarked, Tag } from 'lucide-react';
import { ImportantNote, Subject } from '../types';

interface ImportantNotesProps {
  notes: ImportantNote[];
  setNotes: (n: ImportantNote[] | ((p: ImportantNote[]) => ImportantNote[])) => void;
}

const SUBJECTS: Subject[] = ['Physics', 'Mathematics', 'Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'];
const SUBJECT_COLORS: Record<Subject, { hex: string; bg: string; border: string; text: string }> = {
  Physics:               { hex: '#38BDF8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.25)',  text: '#38BDF8' },
  Mathematics:           { hex: '#FB923C', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.25)',  text: '#FB923C' },
  'Physical Chemistry':  { hex: '#F5A623', bg: 'rgba(245,166,35,0.12)',  border: 'rgba(245,166,35,0.25)',  text: '#F5A623' },
  'Organic Chemistry':   { hex: '#22C55E', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)',   text: '#22C55E' },
  'Inorganic Chemistry': { hex: '#F5455C', bg: 'rgba(245,69,92,0.12)',   border: 'rgba(245,69,92,0.25)',   text: '#F5455C' },
};

const genId = () => Math.random().toString(36).substr(2, 9);

export function ImportantNotes({ notes, setNotes }: ImportantNotesProps) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<Subject | 'all'>('all');
  const [formData, setFormData] = useState({ subject: 'Physics' as Subject, tags: '', note: '' });

  const valid = Array.isArray(notes) ? notes : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.note.trim()) return;
    setNotes(prev => [{
      id: genId(), subject: formData.subject,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      note: formData.note, createdAt: Date.now(),
    }, ...(Array.isArray(prev) ? prev : [])]);
    setFormData({ subject: 'Physics', tags: '', note: '' });
    setShowForm(false);
  };

  const filtered = useMemo(() =>
    valid.filter(n => subjectFilter === 'all' || n.subject === subjectFilter)
      .filter(n => !search || n.note.toLowerCase().includes(search.toLowerCase()) || n.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => b.createdAt - a.createdAt),
  [valid, subjectFilter, search]);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Important Notes</h2>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{valid.length} saved notes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className={showForm ? 'btn-ghost' : 'btn-primary'}>
          {showForm ? <><X size={15} />Cancel</> : <><Plus size={15} />Add Note</>}
        </button>
      </div>

      {showForm && (
        <div className="card animate-slide-down" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Subject</label>
                <select value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value as Subject })} className="field">
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Tags</label>
                <input type="text" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} placeholder="formula, key-concept" className="field" />
              </div>
            </div>
            <div>
              <label className="field-label">Note / Formula</label>
              <textarea value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} rows={3} placeholder="Write your note or formula here…" className="field" style={{ resize: 'none' }} />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" style={{ background: 'var(--success)' }}>
                <BookMarked size={14} />Save Note
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: '14px 18px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…"
            className="field" style={{ paddingLeft: 34, paddingTop: 9, paddingBottom: 9 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', ...SUBJECTS].map(s => {
            const active = subjectFilter === s;
            const sc = s !== 'all' ? SUBJECT_COLORS[s as Subject] : null;
            return (
              <button key={s} onClick={() => setSubjectFilter(s as any)}
                style={{ padding: '6px 12px', borderRadius: 'var(--radius-badge)', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: active ? (sc?.border ?? 'rgba(13,148,136,0.4)') : 'var(--border-subtle)', background: active ? (sc?.bg ?? 'var(--accent-muted-bg)') : 'var(--bg-elevated)', color: active ? (sc?.text ?? 'var(--accent)') : 'var(--text-secondary)', transition: 'all 150ms' }}>
                {s === 'all' ? 'All' : s.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3" style={{ padding: '64px 24px' }}>
          <BookMarked size={28} style={{ color: 'var(--text-tertiary)' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>No notes found</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{valid.length === 0 ? 'Click "Add Note" to create your first one' : 'Try adjusting your search or filters'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(note => {
            const sc = SUBJECT_COLORS[note.subject];
            return (
              <div key={note.id} className="card group" style={{ padding: 24, borderLeft: `3px solid ${sc.hex}` }}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="badge" style={{ background: sc.bg, color: sc.text, borderColor: sc.border, fontSize: 10 }}>{note.subject}</span>
                  <button onClick={() => setNotes(prev => (Array.isArray(prev) ? prev : []).filter(n => n.id !== note.id))}
                    style={{ padding: '4px', borderRadius: 'var(--radius-button)', opacity: 0, transition: 'all 150ms', cursor: 'pointer', background: 'var(--danger-bg)', border: '1px solid rgba(245,69,92,0.15)', color: 'var(--danger)' }}
                    className="group-hover:!opacity-100">
                    <Trash2 size={12} />
                  </button>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{note.note}</p>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {note.tags.map((t, i) => (
                      <span key={i} className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '2px 8px', borderRadius: 'var(--radius-badge)' }}>
                        <Tag size={9} />{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
