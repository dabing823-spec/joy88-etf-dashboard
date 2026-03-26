import { useState, useMemo } from 'react'
import { Doughnut, Bar } from 'react-chartjs-2'
import { useData } from '../contexts/DataContext'
import { InsightCard, Badge, TableContainer, DataTable, FilterButtons } from '../components/shared'
import { chartColors, defaultScaleOptions, defaultPluginOptions } from '../lib/chartDefaults'
import '../lib/chartDefaults'
import type { LaomoSignal, DailyChange } from '../types'

interface AddHistory {
  date: string
  weight_chg: number
}

function buildAddCountMap(dailyChanges: DailyChange[]): Record<string, AddHistory[]> {
  const map: Record<string, AddHistory[]> = {}
  for (const day of dailyChanges) {
    for (const s of day.added || []) {
      if (!map[s.code]) map[s.code] = []
      map[s.code].push({ date: day.date, weight_chg: s.weight_chg ?? 0 })
    }
  }
  return map
}

type FilterType = 'all' | 'new' | 'added' | 'high'

const filterOptions: Array<{ value: FilterType; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'new', label: '🆕 新增' },
  { value: 'added', label: '▲ 加碼' },
  { value: 'high', label: '⭐⭐⭐ 高信心' },
]

function getSignalBadge(type: string): { text: string; variant: 'red' | 'blue' | 'orange' | 'green' } {
  switch (type) {
    case '新增': case 'new': return { text: '新增', variant: 'red' }
    case '加碼': case 'added': return { text: '加碼', variant: 'blue' }
    case '減碼': case 'reduced': return { text: '減碼', variant: 'orange' }
    case '退出': case 'removed': return { text: '退出', variant: 'green' }
    default: return { text: type, variant: 'blue' }
  }
}

function filterByType(signals: LaomoSignal[], filter: FilterType): LaomoSignal[] {
  if (filter === 'all') return signals
  if (filter === 'new') return signals.filter(s => s.type === '新增' || s.type === 'new')
  if (filter === 'added') return signals.filter(s => s.type === '加碼' || s.type === 'added')
  if (filter === 'high') return signals.filter(s => {
    const c = s.confidence
    return c === '⭐⭐⭐' || (typeof c === 'number' && c >= 3)
  })
  return signals
}

