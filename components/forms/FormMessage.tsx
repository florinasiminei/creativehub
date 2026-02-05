import React from 'react';

type FormMessageVariant = 'error' | 'warning' | 'info' | 'success';
type FormMessageSize = 'sm' | 'md';

type FormMessageProps = React.HTMLAttributes<HTMLElement> & {
  variant?: FormMessageVariant;
  size?: FormMessageSize;
  inline?: boolean;
  children: React.ReactNode;
};

const blockVariants: Record<FormMessageVariant, string> = {
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200',
  info: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-gray-200',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200',
};

const inlineVariants: Record<FormMessageVariant, string> = {
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-700 dark:text-amber-400',
  info: 'text-gray-600 dark:text-gray-400',
  success: 'text-emerald-700 dark:text-emerald-400',
};

export default function FormMessage({
  variant = 'info',
  size = 'md',
  inline = false,
  className = '',
  children,
  ...rest
}: FormMessageProps) {
  const sizeClass = size === 'sm' ? 'text-xs' : 'text-sm';
  const baseClass = inline ? `mt-1 block ${sizeClass}` : `rounded-lg border px-3 py-2 ${sizeClass}`;
  const variantClass = inline ? inlineVariants[variant] : blockVariants[variant];
  const Component = inline ? 'span' : 'div';

  return (
    <Component className={`${baseClass} ${variantClass} ${className}`} {...rest}>
      {children}
    </Component>
  );
}
