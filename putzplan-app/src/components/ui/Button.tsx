import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  tone = 'default',
  disabled,
  ...props
}) => {
  const baseClasses = 'btn disabled:opacity-50 disabled:cursor-not-allowed';
  const toneMap: Record<string, { base: string; hover: string; fg?: string }> = {
    default: { base: 'var(--color-primary)', hover: 'var(--color-primary-hover)', fg: 'var(--color-primary-fg)' },
    success: { base: 'var(--color-success)', hover: 'var(--color-success-hover)', fg: '#fff' },
    warning: { base: 'var(--color-warning)', hover: '#ca8a04', fg: '#1e293b' },
    danger: { base: 'var(--color-danger)', hover: 'var(--color-danger-hover)', fg: 'var(--color-danger-fg)' }
  };
  const chosen = toneMap[tone];
  
  const variantClasses: Record<string, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
    outline: 'btn-outline',
    subtle: 'btn-subtle'
  };
  
  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};