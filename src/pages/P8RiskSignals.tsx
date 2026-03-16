import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import { useData } from '../contexts/DataContext'
import { IntroBox } from '../components/shared'
import { chartColors, defaultScaleOptions, defaultPluginOptions } from '../lib/chartDefaults'
import '../lib/chartDefaults'

const RISK_COLORS: Record<string, string> = { red: '#ff4757', yellow: '#ffa502', green: '#00c48c' }
const LEVEL_MAP: Record<string, { label: string; color: string }> = {
  red: { label: '🔴 高度警戒', color: '#ff4757' },
  high: { label: '🔴 高度警戒', color: '#ff4757' },
  yellow: { label: '🟡 中度警戒', color: '#ffa502' },
  medium: { label: '🟡 中度警戒', color: '#ffa502' },
  green: { label: '🟢 正常', color: '#00c48c' },
  low: { label: '🟢 正常', color: '#00c48c' },
}

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
}

interface HistoryPoint {
  date: string
  close: number
}

function ScoreRing({ score, maxScore, level }: { score: number; maxScore: number; level: string }) {
  const pct = Math.min(score / maxScore, 1)
  const circumference = 2 * Math.PI * 60
  const offset = circumference * (1 - pct)
  const color = LEVEL_MAP[level]?.color || RISK_COLORS.green

  return (
    <div className="relative w-36 h-36 shrink-0">
      <svg width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r="60" fill="none" stroke="var(--color-border)" strokeWidth="10" />
        <circle
          cx="72" cy="72" r="60" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 72 72)"
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-text-muted">/{maxScore}</span>
      </div>
    </div>
  )
}

function SignalCard({ signal, history, onClick }: { signal: SignalItem; history?: HistoryPoint[]; onClick: () => void }) {
  const color = RISK_COLORS[signal.signal] || RISK_COLORS.green
  const sparkData = (history || []).slice(-20).map(h => h.close)

  return (
    <button onClick={onClick} className="w-full text-left bg-card border border-border rounded-xl p-4 hover:bg-card-hover hover:border-accent/30 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-text-primary">{signal.name}</span>
        <span className="w-3 h-3 rounded-full shrink-0 shadow-[0_0_6px]" style={{ backgroundColor: color, color }} />
      </div>
      <div className="text-2xl font-bold tabular-nums mb-1" style={{ color }}>{signal.value?.toFixed(2) ?? '-'}</div>
      <div className="text-[10px] text-text-muted mb-1">{signal.desc}</div>
      <div className="text-[10px] font-medium mb-2" style={{ color: signal.phase === 'accelerating' ? '#ff4757' : signal.phase === 'decelerating' ? '#00c48c' : '#9ca0b4' }}>
        {signal.phase_label}
      </div>
      {/* Sparkline */}
      {sparkData.length > 2 && (
        <svg viewBox={`0 0 ${sparkData.length * 5} 24`} className="w-full h-6" preserveAspectRatio="none">
          <polyline
            points={sparkData.map((v, i) => {
              const min = Math.min(...sparkData)
              const max = Math.max(...sparkData)
              const range = max - min || 1
              const y = 22 - ((v - min) / range) * 20
              return `${i * 5},${y}`
            }).join(' ')}
            fill="none" stroke={color} strokeWidth="1.5"
          />
        </svg>
      )}
      <div className="text-[9px] text-text-muted mt-1 tabular-nums">slope: {signal.slope_20d >= 0 ? '+' : ''}{signal.slope_20d.toFixed(4)}</div>
    </button>
  )
}

