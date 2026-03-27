import { useData } from '../contexts/DataContext'
import { VOL_TIER_COLORS, IMPACT_COLORS, palette } from '../lib/constants'

function VolBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100)
  const color = value > 40 ? palette.red : value > 25 ? palette.orange : palette.green
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-text-muted">{label}</span>
        <span className="font-mono font-semibold" style={{ color }}>{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function StatCell({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div className="text-center p-3">
      <div className="text-2xs text-text-muted mb-1">{label}</div>
      <div className="text-lg font-bold font-mono" style={{ color: color || 'var(--color-text-primary)' }}>
        {value}{unit && <span className="text-xs text-text-muted ml-0.5">{unit}</span>}
      </div>
    </div>
  )
}

export function P12TsmcVolSignal() {
  const { tsmcVolSignal: d } = useData()

  if (!d) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted text-sm">TSMC 波動率信號資料載入中...</div>
      </div>
    )
  }

  const stock = d.標的
  const vol = d.波動率
  const amp = d.振幅分析
  const env = d.波動率環境
  const sc = d.Sell_Call策略
  const events = d.事件倒數 || []
  const weeklyStrats = d.台指周選策略 || []
  const tierColor = VOL_TIER_COLORS[env.分檔] || palette.warning
  const returnColor = stock['日報酬(%)'] >= 0 ? palette.up : palette.down

  return (
    <div className="space-y-4">
      {/* Header */}
      <h1 className="text-2xl font-bold font-display text-text-primary">
        {stock.名稱} ({stock.代號}) 波動率信號
        <span className="text-xs text-text-muted font-normal ml-2">{d.更新時間}</span>
      </h1>

      {/* Row 1: Hero KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 hover:bg-card-hover transition-colors">
          <div className="text-2xs text-text-muted mb-1">收盤價</div>
          <div className="text-2xl font-bold font-mono text-text-primary">{stock.收盤價.toLocaleString()}</div>
          <div className={`text-sm font-mono mt-1 ${stock['日報酬(%)'] >= 0 ? 'text-up' : 'text-down'}`}>
            {stock['日報酬(%)'] >= 0 ? '+' : ''}{stock['日報酬(%)'].toFixed(2)}%
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 hover:bg-card-hover transition-colors">
          <div className="text-2xs text-text-muted mb-1">連續漲跌</div>
          <div className={`text-2xl font-bold font-mono ${stock.連續漲跌 >= 0 ? 'text-up' : 'text-down'}`}>
            {stock.連續漲跌 > 0 ? '+' : ''}{stock.連續漲跌} 天
          </div>
          <div className="text-xs text-text-muted mt-1">
            成交量 {(stock.成交量 / 1e6).toFixed(1)}M
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 hover:bg-card-hover transition-colors">
          <div className="text-2xs text-text-muted mb-1">波動率環境</div>
          <div className="text-xl font-bold" style={{ color: tierColor }}>{env.分檔}</div>
          <div className="text-xs mt-1" style={{ color: tierColor }}>{env.趨勢}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 hover:bg-card-hover transition-colors">
          <div className="text-2xs text-text-muted mb-1">SC 履約價</div>
          <div className="text-2xl font-bold font-mono text-accent">{sc.SC履約價}</div>
          <div className="text-xs text-text-muted mt-1">{sc.激進度}</div>
        </div>
      </div>

      {/* Row 2: Volatility Term Structure */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="text-sm font-semibold text-text-primary mb-3">波動率期限結構</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <VolBar label="RV 5d" value={vol['RV_5d(%)']} max={80} />
          <VolBar label="RV 10d" value={vol['RV_10d(%)']} max={80} />
          <VolBar label="RV 20d" value={vol['RV_20d(%)']} max={80} />
          <VolBar label="RV 60d" value={vol['RV_60d(%)']} max={80} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 mt-4 border-t border-border pt-3">
          <StatCell label="RV 20d 百分位" value={`${vol['RV_20d_Percentile']?.toFixed(0)}`} color={vol['RV_20d_Percentile'] > 80 ? palette.up : vol['RV_20d_Percentile'] > 50 ? palette.warning : palette.down} />
          <StatCell label="Parkinson 20d" value={`${vol['Parkinson_20d(%)']?.toFixed(1)}`} unit="%" />
          <StatCell label="YangZhang 20d" value={`${vol['YangZhang_20d(%)']?.toFixed(1)}`} unit="%" />
          <StatCell label="ATR / 股價" value={`${vol['ATR佔股價(%)']?.toFixed(2)}`} unit="%" />
        </div>
      </div>

      {/* Row 3: Amplitude + Sell Call side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Amplitude Analysis */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-sm font-semibold text-text-primary mb-3">振幅分析</div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <StatCell label="今日振幅" value={amp['今日振幅(元)']} unit="元" />
            <StatCell label="今日 Ticks" value={amp['今日振幅(Ticks)']} />
            <StatCell label="今日振幅%" value={amp['今日振幅(%)']} unit="%" />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-text-muted">5 日均振幅</span>
              <span className="font-mono text-text-primary">{amp['5日均振幅(元)']} 元</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-text-muted">10 日均振幅</span>
              <span className="font-mono text-text-primary">{amp['10日均振幅(元)']} 元 ({amp['10日均Ticks']} Ticks)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-text-muted">20 日均振幅</span>
              <span className="font-mono text-text-primary">{amp['20日均振幅(元)']} 元</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-text-muted">sigma 倍數</span>
              <span className="font-mono" style={{ color: Number(amp['σ倍數']) > 1 ? palette.up : palette.down }}>
                {Number(amp['σ倍數']).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-text-muted">振幅趨勢</span>
              <span className="font-mono text-text-primary">{amp.振幅趨勢}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-text-muted">台指期影響</span>
              <span className="font-mono text-accent">{amp['台指期影響(點)']} 點</span>
            </div>
          </div>
        </div>

        {/* Sell Call Strategy */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-sm font-semibold text-text-primary mb-3">Sell Call 策略</div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <StatCell label="履約價" value={sc.SC履約價} color={palette.info} />
            <StatCell label="距離 Ticks" value={sc['SC距離(Ticks)']} />
            <StatCell label="距離" value={sc['SC距離(元)']} unit="元" />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-text-muted">激進度</span>
              <span className="font-mono text-text-primary">{sc.激進度}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-text-muted">波動狀態</span>
              <span className="font-mono text-text-primary">{sc.波動狀態}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-text-muted">計算邏輯</span>
              <span className="font-mono text-text-primary text-right max-w-[60%]">{sc.邏輯}</span>
            </div>
            {sc.事件警告 && (
              <div className="mt-2 p-2 bg-up/10 border border-up/20 rounded-xl text-up">
                {sc.事件警告}
              </div>
            )}
          </div>

          {/* Event Countdown */}
          {events.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border">
              <h3 className="text-xs font-semibold text-text-muted mb-2">事件倒數</h3>
              <div className="space-y-2">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-bg rounded-xl">
                    <div>
                      <span className="text-xs font-medium text-text-primary">{ev.事件}</span>
                      <span className="text-2xs text-text-muted ml-2">{ev.日期}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono" style={{ color: IMPACT_COLORS[ev.影響程度] || '#9ca0b4' }}>
                        {ev.倒數天數}天
                      </span>
                      <span className="text-2xs text-text-muted">{ev.SC建議}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Weekly Options Strategy */}
      {weeklyStrats.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-sm font-semibold text-text-primary mb-3">台指周選策略</div>
          <div className="space-y-2">
            {weeklyStrats.map((s, i) => (
              <div key={i} className="p-3 bg-bg rounded-xl">
                {s.策略 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-accent">{s.策略}</span>
                      <span className="px-1.5 py-0.5 text-2xs rounded bg-accent/10 text-accent border border-accent/20">
                        {s.方向}
                      </span>
                      {s.倉位 && (
                        <span className="px-1.5 py-0.5 text-2xs rounded bg-warning/10 text-warning border border-warning/20">
                          {s.倉位}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">{s.說明}</p>
                    {s.建議履約價 && <p className="text-xs text-text-primary">{s.建議履約價}</p>}
                    {s.風控 && <p className="text-2xs text-warning">{s.風控}</p>}
                  </div>
                ) : s.附加提示 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-warning">{s.附加提示}</p>
                    <p className="text-xs text-text-muted">{s.意義}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
