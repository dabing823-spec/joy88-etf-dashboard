export interface TsmcVolSignalData {
  系統: string
  更新時間: string
  資料日期: string
  標的: {
    代號: string
    名稱: string
    收盤價: number
    '日報酬(%)': number
    連續漲跌: number
    成交量: number
  }
  波動率: Record<string, number>
  振幅分析: Record<string, number | string>
  波動率環境: {
    分檔: string
    細節: string
    趨勢: string
    '短長比(5d/20d)': number
  }
  Sell_Call策略: {
    'SC距離(Ticks)': number
    'SC距離(元)': number
    SC履約價: number
    激進度: string
    波動狀態: string
    邏輯: string
    事件警告: string | null
  }
  事件倒數: Array<{
    事件: string
    日期: string
    倒數天數: number
    影響程度: string
    SC建議: string
  }>
  台指周選策略: Array<Record<string, string>>
}
