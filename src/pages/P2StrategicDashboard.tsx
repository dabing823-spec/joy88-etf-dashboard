import { Link } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import { Badge, TableContainer, DataTable, AdvisorCard } from '../components/shared'
import type { MarketIndices, ConsensusItem, CashSeriesItem } from '../types'

/* ── Mini K-line (SVG candlestick) ─────────────────── */

interface KBar { date: string; open: number; high: number; low: number; close: number }

function MiniKline({ data, width = 160, height = 48 }: { data: KBar[]; width?: number; height?: number }) {
  if (data.length < 2) return null
  const allHigh = Math.max(...data.map(d => d.high))
  const allLow = Math.min(...data.map(d => d.low))
  const range = allHigh - allLow || 1
  const barW = Math.max(2, (width - 4) / data.length - 1)
  const toY = (v: number) => height - 2 - ((v - allLow) / range) * (height - 4)

  return (
    <svg width={width} height={height} className="block">
      {data.map((d, i) => {
        const x = 2 + i * ((width - 4) / data.length) + barW / 2
        const isUp = d.close >= d.open
        const color = isUp ? 'var(--color-up)' : 'var(--color-down)'
        const bodyTop = toY(Math.max(d.open, d.close))
        const bodyBot = toY(Math.min(d.open, d.close))
        const bodyH = Math.max(1, bodyBot - bodyTop)
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={toY(d.high)} y2={toY(d.low)} stroke={color} strokeWidth={0.8} />
            <rect x={x - barW / 2} y={bodyTop} width={barW} height={bodyH} fill={color} rx={0.5} />
          </g>
        )
      })}
    </svg>
  )
}

/* ── helpers ─────────────────────────────────────────── */

function Chg({ val, suffix = '' }: { val?: number; suffix?: string }) {
  if (val == null) return <span className="text-text-muted">-</span>
  const c = val > 0 ? 'text-up' : val < 0 ? 'text-down' : 'text-text-muted'
  return <span className={`${c} tabular-nums`}>{val > 0 ? '+' : ''}{val.toFixed(2)}{suffix}</span>
}

/* ── Hero Index Cards ────────────────────────────────── */

function HeroCard({ flag, label, value, chg, chgPct, delay }: {
  flag: string; label: string; value?: number; chg?: number; chgPct?: number; delay?: string
}) {
  const c = (chg ?? 0) > 0 ? 'text-up' : (chg ?? 0) < 0 ? 'text-down' : 'text-text-muted'
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:bg-card-hover transition-all" style={{ animationDelay: delay }}>
      <div className="text-xs text-text-muted mb-1">{flag} {label}</div>
      <div className={`text-3xl font-extrabold tabular-nums ${c}`}>
        {value != null ? value.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '-'}
      </div>
      <div className="flex items-center gap-2 mt-1 text-sm">
        <Chg val={chg} /> <span className="text-text-muted">|</span> <Chg val={chgPct} suffix="%" />
      </div>
    </div>
  )
}

/* ── Sentiment Card ──────────────────────────────────── */

function SentimentCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center hover:bg-card-hover transition-colors">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${color || ''}`}>{value}</div>
      <div className="text-[10px] text-text-muted mt-1">{sub}</div>
    </div>
  )
}

/* ── Macro Cell ──────────────────────────────────────── */

function MacroCell({ emoji, label, value, chgPct, hint }: { emoji: string; label: string; value?: number; chgPct?: number; hint: string }) {
  return (
    <div className="p-4 border-r border-border/30 last:border-r-0">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-lg">{emoji}</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-text-primary tabular-nums">{value?.toFixed(2) ?? '-'}</span>
        <Chg val={chgPct} suffix="%" />
      </div>
      <div className="text-[10px] text-text-muted mt-1 opacity-50">{hint}</div>
    </div>
  )
}

/* ── Risk Banner (clickable → P8) ────────────────────── */

const LEVEL_MAP: Record<string, { label: string; color: string }> = {
  red: { label: '🔴 高度警戒', color: '#ff4757' },
  high: { label: '🔴 高度警戒', color: '#ff4757' },
  yellow: { label: '🟡 中度警戒', color: '#ffa502' },
  medium: { label: '🟡 中度警戒', color: '#ffa502' },
  green: { label: '🟢 正常', color: '#00c48c' },
  low: { label: '🟢 正常', color: '#00c48c' },
}

