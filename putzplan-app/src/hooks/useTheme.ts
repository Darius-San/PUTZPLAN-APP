import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'putzplan-theme';
export type ThemeName = 'indigo' | 'amber-glow' | 'terracotta-soft' | 'sunset-sand' | 'clay-cream';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeName | null;
  return (saved as ThemeName) || 'indigo';
  });

  useEffect(() => {
    const root = document.documentElement;
    // add transition helper class
    root.classList.add('theme-transition');
    const timeout = setTimeout(()=> root.classList.remove('theme-transition'), 450);
    if (theme === 'indigo') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
    return () => clearTimeout(timeout);
  }, [theme]);

  const cycleOrder: ThemeName[] = ['indigo','amber-glow','terracotta-soft','sunset-sand','clay-cream'];
  const cycle = useCallback(() => {
    setTheme(t => {
      const idx = cycleOrder.indexOf(t);
      return cycleOrder[(idx + 1) % cycleOrder.length];
    });
  }, []);

  return { theme, setTheme, cycle };
}
