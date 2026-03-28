import { useState, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { useData } from '../contexts/DataContext'
import { IntroBox } from '../components/shared'
import { defaultScaleOptions, defaultPluginOptions } from '../lib/chartDefaults'
import { RISK_LEVEL_COLORS as RISK_COLORS, LEVEL_MAP, palette } from '../lib/constants'
import '../lib/chartDefaults'

interface SignalItem {
  name: string
  key: string
  value: number
  slope_20d: number
  signal: string
  desc: string
  theory: string
  accel: number
  phase: string
  phase_label: string
  extremity_pct: number
  reliable: boolean
  threshold_yellow?: number | null
  threshold_red?: number | null
  threshold_dir?: string
  proximity_pct?: number
  proximity_label?: string
}

interface HistoryPoint {
  date: string
  close: number
  open?: number
  high?: number
  low?: number
}

const SIGNAL_ORDER = ['red', 'yellow', 'green']

/* ── Signal weight in composite (red=2, yellow=1, green=0) ── */
const SIGNAL_WEIGHT: Record<string, number> = { red: 2, yellow: 1, green: 0 }

/* ── Heat block sizes based on signal importance ── */
const BLOCK_SIZES: Record<string, 'large' | 'medium' | 'small'> = {
  vix: 'large',
  spy_jpy: 'large',
  fear_greed: 'medium',
  oil: 'medium',
  dxy: 'medium',
  hyg_tlt: 'medium',
  us10y: 'small',
  gold: 'small',
}

/* ── Composite Score Badge ─────────────────────────── */
function ScoreBadge({ score, maxScore, level }: { score: number; maxScore: number; level: string }) {
  const { label, color } = LEVEL_MAP[level] || LEVEL_MAP.green
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl border" style={{ borderColor: `${color}40`, backgroundColor: `${color}08` }}>
      <div className="text-3xl font-black tabular-nums" style={{ color }}>{score}</div>
      <div>
        <div className="text-xs text-text-muted">/{maxScore}</div>
        <div className="text-xs font-semibold" style={{ color }}>{label.replace(/🔴|🟡|🟢/g, '').trim()}</div>
      </div>
    </div>
  )
}

/* ── 30-Day Score Timeline ─────────────────────────── */
function ScoreTimeline({ history }: { history: Array<{ date: string; score: number }> }) {
  if (history.length < 3) return null

  const max = Math.max(...history.map(h => h.score))
  const peakIdx = history.findIndex(h => h.score === max)

  const chartData = {
    labels: history.map(h => h.date.slice(5)),
    datasets: [{
      label: 'Composite Score',
      data: history.map(h => h.score),
      borderColor: palette.accent,
      backgroundColor: `${palette.accent}15`,
      borderWidth: 2.5,
      tension: 0.35,
      pointRadius: history.map((_, i) => i === history.length - 1 || i === peakIdx ? 4 : 0),
      pointBackgroundColor: history.map((_, i) => i === peakIdx ? palette.up : palette.accent),
      pointBorderColor: history.map((_, i) => i === peakIdx ? palette.up : palette.accent),
      fill: true,
    }],
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">30-Day Composite Risk Score Timeline</h3>
        <div className="flex items-center gap-3 text-2xs text-text-muted">
          <span>Peak: <span className="text-up font-bold">{max.toFixed(1)}</span></span>
          <span>Current: <span className="text-accent font-bold">{history[history.length - 1]?.score.toFixed(1)}</span></span>
        </div>
      </div>
      <div className="h-28">
        <Line data={chartData} options={{
          responsive: true, maintainAspectRatio: false,
          plugins: {
            ...defaultPluginOptions,
            tooltip: {
              mode: 'index' as const, intersect: false,
              backgroundColor: 'rgba(15,17,28,0.95)', borderColor: `${palette.accent}50`, borderWidth: 1,
              titleColor: '#e4e6eb', bodyColor: '#9ca0b4', padding: 8, cornerRadius: 8,
              bodyFont: { family: 'monospace', size: 11 },
              callbacks: { label: (ctx: { parsed: { y: number | null } }) => ` Score: ${ctx.parsed.y?.toFixed(1) ?? '-'} / 10` },
            },
          },
          scales: {
            y: { ...defaultScaleOptions, min: 0, max: 10, ticks: { ...defaultScaleOptions.ticks, stepSize: 2 }, grid: { color: 'rgba(42,46,61,0.3)' } },
            x: { ...defaultScaleOptions, ticks: { ...defaultScaleOptions.ticks, maxRotation: 0, autoSkipPadding: 30 }, grid: { display: false } },
          },
        }} />
      </div>
    </div>
  )
}

