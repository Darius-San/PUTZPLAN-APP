import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  onClick?: () => void; // hinzugefügt für klickbare Cards
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = true,
  onClick,
  ...rest
}) => {
  return (
    <div
      className={`card ${onClick ? 'card-hover cursor-pointer' : ''} ${padding ? 'p-6' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      {...rest}
    >
      {children}
    </div>
  );
};

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  showPercentage = true,
  color = 'blue'
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600'
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-sm text-gray-500">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {!label && showPercentage && (
        <div className="text-right mt-1">
          <span className="text-sm text-gray-500">{value}/{max}</span>
        </div>
      )}
    </div>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md'
}) => {
  const variantMap: Record<string,string> = {
    default: 'badge-default',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    accent: 'badge-accent'
  };
  const sizeMap: Record<string,string> = {
    sm: 'text-[11px] py-[4px] px-[6px]',
    md: ''
  };
  return <span className={`badge ${variantMap[variant]} ${sizeMap[size]}`}>{children}</span>;
};