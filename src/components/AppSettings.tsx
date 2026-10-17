import { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Database,
  Shield,
  FileSpreadsheet,
  History,
  RotateCcw,
} from 'lucide-react';
import {
  Mistake,
  ImportantNote,
  InorganicAssignment,
  ExamTemplate,
  TestAttempt,
  SyllabusChapter,
  BackupSnapshot,
} from '../types';
import {
  sanitizeMistake,
  sanitizeNote,
  sanitizeAssignment,
  sanitizeTemplate,
  sanitizeAttempt,
  sanitizeChapter,
} from '../utils/security';
import {
  listBackupSnapshots,
  saveAutoBackupSnapshot,
  generateCsvContent,
  triggerFileDownload,
} from '../utils/backupDb';
import { format } from 'date-fns';

interface AppSettingsProps {
  mistakes: Mistake[];
  notes: ImportantNote[];
  assignments: InorganicAssignment[];
  testTemplates: ExamTemplate[];
  testAttempts: TestAttempt[];
  syllabus: SyllabusChapter[];
  onReset: () => void;
  onImport: (
    data: {
      mistakes: Mistake[];
      notes: ImportantNote[];
      assignments: InorganicAssignment[];
      testTemplates: ExamTemplate[];
      testAttempts: TestAttempt[];
      syllabus: SyllabusChapter[];
    },
    mode: 'merge' | 'replace'
  ) => void;
  onClose: () => void;
}