function SignalDetailModal({ signal, history, onClose }: { signal: SignalItem; history: HistoryPoint[]; onClose: () => void }) {
  const color = RISK_COLORS[signal.signal] || RISK_COLORS.green

  const chartData = history.length > 0 ? {
    labels: history.map(h => h.date),
    datasets: [{
      label: signal.name,
      data: history.map(h => h.close),
      borderColor: color, backgroundColor: `${color}20`,
      borderWidth: 2, tension: 0.3, pointRadius: 2, pointBackgroundColor: color, fill: true,
    }],
  } : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full shadow-[0_0_8px]" style={{ backgroundColor: color, color }} />
            <h3 className="text-lg font-bold text-text-primary">{signal.name}</h3>
          </div>
          <button onClick={onClose} className="text-2xl text-text-muted hover:text-text-primary">&times;</button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-bg rounded-lg p-3 text-center">
            <div className="text-[10px] text-text-muted mb-1">當前值</div>
            <div className="text-lg font-bold tabular-nums" style={{ color }}>{signal.value?.toFixed(4)}</div>
          </div>
          <div className="bg-bg rounded-lg p-3 text-center">
            <div className="text-[10px] text-text-muted mb-1">20日斜率</div>
            <div className="text-lg font-bold tabular-nums" style={{ color }}>{signal.slope_20d >= 0 ? '+' : ''}{signal.slope_20d.toFixed(4)}</div>
          </div>
          <div className="bg-bg rounded-lg p-3 text-center">
            <div className="text-[10px] text-text-muted mb-1">加速度</div>
            <div className={`text-lg font-bold tabular-nums ${signal.accel > 0 ? 'text-up' : signal.accel < 0 ? 'text-down' : 'text-text-muted'}`}>
              {signal.accel >= 0 ? '+' : ''}{signal.accel.toFixed(4)}
            </div>
          </div>
          <div className="bg-bg rounded-lg p-3 text-center">
            <div className="text-[10px] text-text-muted mb-1">極端度</div>
            <div className="text-lg font-bold tabular-nums">{signal.extremity_pct.toFixed(0)}%</div>
          </div>
        </div>

        {/* Phase + Theory */}
        <div className="mb-4 p-3 bg-bg rounded-lg">
          <div className="text-sm font-medium mb-1" style={{ color: signal.phase === 'accelerating' ? '#ff4757' : '#00c48c' }}>
            {signal.phase_label}
          </div>
          <div className="text-xs text-text-muted leading-relaxed">{signal.theory}</div>
        </div>

        {/* 20-day Chart */}
        {chartData && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-text-primary mb-2">📈 20 日走勢</div>
            <div className="h-52">
              <Line data={chartData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: defaultPluginOptions,
                scales: { y: defaultScaleOptions, x: { ...defaultScaleOptions, ticks: { ...defaultScaleOptions.ticks, maxRotation: 45 } } },
              }} />
            </div>
          </div>
        )}

        {/* History Table */}
        {history.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-text-primary mb-2">📊 歷史數據</div>
            <div className="max-h-40 overflow-y-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-1 px-2 text-left text-text-muted">日期</th>
                    <th className="py-1 px-2 text-right text-text-muted">數值</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((h, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-1 px-2 font-mono">{h.date}</td>
                      <td className="py-1 px-2 text-right font-mono tabular-nums">{h.close?.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function P8RiskSignals() {
  const { strategy } = useData()
  const [selectedSignal, setSelectedSignal] = useState<SignalItem | null>(null)

  const riskSignals = strategy?.risk_signals
  const agentStatus = strategy?.agent_status
  const signals = (riskSignals?.signals || []) as unknown as SignalItem[]
  const historyMap = riskSignals?.history || {}

  if (!riskSignals) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary">🛡 宏觀風險訊號儀表板</h2>
        <div className="bg-card border border-border rounded-xl p-8 text-center text-text-muted">暫無風險訊號資料</div>
      </div>
    )
  }

  const { label: levelLabel, color: levelColor } = LEVEL_MAP[riskSignals.level] || LEVEL_MAP.green

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-text-primary">🛡 宏觀風險訊號儀表板</h2>

      <IntroBox>
        基於選擇權隱含特徵研究與流動性風險實驗，追蹤 8 個宏觀風險指標的 20 日趨勢斜率。<br />
        核心理論：<strong>VIX 斜率</strong>比絕對值重要、<strong>SPY/JPY</strong> 套利平倉是最強領先指標、<strong>HYG/TLT</strong> 反映流動性枯竭速度。
      </IntroBox>

      {/* Agent Status */}
      {agentStatus && (
        <details className="text-sm">
          <summary className="cursor-pointer text-text-muted py-1">Agent Pipeline 狀態</summary>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {Object.entries(agentStatus).map(([key, agent]) => (
              <div key={key} className="bg-card border border-border rounded-lg p-3">
                <div className="text-[10px] text-text-muted uppercase">{key}</div>
                <div className={`text-sm font-semibold ${agent.status === 'success' ? 'text-down' : 'text-warning'}`}>
                  {agent.status}
                </div>
                <div className="text-[10px] text-text-muted">{agent.updated_at}</div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Score Panel */}
      <div className="flex items-center gap-6 bg-card border border-border rounded-xl p-6">
        <ScoreRing score={riskSignals.score} maxScore={riskSignals.max_score} level={riskSignals.level} />
        <div>
          <div className="text-xl font-bold mb-1" style={{ color: levelColor }}>{levelLabel}</div>
          <div className="text-sm text-text-muted leading-relaxed">
            🔴 紅燈 {riskSignals.n_red} 個 · 🟡 黃燈 {riskSignals.n_yellow} 個 · 🟢 綠燈 {riskSignals.n_green} 個
          </div>
          {riskSignals.updated_at && (
            <div className="text-xs text-text-muted mt-2">更新：{riskSignals.updated_at}</div>
          )}
        </div>
      </div>

      {/* Signal Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {signals.map(signal => (
          <SignalCard
            key={signal.key}
            signal={signal}
            history={historyMap[signal.key]}
            onClick={() => setSelectedSignal(signal)}
          />
        ))}
      </div>

      {/* Signal Detail Modal */}
      {selectedSignal && (
        <SignalDetailModal
          signal={selectedSignal}
          history={historyMap[selectedSignal.key] || []}
          onClose={() => setSelectedSignal(null)}
        />
      )}

      {/* Research Basis */}
      <details className="bg-card border border-border rounded-xl p-5">
        <summary className="cursor-pointer font-semibold text-text-primary">📚 研究依據與理論基礎</summary>
        <div className="mt-4 text-sm text-text-muted leading-relaxed space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 bg-up/5 rounded-lg border-l-4 border-l-up">
              <div className="font-semibold text-text-primary mb-1">1. SPY/JPY 套利平倉壓力 <span className="text-up text-xs">重要度 19.9%</span></div>
              <p>借入低利率日圓買進美股的 Carry Trade。日圓走強迫使平倉，2024年8月台股同步重挫千點。</p>
            </div>
            <div className="p-4 bg-up/5 rounded-lg border-l-4 border-l-up">
              <div className="font-semibold text-text-primary mb-1">2. VIX 波動率趨勢 <span className="text-up text-xs">重要度 13.3%</span></div>
              <p>VIX 緩步墊高比突然飆升更能預測崩盤。20日斜率持續正值且加速 = 恐慌累積。</p>
            </div>
            <div className="p-4 bg-warning/5 rounded-lg border-l-4 border-l-warning">
              <div className="font-semibold text-text-primary mb-1">3. HYG/TLT 流動性枯竭 <span className="text-warning text-xs">重要度 12.5%</span></div>
              <p>HYG/TLT 比值下降 = 資金從垃圾債撤出湧入國債。信用市場領先股市 1-2 週。</p>
            </div>
            <div className="p-4 bg-accent/5 rounded-lg border-l-4 border-l-accent">
              <div className="font-semibold text-text-primary mb-1">4-8. DXY / US10Y / F&G / Gold / Oil</div>
              <p>美元壓力、殖利率、恐懼指數、黃金避險、油價通膨 — 五大輔助指標。</p>
            </div>
          </div>
          <div className="p-4 bg-purple/5 rounded-lg border-l-4 border-l-purple">
            <div className="font-semibold text-text-primary mb-1">方法論：速度 + 加速度 + 統計機率</div>
            <p>一階導數（20日斜率）判斷趨勢，二階導數（加速度）判斷惡化擴大程度。紅燈x2 + 黃燈x1 → 0-10 分制。</p>
          </div>
        </div>
      </details>
    </div>
  )
}
