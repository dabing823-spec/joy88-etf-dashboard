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
const PHASE_COLORS: Record<string, string> = {
  accelerating: palette.up,
  decelerating: palette.info,
  stable: palette.textMuted,
}
const PHASE_ICONS: Record<string, string> = {
  accelerating: '▲',
  decelerating: '▼',
  stable: '●',
}

/* ── Score Ring (SVG gauge) ─────────────────────────── */
function ScoreRing({ score, maxScore, level }: { score: number; maxScore: number; level: string }) {
  const pct = Math.min(score / maxScore, 1)
  const r = 68
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct)
  const color = LEVEL_MAP[level]?.color || RISK_COLORS.green

  return (
    <div className="relative w-44 h-44 shrink-0">
      <svg width="176" height="176" viewBox="0 0 176 176">
        {/* Track */}
        <circle cx="88" cy="88" r={r} fill="none" stroke="var(--color-border)" strokeWidth="8" opacity={0.4} />
        {/* Gradient tick marks */}
        {Array.from({ length: 40 }).map((_, i) => {
          const angle = (i / 40) * 360 - 90
          const rad = (angle * Math.PI) / 180
          const x1 = 88 + (r - 6) * Math.cos(rad)
          const y1 = 88 + (r - 6) * Math.sin(rad)
          const x2 = 88 + (r + 2) * Math.cos(rad)
          const y2 = 88 + (r + 2) * Math.sin(rad)
          const filled = i / 40 <= pct
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={filled ? color : 'var(--color-border)'} strokeWidth={filled ? 2 : 1} opacity={filled ? 0.8 : 0.2} />
        })}
        {/* Progress arc */}
        <circle
          cx="88" cy="88" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 88 88)"
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s', filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black tabular-nums" style={{ color }}>{score}</span>
        <span className="text-xs text-text-muted font-medium">/ {maxScore}</span>
      </div>
    </div>
  )
}

/* ── Extremity Bar ──────────────────────────────────── */
function ExtremityBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-border/40 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color, boxShadow: pct > 70 ? `0 0 6px ${color}60` : 'none' }}
      />
    </div>
  )
}

/* ── Sparkline (SVG) ────────────────────────────────── */
function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 3) return null
  const w = data.length * 4
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => `${i * 4},${height - 2 - ((v - min) / range) * (height - 4)}`).join(' ')
  const fillPoints = `0,${height} ${points} ${(data.length - 1) * 4},${height}`

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <polygon points={fillPoints} fill={`${color}10`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
      {/* Latest point dot */}
      <circle cx={(data.length - 1) * 4} cy={height - 2 - ((data[data.length - 1] - min) / range) * (height - 4)} r="2.5" fill={color} />
    </svg>
  )
}

/* ── Signal Card ────────────────────────────────────── */
const GLOW_CLASS: Record<string, string> = {
  red: 'border-l-[3px] border-l-danger animate-[pulse-glow-danger_1.2s_ease-in-out_infinite]',
  yellow: 'border-l-[3px] border-l-warning animate-[pulse-glow-warning_3s_ease-in-out_infinite]',
  green: 'border-l-[3px] border-l-accent',
}