export function AppSettings({
  mistakes,
  notes,
  assignments,
  testTemplates,
  testAttempts,
  syllabus,
  onReset,
  onImport,
  onClose,
}: AppSettingsProps) {
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMsg, setImportMsg] = useState('');
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);

  useEffect(() => {
    listBackupSnapshots().then(setSnapshots);
  }, []);

  const handleExportJson = () => {
    const payload = {
      version: '6.1',
      exportDate: new Date().toISOString(),
      mistakes,
      notes,
      assignments,
      testTemplates,
      testAttempts,
      syllabus,
    };
    triggerFileDownload(
      JSON.stringify(payload, null, 2),
      `jee-prep-ledger-backup-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
  };

  const handleExportMistakesCsv = () => {
    const headers = [
      'ID',
      'Date',
      'Subject',
      'Chapter',
      'ErrorCategory',
      'Priority',
      'Status',
      'MarksLost',
      'TimeSpentSeconds',
      'ReviewCount',
      'Tags',
      'Notes',
    ];
    const rows = mistakes.map(m => [
      m.id,
      m.date,
      m.subject,
      m.chapter,
      m.errorCategory,
      m.priority,
      m.status,
      m.marksLost ?? 0,
      m.questionTimeSeconds ?? '',
      m.reviewCount ?? 0,
      (m.tags ?? []).join(';'),
      m.notes,
    ]);
    triggerFileDownload(
      generateCsvContent(headers, rows),
      `jee-mistakes-${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  const handleExportTestsCsv = () => {
    const headers = [
      'ID',
      'Date',
      'AttemptName',
      'TemplateName',
      'Pattern',
      'TestType',
      'TotalScore',
      'MaxScore',
      'Percentage',
      'Accuracy',
      'Correct',
      'Incorrect',
      'Unattempted',
      'MarksLostToNegative',
      'TimePhysicsMin',
      'TimeChemistryMin',
      'TimeMathsMin',
      'TotalTimeMin',
      'Percentile',
    ];
    const rows = testAttempts.map(a => [
      a.id,
      a.date,
      a.attemptName,
      a.templateName,
      a.pattern === 'dual' ? 'JEE Advanced (Dual)' : 'JEE Main (Single)',
      a.testType,
      a.totalScore,
      a.maxScore,
      a.percentage.toFixed(2),
      a.accuracy.toFixed(2),
      a.totalCorrect,
      a.totalIncorrect,
      a.totalUnattempted,
      a.marksLostToNegative,
      a.timePhysics ?? '',
      a.timeChemistry ?? '',
      a.timeMaths ?? '',
      a.timeTakenMinutes ?? '',
      a.percentile ?? '',
    ]);
    triggerFileDownload(
      generateCsvContent(headers, rows),
      `jee-test-attempts-${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  const handleManualSnapshot = async () => {
    const snap = await saveAutoBackupSnapshot(
      { mistakes, notes, assignments, testTemplates, testAttempts, syllabus },
      'Manual Checkpoint'
    );
    if (snap) {
      const updated = await listBackupSnapshots();
      setSnapshots(updated);
      setImportStatus('success');
      setImportMsg('Created local IndexedDB recovery checkpoint.');
      setTimeout(() => setImportStatus('idle'), 4000);
    }
  };

  const handleRestoreSnapshot = (snap: BackupSnapshot) => {
    onImport(snap.payload, 'replace');
    setImportStatus('success');
    setImportMsg(
      `Restored snapshot from ${format(new Date(snap.timestamp), 'MMM d, HH:mm:ss')} (${snap.itemCount} records).`
    );
    setTimeout(() => setImportStatus('idle'), 5000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        if (!raw || typeof raw !== 'object') throw new Error('Invalid JSON structure');

        const m = (Array.isArray(raw.mistakes) ? raw.mistakes : [])
          .map((x: unknown) => sanitizeMistake(x))
          .filter((x: Mistake | null): x is Mistake => x !== null);
        const n = (Array.isArray(raw.notes) ? raw.notes : [])
          .map((x: unknown) => sanitizeNote(x))
          .filter((x: ImportantNote | null): x is ImportantNote => x !== null);
        const a = (Array.isArray(raw.assignments) ? raw.assignments : [])
          .map((x: unknown) => sanitizeAssignment(x))
          .filter((x: InorganicAssignment | null): x is InorganicAssignment => x !== null);
        const tt = (Array.isArray(raw.testTemplates) ? raw.testTemplates : [])
          .map((x: unknown) => sanitizeTemplate(x))
          .filter((x: ExamTemplate | null): x is ExamTemplate => x !== null);
        const ta = (Array.isArray(raw.testAttempts) ? raw.testAttempts : [])
          .map((x: unknown) => sanitizeAttempt(x))
          .filter((x: TestAttempt | null): x is TestAttempt => x !== null);
        const sy = (Array.isArray(raw.syllabus) ? raw.syllabus : [])
          .map((x: unknown) => sanitizeChapter(x))
          .filter((x: SyllabusChapter | null): x is SyllabusChapter => x !== null);

        const totalValid =
          m.length + n.length + a.length + tt.length + ta.length + sy.length;
        if (totalValid === 0)
          throw new Error('Schema validation failed: no valid records found in file');

        onImport(
          {
            mistakes: m,
            notes: n,
            assignments: a,
            testTemplates: tt,
            testAttempts: ta,
            syllabus: sy,
          },
          importMode
        );
        setImportStatus('success');
        setImportMsg(
          `${importMode === 'merge' ? 'Merged' : 'Restored'} ${m.length} mistakes · ${ta.length} test events · ${tt.length} templates · ${sy.length} chapters`
        );
        setTimeout(() => setImportStatus('idle'), 7000);
      } catch (err) {
        setImportStatus('error');
        setImportMsg(
          err instanceof Error ? err.message : 'Import failed — file failed schema validation.'
        );
        setTimeout(() => setImportStatus('idle'), 6000);
      }
    };
    reader.onerror = () => {
      setImportStatus('error');
      setImportMsg('Could not read the selected file.');
      setTimeout(() => setImportStatus('idle'), 6000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const total =
    mistakes.length +
    notes.length +
    assignments.length +
    testTemplates.length +
    testAttempts.length +
    syllabus.length;

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {importStatus !== 'idle' && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-button)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            background: importStatus === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${
              importStatus === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'
            }`,
            color: importStatus === 'success' ? 'var(--success)' : 'var(--danger)',
          }}
        >
          {importStatus === 'success' ? (
            <CheckCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          ) : (
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          )}
          <span style={{ fontSize: 12 }}>{importMsg}</span>
        </div>
      )}

      {/* Storage Overview */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-button)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-button)',
            background: 'var(--accent-muted-bg)',
            border: '1px solid rgba(13,148,136,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Database size={15} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Validated Local Storage & IndexedDB Vault
          </p>
          <p className="tabular-num" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {mistakes.length} mistakes · {testAttempts.length} tests · {testTemplates.length}{' '}
            templates · {notes.length} notes · {assignments.length} assignments
          </p>
        </div>
      </div>

      {/* Export Controls (JSON + CSV) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="section-label">Export Structured Data (JSON & CSV)</p>
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-button)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
          className="space-y-2.5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Full Workspace Snapshot (JSON v6.1)
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                Complete lossless archive ({total} records) for backup or migration
              </p>
            </div>
            <button onClick={handleExportJson} className="btn-primary" style={{ padding: '7px 12px', fontSize: 12 }}>
              <Download size={13} />
              JSON
            </button>
          </div>

          <div
            className="flex items-center justify-between gap-2 pt-2.5"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
              Spreadsheet Exports (CSV):
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportMistakesCsv}
                className="btn-ghost"
                style={{ padding: '5px 10px', fontSize: 11.5 }}
              >
                <FileSpreadsheet size={12} />
                Mistakes CSV
              </button>
              <button
                type="button"
                onClick={handleExportTestsCsv}
                className="btn-ghost"
                style={{ padding: '5px 10px', fontSize: 11.5 }}
              >
                <FileSpreadsheet size={12} />
                Tests CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Schema-Validated Import */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="flex items-center justify-between">
          <p className="section-label">Import & Schema Validation</p>
          <div
            className="flex gap-1"
            style={{
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-badge)',
              padding: 2,
              border: '1px solid var(--border-subtle)',
            }}
          >
            {(['merge', 'replace'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setImportMode(m)}
                style={{
                  padding: '3px 8px',
                  fontSize: 10.5,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  background: importMode === m ? 'var(--accent)' : 'transparent',
                  color: importMode === m ? '#fff' : 'var(--text-tertiary)',
                }}
              >
                {m === 'merge' ? 'Safe Merge' : 'Replace All'}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-button)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            gap: 12,
          }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {importMode === 'merge' ? 'Merge Validated Backup' : 'Replace with Backup File'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Sanitizes every record and validates schema before applying
            </p>
          </div>
          <label
            className="btn-primary"
            style={{ background: 'var(--success)', cursor: 'pointer', padding: '7px 12px', fontSize: 12 }}
          >
            <Upload size={13} />
            Upload JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* Automatic Local Backups (IndexedDB) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="flex items-center justify-between">
          <p className="section-label flex items-center gap-1.5">
            <History size={13} style={{ color: 'var(--accent)' }} />
            Automatic Local Backups (IndexedDB)
          </p>
          <button
            type="button"
            onClick={handleManualSnapshot}
            className="btn-ghost"
            style={{ padding: '4px 9px', fontSize: 11 }}
          >
            Snapshot Now
          </button>
        </div>

        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-button)',
            maxHeight: 145,
            overflowY: 'auto',
          }}
        >
          {snapshots.length === 0 ? (
            <p style={{ padding: 12, fontSize: 11.5, color: 'var(--text-tertiary)', textAlign: 'center' }}>
              Auto-backup snapshots are created automatically every 60 seconds
            </p>
          ) : (
            snapshots.slice(0, 5).map(snap => (
              <div
                key={snap.id}
                className="flex items-center justify-between px-3 py-2"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {snap.label}
                  </p>
                  <p className="tabular-num" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                    {format(new Date(snap.timestamp), 'MMM d, HH:mm:ss')} · {snap.itemCount} items
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestoreSnapshot(snap)}
                  className="btn-ghost"
                  style={{ padding: '4px 8px', fontSize: 11 }}
                >
                  <RotateCcw size={11} />
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)' }}>Danger Zone</p>
        {resetStep === 0 && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-button)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-elevated)',
              border: '1px solid rgba(244,63,94,0.18)',
              gap: 16,
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Reset Workspace Data
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                Permanently clear all {total} items from active storage
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResetStep(1)}
              className="btn-ghost"
              style={{ borderColor: 'rgba(244,63,94,0.25)', color: 'var(--danger)', padding: '6px 11px', fontSize: 12 }}
            >
              <Trash2 size={13} />
              Reset
            </button>
          </div>
        )}
        {resetStep === 1 && (
          <div
            style={{
              padding: 14,
              borderRadius: 'var(--radius-button)',
              background: 'var(--danger-bg)',
              border: '1px solid rgba(244,63,94,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <Shield size={15} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Confirm Workspace Reset?
                </p>
                <p style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  This clears {total} active items. You can still restore from IndexedDB snapshots above.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setResetStep(2)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-button)',
                  background: 'rgba(244,63,94,0.2)',
                  border: '1px solid rgba(244,63,94,0.35)',
                  color: 'var(--danger)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => setResetStep(0)}
                className="btn-ghost"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {resetStep === 2 && (
          <div
            style={{
              padding: 14,
              borderRadius: 'var(--radius-button)',
              background: 'var(--danger-bg)',
              border: '1px solid rgba(244,63,94,0.35)',
            }}
          >
            <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--danger)', marginBottom: 8 }}>
              Final confirmation — wipe all active records now?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setResetStep(0);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-button)',
                  background: 'var(--danger)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={12} />
                Wipe Everything
              </button>
              <button
                type="button"
                onClick={() => setResetStep(0)}
                className="btn-ghost"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