/* ── Heat Block (treemap cell) ─────────────────────── */
function HeatBlock({ signal, size, onClick }: { signal: SignalItem; size: 'large' | 'medium' | 'small'; onClick: () => void }) {
  const color = RISK_COLORS[signal.signal] || RISK_COLORS.green
  const bgIntensity = signal.signal === 'red' ? '25' : signal.signal === 'yellow' ? '18' : '12'
  const sizeClass = size === 'large' ? 'col-span-2 row-span-2' : size === 'medium' ? 'col-span-1 row-span-2' : 'col-span-1 row-span-1'
  const weight = SIGNAL_WEIGHT[signal.signal] || 0
  const glowClass = signal.signal === 'red'
    ? 'animate-[pulse-glow-danger_1.2s_ease-in-out_infinite]'
    : signal.signal === 'yellow'
    ? 'animate-[pulse-glow-warning_3s_ease-in-out_infinite]'
    : ''

  return (
    <button
      onClick={onClick}
      className={`relative text-left rounded-xl border transition-all hover:scale-[1.02] hover:z-10 overflow-hidden ${sizeClass} ${glowClass}`}
      style={{
        borderColor: `${color}40`,
        backgroundColor: `${color}${bgIntensity}`,
      }}
    >
      {/* Severity indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: color, opacity: 0.8 }} />

      <div className={`p-3 h-full flex flex-col justify-between ${size === 'small' ? 'p-2.5' : 'p-4'}`}>
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className={`font-semibold text-text-primary ${size === 'large' ? 'text-sm' : 'text-xs'}`}>{signal.name}</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>{signal.signal}</span>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
            </div>
          </div>
          {size !== 'small' && <div className="text-[10px] text-text-muted truncate">{signal.desc}</div>}
        </div>

        {/* Value */}
        <div>
          <div className={`font-black tabular-nums ${size === 'large' ? 'text-3xl' : size === 'medium' ? 'text-2xl' : 'text-xl'}`} style={{ color }}>
            {signal.value?.toFixed(2) ?? '-'}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-muted tabular-nums mt-0.5">
            {size !== 'small' && (
              <>
                <span>W: {weight}</span>
                <span>P{signal.extremity_pct?.toFixed(0)}</span>
                <span className={signal.slope_20d >= 0 ? 'text-up' : 'text-down'}>
                  {signal.slope_20d >= 0 ? '▲' : '▼'} {Math.abs(signal.slope_20d).toFixed(4)}
                </span>
              </>
            )}
            {size === 'small' && <span>P{signal.extremity_pct?.toFixed(0)}</span>}
          </div>
        </div>
      </div>
    </button>
  )
}

