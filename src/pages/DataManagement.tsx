import React, { useState } from 'react';
import { useMarketStore } from '@/store/marketStore';
import { CSVMarketDataParser, CSVValidationResult } from '@/services/marketData/csvParser';
import { SupportedAsset } from '@/types/market';
import { Badge } from '@/components/common/Badge';
import { formatCurrency, formatTimestamp } from '@/utils/formatters';
import { Database, Upload, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export const DataManagementPage: React.FC = () => {
  const {
    selectedAsset,
    setSelectedAsset,
    candles,
    setCandlesForAsset,
    dataSource,
    setDataSource,
    dataSourceLabel,
  } = useMarketStore();

  const [parseResult, setParseResult] = useState<CSVValidationResult | null>(null);
  const [targetAsset, setTargetAsset] = useState<SupportedAsset>(selectedAsset);
  const [successToast, setSuccessToast] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const result = CSVMarketDataParser.parse(text);
        setParseResult(result);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyDataset = () => {
    if (!parseResult || !parseResult.valid || parseResult.candles.length === 0) return;

    setCandlesForAsset(targetAsset, parseResult.candles);
    setSelectedAsset(targetAsset);
    setDataSource('csv');
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  };

  const cList = candles[selectedAsset] || [];
  const firstCandle = cList[0];
  const lastCandle = cList[cList.length - 1];

  return (
    <div className="space-y-4">
      {/* Current Dataset Status */}
      <div className="bg-surface border border-border rounded p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database size={16} className="text-accent" />
            <span className="text-xs font-semibold text-text-primary">ACTIVE DATASET INVENTORY</span>
          </div>
          <div className="text-xs font-mono text-text-muted">
            {dataSourceLabel} • {cList.length} OHLCV observations for {selectedAsset}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDataSource('synthetic')}
            className="px-3 py-1.5 bg-surface-secondary border border-border hover:bg-surface-hover text-text-primary rounded font-mono text-xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} />
            Reset Calibrated Demo Data
          </button>
        </div>
      </div>

      {/* CSV Dataset Upload and Validation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Box */}
        <div className="bg-surface border border-border rounded p-4 space-y-3">
          <div className="text-xs font-semibold text-text-primary pb-2 border-b border-border flex items-center gap-2">
            <Upload size={15} className="text-accent" />
            <span>IMPORT CSV HISTORICAL DATASET</span>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">
            Upload custom OHLCV CSV files. Requires headers: <code className="bg-surface-secondary px-1 py-0.5 rounded font-mono">Timestamp, Open, High, Low, Close, Volume</code>. Strict mathematical integrity and chronological order checks are enforced.
          </p>

          <label className="border-2 border-dashed border-border hover:border-accent/60 rounded p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-surface-secondary/20">
            <Upload size={24} className="text-text-muted mb-2" />
            <span className="text-xs font-mono font-medium text-text-primary">Click to select CSV file</span>
            <span className="text-[10px] text-text-muted mt-1">Supports standard UTC epochs or ISO-8601 timestamps</span>
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
          </label>

          {parseResult && (
            <div className="p-3 rounded border border-border bg-surface-secondary text-xs font-mono space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold">Validation Result:</span>
                <Badge variant={parseResult.valid ? 'positive' : 'negative'}>
                  {parseResult.valid ? 'VALIDATED OHLC' : 'ERRORS DETECTED'}
                </Badge>
              </div>

              <div>Rows Parsed: {parseResult.rowCount}</div>

              {parseResult.errors.length > 0 && (
                <div className="text-negative text-[11px] space-y-0.5">
                  {parseResult.errors.map((e, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      <span>{e}</span>
                    </div>
                  ))}
                </div>
              )}

              {parseResult.valid && (
                <div className="pt-2 flex items-center justify-between border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-muted">Target Asset:</span>
                    <select
                      value={targetAsset}
                      onChange={(e) => setTargetAsset(e.target.value as SupportedAsset)}
                      className="bg-surface border border-border rounded px-2 py-1 text-xs"
                    >
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                      <option value="BNB">BNB</option>
                      <option value="SOL">SOL</option>
                      <option value="XRP">XRP</option>
                      <option value="ADA">ADA</option>
                    </select>
                  </div>

                  <button
                    onClick={handleApplyDataset}
                    className="px-3 py-1.5 bg-positive hover:bg-positive/90 text-white rounded font-semibold text-xs transition-colors flex items-center gap-1"
                  >
                    <CheckCircle size={13} />
                    Apply Dataset
                  </button>
                </div>
              )}
            </div>
          )}

          {successToast && (
            <div className="p-2 rounded bg-positive/10 border border-positive/30 text-positive text-xs font-mono text-center">
              Dataset successfully applied to {targetAsset}! Real-time indicators recomputed.
            </div>
          )}
        </div>

        {/* Current Data Coverage Inspection */}
        <div className="bg-surface border border-border rounded p-4 space-y-3">
          <div className="text-xs font-semibold text-text-primary pb-2 border-b border-border">
            HISTORICAL COVERAGE & PROVENANCE
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Selected Asset:</span>
              <span className="font-bold text-text-primary">{selectedAsset} / USD</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Provenance:</span>
              <span>{dataSourceLabel}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Earliest Timestamp:</span>
              <span>{firstCandle ? formatTimestamp(firstCandle.timestamp, 'full') : 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Latest Timestamp:</span>
              <span>{lastCandle ? formatTimestamp(lastCandle.timestamp, 'full') : 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Current Close Price:</span>
              <span className="font-semibold">{lastCandle ? formatCurrency(lastCandle.close) : 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-secondary">Total Observations:</span>
              <span>{cList.length} bars</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