export function P3CopyTradingStrategy() {
  const { dashboard } = useData()
  const [filter, setFilter] = useState<FilterType>('all')
  const [expandedCode, setExpandedCode] = useState<string | null>(null)

  const rawSignals = useMemo(() => {
    const raw = dashboard?.laomo_signals
    if (!raw) return []
    const arr = Array.isArray(raw) ? raw : (raw as Record<string, unknown>).signals as LaomoSignal[] || []
    return [...arr].sort((a, b) => b.date.localeCompare(a.date))
  }, [dashboard])

  const addCountMap = useMemo(() => {
    const changes = dashboard?.daily_changes?.['00981A'] || []
    return buildAddCountMap(changes as DailyChange[])
  }, [dashboard])

  const filtered = useMemo(() => filterByType(rawSignals, filter), [rawSignals, filter])

  // Chart data: signal type distribution (doughnut)
  const doughnutData = useMemo(() => {
    const types: Record<string, number> = {}
    rawSignals.forEach(s => { types[s.type] = (types[s.type] || 0) + 1 })
    const colorMap: Record<string, string> = { '新增': chartColors.red, '加碼': chartColors.accent, '減碼': chartColors.orange, '退出': chartColors.green }
    return {
      labels: Object.keys(types),
      datasets: [{ data: Object.values(types), backgroundColor: Object.keys(types).map(t => colorMap[t] || chartColors.accent), borderWidth: 0, hoverOffset: 8 }],
    }
  }, [rawSignals])

  const doughnutTotal = rawSignals.length

  // Chart data: monthly signals (stacked bar)
  const barData = useMemo(() => {
    const monthTypes: Record<string, Record<string, number>> = {}
    rawSignals.forEach(s => {
      const month = s.date.substring(0, 7)
      if (!monthTypes[month]) monthTypes[month] = {}
      monthTypes[month][s.type] = (monthTypes[month][s.type] || 0) + 1
    })
    const months = Object.keys(monthTypes).sort()
    const allTypes = [...new Set(rawSignals.map(s => s.type))]
    const colorMap: Record<string, string> = { '新增': chartColors.red, '加碼': chartColors.accent, '減碼': chartColors.orange, '退出': chartColors.green }
    return {
      labels: months,
      datasets: allTypes.map(type => ({
        label: type,
        data: months.map(m => monthTypes[m]?.[type] || 0),
        backgroundColor: colorMap[type] || '#666',
        borderRadius: 2,
      })),
    }
  }, [rawSignals])

  const signalColumns = [
    { key: 'date', label: '日期' },
    {
      key: 'type', label: '類型',
      render: (s: LaomoSignal) => {
        const b = getSignalBadge(s.type)
        return <Badge variant={b.variant}>{b.text}</Badge>
      },
    },
    { key: 'code', label: '代碼' },
    { key: 'name', label: '名稱' },
    {
      key: 'weight_chg', label: '權重變化', align: 'right' as const,
      render: (s: LaomoSignal) => {
        const chg = s.weight_chg || 0
        const color = chg > 0 ? 'text-up' : chg < 0 ? 'text-down' : ''
        return <span className={color}>{chg > 0 ? '+' : ''}{chg.toFixed(2)}%</span>
      },
      sortValue: (s: LaomoSignal) => s.weight_chg || 0,
    },
    {
      key: 'add_count', label: '加碼次數', align: 'center' as const,
      render: (s: LaomoSignal) => {
        const isAdd = s.type === '加碼' || s.type === 'added'
        const history = addCountMap[s.code]
        const count = history?.length ?? 0
        if (!isAdd || count === 0) return <span className="text-text-muted">-</span>
        const isExpanded = expandedCode === `${s.code}-${s.date}`
        return (
          <div>
            <button
              onClick={(e) => { e.stopPropagation(); setExpandedCode(isExpanded ? null : `${s.code}-${s.date}`) }}
              className="text-accent font-semibold hover:underline tabular-nums"
              title="點擊查看歷史加碼紀錄"
            >
              {count}次 {isExpanded ? '▾' : '▸'}
            </button>
            {isExpanded && (
              <div className="mt-1.5 space-y-0.5 text-left">
                {[...history].reverse().map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="text-text-muted font-mono">{h.date}</span>
                    <span className={`font-semibold tabular-nums ${h.weight_chg > 0 ? 'text-up' : 'text-text-muted'}`}>
                      {h.weight_chg > 0 ? '+' : ''}{h.weight_chg.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      },
      sortValue: (s: LaomoSignal) => addCountMap[s.code]?.length ?? 0,
    },
    {
      key: 'confidence', label: '信心度', align: 'right' as const,
      render: (s: LaomoSignal) => String(s.confidence ?? '-'),
    },
    {
      key: 'hold', label: '持有建議',
      render: (s: LaomoSignal) => s.hold_suggestion || '-',
    },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">老墨跟單策略</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InsightCard title="策略邏輯" borderColor="border-l-accent">
          追蹤 00981A 經理人的持股異動，<strong>當經理人新增或加碼某檔股票</strong>，視為偏多信號。
          結合現金水位判斷經理人的攻防態度，輔助短線操作決策。
        </InsightCard>
        <InsightCard title="使用須知" borderColor="border-l-warning">
          跟單有統計優勢但<strong>不等於完整策略</strong>。需搭配個股基本面、產業趨勢。
          投資有風險，過往表現不代表未來走勢。
        </InsightCard>
      </div>

      {/* Strategy Rules Table */}
      <TableContainer title="信號定義與操作建議">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 px-3 text-left text-xs font-semibold text-text-muted w-24">信號</th>
              <th className="py-2 px-3 text-left text-xs font-semibold text-text-muted">觸發條件</th>
              <th className="py-2 px-3 text-left text-xs font-semibold text-text-muted">操作建議</th>
              <th className="py-2 px-3 text-center text-xs font-semibold text-text-muted w-24">建議天數</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50 bg-up/5">
              <td className="py-2 px-3"><Badge variant="red">新增</Badge></td>
              <td className="py-2 px-3">00981A 經理人新建倉</td>
              <td className="py-2 px-3">最強信號，觀察確認趨勢後介入</td>
              <td className="py-2 px-3 text-center font-semibold text-up">跟 5 天</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3"><Badge variant="blue">加碼</Badge></td>
              <td className="py-2 px-3">持股權重上升 &gt;0.1%</td>
              <td className="py-2 px-3">偏多信號，可逢低跟進</td>
              <td className="py-2 px-3 text-center font-semibold text-accent">跟 3 天</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3"><Badge variant="orange">減碼</Badge></td>
              <td className="py-2 px-3">持股權重下降 &gt;0.1%</td>
              <td className="py-2 px-3">風險警訊，考慮獲利了結</td>
              <td className="py-2 px-3 text-center text-text-muted">—</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3"><Badge variant="green">退出</Badge></td>
              <td className="py-2 px-3">00981A 完全出清</td>
              <td className="py-2 px-3">強烈賣出信號，及時出場</td>
              <td className="py-2 px-3 text-center text-text-muted">—</td>
            </tr>
          </tbody>
        </table>
      </TableContainer>

      <FilterButtons options={filterOptions} active={filter} onChange={setFilter} />

      <TableContainer title="跟單信號紀錄" maxHeight="500px">
        <DataTable columns={signalColumns} data={filtered} emptyText="無符合條件的信號" />
      </TableContainer>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TableContainer title="信號類型分佈">
          <div className="h-64 relative">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                  legend: { position: 'bottom', labels: { color: chartColors.textMuted, padding: 12, usePointStyle: true, pointStyle: 'circle' } },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed} (${((ctx.parsed / doughnutTotal) * 100).toFixed(1)}%)` } },
                },
              }}
              plugins={[{
                id: 'centerText',
                afterDraw(chart) {
                  const { ctx, chartArea } = chart
                  const cx = (chartArea.left + chartArea.right) / 2
                  const cy = (chartArea.top + chartArea.bottom) / 2
                  ctx.save()
                  ctx.textAlign = 'center'
                  ctx.fillStyle = '#e4e6eb'
                  ctx.font = 'bold 1.5rem -apple-system, sans-serif'
                  ctx.fillText(String(doughnutTotal), cx, cy - 4)
                  ctx.font = '0.7rem -apple-system, sans-serif'
                  ctx.fillStyle = '#8b8fa3'
                  ctx.fillText('總信號', cx, cy + 16)
                  ctx.restore()
                },
              }]}
            />
          </div>
        </TableContainer>

        <TableContainer title="月度信號分佈">
          <div className="h-64">
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { ...defaultPluginOptions, tooltip: { mode: 'index' } },
                scales: {
                  y: { ...defaultScaleOptions, stacked: true },
                  x: { ...defaultScaleOptions, stacked: true },
                },
              }}
            />
          </div>
        </TableContainer>
      </div>
    </div>
  )
}
