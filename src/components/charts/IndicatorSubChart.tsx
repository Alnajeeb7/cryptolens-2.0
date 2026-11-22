import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { IndicatorValues } from '@/types/indicators';
import { formatTimestamp } from '@/utils/formatters';
import { useSettingsStore } from '@/store/settingsStore';

interface IndicatorSubChartProps {
  type: 'RSI' | 'MACD';
  data: IndicatorValues[];
  height?: number;
}

export const IndicatorSubChart: React.FC<IndicatorSubChartProps> = ({
  type,
  data,
  height = 140,
}) => {
  const isDark = useSettingsStore((s) => s.theme === 'dark');

  const chartData = data.slice(-80).map((d) => ({
    timestamp: d.timestamp,
    rsi: d.rsi14 ? Number(d.rsi14.toFixed(2)) : null,
    macd: d.macd ? Number(d.macd.macd.toFixed(2)) : null,
    signal: d.macd ? Number(d.macd.signal.toFixed(2)) : null,
    histogram: d.macd ? Number(d.macd.histogram.toFixed(2)) : null,
  }));

  const axisColor = isDark ? '#727A80' : '#96988F';

  if (type === 'RSI') {
    return (
      <div className="w-full bg-surface border border-border rounded p-2 text-xs">
        <div className="flex items-center justify-between mb-1 text-[11px] font-mono text-text-secondary">
          <span>RSI (14)</span>
          <span className="text-accent font-semibold">
            {chartData[chartData.length - 1]?.rsi?.toFixed(1) ?? 'N/A'}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="timestamp" tickFormatter={(t) => formatTimestamp(t, 'time')} stroke={axisColor} fontSize={10} />
            <YAxis domain={[0, 100]} stroke={axisColor} fontSize={10} ticks={[30, 50, 70]} />
            <ReferenceLine y={70} stroke="#E05B5B" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="#26A879" strokeDasharray="3 3" />
            <ReferenceLine y={50} stroke={axisColor} strokeDasharray="2 2" />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#191C1F' : '#FFFFFF',
                borderColor: isDark ? '#30363B' : '#E5E2D9',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono',
              }}
              formatter={(val: any) => [val, 'RSI']}
              labelFormatter={(t) => formatTimestamp(t, 'full')}
            />
            <Line type="monotone" dataKey="rsi" stroke="#526B62" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // MACD
  return (
    <div className="w-full bg-surface border border-border rounded p-2 text-xs">
      <div className="flex items-center justify-between mb-1 text-[11px] font-mono text-text-secondary">
        <span>MACD (12, 26, 9)</span>
        <div className="flex gap-2">
          <span className="text-[#3B82F6]">MACD: {chartData[chartData.length - 1]?.macd?.toFixed(2) ?? 'N/A'}</span>
          <span className="text-[#D7A64D]">Sig: {chartData[chartData.length - 1]?.signal?.toFixed(2) ?? 'N/A'}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey="timestamp" tickFormatter={(t) => formatTimestamp(t, 'time')} stroke={axisColor} fontSize={10} />
          <YAxis stroke={axisColor} fontSize={10} />
          <ReferenceLine y={0} stroke={axisColor} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#191C1F' : '#FFFFFF',
              borderColor: isDark ? '#30363B' : '#E5E2D9',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono',
            }}
            labelFormatter={(t) => formatTimestamp(t, 'full')}
          />
          <Bar
            dataKey="histogram"
            fill="#26A879"
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
