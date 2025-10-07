import React from 'react';
import { useUIStyle } from '../../hooks/useUIStyle';

const labels: Record<string,string> = { soft:'Soft', outline:'Outline', pill:'Pill', glass:'Glass' };

export const UIStyleSwitcher: React.FC = () => {
  const { uiStyle, setUIStyle, cycle } = useUIStyle();
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-600">UI:</span>
      <div className="flex gap-1">
        {Object.keys(labels).map(key => (
          <button key={key} onClick={() => setUIStyle(key as any)} className={`btn btn-subtle ${uiStyle===key ? 'ring-2 ring-offset-1 ring-[var(--color-focus-ring)]' : ''}`}>{labels[key]}</button>
        ))}
      </div>
      <button onClick={cycle} className="btn btn-ghost">Rotate</button>
    </div>
  );
};
