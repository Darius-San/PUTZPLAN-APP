import React, { useId } from 'react';

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
  // Generate stable id if none provided for proper label association
  const generatedId = useId();
  // @ts-ignore id might be part of props
  const inputId = (props as any).id || generatedId;
  const inputClasses = `
    w-full px-3 py-2 text-sm border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-50 disabled:cursor-not-allowed
    ${error ? 'border-red-500' : 'border-gray-300'}
    ${className}
  `;
  const describedBy: string[] = [];
  if (error) describedBy.push(`${inputId}-error`);
  if (helpText && !error) describedBy.push(`${inputId}-help`);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input id={inputId} aria-describedby={describedBy.length ? describedBy.join(' ') : undefined} className={inputClasses} {...props} />
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p id={`${inputId}-help`} className="mt-1 text-sm text-gray-500">{helpText}</p>
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
  const generatedId = useId();
  // @ts-ignore
  const textareaId = (props as any).id || generatedId;
  const textareaClasses = `
    w-full px-3 py-2 text-sm border rounded-lg resize-none
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-50 disabled:cursor-not-allowed
    ${error ? 'border-red-500' : 'border-gray-300'}
    ${className}
  `;
  const describedBy: string[] = [];
  if (error) describedBy.push(`${textareaId}-error`);
  if (helpText && !error) describedBy.push(`${textareaId}-help`);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <textarea id={textareaId} aria-describedby={describedBy.length ? describedBy.join(' ') : undefined} className={textareaClasses} rows={3} {...props} />
      {error && (
        <p id={`${textareaId}-error`} className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p id={`${textareaId}-help`} className="mt-1 text-sm text-gray-500">{helpText}</p>
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
  const generatedId = useId();
  // @ts-ignore
  const selectId = (props as any).id || generatedId;
  const selectClasses = `
    w-full px-3 py-2 text-sm border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-50 disabled:cursor-not-allowed
    ${error ? 'border-red-500' : 'border-gray-300'}
    ${className}
  `;
  const describedBy: string[] = [];
  if (error) describedBy.push(`${selectId}-error`);
  if (helpText && !error) describedBy.push(`${selectId}-help`);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select id={selectId} aria-describedby={describedBy.length ? describedBy.join(' ') : undefined} className={selectClasses} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p id={`${selectId}-help`} className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
};