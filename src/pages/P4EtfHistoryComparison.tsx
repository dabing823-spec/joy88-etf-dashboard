import { useState, useMemo } from 'react'
import { Line, Bar, Chart } from 'react-chartjs-2'
import { useData } from '../contexts/DataContext'
import { KpiCard, KpiGrid, IntroBox, Badge, TableContainer, DataTable } from '../components/shared'
import { chartColors, defaultScaleOptions, defaultPluginOptions } from '../lib/chartDefaults'
import { ETF_LIST, ETF_SHORT_NAMES } from '../lib/constants'
import '../lib/chartDefaults'
import type { EtfPageData, DateRecord } from '../types'

const ETF_COLORS: Record<string, string> = {
  '00981A': '#4f8ef7',
  '00980A': '#ffa502',
  '00982A': '#a855f7',
  '00991A': '#00c48c',
  '00993A': '#22d3ee',
}

function getLatestRecord(etfData: EtfPageData): DateRecord | null {
  const records = etfData.date_records
  if (!Array.isArray(records) || records.length === 0) return null
  return records[records.length - 1] ?? null
}

function getRecordByDate(etfData: EtfPageData, date: string): DateRecord | null {
  const records = etfData.date_records
  if (!Array.isArray(records)) return null
  return records.find(r => r.date === date) ?? null
}

