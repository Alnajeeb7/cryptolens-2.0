import React from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'positive' | 'negative' | 'warning' | 'neutral' | 'accent' | 'outline';
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className,
  size = 'sm',
}) => {
  const variantStyles = {
    positive: 'bg-positive/10 text-positive border-positive/20',
    negative: 'bg-negative/10 text-negative border-negative/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    accent: 'bg-accent/15 text-accent border-accent/25',
    neutral: 'bg-surface-secondary text-text-secondary border-border',
    outline: 'bg-transparent text-text-secondary border-border',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-1.5 py-0.5',
    md: 'text-[12px] px-2 py-0.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded border font-mono tracking-tight',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};