function RiskBanner({ score, maxScore, level, nRed, nYellow, nGreen, updatedAt, signals }: {
  score: number; maxScore: number; level: string; nRed: number; nYellow: number; nGreen: number; updatedAt: string
  signals: Array<{ name: string; level: string }>
}) {
  const mapped = LEVEL_MAP[level] || LEVEL_MAP.green
  const color = mapped.color
  const label = mapped.label

  return (
    <Link to="/risk" className="block bg-card border border-border rounded-xl overflow-hidden mb-3 hover:bg-card-hover transition-colors">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-[3px] shrink-0"
            style={{ borderColor: color, color, background: `${color}10` }}>
            {score}
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color }}>{label}</div>
            <div className="text-xs text-text-muted">
              紅{nRed} 黃{nYellow} 綠{nGreen} | /{maxScore} 分 | {updatedAt}
            </div>
          </div>
        </div>
        <span className="text-accent text-xs font-medium">詳情 →</span>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 py-2.5">
        {signals.map((s, i) => {
          const sc = (LEVEL_MAP[s.level] || LEVEL_MAP.green).color
          return (
            <span key={i} className="px-2 py-0.5 rounded text-[10px] font-semibold"
              style={{ backgroundColor: `${sc}15`, color: sc }}>
              {s.name}
            </span>
          )
        })}
      </div>
    </Link>
  )
}

/* ── Gauge Card ──────────────────────────────────────── */

function GaugeCard({ title, value, mode, modeColor }: { title: string; value: string; mode: string; modeColor: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center hover:bg-card-hover transition-colors">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">{title}</div>
      <div className="text-xl font-bold text-text-primary mb-2">{value}</div>
      <div className="px-3 py-1 rounded-xl text-xs font-semibold" style={{ backgroundColor: `${modeColor}20`, color: modeColor }}>
        {mode}
      </div>
    </div>
  )
}

/* ── Main Component ──────────────────────────────────── */

