import { useState, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart } from 'react-chartjs-2'
import { useData } from '../contexts/DataContext'
import { KpiCard, KpiGrid, IntroBox, Badge, TableContainer, DataTable } from '../components/shared'
import { chartColors, defaultScaleOptions, defaultPluginOptions } from '../lib/chartDefaults'
import '../lib/chartDefaults'
import type { CashSeriesItem, Holding } from '../types'

type RangeType = 30 | 60 | 90 | 'all'

const stripMd = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1').replace(/^#+\s*/gm, '').trim()

const STOCK_COLORS = [
  '#4f8ef7', '#ff4757', '#00c48c', '#ffa502', '#a855f7', '#22d3ee', '#ffc312', '#ff6b81',
  '#7bed9f', '#70a1ff', '#eccc68', '#ff6348', '#2ed573', '#1e90ff', '#ff4500', '#dfe6e9',
  '#6c5ce7', '#fdcb6e', '#e17055', '#00b894',
]

interface CashModeSeriesItem {
  date: string
  cash_pct: number
  units: number
  units_change: number
  nav: number
  cash_5ma?: number | null
  cash_20ma?: number | null
}

interface StockSeriesRaw {
  code: string
  label: string
  data: number[]
}

interface ConvictionRaw {
  code: string
  name: string
  weight: number
  days: number
  conviction: string
}

interface DailyChangeRaw {
  date: string
  new?: Array<{ code: string; name: string; weight: number }>
  added?: Array<{ code: string; name: string; weight: number; weight_chg: number }>
  reduced?: Array<{ code: string; name: string; weight: number; weight_chg: number }>
  exited?: Array<{ code: string; name: string }>
}

// Shared axis options
const axisGrid = { color: 'rgba(42, 46, 61, 0.5)' }
const axisTick = { color: '#8b8fa3' }

