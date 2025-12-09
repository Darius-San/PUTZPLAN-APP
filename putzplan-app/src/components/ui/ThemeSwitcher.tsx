import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';

const labels: Record<string,string> = {
  indigo: 'Indigo',
  'amber-glow': 'Amber Glow',
  'terracotta-soft': 'Terracotta Soft',
  'sunset-sand': 'Sunset Sand',
  'clay-cream': 'Clay & Cream'
};

export const ThemeSwitcher: React.FC = () => {
  const { theme, cycle, setTheme } = useTheme();

  const chipColor: Record<string,string> = {
    indigo: '#6366f1',
    'amber-glow': '#E38B29',
    'terracotta-soft': '#C96868',
    'sunset-sand': '#F2994A',
    'clay-cream': '#C08457'
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">Theme:</span>
      <div className="flex gap-1 flex-wrap max-w-[260px]">
        {Object.keys(labels).map(key => {
          const active = theme === key;
          return (
            <button
              key={key}
              onClick={() => setTheme(key as any)}
              className={`group flex items-center gap-1 px-2 py-1 rounded border text-xs transition-colors ${active ? 'bg-[var(--color-primary)] text-white border-transparent shadow-sm' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-soft)] border-[var(--color-border)] hover:text-[var(--color-text)]'}`}
              title={labels[key]}
            >
              <span className="w-3 h-3 rounded-full border" style={{ background: chipColor[key], opacity: active ? 1 : 0.85 }} />
              {labels[key]}
            </button>
          );
        })}
      </div>
      <Button size="sm" variant="ghost" onClick={cycle} data-testid="theme-switcher-cycle">Rotate</Button>
    </div>
  );
};
