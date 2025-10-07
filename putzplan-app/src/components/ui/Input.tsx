import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helpText,
  className = '',
  ...props
}) => {
  const id = React.useId();
  const inputClasses = `
    w-full px-3 py-2 text-sm border rounded-lg bg-[var(--color-surface)]
    focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:border-transparent
    disabled:bg-gray-50 disabled:cursor-not-allowed transition-all
    ${error ? 'border-red-500' : 'border-gray-300 hover:border-[var(--color-text-soft)]'}
    ${className}
  `;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <input id={id} className={inputClasses} {...props} />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  helpText,
  className = '',
  ...props
}) => {
  const textareaClasses = `
    w-full px-3 py-2 text-sm border rounded-lg resize-none bg-[var(--color-surface)]
    focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:border-transparent
    disabled:bg-gray-50 disabled:cursor-not-allowed transition-all
    ${error ? 'border-red-500' : 'border-gray-300 hover:border-[var(--color-text-soft)]'}
    ${className}
  `;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <textarea className={textareaClasses} rows={3} {...props} />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helpText,
  options,
  className = '',
  ...props
}) => {
  const selectClasses = `
    w-full px-3 py-2 text-sm border rounded-lg bg-[var(--color-surface)]
    focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:border-transparent
    disabled:bg-gray-50 disabled:cursor-not-allowed transition-all
    ${error ? 'border-red-500' : 'border-gray-300 hover:border-[var(--color-text-soft)]'}
    ${className}
  `;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select className={selectClasses} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
};