/* ── Signal Detail Modal ────────────────────────────── */
function SignalDetailModal({ signal, history, onClose }: { signal: SignalItem; history: HistoryPoint[]; onClose: () => void }) {
  const color = RISK_COLORS[signal.signal] || RISK_COLORS.green

  const chartData = history.length > 0 ? {
    labels: history.map(h => h.date.slice(5)),
    datasets: [{
      label: signal.name,
      data: history.map(h => h.close),
      borderColor: color, backgroundColor: `${color}15`,
      borderWidth: 2.5, tension: 0.3, pointRadius: 1, pointHoverRadius: 5,
      pointBackgroundColor: color, pointHoverBackgroundColor: color, fill: true,
    }],
  } : null

  const trendLine = useMemo(() => {
    if (history.length < 5) return null
    const last20 = history.slice(-20)
    const n = last20.length
    const xs = Array.from({ length: n }, (_, i) => i)
    const ys = last20.map(h => h.close)
    const xMean = (n - 1) / 2
    const yMean = ys.reduce((a, b) => a + b, 0) / n
    const num = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0)
    const den = xs.reduce((s, x) => s + (x - xMean) ** 2, 0)
    const slope = den ? num / den : 0
    const intercept = yMean - slope * xMean
    return { start: intercept, end: slope * (n - 1) + intercept, startIdx: history.length - n, slope }
  }, [history])

  const chartDataWithTrend = chartData && trendLine ? {
    ...chartData,
    datasets: [
      ...chartData.datasets,
      {
        label: '20d Trend',
        data: history.map((_, i) => {
          if (i < trendLine.startIdx) return null
          const localIdx = i - trendLine.startIdx
          return trendLine.start + trendLine.slope * localIdx
        }),
        borderColor: `${color}60`, borderWidth: 1.5, borderDash: [6, 3],
        tension: 0, pointRadius: 0, fill: false,
      },
    ],
  } : chartData

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ borderColor: `${color}30` }}>
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}80` }} />
              <h3 className="text-xl font-bold text-text-primary">{signal.name}</h3>
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>{signal.signal}</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-border/50 text-text-muted hover:text-text-primary transition-colors text-lg">&times;</button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="px-6 grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
          {[
            { label: 'Current', value: signal.value?.toFixed(2) ?? '-', vColor: color },
            { label: '20d Slope', value: signal.slope_20d != null ? `${signal.slope_20d >= 0 ? '+' : ''}${signal.slope_20d.toFixed(4)}` : '-', vColor: color },
            { label: 'Accel', value: signal.accel != null ? `${signal.accel >= 0 ? '+' : ''}${signal.accel.toFixed(4)}` : '-', vColor: signal.accel > 0 ? palette.up : signal.accel < 0 ? palette.down : palette.textMuted },
            { label: 'Extremity', value: signal.extremity_pct != null ? `P${signal.extremity_pct.toFixed(0)}` : '-', vColor: signal.extremity_pct > 70 ? palette.warning : palette.textMuted },
            { label: 'Phase', value: signal.phase_label, vColor: palette.textMuted },
          ].map(kpi => (
            <div key={kpi.label} className="bg-bg rounded-xl p-3">
              <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wider">{kpi.label}</div>
              <div className="text-base font-bold tabular-nums" style={{ color: kpi.vColor }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Theory */}
        <div className="mx-6 mb-4 p-3 bg-bg/50 rounded-xl border-l-[3px]" style={{ borderColor: color }}>
          <div className="text-xs text-text-muted leading-relaxed">{signal.theory}</div>
        </div>

        {/* Chart */}
        {chartDataWithTrend && (
          <div className="mx-6 mb-6">
            <div className="h-64">
              <Line data={chartDataWithTrend} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  ...defaultPluginOptions,
                  tooltip: {
                    mode: 'index' as const, intersect: false,
                    backgroundColor: 'rgba(15,17,28,0.95)', borderColor: `${color}50`, borderWidth: 1,
                    titleColor: '#e4e6eb', bodyColor: '#9ca0b4', padding: 10, cornerRadius: 8,
                    bodyFont: { family: 'monospace', size: 11 },
                  },
                },
                scales: {
                  y: { ...defaultScaleOptions, grid: { color: 'rgba(42,46,61,0.3)' } },
                  x: { ...defaultScaleOptions, ticks: { ...defaultScaleOptions.ticks, maxRotation: 0, autoSkipPadding: 20 }, grid: { display: false } },
                },
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Signal Contribution Sidebar ───────────────────── */
function SignalContribution({ signals }: { signals: SignalItem[] }) {
  const sorted = [...signals].sort((a, b) => {
    const wa = SIGNAL_WEIGHT[a.signal] || 0
    const wb = SIGNAL_WEIGHT[b.signal] || 0
    return wb - wa || (b.extremity_pct ?? 0) - (a.extremity_pct ?? 0)
  })
  const maxWeight = 2

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Signal Contribution</h3>
      <div className="space-y-2">
        {sorted.map(s => {
          const color = RISK_COLORS[s.signal] || RISK_COLORS.green
          const weight = SIGNAL_WEIGHT[s.signal] || 0
          const barPct = (weight / maxWeight) * 100
          return (
            <div key={s.key} className="flex items-center gap-2">
              <span className="w-20 text-xs text-text-muted truncate">{s.name.replace(/\s+/g, '').slice(0, 8)}</span>
              <div className="flex-1 h-2 bg-border/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(barPct, 5)}%`, backgroundColor: color }} />
              </div>
              <span className="text-xs font-bold tabular-nums w-8 text-right" style={{ color }}>{weight.toFixed(1)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Risk Zone Indicator ───────────────────────────── */
function RiskZone({ score, maxScore }: { score: number; maxScore: number }) {
  const zones = [
    { label: 'SAFE', max: 2, color: palette.down },
    { label: 'LOW', max: 4, color: palette.info },
    { label: 'MID', max: 6, color: palette.warning },
    { label: 'HIGH', max: 8, color: palette.up },
    { label: 'CRIT', max: 10, color: '#ff2222' },
  ]
  const pct = Math.min((score / maxScore) * 100, 100)

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Risk Zone</h3>
      <div className="flex gap-0.5 mb-2">
        {zones.map(z => {
          const isActive = score <= z.max && score > (z.max - 2)
          return (
            <div key={z.label} className="flex-1 text-center">
              <div
                className="h-3 rounded-sm transition-all"
                style={{
                  backgroundColor: isActive ? z.color : `${z.color}20`,
                  boxShadow: isActive ? `0 0 8px ${z.color}60` : undefined,
                }}
              />
              <div className="text-[8px] mt-1 font-bold tracking-wider" style={{ color: isActive ? z.color : palette.textMuted }}>
                {z.label}
              </div>
            </div>
          )
        })}
      </div>
      <div className="text-xs text-text-muted text-center tabular-nums">Current: {score} / {maxScore}</div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────── */
export function P8RiskSignals() {
  const { strategy } = useData()
  const [selectedSignal, setSelectedSignal] = useState<SignalItem | null>(null)

  const riskSignals = strategy?.risk_signals
  const signals = (riskSignals?.signals || []) as unknown as SignalItem[]
  const historyMap = riskSignals?.history || {}
  const scoreHistory = riskSignals?.score_history || []

  const sortedSignals = useMemo(() =>
    [...signals].sort((a, b) => {
      const oi = SIGNAL_ORDER.indexOf(a.signal) - SIGNAL_ORDER.indexOf(b.signal)
      return oi !== 0 ? oi : (b.extremity_pct ?? 0) - (a.extremity_pct ?? 0)
    })
  , [signals])

  // Map signals by key for the grid layout
  const signalMap = useMemo(() => {
    const m: Record<string, SignalItem> = {}
    signals.forEach(s => { m[s.key] = s })
    return m
  }, [signals])

  if (!riskSignals) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold font-display text-text-primary">Macro Risk Dashboard</h1>
        <div className="bg-card border border-border rounded-xl p-8 text-center text-text-muted">Loading...</div>
      </div>
    )
  }

  // Grid layout: large blocks for VIX + SPY/JPY, medium for others, small for US10Y + Gold
  const gridSignals = [
    { key: 'vix', size: 'large' as const },
    { key: 'spy_jpy', size: 'large' as const },
    { key: 'oil', size: 'medium' as const },
    { key: 'fear_greed', size: 'medium' as const },
    { key: 'dxy', size: 'medium' as const },
    { key: 'hyg_tlt', size: 'medium' as const },
    { key: 'us10y', size: 'small' as const },
    { key: 'gold', size: 'small' as const },
  ]

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display text-text-primary">Macro Risk Dashboard</h1>
        <ScoreBadge score={riskSignals.score} maxScore={riskSignals.max_score} level={riskSignals.level} />
      </div>

      <IntroBox>
        8 個宏觀風險指標的 20 日趨勢斜率追蹤。核心：<strong>速度比位置重要</strong> — VIX 從 15 漲到 20 比維持在 25 更危險。
        方塊大小 = 信號權重，顏色深淺 = 嚴重度。點擊任一方塊查看詳情。
      </IntroBox>

      {/* ── 30-Day Score Timeline ── */}
      <ScoreTimeline history={scoreHistory} />

      {/* ── Heat Matrix + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-3">
        {/* Heat Matrix Grid */}
        <div className="grid grid-cols-4 grid-rows-4 gap-2 auto-rows-fr" style={{ minHeight: '420px' }}>
          {gridSignals.map(({ key, size }) => {
            const signal = signalMap[key]
            if (!signal) return null
            return (
              <HeatBlock
                key={key}
                signal={signal}
                size={size}
                onClick={() => setSelectedSignal(signal)}
              />
            )
          })}
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Score Stats */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Current Score</span>
                <span className="text-sm font-bold text-accent tabular-nums">{riskSignals.score}</span>
              </div>
              {scoreHistory.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">30D High</span>
                    <span className="text-sm font-bold text-up tabular-nums">{Math.max(...scoreHistory.map(h => h.score)).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">30D Low</span>
                    <span className="text-sm font-bold text-down tabular-nums">{Math.min(...scoreHistory.map(h => h.score)).toFixed(1)}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Alerts</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger" />{riskSignals.n_red}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" />{riskSignals.n_yellow}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: palette.down }} />{riskSignals.n_green}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signal Contribution */}
          <SignalContribution signals={sortedSignals} />

          {/* Risk Zone */}
          <RiskZone score={riskSignals.score} maxScore={riskSignals.max_score} />
        </div>
      </div>

      {/* ── Signal Detail Modal ── */}
      {selectedSignal && (
        <SignalDetailModal
          signal={selectedSignal}
          history={historyMap[selectedSignal.key] || []}
          onClose={() => setSelectedSignal(null)}
        />
      )}

      {/* ── Research Basis ── */}
      <details className="bg-card border border-border rounded-xl p-5">
        <summary className="cursor-pointer font-semibold text-text-primary text-sm">研究依據與理論基礎</summary>
        <div className="mt-4 text-sm text-text-muted leading-relaxed space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 bg-up/5 rounded-xl border-l-4 border-l-up">
              <div className="font-semibold text-text-primary mb-1">SPY/JPY 套利平倉壓力 <span className="text-up text-xs">19.9%</span></div>
              <p className="text-xs">借入低利率日圓買進美股的 Carry Trade。日圓走強迫使平倉，2024年8月台股同步重挫千點。</p>
            </div>
            <div className="p-4 bg-up/5 rounded-xl border-l-4 border-l-up">
              <div className="font-semibold text-text-primary mb-1">VIX 波動率趨勢 <span className="text-up text-xs">13.3%</span></div>
              <p className="text-xs">VIX 緩步墊高比突然飆升更能預測崩盤。20日斜率持續正值且加速 = 恐慌累積。</p>
            </div>
            <div className="p-4 bg-warning/5 rounded-xl border-l-4 border-l-warning">
              <div className="font-semibold text-text-primary mb-1">HYG/TLT 流動性枯竭 <span className="text-warning text-xs">12.5%</span></div>
              <p className="text-xs">HYG/TLT 比值下降 = 資金從垃圾債撤出湧入國債。信用市場領先股市 1-2 週。</p>
            </div>
            <div className="p-4 bg-accent/5 rounded-xl border-l-4 border-l-accent">
              <div className="font-semibold text-text-primary mb-1">DXY / US10Y / F&G / Gold / Oil</div>
              <p className="text-xs">美元壓力、殖利率、恐懼指數、黃金避險、油價通膨 — 五大輔助指標。</p>
            </div>
          </div>
          <div className="p-4 bg-info/5 rounded-xl border-l-4 border-l-info">
            <div className="font-semibold text-text-primary mb-1">方法論：速度 + 加速度 + 統計機率</div>
            <p className="text-xs">一階導數（20日斜率）判斷趨勢方向，二階導數（加速度）判斷惡化是擴大或收斂。紅燈x2 + 黃燈x1 → 0-10 分制。極端度 = 當前斜率在歷史分布中的百分位。</p>
          </div>
        </div>
      </details>

      {/* ── Footer ── */}
      {riskSignals.updated_at && (
        <div className="text-xs text-text-muted text-right">Pipeline OK {riskSignals.updated_at}</div>
      )}
    </div>
  )
}