export function P1HoldingsTracker() {
  const { dashboard, aiResearch } = useData()
  const [cashRange, setCashRange] = useState<RangeType>(90)
  const [weightPreset, setWeightPreset] = useState<number | 'all'>(5)
  const [instOpen, setInstOpen] = useState(true)
  const [traderOpen, setTraderOpen] = useState(false)

  const cashMode = dashboard?.cash_mode
  const cashSeries = dashboard?.cash_series || []
  const cashModeSeries = ((cashMode as unknown as Record<string, unknown>)?.cash_series || []) as CashModeSeriesItem[]
  const holdingsRaw = dashboard?.latest_holdings?.['00981A']
  const holdings00981A = (Array.isArray(holdingsRaw) ? holdingsRaw : (holdingsRaw as Record<string, unknown>)?.stocks as Holding[] | undefined) || []
  const conviction = (dashboard?.conviction || []) as unknown as ConvictionRaw[]
  const stockSeries = (dashboard?.stock_series || []) as unknown as StockSeriesRaw[]
  const dates = dashboard?.dates || []
  const dailyChanges = (dashboard?.daily_changes?.['00981A'] || []) as unknown as DailyChangeRaw[]
  const aiData = aiResearch?.analyses?.['00981A']

  // KPIs
  const nHoldings = cashMode?.n_holdings || 0
  const cashNow = cashMode?.cash_now || 0
  const mode = cashMode?.mode || '-'
  const modeDesc = cashMode?.mode_desc || '-'
  const trend = cashMode?.trend || '-'
  const latestUnits = cashModeSeries.length > 0 ? cashModeSeries[cashModeSeries.length - 1] : null
  const unitsChange = latestUnits?.units_change || 0
  const unitsColor = unitsChange > 0 ? 'text-up' : unitsChange < 0 ? 'text-down' : 'text-text-muted'

  // ── Chart: 現金水位 + 5MA + 20MA + TAIEX + TPEX + 申贖量 ──
  const cashChartData = useMemo(() => {
    if (!cashSeries.length) return null
    const sliced = cashRange === 'all' ? cashSeries : cashSeries.slice(-cashRange)
    const slicedUnits = cashRange === 'all' ? cashModeSeries : cashModeSeries.slice(-cashRange)

    return {
      labels: sliced.map((d: CashSeriesItem) => d.date),
      datasets: [
        {
          type: 'bar' as const,
          label: '申購/贖回',
          data: slicedUnits.map(d => d.units_change || 0),
          backgroundColor: slicedUnits.map(d => (d.units_change || 0) >= 0 ? 'rgba(255,71,87,0.2)' : 'rgba(0,196,140,0.2)'),
          borderColor: slicedUnits.map(d => (d.units_change || 0) >= 0 ? 'rgba(255,71,87,0.5)' : 'rgba(0,196,140,0.5)'),
          borderWidth: 1,
          yAxisID: 'y3',
          order: 10,
        },
        {
          label: '現金比例 (%)',
          data: sliced.map(d => d.cash_pct),
          borderColor: '#4f8ef7', backgroundColor: 'rgba(79,142,247,0.06)',
          borderWidth: 2.5, tension: 0.35, pointRadius: 0,
          pointHoverRadius: 4, pointHoverBackgroundColor: '#4f8ef7',
          fill: true, yAxisID: 'y',
          order: 2,
        },
        {
          label: '5MA',
          data: sliced.map(d => d.cash_5ma ?? null),
          borderColor: 'rgba(255,165,2,0.6)', borderWidth: 1, borderDash: [4, 2],
          tension: 0.35, pointRadius: 0, yAxisID: 'y',
          order: 3,
        },
        {
          label: '20MA',
          data: sliced.map(d => d.cash_20ma ?? null),
          borderColor: 'rgba(168,85,247,0.6)', borderWidth: 1, borderDash: [6, 3],
          tension: 0.35, pointRadius: 0, yAxisID: 'y',
          order: 4,
        },
        {
          label: '加權指數',
          data: sliced.map(d => d.taiex ?? null),
          borderColor: '#00c48c', backgroundColor: 'rgba(0,196,140,0.04)',
          borderWidth: 2, tension: 0.35, pointRadius: 0,
          pointHoverRadius: 3, pointHoverBackgroundColor: '#00c48c',
          fill: true, yAxisID: 'y1',
          order: 5,
        },
        {
          label: '櫃買指數',
          data: sliced.map(d => d.tpex ?? null),
          borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.04)',
          borderWidth: 1.5, tension: 0.35, pointRadius: 0, borderDash: [8, 4],
          pointHoverRadius: 3, pointHoverBackgroundColor: '#22d3ee',
          fill: true, yAxisID: 'y2',
          order: 6,
        },
      ],
    }
  }, [cashSeries, cashModeSeries, cashRange])

  const cashChartOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      ...defaultPluginOptions,
      legend: {
        ...defaultPluginOptions.legend,
        position: 'top' as const,
        labels: {
          ...defaultPluginOptions.legend.labels,
          usePointStyle: true, pointStyle: 'circle', padding: 12,
          filter: (item: { text: string }) => item.text !== '申購/贖回',
        },
      },
      tooltip: {
        mode: 'index' as const, intersect: false,
        backgroundColor: 'rgba(15,17,28,0.95)',
        borderColor: 'rgba(79,142,247,0.3)', borderWidth: 1,
        titleColor: '#e4e6eb', bodyColor: '#9ca0b4',
        padding: 10, cornerRadius: 8,
        titleFont: { size: 11 },
        bodyFont: { family: 'monospace', size: 11 },
        callbacks: {
          label: (ctx: { dataset: { label: string }; parsed: { y: number } }) => {
            const label = ctx.dataset.label || ''
            const v = ctx.parsed.y
            if (v == null) return ''
            if (label.includes('現金') || label.includes('MA')) return ` ${label}: ${v.toFixed(2)}%`
            if (label.includes('加權')) return ` ${label}: ${v.toLocaleString()}`
            if (label.includes('櫃買')) return ` ${label}: ${v.toFixed(2)}`
            if (label.includes('申購')) return ` ${label}: ${v >= 0 ? '+' : ''}${v.toFixed(0)}`
            return ` ${label}: ${v}`
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear' as const, position: 'left' as const,
        ticks: { ...axisTick, callback: (v: number) => `${v}%` },
        grid: { ...axisGrid, drawOnChartArea: true },
        title: { display: true, text: '現金 (%)', color: '#4f8ef7', font: { size: 11 } },
      },
      y1: {
        type: 'linear' as const, position: 'right' as const,
        ticks: { ...axisTick, callback: (v: number) => v.toLocaleString() },
        grid: { display: false },
        title: { display: true, text: '加權指數', color: '#00c48c', font: { size: 11 } },
      },
      y2: {
        type: 'linear' as const, position: 'right' as const,
        display: false,
        grid: { display: false },
      },
      y3: {
        type: 'linear' as const, position: 'right' as const,
        display: false,
        grid: { display: false },
      },
      x: {
        ticks: { ...axisTick, maxRotation: 0, autoSkipPadding: 20 },
        grid: { ...axisGrid, drawOnChartArea: false },
      },
    },
  }), [])

  // ── Weight history chart ──
  const weightChartData = useMemo(() => {
    if (!stockSeries.length || !dates.length) return null
    const count = weightPreset === 'all' ? stockSeries.length : Math.min(weightPreset as number, stockSeries.length)
    const selected = stockSeries.slice(0, count)
    const last30Dates = dates.slice(-30)
    const dateOffset = dates.length - 30

    return {
      labels: last30Dates,
      datasets: selected.map((stock, i) => ({
        label: stock.label || stock.code,
        data: stock.data.slice(dateOffset < 0 ? 0 : dateOffset),
        borderColor: STOCK_COLORS[i % STOCK_COLORS.length],
        borderWidth: 1.5, tension: 0.3, pointRadius: 0,
      })),
    }
  }, [stockSeries, dates, weightPreset])

  // ── Conviction columns ──
  const convictionColumns = [
    { key: 'code', label: '代碼' },
    { key: 'name', label: '名稱' },
    { key: 'days', label: '天數', align: 'right' as const, render: (c: ConvictionRaw) => c.days, sortValue: (c: ConvictionRaw) => c.days || 0 },
    { key: 'conviction', label: '狀態', align: 'right' as const, render: (c: ConvictionRaw) => <span className="text-xs">{c.conviction}</span> },
  ]

  // ── Holdings columns ──
  const holdingsColumns = [
    { key: 'code', label: '股票代碼' },
    { key: 'name', label: '股票名稱' },
    {
      key: 'weight', label: '權重 (%)', align: 'right' as const,
      render: (h: Holding) => {
        const maxW = Math.max(...holdings00981A.map(x => x.weight || 0), 1)
        const pct = Math.min(100, (h.weight / maxW) * 100)
        const color = h.weight >= 5 ? 'bg-accent' : h.weight >= 2 ? 'bg-cyan' : 'bg-text-muted'
        return (
          <div className="flex items-center gap-2 justify-end">
            <span className="tabular-nums">{h.weight.toFixed(2)}%</span>
            <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
      sortValue: (h: Holding) => h.weight,
    },
  ]

  // ── Laomo signals (跟單信號) ──
  const laomoSignals = (dashboard?.laomo_signals || []) as Array<{
    date: string; code: string; name: string; type: string
    weight: number; weight_chg: number; hold_suggestion?: string; confidence?: string
  }>

  // Group signals by date for the timeline
  const holdingEvents = useMemo(() => {
    if (!laomoSignals.length) return []
    const byDate: Record<string, typeof laomoSignals> = {}
    laomoSignals.forEach(s => {
      if (!byDate[s.date]) byDate[s.date] = []
      byDate[s.date].push(s)
    })
    return Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 15)
      .map(([date, signals]) => ({ date, signals }))
  }, [laomoSignals])

  const formatUnits = (v: number) => {
    const abs = Math.abs(v)
    if (abs >= 1e8) return `${(v / 1e8).toFixed(1)} 億`
    if (abs >= 1e4) return `${(v / 1e4).toFixed(0)} 萬`
    return v.toLocaleString()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-text-primary">📊 00981A 持股追蹤</h2>

      <IntroBox variant="accent">
        追蹤 00981A（主動統一台股增長 ETF）的每日持股變化、經理人操作動向與現金水位。持股異動事件可作為跟單參考（新增跟 5 天、加碼跟 3 天）。圖表支援拖曳縮放。
      </IntroBox>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiCard label="📊 持股數" value={nHoldings} valueColor={nHoldings >= 40 ? 'text-down' : nHoldings >= 20 ? 'text-accent' : 'text-warning'} />
        <KpiCard label="💰 現金水位" value={`${cashNow.toFixed(1)}%`} valueColor={cashNow >= 5 ? 'text-up' : cashNow >= 3 ? 'text-warning' : 'text-down'} subtext={`趨勢: ${trend}`} />
        <KpiCard label="📈 期貨部位" value={cashMode?.has_futures ? '有' : '無'} subtext={cashMode?.futures_signal || '-'} />
        <KpiCard label="💹 申購/贖回" value={formatUnits(unitsChange)} valueColor={unitsColor} subtext={latestUnits ? `NAV ${latestUnits.nav?.toFixed(2)}` : '-'} />
        <KpiCard label="⚔️ 攻防模式" value={mode} subtext={modeDesc} />
      </div>

      {/* ── AI Research Panel ── */}
      {aiData && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <span className="text-sm font-semibold">🧠 AI 持股異動分析（沈萬鈞 x 巨人傑）</span>
            <span className="text-xs text-text-muted">{aiData.date}</span>
          </div>
          <div className="px-5 py-2 border-b border-border text-xs text-text-muted">{aiData.changes_summary}</div>
          <div className="border-b border-border">
            <button onClick={() => setInstOpen(!instOpen)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-card-hover">
              <div className="flex items-center gap-2">
                <span>🏛️</span>
                <span className="font-semibold text-sm">{aiResearch?.notebooks?.institutional || '法人視野'}</span>
                <span className="px-2 py-0.5 rounded text-xs bg-accent/15 text-accent">法人產業研究</span>
              </div>
              <span className={`transition-transform ${instOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {instOpen && aiData.institutional && (
              <div className="px-5 pb-4 text-sm text-text-muted leading-relaxed">
                <p className="mb-2">{stripMd(aiData.institutional.summary)}</p>
                <ul className="list-disc pl-5 space-y-1">
                  {aiData.institutional.key_points?.map((p, i) => <li key={i}>{stripMd(p)}</li>)}
                </ul>
              </div>
            )}
          </div>
          <div>
            <button onClick={() => setTraderOpen(!traderOpen)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-card-hover">
              <div className="flex items-center gap-2">
                <span>⚡</span>
                <span className="font-semibold text-sm">{aiResearch?.notebooks?.trader || '巨人思維'}</span>
                <span className="px-2 py-0.5 rounded text-xs bg-purple/15 text-purple">實戰交易者</span>
              </div>
              <span className={`transition-transform ${traderOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {traderOpen && aiData.trader && (
              <div className="px-5 pb-4 text-sm text-text-muted leading-relaxed">
                <p className="mb-2">{stripMd(aiData.trader.summary)}</p>
                <ul className="list-disc pl-5 space-y-1">
                  {aiData.trader.key_points?.map((p, i) => <li key={i}>{stripMd(p)}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Chart 1: Cash + MA + TAIEX + TPEX + Units ── */}
      <TableContainer title="📈 00981A 現金水位 · 申贖量 vs 加權 · 櫃買">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-text-muted">🖱️ 滾輪縮放 · 拖曳平移 · 雙擊重置</div>
          <div className="flex gap-1">
            {([30, 60, 90, 'all'] as const).map(r => (
              <button key={String(r)} onClick={() => setCashRange(r as RangeType)}
                className={`px-2 py-1 rounded text-xs font-medium ${String(cashRange) === String(r) ? 'bg-accent text-white' : 'bg-card-hover text-text-muted'}`}>
                {r === 'all' ? '全部' : `${r}日`}
              </button>
            ))}
          </div>
        </div>
        <div className="h-96">
          {cashChartData && <Chart type="line" data={cashChartData as never} options={cashChartOptions as never} />}
        </div>
      </TableContainer>


      {/* ── Holding Events Timeline ── */}
      <TableContainer title="📌 00981A 持股異動事件（含跟單信號）" maxHeight="350px">
        {holdingEvents.length === 0 ? (
          <div className="py-4 text-center text-text-muted">近期無異動事件</div>
        ) : (
          holdingEvents.map(({ date, signals }) => (
            <div key={date} className="py-2.5 border-b border-border last:border-b-0">
              <div className="text-xs text-text-muted font-mono mb-1.5">{date}</div>
              <div className="space-y-1">
                {signals.map((s, i) => {
                  const variant = s.type === '新增' ? 'red' as const : s.type === '加碼' ? 'blue' as const : s.type === '減碼' ? 'orange' as const : 'green' as const
                  const chgColor = s.weight_chg > 0 ? 'text-up' : s.weight_chg < 0 ? 'text-down' : ''
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs bg-card-hover/30 rounded px-2 py-1">
                      <Badge variant={variant}>{s.type}</Badge>
                      <span className="text-accent font-mono">{s.code}</span>
                      <span className="font-medium">{s.name}</span>
                      <span className={`tabular-nums ${chgColor}`}>{s.weight_chg > 0 ? '+' : ''}{s.weight_chg.toFixed(2)}%</span>
                      {s.confidence && <span className="text-yellow">{s.confidence}</span>}
                      {s.hold_suggestion && <span className="text-text-muted ml-auto">{s.hold_suggestion}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </TableContainer>

      {/* ── Holdings Table ── */}
      <TableContainer title="📋 00981A 持股明細（統一台股增長 · 市值最大主動式 ETF）">
        <DataTable columns={holdingsColumns} data={holdings00981A} emptyText="無數據" />
      </TableContainer>

      {/* ── Weight History + Conviction ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TableContainer title="📈 持股權重變化 (30日)">
          <div className="flex justify-end gap-1 mb-2">
            {[{ v: 5, l: 'Top 5' }, { v: 10, l: 'Top 10' }, { v: 'all' as const, l: '全部' }].map(o => (
              <button key={String(o.v)} onClick={() => setWeightPreset(o.v)}
                className={`px-2 py-1 rounded text-xs font-medium ${weightPreset === o.v ? 'bg-accent text-white' : 'bg-card-hover text-text-muted'}`}>
                {o.l}
              </button>
            ))}
          </div>
          <div className="h-64">
            {weightChartData && (
              <Line data={weightChartData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { ...defaultPluginOptions, legend: { ...defaultPluginOptions.legend, position: 'right' } },
                scales: { y: defaultScaleOptions, x: defaultScaleOptions },
              }} />
            )}
          </div>
        </TableContainer>

        <TableContainer title="🏆 20日信心度排行" maxHeight="280px">
          <DataTable columns={convictionColumns} data={conviction.slice(0, 20)} emptyText="暫無資料" />
        </TableContainer>
      </div>
    </div>
  )
}
