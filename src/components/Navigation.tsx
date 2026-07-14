import { useState } from 'react';
import { LayoutDashboard, FileText, BarChart3, BookOpen, ClipboardCheck, Zap, Settings, ChevronRight, ClipboardList } from 'lucide-react';
import { View } from '../types';

interface NavProps {
  currentView: View;
  setCurrentView: (v: View) => void;
  onSettingsClick: () => void;
}

const NAV = [
  { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'ledger' as View, label: 'Ledger', icon: FileText },
  { id: 'tests' as View, label: 'Tests', icon: ClipboardList },
  { id: 'analytics' as View, label: 'Analytics', icon: BarChart3 },
  { id: 'strategy' as View, label: 'Strategy', icon: Zap },
  { id: 'notes' as View, label: 'Notes', icon: BookOpen },
  { id: 'assignments' as View, label: 'Assignments', icon: ClipboardCheck },
];

const MOBILE_NAV = NAV.filter(n => n.id !== 'strategy' && n.id !== 'notes');

export function Sidebar({ currentView, setCurrentView, onSettingsClick }: NavProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{ width: expanded ? 224 : 60, background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}
      className="hidden md:flex flex-col h-screen sticky top-0 flex-shrink-0 z-40 overflow-hidden sidebar-transition"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3.5 pt-6 pb-6 overflow-hidden" style={{ minHeight: 64 }}>
        <div className="w-8 h-8 rounded-[10px] flex-shrink-0 flex items-center justify-center"
          style={{ background: 'var(--accent)' }}>
          <FileText size={15} className="text-white" />
        </div>
        <div style={{ opacity: expanded ? 1 : 0, transition: 'opacity 160ms', whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <p className="text-[13px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>Mistake Tracker</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>JEE Analytics</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-hidden">
        {NAV.map(item => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button key={item.id} onClick={() => setCurrentView(item.id)}
              title={!expanded ? item.label : undefined}
              className="w-full flex items-center gap-3 relative overflow-hidden"
              style={{
                padding: '10px 12px', borderRadius: 'var(--radius-button)',
                background: active ? 'var(--accent-muted-bg)' : 'transparent',
                border: '1px solid transparent',
                transition: 'background 150ms',
                cursor: 'pointer',
              }}>
              {active && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: '60%', background: 'var(--accent)', borderRadius: '0 3px 3px 0' }} />}
              <Icon size={18} style={{ flexShrink: 0, color: active ? 'var(--accent)' : 'var(--text-tertiary)', transition: 'color 150ms' }} />
              <span className="nav-label" style={{ opacity: expanded ? 1 : 0, transition: 'opacity 160ms', whiteSpace: 'nowrap', overflow: 'hidden', color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {item.label}
              </span>
              {active && expanded && <ChevronRight size={12} className="ml-auto flex-shrink-0" style={{ color: 'var(--accent)' }} />}
            </button>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="px-2 pb-5 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button onClick={onSettingsClick} title={!expanded ? 'Settings' : undefined}
          className="w-full flex items-center gap-3 btn-ghost" style={{ borderRadius: 'var(--radius-button)', padding: '10px 12px', justifyContent: 'flex-start' }}>
          <Settings size={17} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
          <span className="nav-label" style={{ opacity: expanded ? 1 : 0, transition: 'opacity 160ms', whiteSpace: 'nowrap' }}>Settings</span>
        </button>
      </div>
    </aside>
  );
}

export function BottomNav({ currentView, setCurrentView }: Omit<NavProps, 'onSettingsClick'>) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
      <ul className="flex justify-around">
        {MOBILE_NAV.map(item => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <li key={item.id} className="flex-1">
              <button onClick={() => setCurrentView(item.id)}
                className="w-full flex flex-col items-center gap-1 py-3"
                style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)', transition: 'color 150ms' }}>
                <Icon size={18} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