export function P2StrategicDashboard() {
  const { dashboard, strategy, advisor, indicesHistory } = useData()
  const mi: MarketIndices | undefined = strategy?.market_indices
  const riskSignals = strategy?.risk_signals
  const cashMode = dashboard?.cash_mode
  const consensus = dashboard?.consensus || []
  const dailyChanges = dashboard?.daily_changes?.['00981A'] || []
  const cashSeries = dashboard?.cash_series || []

  // Get TAIEX/TPEX from cash_series
  const latestCash = cashSeries.length > 0 ? cashSeries[cashSeries.length - 1] : undefined
  const prevCash = cashSeries.length > 1 ? cashSeries[cashSeries.length - 2] : undefined
  const taiex = latestCash?.taiex
  const tpex = latestCash?.tpex
  const prevTaiex = prevCash?.taiex
  const prevTpex = prevCash?.tpex
  const taiexChg = taiex && prevTaiex ? taiex - prevTaiex : undefined
  const taiexChgPct = taiex && prevTaiex ? ((taiex - prevTaiex) / prevTaiex) * 100 : undefined
  const tpexChg = tpex && prevTpex ? tpex - prevTpex : undefined
  const tpexChgPct = tpex && prevTpex ? ((tpex - prevTpex) / prevTpex) * 100 : undefined

  // Calculate MA20/MA60 from cash_series
  const calcMA = (arr: number[], period: number) => arr.length >= period ? arr.slice(-period).reduce((a, b) => a + b, 0) / period : undefined
  const getMaInfo = (values: number[], current: number | undefined) => {
    const ma20 = calcMA(values, 20)
    const ma60 = calcMA(values, 60)
    const label = current && ma60 && ma20
      ? current > ma20 ? '月線之上' : current > ma60 ? '月線之下 季線之上' : '季線之下'
      : undefined
    const color = label === '月線之上' ? '#00c48c' : label === '季線之下' ? '#ff4757' : '#ffa502'
    return { ma20, ma60, label, color }
  }
  const taiexValues = cashSeries.map(d => d.taiex).filter((v): v is number => v != null)
  const tpexValues = cashSeries.map(d => d.tpex).filter((v): v is number => v != null)
  const taiexMa = getMaInfo(taiexValues, taiex)
  const tpexMa = getMaInfo(tpexValues, tpex)

  // Recent 4-day history for mini sparkline tables
  const recent4 = cashSeries.slice(-4)
  const getRecentDeltas = (key: 'taiex' | 'tpex') => {
    return recent4.map((d, i) => {
      const val = d[key]
      const prev = i > 0 ? recent4[i - 1][key] : (cashSeries.length > 4 ? cashSeries[cashSeries.length - 5]?.[key] : undefined)
      const chg = val != null && prev != null ? val - prev : undefined
      const pct = val != null && prev != null && prev !== 0 ? ((val - prev) / prev) * 100 : undefined
      return { date: d.date.slice(5), val, chg, pct }
    })
  }
  const taiexRecent = getRecentDeltas('taiex')
  const tpexRecent = getRecentDeltas('tpex')

  // 攻防模式顏色映射
  const modeText = cashMode?.mode || ''
  const modeColor = modeText.includes('進攻') || modeText.includes('積極') ? '#ff4757'
    : modeText.includes('防守') || modeText.includes('保守') ? '#ffa502'
    : modeText.includes('恐慌') || modeText.includes('觀望') ? '#00c48c'
    : '#4f8ef7'

  // Laomo signals map for hold suggestion
  const laomoSignals = dashboard?.laomo_signals || []
  const holdMap = Object.fromEntries(laomoSignals.map(s => [s.code, s]))

  // VIX classification
  const vixLevel = (v: number) => v < 15 ? 'text-down' : v < 20 ? 'text-text-primary' : v < 30 ? 'text-warning' : 'text-up'
  const fgLevel = (v: number) => v < 25 ? 'text-up' : v < 45 ? 'text-warning' : v < 55 ? 'text-text-primary' : 'text-down'
  const fgLabel = mi?.fear_greed_rating || mi?.fear_greed_label || '-'

  // Consensus table
  const top15 = consensus.slice(0, 15)
  const consensusColumns = [
    { key: 'code', label: '代碼', render: (c: ConsensusItem) => <span className="font-mono text-accent">{c.code}</span> },
    { key: 'name', label: '名稱' },
    {
      key: 'avg_weight', label: '共識%', align: 'right' as const,
      render: (c: ConsensusItem) => `${c.avg_weight?.toFixed(2) ?? '-'}%`,
      sortValue: (c: ConsensusItem) => c.avg_weight || 0,
    },
    {
      key: 'etf_count', label: 'ETF數', align: 'right' as const,
      render: (c: ConsensusItem) => (
        <div className="flex items-center justify-end gap-0.5">
          {Array.from({ length: c.etf_count }).map((_, i) => (
            <span key={i} className="w-2 h-2 rounded-full bg-accent" />
          ))}
        </div>
      ),
      sortValue: (c: ConsensusItem) => c.etf_count,
    },
  ]

  // Today signals
  const todayChanges = dailyChanges.length > 0 ? dailyChanges[dailyChanges.length - 1] : null
  const nNew = todayChanges?.new?.length || 0
  const nAdded = todayChanges?.added?.length || 0
  const nReduced = todayChanges?.reduced?.length || 0
  const nExited = todayChanges?.exited?.length || 0
  const totalSignals = nNew + nAdded + nReduced + nExited

  const cashNow = cashMode?.cash_now ?? 0
  const cashTrend = cashMode?.trend || '-'
  const cashTrendColor = cashTrend === '上升' ? '#ff4757' : cashTrend === '下降' ? '#00c48c' : '#9ca0b4'

  return (
    <div className="space-y-4">
      <h1 className="sr-only">JOY88 ETF 戰略儀表板</h1>

      {/* ── AI Advisor ── */}
      <AdvisorCard
        advisory={advisor?.advisories?.[0] ?? null}
        riskScore={strategy?.risk_signals ? `${strategy.risk_signals.score}/${strategy.risk_signals.max_score}` : undefined}
      />

      {/* ── Market Overview (TAIEX, TPEX, VIX, F&G — one row) ── */}
      {(() => {
        const cards = [
          { label: 'TAIEX', hk: 'taiex', val: taiex, chgPct: taiexChgPct, digits: 0, tag: taiexMa.label, tagColor: taiexMa.color,
            valColor: (taiexChgPct ?? 0) > 0 ? 'text-up' : (taiexChgPct ?? 0) < 0 ? 'text-down' : 'text-text-muted' },
          { label: 'TPEX', hk: 'tpex', val: tpex, chgPct: tpexChgPct, digits: 2, tag: tpexMa.label, tagColor: tpexMa.color,
            valColor: (tpexChgPct ?? 0) > 0 ? 'text-up' : (tpexChgPct ?? 0) < 0 ? 'text-down' : 'text-text-muted' },
          { label: 'VIX', hk: 'vix', val: mi?.vix, chgPct: mi?.vix_chg_pct, digits: 2, tag: undefined, tagColor: undefined,
            valColor: (mi?.vix ?? 0) > 25 ? 'text-up' : (mi?.vix ?? 0) > 20 ? 'text-warning' : 'text-down' },
          { label: 'Fear & Greed', hk: 'fear_greed', val: mi?.fear_greed, chgPct: mi?.fear_greed_chg, digits: 0, tag: fgLabel,
            tagColor: (mi?.fear_greed ?? 50) < 25 ? '#e54545' : (mi?.fear_greed ?? 50) < 45 ? '#f59e0b' : '#22c55e',
            valColor: (mi?.fear_greed ?? 50) < 25 ? 'text-up' : (mi?.fear_greed ?? 50) < 45 ? 'text-warning' : 'text-down' },
        ]
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {cards.map(c => {
              const histRaw = (indicesHistory?.[c.hk] ?? []).slice(-15)
              const kOhlc: KBar[] = histRaw
                .filter((d: any) => d.open != null && d.high != null && d.low != null && d.close != null)
                .map((d: any) => ({ date: d.date, open: d.open, high: d.high, low: d.low, close: d.close }))
              const kClose: KBar[] = histRaw
                .filter((d: any) => d.close != null)
                .map((d: any) => ({ date: d.date, open: d.close, high: d.close, low: d.close, close: d.close }))
              // Extra fallback for TAIEX/TPEX from cashSeries
              const csFallback: KBar[] = (c.hk === 'taiex' || c.hk === 'tpex')
                ? cashSeries.slice(-15).filter(d => d[c.hk as 'taiex' | 'tpex'] != null).map(d => {
                    const v = d[c.hk as 'taiex' | 'tpex'] as number
                    return { date: d.date, open: v, high: v, low: v, close: v }
                  })
                : []
              const kData = kOhlc.length >= 3 ? kOhlc : kClose.length >= 3 ? kClose : csFallback
              const suffix = c.hk === 'fear_greed' ? '' : '%'
              return (
                <div key={c.hk} className="bg-card border border-border rounded-lg p-2.5 hover:bg-card-hover transition-all">
                  <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <div className="text-[9px] text-text-muted uppercase tracking-wider">{c.label}</div>
                      <div className={`text-base font-bold tabular-nums leading-tight ${c.valColor}`}>
                        {c.val != null ? Number(c.val).toLocaleString('en-US', { maximumFractionDigits: c.digits }) : '-'}
                      </div>
                      {c.chgPct != null && (
                        <div className="text-[10px] tabular-nums"><Chg val={c.chgPct} suffix={suffix} /></div>
                      )}
                    </div>
                    <MiniKline data={kData} width={72} height={30} />
                  </div>
                  {c.tag && c.tagColor && (
                    <div className="mt-1 px-1.5 py-0.5 rounded text-[8px] font-semibold inline-block" style={{ backgroundColor: `${c.tagColor}15`, color: c.tagColor }}>
                      {c.tag}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ── Global Macro Dashboard ── */}
      {mi && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-border">
            <h2 className="text-sm font-semibold tracking-wide">Global Macro Dashboard</h2>
            <span className="text-[10px] text-text-muted tracking-wider">OIL · DXY · GOLD · YIELD</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4">
            <MacroCell emoji="💵" label="DXY 美元指數" value={mi.dxy} chgPct={mi.dxy_chg_pct} hint="看資金流向" />
            <MacroCell emoji="🛢️" label="WTI 原油" value={mi.oil} chgPct={mi.oil_chg_pct} hint="看經濟成本" />
            <MacroCell emoji="🥇" label="黃金 GOLD" value={mi.gold} chgPct={mi.gold_chg_pct} hint="看避險需求" />
            <MacroCell emoji="📈" label="US 10Y" value={mi.us10y} chgPct={mi.us10y_chg_pct} hint="看利率環境" />
          </div>
          {/* Macro Reading Guide */}
          <details className="border-t border-border/30">
            <summary className="px-5 py-2 text-[10px] text-text-muted cursor-pointer hover:text-text-primary">
              ℹ️ 五大指標怎麼看？(點擊展開)
            </summary>
            <div className="px-5 pb-3 text-xs text-text-muted leading-relaxed">
              <div className="grid grid-cols-[70px_50px_1fr] gap-x-2 gap-y-0.5">
                <span className="font-semibold text-text-primary">VIX</span><span>情緒</span><span>&lt;15 低波動 | 15-20 正常 | 20-30 偏高 | &gt;30 恐慌</span>
                <span className="font-semibold text-text-primary">DXY</span><span>資金</span><span>走強→流動性收縮；走弱→資金外流，股市有行情</span>
                <span className="font-semibold text-text-primary">Oil</span><span>成本</span><span>需求推升→經濟擴張；供給推升→通膨壓力</span>
                <span className="font-semibold text-text-primary">Gold</span><span>避險</span><span>股跌金漲→避險；股金齊漲→通膨預期</span>
                <span className="font-semibold text-text-primary">US 10Y</span><span>利率</span><span>殖利率升→經濟轉強或通膨；降→降息預期利多</span>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* ── Risk Signal Banner (click → P8) ── */}
      {riskSignals && (
        <RiskBanner
          score={riskSignals.score} maxScore={riskSignals.max_score} level={riskSignals.level}
          nRed={riskSignals.n_red} nYellow={riskSignals.n_yellow} nGreen={riskSignals.n_green}
          updatedAt={riskSignals.updated_at}
          signals={riskSignals.signals.map(s => ({ name: s.name, level: s.signal }))}
        />
      )}

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 hover:bg-card-hover transition-colors">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">💰 現金水位</div>
          <div className={`text-2xl font-bold ${cashNow >= 5 ? 'text-up' : cashNow >= 3 ? 'text-warning' : 'text-down'}`}>
            {cashNow.toFixed(1)}%
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">{cashMode?.mode_desc || '-'}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 hover:bg-card-hover transition-colors">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">⚔️ 攻防模式</div>
          <div className="text-2xl font-bold" style={{ color: modeColor }}>{cashMode?.mode?.replace(/🔵|🟢|🟡|🔴/g, '').trim() || '-'}</div>
          <div className="text-[10px] mt-0.5" style={{ color: modeColor }}>{cashTrend}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 hover:bg-card-hover transition-colors">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">🎯 跟單狀態</div>
          <div className={`text-2xl font-bold ${cashNow > 4 ? 'text-up' : 'text-text-muted'}`}>
            {cashNow > 4 ? '加分中' : '一般'}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">{cashNow > 4 ? '現金>4%, 勝率提升' : '一般狀態'}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 hover:bg-card-hover transition-colors">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">今日異動</div>
          <div className="text-2xl font-bold text-accent">{totalSignals}</div>
          <div className="text-[10px] text-text-muted mt-0.5">🆕{nNew} ▲{nAdded} ▼{nReduced} ✕{nExited}</div>
        </div>
      </div>

      {/* ── Today Action List ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ borderColor: totalSignals > 0 ? 'rgba(255,71,87,0.2)' : undefined }}>
        <div className="px-4 py-2.5 border-b border-border text-xs font-semibold flex items-center gap-2"
          style={totalSignals > 0 ? { background: 'rgba(255,71,87,0.04)' } : undefined}>
          <h2 className="text-xs font-semibold inline">今日跟單行動清單</h2>
        </div>
        <div className="p-4">
          {!todayChanges || totalSignals === 0 ? (
            <div className="py-2 text-center text-text-muted text-xs">今日無異動</div>
          ) : (
            <div className="space-y-1.5">
              {(todayChanges?.new || []).map((s, i) => {
                const sig = holdMap[s.code]
                return (
                  <div key={`n${i}`} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-b-0 text-sm">
                    <Badge variant="red">🆕 新增</Badge>
                    <span className="text-accent font-mono">{s.code}</span>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-text-muted tabular-nums">{s.weight?.toFixed(2)}%</span>
                    {sig?.hold_suggestion && <span className="text-[10px] text-yellow-400 ml-auto">{sig.hold_suggestion}</span>}
                    {sig?.confidence && <span className="text-[10px] text-text-muted">{sig.confidence}</span>}
                  </div>
                )
              })}
              {(todayChanges?.added || []).map((s, i) => {
                const sig = holdMap[s.code]
                return (
                  <div key={`a${i}`} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-b-0 text-sm">
                    <Badge variant="blue">▲ 加碼</Badge>
                    <span className="text-accent font-mono">{s.code}</span>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-up tabular-nums">+{s.weight_chg?.toFixed(2)}%</span>
                    {sig?.hold_suggestion && <span className="text-[10px] text-yellow-400 ml-auto">{sig.hold_suggestion}</span>}
                    {sig?.confidence && <span className="text-[10px] text-text-muted">{sig.confidence}</span>}
                  </div>
                )
              })}
              {(todayChanges?.reduced || []).map((s, i) => {
                const sig = holdMap[s.code]
                return (
                  <div key={`r${i}`} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-b-0 text-sm">
                    <Badge variant="orange">▼ 減碼</Badge>
                    <span className="text-accent font-mono">{s.code}</span>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-down tabular-nums">{s.weight_chg?.toFixed(2)}%</span>
                    {sig?.hold_suggestion && <span className="text-[10px] text-yellow-400 ml-auto">{sig.hold_suggestion}</span>}
                  </div>
                )
              })}
              {(todayChanges?.exited || []).map((s, i) => (
                <div key={`x${i}`} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-b-0 text-sm">
                  <Badge variant="green">✕ 退出</Badge>
                  <span className="text-accent font-mono">{s.code}</span>
                  <span className="font-medium">{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Gauges ── */}
      <div className="grid grid-cols-2 gap-3">
        <GaugeCard title="🎯 持股集中度 Top 1" value={`${(dashboard?.conviction?.[0]?.avg_weight ?? 0).toFixed(1)}%`} mode={dashboard?.conviction?.[0]?.name || '-'} modeColor="#4f8ef7" />
        <GaugeCard title="持股數" value={`${cashMode?.n_holdings || 0}`} mode={cashMode?.mode_desc || '-'} modeColor={modeColor} />
      </div>

      {/* ── Bottom: Consensus + Signal Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TableContainer title="🤝 多ETF共識標的 TOP15" maxHeight="320px" className="mb-0">
          <DataTable columns={consensusColumns} data={top15} emptyText="暫無共識標的" />
        </TableContainer>

        <TableContainer title="今日 00981A 異動" maxHeight="320px" className="mb-0">
          {!todayChanges || totalSignals === 0 ? (
            <div className="py-4 text-center text-text-muted text-xs">今日無異動</div>
          ) : (
            <div className="space-y-1.5">
              {(todayChanges?.new || []).map((s, i) => (
                <div key={`sn${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded bg-up/5 text-xs">
                  <Badge variant="red">🆕 新增</Badge>
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-text-muted font-mono">{s.code}</span>
                </div>
              ))}
              {(todayChanges?.added || []).map((s, i) => (
                <div key={`sa${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded bg-accent/5 text-xs">
                  <Badge variant="blue">▲ 加碼</Badge>
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-up ml-auto tabular-nums">+{s.weight_chg?.toFixed(2)}%</span>
                </div>
              ))}
              {(todayChanges?.reduced || []).map((s, i) => (
                <div key={`sr${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded bg-warning/5 text-xs">
                  <Badge variant="orange">▼ 減碼</Badge>
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-down ml-auto tabular-nums">{s.weight_chg?.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          )}
        </TableContainer>
      </div>
    </div>
  )
}
