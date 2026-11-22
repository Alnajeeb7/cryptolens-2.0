import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useScriptStore } from '@/store/scriptStore';
import { useMarketStore } from '@/store/marketStore';
import { useSettingsStore } from '@/store/settingsStore';
import { CRYPTOSCRIPT_REGISTRY } from '@/engine/cryptoscript/registry';
import { Badge } from '@/components/common/Badge';
import { EquityChart } from '@/components/charts/EquityChart';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import {
  Play,
  Save,
  Plus,
  Copy,
  Trash2,
  FileCode,
  BookOpen,
  Terminal,
  Activity,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
} from 'lucide-react';

export const StrategyLabPage: React.FC = () => {
  const {
    scripts,
    activeScriptId,
    activeScriptCode,
    isExecuting,
    lastExecutionResult,
    scriptBacktestResult,
    setActiveScript,
    updateActiveCode,
    createNewScript,
    saveScript,
    duplicateScript,
    deleteScript,
    executeScript,
    runScriptBacktest,
    importScript,
  } = useScriptStore();

  const { theme } = useSettingsStore();
  const { selectedAsset } = useMarketStore();

  const [activeBottomTab, setActiveBottomTab] = useState<'console' | 'tester' | 'plots'>('console');
  const [showDocs, setShowDocs] = useState(false);
  const [docSearch, setDocSearch] = useState('');
  const [saveToast, setSaveToast] = useState(false);

  const activeScript = scripts.find((s) => s.id === activeScriptId) || scripts[0];

  const handleSave = () => {
    saveScript();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleExport = () => {
    if (!activeScript) return;
    const blob = new Blob([activeScript.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeScript.name.toLowerCase().replace(/\s+/g, '_')}.crypto`;
    a.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const code = event.target?.result as string;
      if (code) {
        importScript(file.name.replace('.crypto', ''), code);
      }
    };
    reader.readAsText(file);
  };

  const filteredFunctions = Object.values(CRYPTOSCRIPT_REGISTRY).filter((fn) =>
    fn.name.toLowerCase().includes(docSearch.toLowerCase()) ||
    fn.description.toLowerCase().includes(docSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] gap-2">
      {/* Top Toolbar */}
      <div className="bg-surface border border-border rounded px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-text-primary">
            <FileCode size={16} className="text-accent" />
            <span>{activeScript?.name || 'Strategy Editor'}</span>
          </div>
          {activeScript?.isTemplate && <Badge variant="accent">BUILT-IN TEMPLATE</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="px-2.5 py-1.5 bg-surface-secondary border border-border hover:bg-surface-hover text-text-primary rounded text-xs font-mono font-medium flex items-center gap-1 transition-colors"
          >
            <Save size={13} />
            {saveToast ? 'Saved!' : 'Save'}
          </button>

          <button
            onClick={executeScript}
            disabled={isExecuting}
            className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Play size={13} />
            Compile & Run
          </button>

          <button
            onClick={() => {
              runScriptBacktest();
              setActiveBottomTab('tester');
            }}
            disabled={isExecuting}
            className="px-3 py-1.5 bg-positive hover:bg-positive/90 text-white rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Activity size={13} />
            Backtest Strategy
          </button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <button
            onClick={() => setShowDocs(!showDocs)}
            className={`px-2.5 py-1.5 rounded border text-xs font-mono font-medium flex items-center gap-1 transition-colors ${
              showDocs ? 'bg-accent text-white border-accent' : 'bg-surface-secondary border-border text-text-secondary'
            }`}
          >
            <BookOpen size={13} />
            Function Docs
          </button>
        </div>
      </div>

      {/* Main 3-Area Workspace */}
      <div className="flex-1 flex gap-2 overflow-hidden min-h-0">
        {/* LEFT PANEL: Script Explorer */}
        <div className="w-56 bg-surface border border-border rounded flex flex-col shrink-0 overflow-hidden">
          <div className="p-2 border-b border-border flex items-center justify-between">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Scripts & Templates
            </span>
            <button
              onClick={() => createNewScript('Custom Strategy')}
              title="New Script"
              className="p-1 hover:bg-surface-hover rounded text-text-secondary"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
            {scripts.map((s) => {
              const isSelected = s.id === activeScriptId;
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveScript(s.id)}
                  className={`group px-2 py-1.5 rounded text-xs font-mono flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-surface-secondary text-text-primary font-semibold border-l-2 border-accent' : 'text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateScript(s.id);
                      }}
                      title="Duplicate"
                      className="text-text-muted hover:text-text-primary"
                    >
                      <Copy size={11} />
                    </button>
                    {!s.isTemplate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteScript(s.id);
                        }}
                        title="Delete"
                        className="text-text-muted hover:text-negative"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2 border-t border-border flex gap-1">
            <button
              onClick={handleExport}
              className="flex-1 py-1 text-[10px] font-mono rounded bg-surface-secondary border border-border text-text-secondary hover:text-text-primary flex items-center justify-center gap-1"
            >
              <Download size={11} /> Export
            </button>
            <label className="flex-1 py-1 text-[10px] font-mono rounded bg-surface-secondary border border-border text-text-secondary hover:text-text-primary flex items-center justify-center gap-1 cursor-pointer">
              <Upload size={11} /> Import
              <input type="file" accept=".crypto,.txt" onChange={handleImportFile} className="hidden" />
            </label>
          </div>
        </div>

        {/* CENTER PANEL: Monaco Code Editor */}
        <div className="flex-1 bg-surface border border-border rounded flex flex-col overflow-hidden">
          <div className="flex-1 min-h-[300px]">
            <Editor
              height="100%"
              language="javascript"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={activeScriptCode}
              onChange={(val) => updateActiveCode(val || '')}
              options={{
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                minimap: { enabled: false },
                lineNumbers: 'on',
                folding: true,
                automaticLayout: true,
                tabSize: 4,
                scrollBeyondLastLine: false,
              }}
            />
          </div>

          {/* BOTTOM PANEL: Console, Strategy Tester, Plots */}
          <div className="h-56 border-t border-border bg-surface flex flex-col shrink-0">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-border bg-surface-secondary/40 px-3">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveBottomTab('console')}
                  className={`py-1.5 text-xs font-mono font-medium border-b-2 transition-colors ${
                    activeBottomTab === 'console'
                      ? 'border-accent text-text-primary font-semibold'
                      : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Execution Console
                </button>
                <button
                  onClick={() => setActiveBottomTab('tester')}
                  className={`py-1.5 text-xs font-mono font-medium border-b-2 transition-colors ${
                    activeBottomTab === 'tester'
                      ? 'border-accent text-text-primary font-semibold'
                      : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Strategy Tester
                </button>
                <button
                  onClick={() => setActiveBottomTab('plots')}
                  className={`py-1.5 text-xs font-mono font-medium border-b-2 transition-colors ${
                    activeBottomTab === 'plots'
                      ? 'border-accent text-text-primary font-semibold'
                      : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Plot Output ({lastExecutionResult?.plots.length || 0})
                </button>
              </div>

              {lastExecutionResult && (
                <div className="text-[10px] font-mono text-text-muted">
                  Execution Time: {lastExecutionResult.executionTimeMs.toFixed(1)}ms
                </div>
              )}
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-2.5 overflow-y-auto text-xs font-mono">
              {activeBottomTab === 'console' && (
                <div className="space-y-1">
                  {lastExecutionResult ? (
                    <>
                      {lastExecutionResult.errors.map((err, i) => (
                        <div key={i} className="text-negative flex items-center gap-1.5">
                          <AlertCircle size={12} />
                          <span>Line {err.line}: {err.message}</span>
                        </div>
                      ))}
                      {lastExecutionResult.logs.map((log, i) => (
                        <div key={i} className="text-text-secondary flex items-center gap-1.5">
                          <Terminal size={12} className="text-text-muted" />
                          <span>{log}</span>
                        </div>
                      ))}
                      {lastExecutionResult.errors.length === 0 && (
                        <div className="text-positive flex items-center gap-1.5">
                          <CheckCircle size={12} />
                          <span>Compilation succeeded with 0 errors. Ready for testing.</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-text-muted">Click "Compile & Run" to execute CryptoScript logic against {selectedAsset} market series.</div>
                  )}
                </div>
              )}

              {activeBottomTab === 'tester' && (
                <div>
                  {scriptBacktestResult ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="p-2 rounded bg-surface-secondary">
                          <div className="text-text-muted text-[10px]">Net Return</div>
                          <div className={`font-bold ${scriptBacktestResult.metrics.totalReturnPct >= 0 ? 'text-positive' : 'text-negative'}`}>
                            {formatPercent(scriptBacktestResult.metrics.totalReturnPct)}
                          </div>
                        </div>
                        <div className="p-2 rounded bg-surface-secondary">
                          <div className="text-text-muted text-[10px]">Sharpe Ratio</div>
                          <div className="font-bold text-accent">{scriptBacktestResult.metrics.sharpeRatio.toFixed(2)}</div>
                        </div>
                        <div className="p-2 rounded bg-surface-secondary">
                          <div className="text-text-muted text-[10px]">Max Drawdown</div>
                          <div className="font-bold text-negative">{formatPercent(scriptBacktestResult.metrics.maxDrawdownPct, 2, false)}</div>
                        </div>
                        <div className="p-2 rounded bg-surface-secondary">
                          <div className="text-text-muted text-[10px]">Trades Simulated</div>
                          <div className="font-bold">{scriptBacktestResult.trades.length}</div>
                        </div>
                      </div>
                      <EquityChart data={scriptBacktestResult.equityCurve} height={120} />
                    </div>
                  ) : (
                    <div className="text-text-muted">Click "Backtest Strategy" to simulate trades, apply transaction fees & slippage, and view the equity curve.</div>
                  )}
                </div>
              )}

              {activeBottomTab === 'plots' && (
                <div className="space-y-2">
                  {lastExecutionResult?.plots.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-surface-secondary">
                      <span className="font-semibold text-text-primary">{p.title}</span>
                      <span className="text-text-muted">{p.type} • {p.data.length} points</span>
                    </div>
                  ))}
                  {(!lastExecutionResult || lastExecutionResult.plots.length === 0) && (
                    <div className="text-text-muted">No plots registered. Use plot(series, "Title") in your code.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Function Explorer & Reference (Collapsible) */}
        {showDocs && (
          <div className="w-72 bg-surface border border-border rounded flex flex-col shrink-0 overflow-hidden">
            <div className="p-2 border-b border-border space-y-1.5">
              <div className="text-xs font-semibold text-text-primary">CRYPTOSCRIPT REGISTRY</div>
              <input
                type="text"
                placeholder="Search functions (ta, quant, risk)..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                className="w-full px-2 py-1 bg-surface-secondary border border-border rounded text-xs font-mono text-text-primary placeholder:text-text-muted"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-xs">
              {filteredFunctions.map((fn) => (
                <div key={fn.name} className="p-2 rounded border border-border bg-surface-secondary/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-accent">{fn.name}</span>
                    <Badge variant="neutral" size="sm">{fn.namespace}</Badge>
                  </div>
                  <div className="text-[11px] text-text-secondary">{fn.description}</div>
                  <div className="text-[10px] text-text-muted bg-surface p-1 rounded font-mono truncate">
                    {fn.example}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
