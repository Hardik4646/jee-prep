import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Zap,
  Settings,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Command,
  Maximize2,
} from 'lucide-react';
import { View } from '../types';

interface NavProps {
  currentView: View;
  setCurrentView: (v: View) => void;
  onSettingsClick: () => void;
  onCommandPaletteClick?: () => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export const NAV_ITEMS = [
  { id: 'dashboard' as View, label: 'Dashboard', shortcut: 'Alt+1', icon: LayoutDashboard },
  { id: 'ledger' as View, label: 'Mistake Ledger', shortcut: 'Alt+2', icon: FileText },
  { id: 'tests' as View, label: 'Test Tracker', shortcut: 'Alt+3', icon: ClipboardList },
  { id: 'syllabus' as View, label: 'Syllabus', shortcut: 'Alt+4', icon: GraduationCap },
  { id: 'analytics' as View, label: 'Analytics', shortcut: 'Alt+5', icon: BarChart3 },
  { id: 'strategy' as View, label: 'Exam Strategy', shortcut: 'Alt+6', icon: Zap },
  { id: 'notes' as View, label: 'Formula Notes', shortcut: 'Alt+7', icon: BookOpen },
  { id: 'assignments' as View, label: 'Assignments', shortcut: 'Alt+8', icon: ClipboardCheck },
];

const MOBILE_NAV = NAV_ITEMS.filter(
  n => n.id !== 'strategy' && n.id !== 'notes' && n.id !== 'syllabus'
);

export function Sidebar({
  currentView,
  setCurrentView,
  onSettingsClick,
  onCommandPaletteClick,
  focusMode,
  onToggleFocusMode,
}: NavProps) {
  const [expanded, setExpanded] = useState(false);

  if (focusMode) return null;

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? 236 : 62,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
      }}
      className="hidden md:flex flex-col h-screen sticky top-0 flex-shrink-0 z-40 overflow-hidden sidebar-transition"
    >
      {/* Brand Header */}
      <div
        className="flex items-center gap-3 px-3.5 pt-5 pb-4 overflow-hidden"
        style={{ minHeight: 64, borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div
          className="w-8 h-8 rounded-[8px] flex-shrink-0 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.25)',
          }}
        >
          <FileText size={15} className="text-slate-950" strokeWidth={2.4} />
        </div>
        <div
          style={{
            opacity: expanded ? 1 : 0,
            transition: 'opacity 160ms',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <p className="text-[13px] font-bold leading-none tracking-tight text-slate-100">
            JEE Prep Ledger
          </p>
          <p className="text-[10px] mt-1 font-mono text-slate-400">
            MAIN · ADV TELEMETRY
          </p>
        </div>
      </div>

      {/* Quick Command Bar Trigger */}
      {onCommandPaletteClick && (
        <div className="px-2.5 pt-3 pb-1">
          <button
            onClick={onCommandPaletteClick}
            title={!expanded ? 'Command Palette (Ctrl+K)' : undefined}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-[8px] text-left transition-colors"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Command size={15} className="flex-shrink-0 text-emerald-400" />
            <div
              className="flex-1 flex items-center justify-between overflow-hidden"
              style={{
                opacity: expanded ? 1 : 0,
                transition: 'opacity 150ms',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="text-[11.5px] font-medium text-slate-300">Quick Actions</span>
              <span className="kbd-key">⌘K</span>
            </div>
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-2 space-y-0.5 overflow-hidden">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              title={!expanded ? `${item.label} (${item.shortcut})` : undefined}
              className="w-full flex items-center gap-3 relative overflow-hidden"
              style={{
                padding: '9px 11px',
                borderRadius: 'var(--radius-button)',
                background: active ? 'var(--accent-muted-bg)' : 'transparent',
                border: active
                  ? '1px solid rgba(16, 185, 129, 0.22)'
                  : '1px solid transparent',
                transition: 'all 140ms',
                cursor: 'pointer',
              }}
            >
              {active && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: '58%',
                    background: 'var(--accent)',
                    borderRadius: '0 3px 3px 0',
                  }}
                />
              )}
              <Icon
                size={17}
                style={{
                  flexShrink: 0,
                  color: active ? 'var(--accent)' : 'var(--text-tertiary)',
                  transition: 'color 140ms',
                }}
              />
              <span
                className="nav-label flex-1 text-left"
                style={{
                  opacity: expanded ? 1 : 0,
                  transition: 'opacity 150ms',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {item.label}
              </span>
              {expanded && (
                <span
                  className="font-mono text-[9.5px] text-slate-500"
                  style={{ opacity: active ? 0.9 : 0.55 }}
                >
                  {item.shortcut.replace('Alt+', '⌥')}
                </span>
              )}
              {active && expanded && (
                <ChevronRight
                  size={12}
                  className="flex-shrink-0"
                  style={{ color: 'var(--accent)' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Controls: Focus Mode & Settings */}
      <div
        className="px-2.5 pb-4 pt-2.5 space-y-1"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        {onToggleFocusMode && (
          <button
            onClick={onToggleFocusMode}
            title={!expanded ? 'Distraction-Free Mode (Alt+F)' : undefined}
            className="w-full flex items-center gap-3 btn-ghost"
            style={{
              borderRadius: 'var(--radius-button)',
              padding: '9px 11px',
              justifyContent: 'flex-start',
            }}
          >
            <Maximize2 size={16} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
            <span
              className="nav-label flex-1 text-left"
              style={{
                opacity: expanded ? 1 : 0,
                transition: 'opacity 150ms',
                whiteSpace: 'nowrap',
              }}
            >
              Focus Mode
            </span>
            {expanded && <span className="kbd-key">⌥F</span>}
          </button>
        )}

        <button
          onClick={onSettingsClick}
          title={!expanded ? 'Data & Backups' : undefined}
          className="w-full flex items-center gap-3 btn-ghost"
          style={{
            borderRadius: 'var(--radius-button)',
            padding: '9px 11px',
            justifyContent: 'flex-start',
          }}
        >
          <Settings size={16} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
          <span
            className="nav-label flex-1 text-left"
            style={{
              opacity: expanded ? 1 : 0,
              transition: 'opacity 150ms',
              whiteSpace: 'nowrap',
            }}
          >
            Data & Backups
          </span>
        </button>
      </div>
    </aside>
  );
}

export function BottomNav({
  currentView,
  setCurrentView,
  focusMode,
}: Omit<NavProps, 'onSettingsClick'>) {
  if (focusMode) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(17, 20, 27, 0.92)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <ul className="flex justify-around">
        {MOBILE_NAV.map(item => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <li key={item.id} className="flex-1">
              <button
                onClick={() => setCurrentView(item.id)}
                className="w-full flex flex-col items-center gap-1 py-2.5"
                style={{
                  color: active ? 'var(--accent)' : 'var(--text-tertiary)',
                  transition: 'color 150ms',
                }}
              >
                <Icon size={17} />
                <span className="text-[10px] font-semibold">
                  {item.label.split(' ')[0]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
