import React from 'react';
import { cn } from '@/utils/cn';

interface KpiCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'warning' | 'neutral';
  subtext?: string;
  className?: string;
  icon?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  change,
  changeType = 'neutral',
  subtext,
  className,
  icon,
}) => {
  return (
    <div
      className={cn(
        'p-3.5 rounded bg-surface border border-border flex flex-col justify-between transition-colors shadow-none hover:border-text-muted/40',
        className
      )}
    >
      <div className="flex items-center justify-between text-text-secondary mb-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[20px] font-bold font-mono text-text-primary tracking-tight">
          {value}
        </span>
        {change && (
          <span
            className={cn(
              'text-[12px] font-semibold font-mono px-1 rounded',
              changeType === 'positive' && 'text-positive bg-positive/10',
              changeType === 'negative' && 'text-negative bg-negative/10',
              changeType === 'warning' && 'text-warning bg-warning/10',
              changeType === 'neutral' && 'text-text-muted bg-surface-secondary'
            )}
          >
            {change}
          </span>
        )}
      </div>

      {subtext && (
        <div className="mt-1.5 text-[11px] text-text-muted truncate">{subtext}</div>
      )}
    </div>
  );
};
