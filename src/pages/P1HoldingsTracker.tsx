import { useState, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { useData } from '../contexts/DataContext'
import { KpiCard, KpiGrid, IntroBox, Badge, TableContainer, DataTable } from '../components/shared'
import { chartColors, defaultScaleOptions, defaultPluginOptions } from '../lib/chartDefaults'
import '../lib/chartDefaults'
import type { CashSeriesItem, Holding } from '../types'

type RangeType = 30 | 60 | 90 | 'all'
const rangeOptions: Array<{ value: string; label: string }> = [
  { value: '30', label: '30日' },
  { value: '60', label: '60日' },
  { value: '90', label: '90日' },
  { value: 'all', label: '全部' },
]

const STOCK_COLORS = [
  '#4f8ef7', '#ff4757', '#00c48c', '#ffa502', '#a855f7', '#22d3ee', '#ffc312', '#ff6b81',
  '#7bed9f', '#70a1ff', '#eccc68', '#ff6348', '#2ed573', '#1e90ff', '#ff4500', '#dfe6e9',
  '#6c5ce7', '#fdcb6e', '#e17055', '#00b894',
]

interface StockSeriesRaw {
  code: string
  label: string
  data: number[]
}

interface ConvictionRaw {
  code: string
  name: string
  weight: number
  start_weight: number
  weight_chg: number
  days: number
  conviction: string
}

interface DailyChangeRaw {
  date: string
  new?: Array<{ code: string; name: string; weight: number }>
  added?: Array<{ code: string; name: string; weight: number; weight_chg: number }>
  reduced?: Array<{ code: string; name: string; weight: number; weight_chg: number }>
  exited?: Array<{ code: string; name: string; prev_weight?: number }>
}

export function P1HoldingsTracker() {
  const { dashboard, aiResearch } = useData()
  const [cashRange, setCashRange] = useState<RangeType>(90)
  const [weightPreset, setWeightPreset] = useState<number | 'all'>(5)
  const [instOpen, setInstOpen] = useState(true)
  const [traderOpen, setTraderOpen] = useState(false)

  const cashMode = dashboard?.cash_mode
  const cashSeries = dashboard?.cash_series || []
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

  // Cash chart data
  const cashChartData = useMemo(() => {
    if (!cashSeries.length) return null
    const sliced = cashRange === 'all' ? cashSeries : cashSeries.slice(-cashRange)
    return {
      labels: sliced.map((d: CashSeriesItem) => d.date),
      datasets: [
        {
          label: '現金比例 (%)',
          data: sliced.map((d: CashSeriesItem) => d.cash_pct),
          borderColor: chartColors.accent, backgroundColor: 'rgba(79,142,247,0.1)',
          borderWidth: 2, tension: 0.3, pointRadius: 0, fill: true, yAxisID: 'y',
        },
      ],
    }
  }, [cashSeries, cashRange])

  // 5 ETF cash compare chart
  const etfCompareData = useMemo(() => {
    if (!cashSeries.length) return null
    const last30 = cashSeries.slice(-30)
    return {
      labels: last30.map(d => d.date),
      datasets: [{
        label: '00981A',
        data: last30.map(d => d.cash_pct),
        borderColor: '#4f8ef7', borderWidth: 2, tension: 0.3, pointRadius: 0,
      }],
    }
  }, [cashSeries])

  // Weight history chart — stock_series uses { code, label, data: number[] }
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

  // Conviction table columns — uses { code, name, days, conviction (string) }
  const convictionColumns = [
    { key: 'code', label: '代碼' },
    { key: 'name', label: '名稱' },
    {
      key: 'days', label: '天數', align: 'right' as const,
      render: (c: ConvictionRaw) => c.days,
      sortValue: (c: ConvictionRaw) => c.days || 0,
    },
    {
      key: 'conviction', label: '狀態', align: 'right' as const,
      render: (c: ConvictionRaw) => <span className="text-xs">{c.conviction}</span>,
    },
  ]

  // Holdings table columns
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
            <span>{h.weight.toFixed(2)}%</span>
            <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
      sortValue: (h: Holding) => h.weight,
    },
  ]

  // Holding events — uses exited not removed
  const holdingEvents = useMemo(() => {
    if (!dailyChanges.length) return []
    return dailyChanges.slice(-10).reverse().map(change => {
      const tags: Array<{ text: string; variant: 'green' | 'red' | 'blue' | 'orange' }> = []
      change.new?.forEach(s => tags.push({ text: `+${s.name}`, variant: 'green' }))
      change.exited?.forEach(s => tags.push({ text: `-${s.name}`, variant: 'red' }))
      change.added?.filter(s => Math.abs(s.weight_chg) > 0.1).forEach(s =>
        tags.push({ text: `\u2191${s.name} +${s.weight_chg.toFixed(1)}%`, variant: 'blue' }))
      change.reduced?.filter(s => Math.abs(s.weight_chg) > 0.1).forEach(s =>
        tags.push({ text: `\u2193${s.name} ${s.weight_chg.toFixed(1)}%`, variant: 'orange' }))
      return { date: change.date, tags }
    }).filter(e => e.tags.length > 0)
  }, [dailyChanges])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-text-primary">00981A 持股追蹤</h2>

      <IntroBox variant="accent">
        追蹤 00981A（主動統一台股增長 ETF）的每日持股變化、經理人操作動向與現金水位。持股異動事件可作為跟單參考（新增跟 5 天、加碼跟 3 天）。圖表支援拖曳縮放。
      </IntroBox>

      <KpiGrid>
        <KpiCard label="00981A 持股數" value={nHoldings} valueColor={nHoldings >= 40 ? 'text-down' : nHoldings >= 20 ? 'text-accent' : 'text-warning'} />
        <KpiCard label="現金水位" value={`${cashNow.toFixed(1)}%`} valueColor={cashNow >= 5 ? 'text-up' : cashNow >= 3 ? 'text-warning' : 'text-down'} subtext={`趨勢: ${trend}`} />
        <KpiCard label="期貨部位" value={cashMode?.has_futures ? '有' : '無'} subtext={cashMode?.futures_signal || '-'} />
        <KpiCard label="攻防模式" value={mode} subtext={modeDesc} />
      </KpiGrid>

      {/* AI Research Panel */}
      {aiData && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <span className="text-sm font-semibold">AI 持股異動分析（沈萬鈞 x 巨人傑）</span>
            <span className="text-xs text-text-muted">{aiData.date}</span>
          </div>
          <div className="px-5 py-2 border-b border-border text-xs text-text-muted">{aiData.changes_summary}</div>

          <div className="border-b border-border">
            <button onClick={() => setInstOpen(!instOpen)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-card-hover">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{aiResearch?.notebooks?.institutional || '法人視野'}</span>
                <span className="px-2 py-0.5 rounded text-xs bg-accent/15 text-accent">法人產業研究</span>
              </div>
              <span className={`transition-transform ${instOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {instOpen && aiData.institutional_view && (
              <div className="px-5 pb-4 text-sm text-text-muted leading-relaxed">
                <p className="mb-2">{aiData.institutional_view.summary}</p>
                <ul className="list-disc pl-5 space-y-1">
                  {aiData.institutional_view.key_points?.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
          </div>

          <div>
            <button onClick={() => setTraderOpen(!traderOpen)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-card-hover">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{aiResearch?.notebooks?.trader || '巨人思維'}</span>
                <span className="px-2 py-0.5 rounded text-xs bg-purple/15 text-purple">實戰交易者</span>
              </div>
              <span className={`transition-transform ${traderOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {traderOpen && aiData.trader_view && (
              <div className="px-5 pb-4 text-sm text-text-muted leading-relaxed">
                <p className="mb-2">{aiData.trader_view.summary}</p>
                <ul className="list-disc pl-5 space-y-1">
                  {aiData.trader_view.key_points?.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cash History Chart */}
      <TableContainer title="00981A 現金水位趨勢">
        <div className="flex justify-end gap-1 mb-2">
          {rangeOptions.map(o => (
            <button key={o.value} onClick={() => setCashRange(o.value === 'all' ? 'all' : Number(o.value) as 30|60|90)}
              className={`px-2 py-1 rounded text-xs font-medium ${String(cashRange) === o.value ? 'bg-accent text-white' : 'bg-card-hover text-text-muted'}`}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="h-72">
          {cashChartData && (
            <Line data={cashChartData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: defaultPluginOptions,
              scales: {
                y: { ...defaultScaleOptions, title: { display: true, text: '現金比例 (%)', color: chartColors.textMuted } },
                x: defaultScaleOptions,
              },
            }} />
          )}
        </div>
      </TableContainer>

      {/* 5 ETF Cash Compare */}
      {etfCompareData && (
        <TableContainer title="00981A 現金水位 (30日)">
          <div className="h-64">
            <Line data={etfCompareData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: defaultPluginOptions,
              scales: { y: defaultScaleOptions, x: defaultScaleOptions },
            }} />
          </div>
        </TableContainer>
      )}

      {/* Holding Events Timeline */}
      <TableContainer title="00981A 持股異動事件" maxHeight="200px">
        {holdingEvents.length === 0 ? (
          <div className="py-4 text-center text-text-muted">近期無異動事件</div>
        ) : (
          holdingEvents.map(({ date, tags }) => (
            <div key={date} className="flex gap-3 items-start py-2 border-b border-border last:border-b-0">
              <span className="text-xs text-text-muted w-20 shrink-0">{date}</span>
              <div className="flex flex-wrap gap-1">{tags.map((t, i) => <Badge key={i} variant={t.variant}>{t.text}</Badge>)}</div>
            </div>
          ))
        )}
      </TableContainer>

      {/* Holdings Table */}
      <TableContainer title="00981A 持股明細（統一台股增長）">
        <DataTable columns={holdingsColumns} data={holdings00981A} emptyText="無數據" />
      </TableContainer>

      {/* Weight History + Conviction */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TableContainer title="00981A 持股權重變化 (30日)">
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

        <TableContainer title="20日信心度排行" maxHeight="280px">
          <DataTable columns={convictionColumns} data={conviction.slice(0, 20)} emptyText="暫無資料" />
        </TableContainer>
      </div>
    </div>
  )
}
