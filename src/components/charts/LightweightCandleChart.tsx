import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CrosshairMode,
  CandlestickData,
  HistogramData,
  LineData,
  UTCTimestamp,
  LineStyle,
} from 'lightweight-charts';
import { Candle } from '@/types/market';
import { IndicatorValues } from '@/types/indicators';
import { useSettingsStore } from '@/store/settingsStore';
import { formatNumber, formatPercent } from '@/utils/formatters';
import { RefreshCw } from 'lucide-react';

interface ChartProps {
  symbol?: string;
  candles: Candle[];
  indicators?: IndicatorValues[];
  showEma?: boolean;
  showBollinger?: boolean;
  height?: number;
}

export type ChartType = 'candlestick' | 'line' | 'area';
export type TimeRangePreset = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL';

export const LightweightCandleChart: React.FC<ChartProps> = ({
  symbol = 'BTC',
  candles,
  indicators = [],
  showEma = true,
  showBollinger = false,
  height = 500,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Candlestick' | 'Line' | 'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const emaFastSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSlowSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const theme = useSettingsStore((s) => s.theme);
  const isDark = theme === 'dark';

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [activeRange, setActiveRange] = useState<TimeRangePreset>('ALL');
  const [isLogScale, setIsLogScale] = useState(false);

  // Active hover bar for the TradingView Legend
  const [legendData, setLegendData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePct: number;
    volume: number;
    isUp: boolean;
  } | null>(null);

  // Function to feed data into existing series
  const updateData = useCallback(() => {
    if (!mainSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    if (chartType === 'candlestick') {
      const candleData: CandlestickData[] = candles.map((c) => ({
        time: (Math.floor(c.timestamp / 1000) as UTCTimestamp),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      (mainSeriesRef.current as ISeriesApi<'Candlestick'>).setData(candleData);
    } else {
      const lineData: LineData[] = candles.map((c) => ({
        time: (Math.floor(c.timestamp / 1000) as UTCTimestamp),
        value: c.close,
      }));
      (mainSeriesRef.current as ISeriesApi<'Line'>).setData(lineData);
    }

    // Volume histogram with official TradingView color opacity
    const upColor = 'rgba(8, 153, 129, 0.4)';
    const downColor = 'rgba(242, 54, 69, 0.4)';
    const volumeData: HistogramData[] = candles.map((c) => ({
      time: (Math.floor(c.timestamp / 1000) as UTCTimestamp),
      value: c.volume,
      color: c.close >= c.open ? upColor : downColor,
    }));
    volumeSeriesRef.current.setData(volumeData);

    // Overlays
    if (showEma && emaFastSeriesRef.current && emaSlowSeriesRef.current) {
      const fastData: LineData[] = [];
      const slowData: LineData[] = [];

      indicators.forEach((ind) => {
        const time = (Math.floor(ind.timestamp / 1000) as UTCTimestamp);
        if (ind.ema12 !== undefined) fastData.push({ time, value: ind.ema12 });
        if (ind.ema26 !== undefined) slowData.push({ time, value: ind.ema26 });
      });

      emaFastSeriesRef.current.setData(fastData);
      emaSlowSeriesRef.current.setData(slowData);
    }

    if (showBollinger && bbUpperSeriesRef.current && bbLowerSeriesRef.current) {
      const upData: LineData[] = [];
      const lowData: LineData[] = [];

      indicators.forEach((ind) => {
        const time = (Math.floor(ind.timestamp / 1000) as UTCTimestamp);
        if (ind.bbands) {
          upData.push({ time, value: ind.bbands.upper });
          lowData.push({ time, value: ind.bbands.lower });
        }
      });

      bbUpperSeriesRef.current.setData(upData);
      bbLowerSeriesRef.current.setData(lowData);
    }

    // Initialize legend with latest bar
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2] || last;
    const change = last.close - prev.close;
    const changePct = prev.close > 0 ? change / prev.close : 0;
    setLegendData({
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      change,
      changePct,
      volume: last.volume,
      isUp: last.close >= last.open,
    });
  }, [candles, indicators, showEma, showBollinger, chartType]);

  // 1. Initialize Chart Instance (only re-creates if container, height or chartType changes)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const bg = isDark ? '#131722' : '#FFFFFF';
    const textColor = isDark ? '#B2B5BE' : '#787B86';
    const gridColor = isDark ? '#1E222D' : '#F0F3FA';
    const borderColor = isDark ? '#2A2E39' : '#E0E3EB';
    const upColor = '#089981';
    const downColor = '#F23645';

    // Clear any previous chart container content
    chartContainerRef.current.innerHTML = '';

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth || 600,
      height,
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor,
        fontSize: 11,
        fontFamily: "'Trebuchet MS', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: gridColor, style: LineStyle.Solid },
        horzLines: { color: gridColor, style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: isDark ? '#758696' : '#9598A1',
          width: 1,
          style: LineStyle.LargeDashed,
          labelBackgroundColor: isDark ? '#2A2E39' : '#131722',
        },
        horzLine: {
          color: isDark ? '#758696' : '#9598A1',
          width: 1,
          style: LineStyle.LargeDashed,
          labelBackgroundColor: isDark ? '#2A2E39' : '#131722',
        },
      },
      rightPriceScale: {
        borderColor,
        borderVisible: true,
        scaleMargins: { top: 0.1, bottom: 0.22 },
        autoScale: true,
      },
      timeScale: {
        borderColor,
        borderVisible: true,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 8,
        minBarSpacing: 1,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
    });

    let mainSeries: ISeriesApi<'Candlestick' | 'Line' | 'Area'>;
    if (chartType === 'line') {
      mainSeries = chart.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
        crosshairMarkerVisible: true,
      });
    } else if (chartType === 'area') {
      mainSeries = chart.addAreaSeries({
        topColor: isDark ? 'rgba(41, 98, 255, 0.4)' : 'rgba(41, 98, 255, 0.28)',
        bottomColor: 'rgba(41, 98, 255, 0.0)',
        lineColor: '#2962FF',
        lineWidth: 2,
      });
    } else {
      mainSeries = chart.addCandlestickSeries({
        upColor,
        downColor,
        borderUpColor: upColor,
        borderDownColor: downColor,
        wickUpColor: upColor,
        wickDownColor: downColor,
      });
    }

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const emaFast = chart.addLineSeries({
      color: '#2962FF',
      lineWidth: 1,
      title: 'EMA 12',
    });

    const emaSlow = chart.addLineSeries({
      color: '#FF9800',
      lineWidth: 1,
      title: 'EMA 26',
    });

    const bbUpper = chart.addLineSeries({
      color: isDark ? '#787B86' : '#9598A1',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: 'BB Upper',
    });

    const bbLower = chart.addLineSeries({
      color: isDark ? '#787B86' : '#9598A1',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: 'BB Lower',
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData || !mainSeries) {
        if (candles.length > 0) {
          const last = candles[candles.length - 1];
          const prev = candles[candles.length - 2] || last;
          const change = last.close - prev.close;
          const changePct = prev.close > 0 ? change / prev.close : 0;
          setLegendData({
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            change,
            changePct,
            volume: last.volume,
            isUp: last.close >= last.open,
          });
        }
        return;
      }

      const data = param.seriesData.get(mainSeries) as any;
      const volData = param.seriesData.get(volumeSeries) as any;

      if (data) {
        const o = data.open ?? data.value ?? 0;
        const h = data.high ?? data.value ?? 0;
        const l = data.low ?? data.value ?? 0;
        const c = data.close ?? data.value ?? 0;
        const change = c - o;
        const changePct = o > 0 ? change / o : 0;

        setLegendData({
          open: o,
          high: h,
          low: l,
          close: c,
          change,
          changePct,
          volume: volData?.value ?? 0,
          isUp: c >= o,
        });
      }
    });

    chartRef.current = chart;
    mainSeriesRef.current = mainSeries;
    volumeSeriesRef.current = volumeSeries;
    emaFastSeriesRef.current = emaFast;
    emaSlowSeriesRef.current = emaSlow;
    bbUpperSeriesRef.current = bbUpper;
    bbLowerSeriesRef.current = bbLower;

    // Populate data right after creation
    updateData();

    // Set initial comfortable zoom view (recent 120 bars)
    const totalBars = candles.length;
    if (totalBars > 0) {
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, totalBars - 120),
        to: totalBars + 5,
      });
    }

    // Auto-resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      if (width > 0) {
        chart.applyOptions({ width });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [height, chartType]);

  // 2. Seamless In-Place Theme Updating (NEVER destroys or empties chart on theme toggle!)
  useEffect(() => {
    if (!chartRef.current) return;

    const bg = isDark ? '#131722' : '#FFFFFF';
    const textColor = isDark ? '#B2B5BE' : '#787B86';
    const gridColor = isDark ? '#1E222D' : '#F0F3FA';
    const borderColor = isDark ? '#2A2E39' : '#E0E3EB';

    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: {
        borderColor,
      },
      timeScale: {
        borderColor,
      },
      crosshair: {
        vertLine: {
          labelBackgroundColor: isDark ? '#2A2E39' : '#131722',
        },
        horzLine: {
          labelBackgroundColor: isDark ? '#2A2E39' : '#131722',
        },
      },
    });

    if (bbUpperSeriesRef.current && bbLowerSeriesRef.current) {
      const bbColor = isDark ? '#787B86' : '#9598A1';
      bbUpperSeriesRef.current.applyOptions({ color: bbColor });
      bbLowerSeriesRef.current.applyOptions({ color: bbColor });
    }
  }, [isDark]);

  // 3. Update Data on candles/indicators change
  useEffect(() => {
    updateData();
  }, [updateData]);

  // Bottom Time Range Buttons
  const handleTimeRange = (range: TimeRangePreset) => {
    setActiveRange(range);
    if (!chartRef.current || candles.length === 0) return;

    if (range === 'ALL' || range === '5Y') {
      chartRef.current.timeScale().fitContent();
      return;
    }

    const now = candles[candles.length - 1].timestamp;
    let days = 30;
    switch (range) {
      case '1D':
        days = 1;
        break;
      case '5D':
        days = 5;
        break;
      case '1M':
        days = 30;
        break;
      case '3M':
        days = 90;
        break;
      case '6M':
        days = 180;
        break;
      case 'YTD': {
        const currentYear = new Date(now).getFullYear();
        const startOfYear = new Date(currentYear, 0, 1).getTime();
        days = Math.max(1, Math.round((now - startOfYear) / (86400 * 1000)));
        break;
      }
      case '1Y':
        days = 365;
        break;
    }

    const startTime = (Math.floor((now - days * 86400 * 1000) / 1000) as UTCTimestamp);
    const endTime = (Math.floor(now / 1000) as UTCTimestamp);

    chartRef.current.timeScale().setVisibleRange({
      from: startTime,
      to: endTime,
    });
  };

  const toggleLogScale = () => {
    if (!chartRef.current) return;
    const next = !isLogScale;
    setIsLogScale(next);
    chartRef.current.priceScale('right').applyOptions({
      mode: next ? 1 : 0,
    });
  };

  const resetView = () => {
    setActiveRange('ALL');
    const totalBars = candles.length;
    if (totalBars > 0 && chartRef.current) {
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: Math.max(0, totalBars - 120),
        to: totalBars + 5,
      });
    }
  };

  return (
    <div className="w-full relative border border-border rounded overflow-hidden bg-surface select-none shadow-sm">
      {/* TradingView Iconic Top-Left Floating OHLCV Legend */}
      <div className="absolute top-2 left-3 z-10 pointer-events-none flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs tracking-tight text-text-primary">
            {symbol} / USD · 1D · CRYPTOLENS
          </span>
          <span className="w-2 h-2 rounded-full bg-positive inline-block animate-pulse" />
        </div>

        {legendData && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono">
            <span className="text-text-muted">
              O <span className={legendData.isUp ? 'text-[#089981] font-semibold' : 'text-[#F23645] font-semibold'}>
                {formatNumber(legendData.open, legendData.open < 1 ? 4 : 2)}
              </span>
            </span>
            <span className="text-text-muted">
              H <span className={legendData.isUp ? 'text-[#089981] font-semibold' : 'text-[#F23645] font-semibold'}>
                {formatNumber(legendData.high, legendData.high < 1 ? 4 : 2)}
              </span>
            </span>
            <span className="text-text-muted">
              L <span className={legendData.isUp ? 'text-[#089981] font-semibold' : 'text-[#F23645] font-semibold'}>
                {formatNumber(legendData.low, legendData.low < 1 ? 4 : 2)}
              </span>
            </span>
            <span className="text-text-muted">
              C <span className={legendData.isUp ? 'text-[#089981] font-semibold' : 'text-[#F23645] font-semibold'}>
                {formatNumber(legendData.close, legendData.close < 1 ? 4 : 2)}
              </span>
            </span>
            <span className={legendData.change >= 0 ? 'text-[#089981] font-semibold' : 'text-[#F23645] font-semibold'}>
              {legendData.change >= 0 ? '+' : ''}{formatNumber(legendData.change, legendData.close < 1 ? 4 : 2)} ({formatPercent(legendData.changePct)})
            </span>
            <span className="text-text-muted">
              Vol <span className="text-text-secondary">{formatNumber(legendData.volume, 0)}</span>
            </span>
          </div>
        )}
      </div>

      {/* TradingView Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.035] dark:opacity-[0.05]">
        <span className="text-[120px] font-black tracking-widest text-text-primary">
          {symbol}
        </span>
      </div>

      {/* Main Chart Container */}
      <div ref={chartContainerRef} className="w-full relative z-1" style={{ height }} />

      {/* TradingView Bottom Toolbar: Range Selector, Log Scale, Reset */}
      <div className="h-8 bg-surface border-t border-border px-3 flex items-center justify-between text-xs font-mono z-10">
        {/* Left: Time Range Presets */}
        <div className="flex items-center gap-1">
          {(['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'] as TimeRangePreset[]).map((r) => {
            const isSelected = activeRange === r;
            return (
              <button
                key={r}
                onClick={() => handleTimeRange(r)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  isSelected
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* Right: Chart Style, Log Toggle, Reset */}
        <div className="flex items-center gap-2">
          {/* Chart Style Switcher */}
          <div className="flex items-center bg-surface-secondary rounded p-0.5 border border-border">
            <button
              onClick={() => setChartType('candlestick')}
              title="Candlestick Chart"
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                chartType === 'candlestick' ? 'bg-surface text-text-primary font-bold shadow-xs' : 'text-text-muted'
              }`}
            >
              Candles
            </button>
            <button
              onClick={() => setChartType('line')}
              title="Line Chart"
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                chartType === 'line' ? 'bg-surface text-text-primary font-bold shadow-xs' : 'text-text-muted'
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setChartType('area')}
              title="Area Chart"
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                chartType === 'area' ? 'bg-surface text-text-primary font-bold shadow-xs' : 'text-text-muted'
              }`}
            >
              Area
            </button>
          </div>

          <div className="h-3 w-[1px] bg-border" />

          {/* Log scale toggle */}
          <button
            onClick={toggleLogScale}
            className={`px-1.5 py-0.5 rounded text-[11px] border transition-colors ${
              isLogScale ? 'border-accent text-accent font-bold bg-accent/10' : 'border-border text-text-muted hover:text-text-primary'
            }`}
          >
            log
          </button>

          {/* Reset / Fit Content */}
          <button
            onClick={resetView}
            title="Reset to 5-Year Full Range"
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
