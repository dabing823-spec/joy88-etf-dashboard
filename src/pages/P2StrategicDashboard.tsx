import { useData } from '../contexts/DataContext'
import { KpiCard, KpiGrid, IntroBox, Badge, TableContainer, DataTable } from '../components/shared'
import { formatPct, formatNumber } from '../lib/formatters'
import { RISK_LEVEL_COLORS } from '../lib/constants'
import type { MarketIndices, ConsensusItem } from '../types'

function chgSpan(val: number | undefined, suffix = '') {
  if (val == null) return <span className="text-text-muted">-</span>
  const color = val > 0 ? 'text-up' : val < 0 ? 'text-down' : 'text-text-muted'
  return <span className={color}>{val > 0 ? '+' : ''}{val.toFixed(2)}{suffix}</span>
}

function HeroCard({ label, value, chg, chgPct }: { label: string; value?: number; chg?: number; chgPct?: number }) {
  const color = (chg ?? 0) > 0 ? 'text-up' : (chg ?? 0) < 0 ? 'text-down' : 'text-text-muted'
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:bg-card-hover transition-colors">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value ? formatNumber(value, 0) : '-'}</div>
      <div className="text-sm mt-1">
        {chgSpan(chg)} <span className="text-text-muted mx-1">|</span> {chgSpan(chgPct, '%')}
      </div>
    </div>
  )
}

function SentimentCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center hover:bg-card-hover transition-colors">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className={`text-lg font-bold ${color || ''}`}>{value}</div>
      <div className="text-xs text-text-muted mt-1">{sub}</div>
    </div>
  )
}

function MacroCell({ emoji, label, value, chg, chgPct, hint }: { emoji: string; label: string; value?: number; chg?: number; chgPct?: number; hint: string }) {
  return (
    <div className="p-4 border-r border-border last:border-r-0">
      <div className="flex items-center gap-1 mb-1">
        <span>{emoji}</span>
        <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-text-primary">{value?.toFixed(2) ?? '-'}</span>
        {chgSpan(chgPct, '%')}
      </div>
      <div className="text-xs text-text-muted mt-1 opacity-60">{hint}</div>
    </div>
  )
}

function RiskBanner({ score, maxScore, level, nRed, nYellow, nGreen, updatedAt, signals }: {
  score: number; maxScore: number; level: string; nRed: number; nYellow: number; nGreen: number; updatedAt: string
  signals: Array<{ name: string; level: string }>
}) {
  const color = RISK_LEVEL_COLORS[level] || RISK_LEVEL_COLORS.green
  const label = level === 'red' ? '高度警戒' : level === 'yellow' ? '中度警戒' : '正常'

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4 cursor-pointer hover:bg-card-hover transition-colors">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-[3px]"
            style={{ borderColor: color, color, background: `${color}10` }}>
            {score}
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color }}>{label}</div>
            <div className="text-xs text-text-muted">紅{nRed} 黃{nYellow} 綠{nGreen} | {updatedAt}</div>
          </div>
        </div>
        <span className="text-accent text-xs">詳情 →</span>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 py-2.5">
        {signals.map((s, i) => (
          <span key={i} className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: `${RISK_LEVEL_COLORS[s.level]}15`, color: RISK_LEVEL_COLORS[s.level] }}>
            {s.name}
          </span>
        ))}
      </div>
    </div>
  )
}

function GaugeCard({ title, value, mode, modeColor }: { title: string; value: string; mode: string; modeColor: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center">
      <div className="text-xs text-text-muted mb-2">{title}</div>
      <div className="text-xl font-bold text-text-primary mb-2">{value}</div>
      <div className="px-3 py-1 rounded-lg text-xs font-semibold w-full" style={{ backgroundColor: `${modeColor}20`, color: modeColor }}>
        {mode}
      </div>
    </div>
  )
}

