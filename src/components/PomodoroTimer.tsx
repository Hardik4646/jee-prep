import { useState } from 'react';
import { Timer, Pause, Play, RotateCcw } from 'lucide-react';

interface PomodoroTimerProps {
  compact?: boolean;
  onComplete?: (minutes: number) => void;
}

export function PomodoroTimer({ compact = false, onComplete }: PomodoroTimerProps) {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [intervalId, setIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);

  const total = mode === 'focus' ? 25 * 60 : 5 * 60;
  const progress = ((total - secondsLeft) / total) * 100;
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  const clear = () => { if (intervalId) { clearInterval(intervalId); setIntervalId(null); } };

  const start = () => {
    if (running) return;
    setRunning(true);
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(id);
          setRunning(false);
          const totalElapsed = elapsed + 25;
          onComplete?.(totalElapsed);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    setIntervalId(id);
  };

  const pause = () => { clear(); setRunning(false); setElapsed(e => e + 1); };

  const reset = () => { clear(); setRunning(false); setSecondsLeft(mode === 'focus' ? 25 * 60 : 5 * 60); setElapsed(0); };

  const switchMode = (m: 'focus' | 'break') => { clear(); setMode(m); setSecondsLeft(m === 'focus' ? 25 * 60 : 5 * 60); setRunning(false); setElapsed(0); };

  if (compact) {
    const r = 13;
    const circ = 2 * Math.PI * r;
    return (
      <div className="flex items-center gap-3" style={{ padding: '8px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-button)' }}>
        <div style={{ position: 'relative', width: 32, height: 32 }}>
          <svg width="32" height="32" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={16} cy={16} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={2.5} />
            <circle cx={16} cy={16} r={r} fill="none" stroke={mode === 'focus' ? 'var(--accent)' : 'var(--success)'} strokeWidth={2.5}
              strokeDasharray={circ} strokeDashoffset={circ * (1 - progress / 100)} strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <Timer size={10} style={{ position: 'absolute', inset: 0, margin: 'auto', color: 'var(--text-tertiary)' }} />
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{mins}:{secs}</span>
        <button onClick={running ? pause : start} style={{ padding: '5px', borderRadius: 'var(--radius-button)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          {running ? <Pause size={11} /> : <Play size={11} />}
        </button>
        <button onClick={reset} style={{ padding: '5px', borderRadius: 'var(--radius-button)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
          <RotateCcw size={11} />
        </button>
      </div>
    );
  }

  const R = 28;
  const CIRC = 2 * Math.PI * R;
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">Focus Timer</p>
        <div className="flex gap-1" style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-button)', padding: 2 }}>
          {(['focus', 'break'] as const).map(m => (
            <button key={m} onClick={() => switchMode(m)}
              style={{ padding: '5px 10px', borderRadius: 'var(--radius-button)', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-tertiary)', transition: 'all 150ms' }}>
              {m === 'focus' ? '25m' : '5m'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
          <svg width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={34} cy={34} r={R} fill="none" stroke="var(--border-subtle)" strokeWidth={4.5} />
            <circle cx={34} cy={34} r={R} fill="none" stroke={mode === 'focus' ? 'var(--accent)' : 'var(--success)'} strokeWidth={4.5}
              strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress / 100)} strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{mins}:{secs}</span>
          </div>
        </div>
        <div className="flex-1">
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>{mode === 'focus' ? 'Deep work session' : 'Take a break'}</p>
          <div className="flex gap-2">
            <button onClick={running ? pause : start} className={running ? 'btn-ghost' : 'btn-primary'} style={{ padding: '8px 14px', fontSize: 12 }}>
              {running ? <><Pause size={12} />Pause</> : <><Play size={12} />Start</>}
            </button>
            <button onClick={reset} className="btn-ghost" style={{ padding: '8px 10px' }}>
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
