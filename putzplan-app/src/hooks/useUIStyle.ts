import { useState, useEffect, useCallback } from 'react';

export type UIStyle = 'soft' | 'outline' | 'pill' | 'glass';
const STORAGE_KEY = 'putzplan-ui-style';

export function useUIStyle() {
  const [uiStyle, setUIStyle] = useState<UIStyle>(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as UIStyle | null;
  return saved || 'pill';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-ui-style', uiStyle);
    window.localStorage.setItem(STORAGE_KEY, uiStyle);
  }, [uiStyle]);

  const cycle = useCallback(() => {
    setUIStyle(s => {
      const order: UIStyle[] = ['soft','outline','pill','glass'];
      return order[(order.indexOf(s)+1)%order.length];
    });
  }, []);

  return { uiStyle, setUIStyle, cycle };
}
