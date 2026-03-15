import { useMemo } from 'react'
import { useData } from '../contexts/DataContext'
import { KpiCard, KpiGrid, IntroBox, Badge, TableContainer, DataTable } from '../components/shared'
import type { TrumpSignals, TrumpPrediction, TrumpModel } from '../types'

function ActionBox({ ts }: { ts: TrumpSignals }) {
  const signals = ts.signals_today || []
  const consensus = ts.consensus || 'NEUTRAL'

  const result = useMemo(() => {
    let color = 'text-text-muted'
    let border = 'border-l-text-muted'
    let icon = '\u2014'
    let title = '觀望'
    const items: string[] = []

    const hasRelief = signals.includes('RELIEF')
    const hasTariff = signals.includes('TARIFF') || signals.includes('TARIFF_ONLY')
    const hasDeal = signals.includes('DEAL') || signals.includes('DEAL_ONLY')

    if (hasRelief) {
      color = 'text-down'; border = 'border-l-down'; icon = '\u25B2'; title = '偏多操作'
      items.push('RELIEF 信號觸發 — 歷史最強買入信號（勝率 72.7%，平均 +1.12%）')
      items.push('建議：美股開盤前留意 S&P 500 期貨走勢，可考慮短線做多')
    }
    if (hasTariff && !hasDeal && !hasRelief) {
      color = 'text-up'; border = 'border-l-up'; icon = '\u25BC'; title = '避險觀望'
      items.push('純關稅信號（無 Deal/Relief 對沖）— 歷史平均 -1.06%')
      items.push('建議：降低美股部位或觀望，留意隔日開盤跳空風險')
    }
    if (hasDeal && hasTariff) {
      color = 'text-warning'; border = 'border-l-warning'; icon = '\u2500'; title = '觀察中'
      items.push('Deal + Tariff 同時出現 — 典型談判模式，方向待確認')
      items.push('建議：等待 17.4 小時窗口（關稅威脅到確認的中位數時間）')
    }
    if (hasDeal && !hasTariff) items.push('DEAL 信號（無關稅） — 溫和正面，但勝率僅 52%，不宜重押')
    if (signals.includes('CHINA')) items.push('CHINA 信號 — 中美關係相關貼文，留意地緣政治風險')
    if (signals.includes('THREAT')) items.push('THREAT 信號 — 威脅/制裁語氣，歷史回報低於平均')

    if (consensus === 'LONG') { title = '模型看多'; color = 'text-down'; border = 'border-l-down'; icon = '\u25B2' }
    else if (consensus === 'SHORT') { title = '模型看空'; color = 'text-up'; border = 'border-l-up'; icon = '\u25BC' }

    if (items.length === 0) {
      items.push('今日無顯著信號觸發，維持觀望')
      items.push('注意：川普貼文主要影響美股 S&P 500，對台股為間接影響（透過美股夜盤→台股隔日開盤）')
    }
    items.push('台股連動：S&P 500 前日漲跌 → 台股隔日開盤方向相關性約 60-70%')

    return { color, border, icon, title, items }
  }, [signals, consensus])

  return (
    <div className={`flex items-start gap-4 p-5 bg-card rounded-xl border border-border border-l-4 ${result.border} mb-4`}>
      <div className={`text-3xl ${result.color} leading-none shrink-0 mt-0.5`}>{result.icon}</div>
      <div className="flex-1">
        <div className={`text-lg font-bold ${result.color} mb-2`}>今日行動建議：{result.title}</div>
        <ul className="list-disc pl-5 text-text-muted text-sm leading-relaxed space-y-1">
          {result.items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>
    </div>
  )
}

function SignalConfidencePills({ signals }: { signals: TrumpSignals['signal_confidence'] }) {
  if (!signals || signals.length === 0) return null
  return (
    <div className="flex gap-2 flex-wrap py-2">
      {signals.map((s) => (
        <span
          key={s.signal}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm ${
            s.detected_today
              ? 'bg-accent/15 text-accent border border-accent/30 font-semibold'
              : 'bg-text-muted/5 text-text-muted border border-transparent'
          }`}
        >
          {s.detected_today && <span className="text-[0.5rem]">{'\u25CF'}</span>}
          {s.signal} <span className="text-xs opacity-60">{Math.round(s.confidence * 100)}%</span>
        </span>
      ))}
    </div>
  )
}

const predictionColumns = [
  {
    key: 'time', label: '時間',
    render: (p: TrumpPrediction) => (
      <span className="font-mono whitespace-nowrap">{p.time ? p.time.substring(5, 16).replace('T', ' ') : '-'}</span>
    ),
  },
  { key: 'preview', label: '貼文摘要', render: (p: TrumpPrediction) => p.preview || '-' },
  {
    key: 'signal_types', label: '信號',
    render: (p: TrumpPrediction) => (
      <div className="flex gap-1 flex-wrap">
        {(p.signal_types || []).map((s) => <Badge key={s} variant="blue">{s}</Badge>)}
      </div>
    ),
  },
  {
    key: 'direction', label: '方向', align: 'right' as const,
    render: (p: TrumpPrediction) => {
      const color = p.direction === 'UP' ? 'text-down' : p.direction === 'DOWN' ? 'text-up' : 'text-text-muted'
      const text = p.direction === 'UP' ? '\u25B2 看漲' : p.direction === 'DOWN' ? '\u25BC 看跌' : '\u2014 中性'
      return <span className={`font-semibold ${color}`}>{text}</span>
    },
  },
  {
    key: 'confidence', label: '信心度', align: 'right' as const,
    render: (p: TrumpPrediction) => `${Math.round(p.confidence * 100)}%`,
  },
]

const modelColumns = [
  {
    key: 'name', label: '模型',
    render: (m: TrumpModel, i: number) => <>{m.name}{i < 3 && ' \u2B50'}</>,
  },
  {
    key: 'win_rate', label: '勝率', align: 'right' as const,
    render: (m: TrumpModel) => {
      const color = m.win_rate >= 65 ? 'text-down' : m.win_rate >= 55 ? 'text-text-primary' : 'text-text-muted'
      return <span className={`font-semibold ${color}`}>{m.win_rate.toFixed(1)}%</span>
    },
    sortValue: (m: TrumpModel) => m.win_rate,
  },
  {
    key: 'avg_return', label: '平均回報', align: 'right' as const,
    render: (m: TrumpModel) => {
      const color = m.avg_return > 0 ? 'text-down' : m.avg_return < 0 ? 'text-up' : 'text-text-muted'
      return <span className={color}>{m.avg_return >= 0 ? '+' : ''}{m.avg_return.toFixed(3)}%</span>
    },
    sortValue: (m: TrumpModel) => m.avg_return,
  },
  { key: 'total_trades', label: '交易數', align: 'right' as const },
]

export function P11TrumpSignal() {
  const { strategy } = useData()
  const ts = strategy?.trump_signals

  if (!ts || !ts.date) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary">🇺🇸 Trump Signal — 川普密碼</h2>
        <div className="bg-card border border-border rounded-xl p-8 text-center text-text-muted">暫無資料</div>
      </div>
    )
  }

  const consensusColor = ts.consensus === 'LONG' ? 'text-down' : ts.consensus === 'SHORT' ? 'text-up' : 'text-text-muted'
  const consensusText = ts.consensus === 'LONG' ? '看多' : ts.consensus === 'SHORT' ? '看空' : '中性'

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-text-primary">🇺🇸 Trump Signal — 川普密碼</h2>

      <IntroBox>
        基於{' '}
        <a href="https://github.com/sstklen/trump-code" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          TRUMP CODE
        </a>{' '}
        開源專案，追蹤川普 37,000+ 則社群貼文中的股市信號。
        核心發現：RELIEF（緩解/豁免）是最強買入信號（勝率 72.7%，+1.12%），Truth Social 領先 X 平台 6.2 小時。
        <br />影響路徑：川普發文 → S&P 500 即時反應 → 美股夜盤 → 台股隔日開盤。
      </IntroBox>

      <ActionBox ts={ts} />

      <KpiGrid>
        <KpiCard label="今日貼文數" value={ts.posts_today || 0} subtext={ts.date} />
        <KpiCard label="偵測信號" value={ts.signals_today?.length || 0} subtext={ts.signals_today?.join(', ') || 'None'} />
        <KpiCard label="共識方向" value={consensusText} valueColor={consensusColor} subtext="基於觸發模型投票" />
        <KpiCard label="歷史命中率" value={`${ts.overall_hit_rate || 0}%`} subtext={`${ts.total_predictions || 0} 筆驗證預測`} />
      </KpiGrid>

      {ts.signal_confidence?.length > 0 && (
        <TableContainer title="今日偵測信號">
          <SignalConfidencePills signals={ts.signal_confidence} />
        </TableContainer>
      )}

      <TableContainer title="即時貼文預測" maxHeight="400px">
        <DataTable columns={predictionColumns} data={ts.live_predictions || []} emptyText="暫無即時預測" />
      </TableContainer>

      <TableContainer title="模型績效排行" maxHeight="400px">
        <DataTable columns={modelColumns} data={ts.models || []} emptyText="暫無模型資料" />
      </TableContainer>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TableContainer title="避險信號 — 他在怕什麼" titleColor="text-up" className="mb-0">
          {(ts.hedge_rules || []).length === 0 ? (
            <div className="py-3 text-text-muted">暫無</div>
          ) : (
            ts.hedge_rules.map((r, i) => (
              <div key={i} className="py-3 px-4 border-b border-border last:border-b-0">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">{r.label}</span>
                  <Badge variant="red">{r.action}</Badge>
                </div>
                <div className="text-xs text-text-muted mt-1">
                  平均回報 {r.avg_return >= 0 ? '+' : ''}{(r.avg_return || 0).toFixed(3)}%
                </div>
              </div>
            ))
          )}
        </TableContainer>

        <TableContainer title="佈局信號 — 他在準備什麼" titleColor="text-down" className="mb-0">
          {(ts.position_rules || []).length === 0 ? (
            <div className="py-3 text-text-muted">暫無</div>
          ) : (
            ts.position_rules.map((r, i) => (
              <div key={i} className="py-3 px-4 border-b border-border last:border-b-0">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">{r.label}</span>
                  <Badge variant="green">{r.action}</Badge>
                </div>
                <div className="text-xs text-text-muted mt-1">
                  平均回報 +{(r.avg_return || 0).toFixed(3)}%{r.up_rate ? ` | ${r.up_rate.toFixed(1)}% 上漲率` : ''}
                </div>
              </div>
            ))
          )}
        </TableContainer>
      </div>

      <TableContainer title="每日摘要">
        <div className="text-sm text-text-muted leading-relaxed whitespace-pre-line">
          {ts.summary_zh || '暫無摘要'}
        </div>
      </TableContainer>
    </div>
  )
}