export function P2StrategicDashboard() {
  const { dashboard, strategy } = useData()
  const mi: MarketIndices | undefined = strategy?.market_indices
  const riskSignals = strategy?.risk_signals
  const cashMode = dashboard?.cash_mode
  const consensus = dashboard?.consensus || []
  const dailyChanges = dashboard?.daily_changes?.['00981A'] || []

  // VIX classification
  const vixLevel = (v: number) => v < 15 ? 'text-down' : v < 20 ? 'text-text-primary' : v < 30 ? 'text-warning' : 'text-up'
  const fgLevel = (v: number) => v < 25 ? 'text-up' : v < 45 ? 'text-warning' : v < 55 ? 'text-text-primary' : v < 75 ? 'text-down' : 'text-down'

  // Consensus table
  const top15 = consensus.slice(0, 15)
  const consensusColumns = [
    { key: 'code', label: '代碼' },
    { key: 'name', label: '名稱' },
    {
      key: 'avg_weight', label: '共識 (%)', align: 'right' as const,
      render: (c: ConsensusItem) => `${c.avg_weight?.toFixed(2) ?? '-'}%`,
      sortValue: (c: ConsensusItem) => c.avg_weight || 0,
    },
    {
      key: 'etf_count', label: '參與ETF數', align: 'right' as const,
      render: (c: ConsensusItem) => (
        <div className="flex items-center justify-end gap-1">
          {c.etfs?.map((e, i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-accent" />)}
          <span className="ml-1">{c.etf_count}</span>
        </div>
      ),
      sortValue: (c: ConsensusItem) => c.etf_count,
    },
  ]

  // Today signals summary
  const todayChanges = dailyChanges.length > 0 ? dailyChanges[dailyChanges.length - 1] : null
  const nNew = todayChanges?.new?.length || 0
  const nAdded = todayChanges?.added?.length || 0
  const nReduced = todayChanges?.reduced?.length || 0
  const nRemoved = todayChanges?.removed?.length || 0
  const totalSignals = nNew + nAdded + nReduced + nRemoved

  // Cash edge
  const cashNow = cashMode?.cash_now ?? 0
  const cashEdge = cashNow > 4 ? '加分中' : '一般'
  const cashEdgeColor = cashNow > 4 ? 'text-up' : 'text-text-muted'

  // Gauges
  const cashTrend = cashMode?.trend || '-'
  const cashTrendColor = cashTrend === '上升' ? '#ff4757' : cashTrend === '下降' ? '#00c48c' : '#9ca0b4'

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-text-primary">戰略儀表板</h2>

      <IntroBox variant="accent">
        綜合 5 檔主動式 ETF 的市場指標與共識分析。上方為即時全球市場儀表板，下方為經理人持股共識與異動摘要。
      </IntroBox>

      {/* Taiwan Indices Hero */}
      <div className="grid grid-cols-2 gap-3">
        <HeroCard label="加權指數 TAIEX" value={mi?.taiex} chg={mi?.taiex_chg} chgPct={mi?.taiex_chg_pct} />
        <HeroCard label="櫃買指數 TPEX" value={mi?.tpex} chg={mi?.tpex_chg} chgPct={mi?.tpex_chg_pct} />
      </div>

      {/* Sentiment Row */}
      <div className="grid grid-cols-3 gap-3">
        {mi?.vix_tw != null && (
          <SentimentCard icon="⚡" label="VIX 台灣" value={mi.vix_tw.toFixed(2)}
            sub={`${mi.vix_tw_chg >= 0 ? '+' : ''}${mi.vix_tw_chg?.toFixed(2)} (${formatPct(mi.vix_tw_chg_pct)})`}
            color={vixLevel(mi.vix_tw)} />
        )}
        <SentimentCard icon="⚡" label="VIX S&P500" value={mi?.vix?.toFixed(2) || '-'}
          sub={mi ? `${mi.vix_chg >= 0 ? '+' : ''}${mi.vix_chg?.toFixed(2)} (${formatPct(mi.vix_chg_pct)})` : '-'}
          color={mi ? vixLevel(mi.vix) : undefined} />
        <SentimentCard icon="🎭" label="CNN 恐懼與貪婪" value={mi?.fear_greed?.toString() || '-'}
          sub={mi?.fear_greed_label || '-'}
          color={mi ? fgLevel(mi.fear_greed) : undefined} />
      </div>

      {/* Global Macro Panel */}
      {mi && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <span className="text-sm font-semibold tracking-wide">Global Macro Dashboard</span>
            <span className="text-xs text-text-muted tracking-wider">OIL · DXY · GOLD · YIELD</span>
          </div>
          <div className="grid grid-cols-4">
            <MacroCell emoji="💵" label="DXY 美元指數" value={mi.dxy} chg={mi.dxy_chg} chgPct={mi.dxy_chg_pct} hint="看資金流向" />
            <MacroCell emoji="🛢️" label="WTI 原油" value={mi.oil} chg={mi.oil_chg} chgPct={mi.oil_chg_pct} hint="看經濟成本" />
            <MacroCell emoji="🥇" label="黃金 GOLD" value={mi.gold} chg={mi.gold_chg} chgPct={mi.gold_chg_pct} hint="看避險需求" />
            <MacroCell emoji="📈" label="US 10Y" value={mi.us10y} chg={mi.us10y_chg} chgPct={mi.us10y_chg_pct} hint="看利率環境" />
          </div>
        </div>
      )}

      {/* Risk Banner */}
      {riskSignals && (
        <RiskBanner
          score={riskSignals.score} maxScore={riskSignals.max_score} level={riskSignals.level}
          nRed={riskSignals.n_red} nYellow={riskSignals.n_yellow} nGreen={riskSignals.n_green}
          updatedAt={riskSignals.updated_at}
          signals={riskSignals.signals.map(s => ({ name: s.name, level: s.level }))}
        />
      )}

      {/* ETF Action KPIs */}
      <KpiGrid>
        <KpiCard label="現金水位" value={`${cashNow.toFixed(1)}%`} valueColor={cashNow >= 5 ? 'text-up' : cashNow >= 3 ? 'text-warning' : 'text-down'} subtext={cashMode?.mode_desc || '-'} />
        <KpiCard label="攻防模式" value={cashMode?.mode || '-'} subtext={cashMode?.trend ? `趨勢: ${cashMode.trend}` : '-'} />
        <KpiCard label="跟單加分狀態" value={cashEdge} valueColor={cashEdgeColor} subtext={cashNow > 4 ? '現金>4%, 跟單勝率提升' : '現金≤4%, 一般狀態'} />
        <KpiCard label="今日異動" value={totalSignals} subtext={`新增${nNew} 加碼${nAdded} 減碼${nReduced} 退出${nRemoved}`} />
      </KpiGrid>

      {/* Today Action List */}
      {todayChanges && totalSignals > 0 && (
        <div className="bg-card border border-up/20 rounded-xl p-4">
          <div className="text-sm font-semibold text-up mb-3">今日跟單行動清單</div>
          <div className="space-y-2">
            {todayChanges.new?.map((s, i) => (
              <div key={`n${i}`} className="flex items-center gap-2 text-sm">
                <Badge variant="red">新增</Badge>
                <span className="text-accent">{s.code}</span>
                <span>{s.name}</span>
                <span className="text-text-muted ml-auto">{s.weight?.toFixed(2)}%</span>
              </div>
            ))}
            {todayChanges.added?.map((s, i) => (
              <div key={`a${i}`} className="flex items-center gap-2 text-sm">
                <Badge variant="blue">加碼</Badge>
                <span className="text-accent">{s.code}</span>
                <span>{s.name}</span>
                <span className="text-up ml-auto">+{s.weight_chg?.toFixed(2)}%</span>
              </div>
            ))}
            {todayChanges.reduced?.map((s, i) => (
              <div key={`r${i}`} className="flex items-center gap-2 text-sm">
                <Badge variant="orange">減碼</Badge>
                <span className="text-accent">{s.code}</span>
                <span>{s.name}</span>
                <span className="text-down ml-auto">{s.weight_chg?.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gauges */}
      <div className="grid grid-cols-3 gap-3">
        <GaugeCard title="現金趨勢" value={`${cashNow.toFixed(1)}%`} mode={cashTrend} modeColor={cashTrendColor} />
        <GaugeCard title="持股集中度" value={`${(dashboard?.conviction?.[0]?.avg_weight ?? 0).toFixed(1)}%`} mode="Top 1 權重" modeColor="#4f8ef7" />
        <GaugeCard title="經理人動向" value={cashMode?.mode || '-'} mode={cashMode?.mode_desc || '-'} modeColor={cashTrendColor} />
      </div>

      {/* Content Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TableContainer title="多ETF共識標的 TOP15" maxHeight="350px">
          <DataTable columns={consensusColumns} data={top15} emptyText="暫無共識標的" />
        </TableContainer>

        <TableContainer title="今日00981A異動摘要" maxHeight="400px">
          {!todayChanges || totalSignals === 0 ? (
            <div className="py-4 text-center text-text-muted">今日無異動</div>
          ) : (
            <div className="space-y-2">
              {todayChanges.new?.map((s, i) => (
                <div key={`sn${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-up/5">
                  <Badge variant="red">新增</Badge>
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-text-muted text-xs">{s.code}</span>
                </div>
              ))}
              {todayChanges.added?.map((s, i) => (
                <div key={`sa${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-accent/5">
                  <Badge variant="blue">加碼</Badge>
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-up text-sm">+{s.weight_chg?.toFixed(2)}%</span>
                </div>
              ))}
              {todayChanges.reduced?.map((s, i) => (
                <div key={`sr${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-warning/5">
                  <Badge variant="orange">減碼</Badge>
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-down text-sm">{s.weight_chg?.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          )}
        </TableContainer>
      </div>
    </div>
  )
}