export function P4EtfHistoryComparison() {
  const { etfPages } = useData()
  const [currentETF, setCurrentETF] = useState<string>('00981A')
  const [compareDate1, setCompareDate1] = useState('')
  const [compareDate2, setCompareDate2] = useState('')
  const [compareResult, setCompareResult] = useState<{
    newStocks: Array<{ code: string; name: string; weight: number }>
    exitedStocks: Array<{ code: string; name: string; prevWeight: number }>
    changedStocks: Array<{ code: string; name: string; w1: number; w2: number; delta: number }>
    cashDelta: number
    holdingsDelta: number
    cash1: number
    cash2: number
    n1: number
    n2: number
  } | null>(null)

  const etfData = etfPages?.[currentETF]
  const latest = etfData ? getLatestRecord(etfData) : null
  const dates = etfData?.dates || []

  // Initialize compare dates
  useMemo(() => {
    if (dates.length > 1) {
      setCompareDate1(dates[dates.length - 2])
      setCompareDate2(dates[dates.length - 1])
    }
  }, [dates])

  // KPIs
  const nHoldings = latest?.n_stocks || 0
  const cashPct = latest?.cash_pct || 0
  const latestDate = dates[dates.length - 1] || '-'
  const top5Weight = useMemo(() => {
    const h = latest?.holdings || []
    return h.slice(0, 5).reduce((sum, item) => sum + (item.weight || 0), 0)
  }, [latest])

  // ── Chart 1: 五檔 ETF 現金權重 + 加權指數 套圖 ──
  const allCashChartData = useMemo(() => {
    if (!etfPages) return null
    // Use 00981A dates as base (longest series)
    const baseSeries = etfPages['00981A']?.cash_series
    if (!baseSeries?.length) return null
    const sliced = baseSeries.slice(-90)
    const labels = sliced.map(d => d.date)

    const etfDatasets = ETF_LIST.map(etf => {
      const series = etfPages[etf]?.cash_series || []
      const dateMap = Object.fromEntries(series.map(d => [d.date, d.cash_pct]))
      return {
        label: `${ETF_SHORT_NAMES[etf]} 現金%`,
        data: labels.map(d => dateMap[d] ?? null),
        borderColor: ETF_COLORS[etf],
        backgroundColor: `${ETF_COLORS[etf]}08`,
        borderWidth: etf === currentETF ? 2.5 : 1.2,
        tension: 0.35, pointRadius: 0,
        pointHoverRadius: 3, pointHoverBackgroundColor: ETF_COLORS[etf],
        fill: etf === currentETF, yAxisID: 'y',
        borderDash: etf === currentETF ? [] : [4, 2],
        order: etf === currentETF ? 1 : 5,
      }
    })

    return {
      labels,
      datasets: [
        ...etfDatasets,
        {
          label: '加權指數',
          data: sliced.map(d => d.taiex ?? null),
          borderColor: '#ff475780', backgroundColor: 'rgba(255,71,87,0.03)',
          borderWidth: 1.5, tension: 0.35, pointRadius: 0, fill: true,
          yAxisID: 'y1', order: 8,
        },
      ],
    }
  }, [etfPages, currentETF])

  const allCashChartOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      ...defaultPluginOptions,
      legend: { ...defaultPluginOptions.legend, position: 'top' as const, labels: { ...defaultPluginOptions.legend.labels, usePointStyle: true, pointStyle: 'circle', padding: 10 } },
      tooltip: {
        mode: 'index' as const, intersect: false,
        backgroundColor: 'rgba(15,17,28,0.95)', borderColor: 'rgba(79,142,247,0.3)', borderWidth: 1,
        titleColor: '#e4e6eb', bodyColor: '#9ca0b4', padding: 10, cornerRadius: 8,
        bodyFont: { family: 'monospace', size: 11 },
        callbacks: {
          label: (ctx: { dataset: { label: string }; parsed: { y: number } }) => {
            const v = ctx.parsed.y
            if (v == null) return ''
            if (ctx.dataset.label.includes('加權')) return ` ${ctx.dataset.label}: ${v.toLocaleString()}`
            return ` ${ctx.dataset.label}: ${v.toFixed(2)}%`
          },
        },
      },
    },
    scales: {
      y: { type: 'linear' as const, position: 'left' as const, ticks: { color: '#8b8fa3', callback: (v: number) => `${v}%` }, grid: { color: 'rgba(42,46,61,0.5)' }, title: { display: true, text: '現金比例 (%)', color: '#4f8ef7', font: { size: 11 } } },
      y1: { type: 'linear' as const, position: 'right' as const, ticks: { color: '#8b8fa3', callback: (v: number) => v.toLocaleString() }, grid: { display: false }, title: { display: true, text: '加權指數', color: '#ff4757', font: { size: 11 } } },
      x: { ticks: { color: '#8b8fa3', maxRotation: 0, autoSkipPadding: 20 }, grid: { display: false } },
    },
  }), [])

  // ── Chart 2: 持股數 K 棒 (日增減) ──
  const holdingsBarData = useMemo(() => {
    if (!etfData || dates.length < 2) return null
    const last30 = dates.slice(-30)
    const values: number[] = []
    const deltas: number[] = []
    last30.forEach((d, i) => {
      const r = getRecordByDate(etfData, d)
      const n = r?.n_stocks || 0
      values.push(n)
      if (i === 0) {
        const idx = dates.indexOf(d)
        const prev = idx > 0 ? getRecordByDate(etfData, dates[idx - 1]) : null
        deltas.push(prev ? n - (prev.n_stocks || 0) : 0)
      } else {
        deltas.push(n - values[i - 1])
      }
    })
    return {
      labels: last30,
      datasets: [
        {
          type: 'bar' as const, label: '持股增減',
          data: deltas,
          backgroundColor: deltas.map(d => d > 0 ? 'rgba(255,71,87,0.6)' : d < 0 ? 'rgba(0,196,140,0.6)' : 'rgba(139,143,163,0.3)'),
          borderColor: deltas.map(d => d > 0 ? '#ff4757' : d < 0 ? '#00c48c' : '#8b8fa3'),
          borderWidth: 1, yAxisID: 'y1', order: 1,
        },
        {
          type: 'line' as const, label: '持股數',
          data: values,
          borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,0.06)',
          borderWidth: 2, tension: 0.35, pointRadius: 0, fill: true, yAxisID: 'y', order: 2,
        },
      ],
    }
  }, [etfData, dates])

  // ── Chart 3: 現金水位 K 棒 (日增減) ──
  const cashBarData = useMemo(() => {
    if (!etfData?.cash_series || etfData.cash_series.length < 2) return null
    const series = etfData.cash_series.slice(-30)
    const deltas = series.map((d, i) => i === 0 ? 0 : d.cash_pct - series[i - 1].cash_pct)
    return {
      labels: series.map(d => d.date),
      datasets: [
        {
          type: 'bar' as const, label: '現金增減',
          data: deltas,
          backgroundColor: deltas.map(d => d > 0 ? 'rgba(255,71,87,0.6)' : d < 0 ? 'rgba(0,196,140,0.6)' : 'rgba(139,143,163,0.3)'),
          borderColor: deltas.map(d => d > 0 ? '#ff4757' : d < 0 ? '#00c48c' : '#8b8fa3'),
          borderWidth: 1, yAxisID: 'y1', order: 1,
        },
        {
          type: 'line' as const, label: '現金水位',
          data: series.map(d => d.cash_pct),
          borderColor: '#4f8ef7', backgroundColor: 'rgba(79,142,247,0.06)',
          borderWidth: 2, tension: 0.35, pointRadius: 0, fill: true, yAxisID: 'y', order: 2,
        },
      ],
    }
  }, [etfData])

  const barChartOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      ...defaultPluginOptions,
      tooltip: {
        mode: 'index' as const, intersect: false,
        backgroundColor: 'rgba(15,17,28,0.95)', borderColor: 'rgba(79,142,247,0.3)', borderWidth: 1,
        titleColor: '#e4e6eb', bodyColor: '#9ca0b4', padding: 10, cornerRadius: 8,
        bodyFont: { family: 'monospace', size: 11 },
      },
    },
    scales: {
      y: { type: 'linear' as const, position: 'left' as const, ticks: { color: '#8b8fa3' }, grid: { color: 'rgba(42,46,61,0.5)' } },
      y1: { type: 'linear' as const, position: 'right' as const, ticks: { color: '#8b8fa3' }, grid: { display: false }, title: { display: true, text: '日增減', color: '#8b8fa3', font: { size: 10 } } },
      x: { ticks: { color: '#8b8fa3', maxRotation: 0, autoSkipPadding: 15 }, grid: { display: false } },
    },
  }), [])

  // Holdings table
  const holdingColumns = [
    { key: 'code', label: '代碼' },
    { key: 'name', label: '名稱' },
    {
      key: 'weight', label: '權重 (%)', align: 'right' as const,
      render: (h: { weight: number }) => {
        const maxW = Math.max(...(latest?.holdings || []).map(x => x.weight || 0), 1)
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
      sortValue: (h: { weight: number }) => h.weight,
    },
  ]

  // Changes timeline
  const changesTimeline = useMemo(() => {
    if (!etfData || dates.length < 2) return []
    const timeline: Array<{ date: string; tags: Array<{ text: string; variant: 'green' | 'red' | 'blue' | 'orange' }> }> = []

    for (let i = dates.length - 1; i >= 1 && i >= dates.length - 10; i--) {
      const curr = getRecordByDate(etfData, dates[i])
      const prev = getRecordByDate(etfData, dates[i - 1])
      if (!curr || !prev) continue

      const currMap = Object.fromEntries((curr.holdings || []).map(h => [h.code, h]))
      const prevMap = Object.fromEntries((prev.holdings || []).map(h => [h.code, h]))
      const currCodes = new Set(Object.keys(currMap))
      const prevCodes = new Set(Object.keys(prevMap))

      const tags: typeof timeline[0]['tags'] = []
      ;[...currCodes].filter(c => !prevCodes.has(c)).forEach(c => tags.push({ text: `+${currMap[c]?.name || c}`, variant: 'green' }))
      ;[...prevCodes].filter(c => !currCodes.has(c)).forEach(c => tags.push({ text: `-${prevMap[c]?.name || c}`, variant: 'red' }))
      ;[...currCodes].filter(c => prevCodes.has(c) && (currMap[c].weight - prevMap[c].weight) > 0.3).forEach(c =>
        tags.push({ text: `\u2191${currMap[c].name} +${(currMap[c].weight - prevMap[c].weight).toFixed(1)}%`, variant: 'blue' })
      )
      ;[...currCodes].filter(c => prevCodes.has(c) && (currMap[c].weight - prevMap[c].weight) < -0.3).forEach(c =>
        tags.push({ text: `\u2193${currMap[c].name} ${(currMap[c].weight - prevMap[c].weight).toFixed(1)}%`, variant: 'orange' })
      )

      if (tags.length) timeline.push({ date: dates[i], tags })
    }
    return timeline
  }, [etfData, dates])

  function doCompare() {
    if (!etfData || !compareDate1 || !compareDate2) return
    const r1 = getRecordByDate(etfData, compareDate1)
    const r2 = getRecordByDate(etfData, compareDate2)
    if (!r1 || !r2) return

    const map1 = Object.fromEntries((r1.holdings || []).map(h => [h.code, h]))
    const map2 = Object.fromEntries((r2.holdings || []).map(h => [h.code, h]))
    const codes1 = new Set(Object.keys(map1))
    const codes2 = new Set(Object.keys(map2))

    const newStocks = [...codes2].filter(c => !codes1.has(c)).map(c => ({ code: c, name: map2[c].name, weight: map2[c].weight }))
    const exitedStocks = [...codes1].filter(c => !codes2.has(c)).map(c => ({ code: c, name: map1[c].name, prevWeight: map1[c].weight }))
    const changedStocks = [...codes2].filter(c => codes1.has(c) && Math.abs(map2[c].weight - map1[c].weight) > 0.01)
      .map(c => ({ code: c, name: map2[c].name, w1: map1[c].weight, w2: map2[c].weight, delta: map2[c].weight - map1[c].weight }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

    setCompareResult({
      newStocks, exitedStocks, changedStocks,
      cashDelta: (r2.cash_pct || 0) - (r1.cash_pct || 0),
      holdingsDelta: (r2.n_stocks || 0) - (r1.n_stocks || 0),
      cash1: r1.cash_pct || 0, cash2: r2.cash_pct || 0,
      n1: r1.n_stocks || 0, n2: r2.n_stocks || 0,
    })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">ETF 歷史回溯與對比</h1>

      <IntroBox variant="accent">
        選擇 ETF 查看歷史持股、現金水位變化，並使用對比工具分析任意兩個日期間的持股變動。
      </IntroBox>

      {/* ETF Tabs */}
      <div className="flex gap-2 flex-wrap">
        {ETF_LIST.map(etf => (
          <button
            key={etf}
            onClick={() => { setCurrentETF(etf); setCompareResult(null) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              currentETF === etf
                ? 'bg-accent text-white border-accent'
                : 'bg-card text-text-muted border-border hover:bg-card-hover'
            }`}
          >
            {etf} {ETF_SHORT_NAMES[etf] && <span className="text-xs opacity-70">({ETF_SHORT_NAMES[etf]})</span>}
          </button>
        ))}
      </div>

      <KpiGrid>
        <KpiCard label="持股數" value={nHoldings} valueColor={nHoldings >= 40 ? 'text-down' : nHoldings >= 20 ? 'text-accent' : 'text-warning'} />
        <KpiCard label="現金水位" value={`${cashPct.toFixed(1)}%`} valueColor={cashPct >= 5 ? 'text-up' : cashPct >= 3 ? 'text-warning' : 'text-down'} />
        <KpiCard label="最新日期" value={latestDate} />
        <KpiCard label="持股集中度 (Top 5)" value={`${top5Weight.toFixed(1)}%`} valueColor={top5Weight >= 40 ? 'text-up' : top5Weight >= 30 ? 'text-warning' : 'text-down'} />
      </KpiGrid>

      {/* Comparison Tool */}
      <TableContainer title="對比分析工具">
        <div className="flex flex-wrap gap-4 items-end mb-4">
          <div>
            <label className="text-xs text-text-muted block mb-1">基準日（較早）</label>
            <select
              value={compareDate1}
              onChange={e => setCompareDate1(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary"
            >
              {[...dates].reverse().map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">對比日（較晚）</label>
            <select
              value={compareDate2}
              onChange={e => setCompareDate2(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary"
            >
              {[...dates].reverse().map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button onClick={doCompare} className="px-4 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90">
            比較
          </button>
        </div>

        {compareResult && (
          <div className="space-y-4">
            <KpiGrid>
              <KpiCard
                label="現金水位變化"
                value={`${compareResult.cashDelta >= 0 ? '+' : ''}${compareResult.cashDelta.toFixed(1)}%`}
                valueColor={compareResult.cashDelta > 0 ? 'text-up' : compareResult.cashDelta < 0 ? 'text-down' : 'text-text-muted'}
                subtext={`${compareResult.cash1.toFixed(1)}% → ${compareResult.cash2.toFixed(1)}%`}
              />
              <KpiCard
                label="持股數變化"
                value={`${compareResult.holdingsDelta >= 0 ? '+' : ''}${compareResult.holdingsDelta}`}
                valueColor={compareResult.holdingsDelta > 0 ? 'text-down' : compareResult.holdingsDelta < 0 ? 'text-up' : 'text-text-muted'}
                subtext={`${compareResult.n1} → ${compareResult.n2}`}
              />
            </KpiGrid>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-semibold text-down mb-2">新增持股</div>
                <DataTable
                  columns={[
                    { key: 'code', label: '代碼' },
                    { key: 'name', label: '名稱' },
                    { key: 'weight', label: '權重', align: 'right' as const, render: (s: { weight: number }) => `${s.weight.toFixed(2)}%` },
                  ]}
                  data={compareResult.newStocks}
                  emptyText="無"
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-up mb-2">退出持股</div>
                <DataTable
                  columns={[
                    { key: 'code', label: '代碼' },
                    { key: 'name', label: '名稱' },
                    { key: 'prevWeight', label: '原權重', align: 'right' as const, render: (s: { prevWeight: number }) => `${s.prevWeight.toFixed(2)}%` },
                  ]}
                  data={compareResult.exitedStocks}
                  emptyText="無"
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-accent mb-2">權重變化</div>
                <DataTable
                  columns={[
                    { key: 'code', label: '代碼' },
                    { key: 'name', label: '名稱' },
                    {
                      key: 'delta', label: '變化', align: 'right' as const,
                      render: (s: { delta: number }) => (
                        <span className={s.delta > 0 ? 'text-up' : 'text-down'}>{s.delta > 0 ? '+' : ''}{s.delta.toFixed(2)}%</span>
                      ),
                    },
                  ]}
                  data={compareResult.changedStocks}
                  emptyText="無"
                />
              </div>
            </div>
          </div>
        )}
      </TableContainer>

      {/* Chart 1: 五檔 ETF 現金權重 + 加權指數 */}
      <TableContainer title="五檔 ETF 現金權重 vs 加權指數">
        <div className="h-80">
          {allCashChartData && <Chart type="line" data={allCashChartData as never} options={allCashChartOptions as never} />}
        </div>
      </TableContainer>

      {/* Chart 2 & 3: K 棒 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TableContainer title={`${ETF_SHORT_NAMES[currentETF]} 現金水位 K 棒`}>
          <div className="h-64">
            {cashBarData && <Chart type="bar" data={cashBarData as never} options={barChartOptions as never} />}
          </div>
        </TableContainer>

        <TableContainer title={`${ETF_SHORT_NAMES[currentETF]} 持股數 K 棒`}>
          <div className="h-64">
            {holdingsBarData && <Chart type="bar" data={holdingsBarData as never} options={barChartOptions as never} />}
          </div>
        </TableContainer>
      </div>

      {/* Holdings Table */}
      <TableContainer title="完整持股明細">
        <DataTable columns={holdingColumns} data={latest?.holdings || []} emptyText="無數據" />
      </TableContainer>

      {/* Changes Timeline */}
      <TableContainer title="近期異動紀錄" maxHeight="350px">
        {changesTimeline.length === 0 ? (
          <div className="py-4 text-text-muted text-center">近期無重大異動</div>
        ) : (
          changesTimeline.map(({ date, tags }) => (
            <div key={date} className="flex gap-3 items-start py-3 border-b border-border last:border-b-0">
              <span className="text-sm text-text-muted w-20 shrink-0">{date}</span>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t, i) => <Badge key={i} variant={t.variant}>{t.text}</Badge>)}
              </div>
            </div>
          ))
        )}
      </TableContainer>

    </div>
  )
}
