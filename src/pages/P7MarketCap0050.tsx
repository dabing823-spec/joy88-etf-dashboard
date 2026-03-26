import { useData } from '../contexts/DataContext'
import { KpiCard, KpiGrid, IntroBox, TableContainer, DataTable } from '../components/shared'
import { formatPrice, formatChangePct, formatVolume, formatTurnover } from '../lib/p7Formatters'
import type { Strategy0050Stock, MarketWeightStock } from '../types'

function StockLink({ code, link }: { code: string; link?: string }) {
  const href = link || `https://tw.stock.yahoo.com/quote/${code}`
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
      {code}
    </a>
  )
}

function getRank(s: Strategy0050Stock | MarketWeightStock): number {
  return s.rank ?? (s as Strategy0050Stock).market_cap_rank ?? 0
}

const cols0050 = [
  { key: 'rank', label: '排名', sortValue: (s: Strategy0050Stock) => getRank(s), render: (s: Strategy0050Stock) => getRank(s) },
  { key: 'code', label: '代碼', render: (s: Strategy0050Stock) => <StockLink code={s.code} link={s.link} /> },
  { key: 'name', label: '名稱' },
  {
    key: 'price', label: '現價', align: 'right' as const,
    render: (s: Strategy0050Stock) => formatPrice(s.price),
    sortValue: (s: Strategy0050Stock) => Number(s.price) || 0,
  },
  {
    key: 'change_pct', label: '漲跌%', align: 'right' as const,
    render: (s: Strategy0050Stock) => {
      const { text, color } = formatChangePct(s.change_pct)
      return <span className={color}>{text}</span>
    },
    sortValue: (s: Strategy0050Stock) => Number(s.change_pct) || 0,
  },
  {
    key: 'volume', label: '成交量', align: 'right' as const,
    render: (s: Strategy0050Stock) => formatVolume(s.volume),
    sortValue: (s: Strategy0050Stock) => Number(s.volume) || 0,
  },
]

const colsMW = [
  { key: 'rank', label: '排名', sortValue: (s: MarketWeightStock) => s.rank },
  { key: 'code', label: '代碼', render: (s: MarketWeightStock) => <StockLink code={s.code} link={s.link} /> },
  { key: 'name', label: '名稱' },
  {
    key: 'price', label: '現價', align: 'right' as const,
    render: (s: MarketWeightStock) => formatPrice(s.price),
    sortValue: (s: MarketWeightStock) => Number(s.price) || 0,
  },
  {
    key: 'change_pct', label: '漲跌%', align: 'right' as const,
    render: (s: MarketWeightStock) => {
      const { text, color } = formatChangePct(s.change_pct)
      return <span className={color}>{text}</span>
    },
    sortValue: (s: MarketWeightStock) => Number(s.change_pct) || 0,
  },
  {
    key: 'volume', label: '成交量', align: 'right' as const,
    render: (s: MarketWeightStock) => formatVolume(s.volume),
    sortValue: (s: MarketWeightStock) => Number(s.volume) || 0,
  },
  {
    key: 'turnover', label: '成交值', align: 'right' as const,
    render: (s: MarketWeightStock) => formatTurnover(s.turnover),
    sortValue: (s: MarketWeightStock) => Number(s.turnover) || 0,
  },
]

export function P7MarketCap0050() {
  const { strategy } = useData()
  const data0050 = strategy?.strategy_0050
  const dataMW = strategy?.market_weight_top150

  const potentialIn = data0050?.potential_in || []
  const potentialOut = data0050?.potential_out || []
  const mwStocks = dataMW?.stocks || []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">0050 納入/剔除 & 市值權重 Top 150</h1>

      <IntroBox variant="accent">
        <strong className="text-accent text-base">0050 吃豆腐戰法 (SOP)</strong><br />
        <strong>核心邏輯：</strong>市值前 40 名必定納入 0050，利用「市值排名」提前預測換股<br />
        <strong>換股時程：</strong><br />
        <span className="ml-4 block">
          <strong>3月/6月/9月/12月</strong> 第 7 個交易日 → 臺灣指數公司<strong>公布審核結果</strong><br />
          第 3 個週五<strong>收盤後生效</strong>（換股日）→ 隔週一開始新成分
        </span>
        <strong>進場時機：</strong>公告前 1 個月 → 掃描 Rank ≤ 40 但未入選者<br />
        <strong>出場時機：</strong>生效日（第 3 個週五）13:25-13:30 → 掛跌停價倒貨給 ETF<br />
        <strong className="text-up">風險控制：</strong>若公告前漲幅 &gt; 20%，勿追
      </IntroBox>

      <IntroBox>
        依據期交所市值排名與 0050 ETF 成分股比對，分析潛在納入/剔除候選人。每日自動更新。<br />
        <strong>納入門檻：</strong>市值排名 ≤ 40 且不在 0050 成分股中 ｜
        <strong>剔除門檻：</strong>市值排名 &gt; 60 且在 0050 成分股中
      </IntroBox>

      <KpiGrid>
        <KpiCard label="潛在納入" value={potentialIn.length} valueColor="text-down" subtext="排名 ≤ 40 且不在 0050" />
        <KpiCard label="潛在剔除" value={potentialOut.length} valueColor="text-up" subtext="排名 > 60 且在 0050" />
      </KpiGrid>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TableContainer title="潛在納入候選" titleColor="text-down" maxHeight="420px">
          <DataTable columns={cols0050} data={potentialIn} emptyText="目前無潛在納入候選" />
        </TableContainer>
        <TableContainer title="潛在剔除候選" titleColor="text-up" maxHeight="420px">
          <DataTable columns={cols0050} data={potentialOut} emptyText="目前無潛在剔除候選" />
        </TableContainer>
      </div>

      <TableContainer title="市值權重 Top 150" maxHeight="600px">
        <DataTable columns={colsMW} data={mwStocks} emptyText="暫無資料" />
      </TableContainer>
    </div>
  )
}
