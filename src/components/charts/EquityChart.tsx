import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { EquityPoint } from '@/types/strategy';
import { formatCurrency, formatTimestamp, formatPercent } from '@/utils/formatters';
import { useSettingsStore } from '@/store/settingsStore';

interface EquityChartProps {
  data: EquityPoint[];
  height?: number;
}

export const EquityChart: React.FC<EquityChartProps> = ({ data, height = 300 }) => {
  const isDark = useSettingsStore((s) => s.theme === 'dark');
  const axisColor = isDark ? '#727A80' : '#96988F';

  return (
    <div className="w-full bg-surface border border-border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold text-text-primary tracking-wide">
          SIMULATED STRATEGY EQUITY VS BENCHMARK
        </span>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-positive font-medium">
            <span className="w-2.5 h-0.5 bg-positive rounded-full" /> Strategy
          </span>
          <span className="flex items-center gap-1.5 text-text-muted">
            <span className="w-2.5 h-0.5 bg-text-muted rounded-full" /> Benchmark (Buy & Hold)
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isDark ? '#26A879' : '#16865B'} stopOpacity={0.25} />
              <stop offset="95%" stopColor={isDark ? '#26A879' : '#16865B'} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="timestamp"
            tickFormatter={(t) => formatTimestamp(t, 'date')}
            stroke={axisColor}
            fontSize={11}
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            stroke={axisColor}
            fontSize={11}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#191C1F' : '#FFFFFF',
              borderColor: isDark ? '#30363B' : '#E5E2D9',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono',
            }}
            formatter={(value: any, name: string) => [
              formatCurrency(Number(value)),
              name === 'equity' ? 'Strategy Equity' : 'Benchmark Equity',
            ]}
            labelFormatter={(t) => formatTimestamp(t, 'full')}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={isDark ? '#26A879' : '#16865B'}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#equityGrad)"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="benchmarkEquity"
            stroke={isDark ? '#727A80' : '#96988F'}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