function SignalCard({ signal, history, onClick }: { signal: SignalItem; history?: HistoryPoint[]; onClick: () => void }) {
  const color = RISK_COLORS[signal.signal] || RISK_COLORS.green
  const sparkData = (history || []).slice(-30).map(h => h.close)
  const glow = GLOW_CLASS[signal.signal] || GLOW_CLASS.green
  const phaseColor = PHASE_COLORS[signal.phase] || '#9ca0b4'
  const phaseIcon = PHASE_ICONS[signal.phase] || '●'

  return (
    <button onClick={onClick} className={`group w-full text-left bg-card border border-border rounded-xl p-4 hover:bg-card-hover hover:border-accent/30 transition-all duration-200 ${glow}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-text-primary tracking-wide">{signal.name}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>{signal.signal}</span>
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }} />
        </div>
      </div>

      {/* Value + Phase */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-black tabular-nums" style={{ color }}>{signal.value?.toFixed(2) ?? '-'}</span>
        <span className="text-[10px] font-semibold tabular-nums" style={{ color: phaseColor }}>
          {phaseIcon} {signal.phase_label}
        </span>
      </div>

      {/* Slope + Accel */}
      <div className="flex items-center gap-3 mb-2 text-[10px] tabular-nums text-text-muted">
        <span>slope <span style={{ color }}>{signal.slope_20d >= 0 ? '+' : ''}{signal.slope_20d.toFixed(4)}</span></span>
        <span>accel <span className={signal.accel > 0 ? 'text-up' : signal.accel < 0 ? 'text-down' : ''}>{signal.accel >= 0 ? '+' : ''}{signal.accel.toFixed(4)}</span></span>
      </div>

      {/* Sparkline */}
      <Sparkline data={sparkData} color={color} height={36} />

      {/* Proximity + Extremity */}
      <div className="mt-2 space-y-1.5">
        {signal.proximity_label && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-text-muted shrink-0 w-14">{signal.proximity_label}</span>
            <div className="flex-1 h-1.5 bg-border/30 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{
                width: `${signal.proximity_pct ?? 0}%`,
                backgroundColor: (signal.proximity_pct ?? 0) > 80 ? palette.up : (signal.proximity_pct ?? 0) > 50 ? palette.warning : palette.down,
              }} />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-text-muted shrink-0 w-14">極端 P{signal.extremity_pct?.toFixed(0)}</span>
          <ExtremityBar pct={signal.extremity_pct} color={color} />
        </div>
      </div>
    </button>
  )
}

/* ── Signal Detail Modal ────────────────────────────── */
function SignalDetailModal({ signal, history, onClose }: { signal: SignalItem; history: HistoryPoint[]; onClose: () => void }) {
  const color = RISK_COLORS[signal.signal] || RISK_COLORS.green
  const phaseColor = PHASE_COLORS[signal.phase] || '#9ca0b4'

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

  // Compute 20d linear regression for trend line overlay
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
        label: '20d 趨勢線',
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
        {/* Header with color accent */}
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
            { label: '當前值', value: signal.value?.toFixed(2) ?? '-', vColor: color },
            { label: '20d 斜率', value: signal.slope_20d != null ? `${signal.slope_20d >= 0 ? '+' : ''}${signal.slope_20d.toFixed(4)}` : '-', vColor: color },
            { label: '加速度', value: signal.accel != null ? `${signal.accel >= 0 ? '+' : ''}${signal.accel.toFixed(4)}` : '-', vColor: signal.accel > 0 ? palette.up : signal.accel < 0 ? palette.down : palette.textMuted },
            { label: '極端度', value: signal.extremity_pct != null ? `P${signal.extremity_pct.toFixed(0)}` : '-', vColor: signal.extremity_pct > 70 ? palette.warning : palette.textMuted },
            { label: '趨勢', value: signal.phase_label, vColor: phaseColor },
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
          <div className="mx-6 mb-4">
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

        {/* Extremity bar (large) */}
        <div className="mx-6 mb-6 p-4 bg-bg rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">歷史斜率分布中的位置</span>
            <span className="text-sm font-bold tabular-nums" style={{ color }}>{signal.extremity_pct?.toFixed(1)}%</span>
          </div>
          <div className="relative w-full h-3 bg-border/30 rounded-full overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(to right, ${palette.down}30, ${palette.warning}30, ${palette.up}30)` }} />
            {/* Marker */}
            <div
              className="absolute top-0 h-full w-1 rounded-full"
              style={{ left: `${Math.min(signal.extremity_pct, 99)}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-text-muted mt-1">
            <span>正常</span>
            <span>偏高</span>
            <span>極端</span>
          </div>
        </div>
      </div>
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

  // Sort by severity: red → yellow → green, then by extremity desc
  const sortedSignals = useMemo(() =>
    [...signals].sort((a, b) => {
      const oi = SIGNAL_ORDER.indexOf(a.signal) - SIGNAL_ORDER.indexOf(b.signal)
      return oi !== 0 ? oi : (b.extremity_pct ?? 0) - (a.extremity_pct ?? 0)
    })
  , [signals])

  if (!riskSignals) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold font-display text-text-primary">Macro Risk Dashboard</h1>
        <div className="bg-card border border-border rounded-xl p-8 text-center text-text-muted">Loading...</div>
      </div>
    )
  }

  const { label: levelLabel, color: levelColor } = LEVEL_MAP[riskSignals.level] || LEVEL_MAP.green

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-display text-text-primary">Macro Risk Dashboard</h1>

      <IntroBox>
        8 個宏觀風險指標的 20 日趨勢斜率追蹤。核心：<strong>速度比位置重要</strong> — VIX 從 15 漲到 20 比維持在 25 更危險。
        <strong> SPY/JPY</strong> 套利平倉是最強領先指標、<strong>HYG/TLT</strong> 反映流動性枯竭速度。
      </IntroBox>

      {/* ── Hero: Score + Signal Summary ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-6 p-6">
          <ScoreRing score={riskSignals.score} maxScore={riskSignals.max_score} level={riskSignals.level} />
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-bold mb-2" style={{ color: levelColor }}>{levelLabel}</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {sortedSignals.map(s => {
                const c = RISK_COLORS[s.signal] || RISK_COLORS.green
                return (
                  <button
                    key={s.key}
                    onClick={() => setSelectedSignal(s)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105"
                    style={{ backgroundColor: `${c}15`, color: c, border: `1px solid ${c}30` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                    {s.name}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger" /> {riskSignals.n_red} Red</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> {riskSignals.n_yellow} Yellow</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: palette.down }} /> {riskSignals.n_green} Green</span>
              {riskSignals.updated_at && <span className="ml-auto opacity-60">{riskSignals.updated_at}</span>}
            </div>
          </div>
        </div>

        {/* Mini severity bar at bottom of hero */}
        <div className="flex h-1">
          {sortedSignals.map(s => (
            <div key={s.key} className="flex-1" style={{ backgroundColor: RISK_COLORS[s.signal] || RISK_COLORS.green, opacity: 0.7 }} />
          ))}
        </div>
      </div>

      {/* ── Signal Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sortedSignals.map(signal => (
          <SignalCard
            key={signal.key}
            signal={signal}
            history={historyMap[signal.key]}
            onClick={() => setSelectedSignal(signal)}
          />
        ))}
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
    </div>
  )
}
