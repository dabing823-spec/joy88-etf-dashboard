# 資料源查詢指南

三路資料收集的具體查詢方法與參數。

---

## 路線 A：Web Search

### 搜尋策略

每次搜尋保持 1-6 個關鍵字，具體且簡潔。

#### 盤前日報搜尋模板（3-5 次）

| 優先序 | 搜尋關鍵字 | 取得資訊 |
|--------|-----------|---------|
| 1 | `美股 收盤 {日期}` | 道瓊/那斯達克/S&P500/費半 收盤 |
| 2 | `台股 盤前 重點 {日期}` | 當日台股預覽 |
| 3 | `{當前焦點事件關鍵字}` | 動態調整，如「NVIDIA GTC」「Fed 利率」|
| 4 | `台指期 夜盤` | 夜盤收盤價與趨勢 |
| 5 | `VIX 指數` | VIX 收盤值 |

#### 盤後日報搜尋模板（3-5 次）

| 優先序 | 搜尋關鍵字 | 取得資訊 |
|--------|-----------|---------|
| 1 | `台股 收盤 {日期}` | 加權指數收盤、成交量 |
| 2 | `三大法人 買賣超 {日期}` | 法人進出 |
| 3 | `台指期 未平倉 外資` | 期貨籌碼 |
| 4 | `選擇權 PC ratio` | 選擇權情緒 |
| 5 | `{當日重大事件}` | 動態補搜 |

#### 週報/月報額外搜尋

- `台股 週回顧 {日期範圍}`
- `外資 動向 台股 {月份}`
- `台灣 經濟 展望`
- `半導體 產業 動態`（依持倉相關性）
- `記憶體 DRAM 報價`（依持倉相關性）

### 搜尋結果處理原則

1. 優先採信官方來源（證交所、央行、公司公告）
2. 財經媒體次之（經濟日報、工商時報、鉅亨網、MoneyDJ）
3. 論壇/社群僅作情緒參考，不作為事實依據
4. 數據衝突時，標註來源差異，不自行裁定

---

## 路線 B：TAIFEX / 證交所數據

### 透過 Web Search 取得

TAIFEX 和證交所每日盤後公布的數據，通常可透過搜尋取得。

#### 關鍵數據與搜尋方式

| 數據 | 搜尋關鍵字 | 來源 |
|------|-----------|------|
| 三大法人現貨買賣超 | `三大法人 買賣超 {日期}` | 證交所每日公告 |
| 外資台指期淨部位 | `外資 台指期 未平倉` | TAIFEX 每日收盤資訊 |
| 選擇權 P/C Ratio | `選擇權 Put Call ratio` | TAIFEX |
| 十大交易人未平倉 | `十大交易人 台指期` | TAIFEX |
| 融資融券變化 | `融資餘額 台股` | 證交所 |
| 外資持股比例變化 | `外資 持股 {個股}` | 證交所 |

#### 直接查詢 URL（web_fetch 優先，不可跳過）

**每次報告必須至少嘗試 fetch 一個官方 URL。** 這是 v1.1 的核心改進——從「靠媒體轉述」升級為「直取一手數據」。

**優先序 1：證交所三大法人**
```
web_fetch: https://www.twse.com.tw/rwd/zh/fund/BFI82U?response=json
```
- JSON 格式回傳，解析 `data` 陣列
- 欄位：名稱 / 買進金額 / 賣出金額 / 買賣差額
- 若 JSON 解析成功 → 直接引用，標註「來源：證交所」
- 若失敗 → 嘗試不帶 `?response=json` 的 HTML 版本
- 若仍失敗 → 降級至 web_search「三大法人 買賣超 {日期}」

**優先序 2：TAIFEX 期貨三大法人**
```
web_fetch: https://www.taifex.com.tw/cht/3/futContractsDate
```
- HTML 格式，需從表格中提取外資多空口數
- 關鍵欄位：外資 多方未平倉 / 空方未平倉 / 淨部位

**優先序 3：TAIFEX 選擇權 P/C Ratio**
```
web_fetch: https://www.taifex.com.tw/cht/3/callsAndPutsDate
```

**優先序 4：融資融券**
```
web_fetch: https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN
```

**降級搜尋模板（任一 URL fetch 失敗時使用）：**

| 數據 | 降級搜尋關鍵字 |
|------|--------------|
| 三大法人 | `三大法人 買賣超 {日期}` |
| 外資期貨 | `外資 台指期 未平倉 淨部位 {日期}` |
| P/C Ratio | `選擇權 PC ratio 未平倉 {日期}` |
| 融資融券 | `融資餘額 變化 台股 {日期}` |

報告中必須標註數據來源層級：「📊 來源：證交所」或「📊 來源：財經媒體（{媒體名}）」。

---

## 路線 C：技術指標（三級 Fallback）

### Level 1（優先）：web_fetch 技術分析頁面

直接抓取包含即時技術指標的頁面，從 HTML 內容中提取數值。

**首選：玩股網加權指數頁**
```
web_fetch: https://www.wantgoo.com/index/0000
```
頁面包含：收盤價、開盤、最高、最低、成交量、離季線距離、本益比、殖利率、類股漲幅排行。
注意：技術指標（RSI/KD/MACD）可能需要登入才能取得完整數值，但基本價格和均線數據通常可用。

**備選：HiStock 大盤技術分析**
```
web_fetch: https://histock.tw/stock/taiex01.aspx
```
頁面包含：RSI、KD、MACD 數值圖表，以及即時/日 K 線走勢。

**備選：鉅亨網台指期**
```
web_fetch: https://invest.cnyes.com/futures/TWF/TXF
```
頁面包含：台指期即時報價、技術面摘要。

**從 fetch 結果中提取的目標數據：**

| 指標 | 需要的值 | 用途 |
|------|---------|------|
| 收盤價 | 精確數值 | Ch.1 市場總覽 |
| 5MA / 10MA / 20MA / 60MA | 精確數值 | Ch.3 均線系統 |
| RSI(14) | 精確數值 | Ch.3 動能指標 |
| K / D 值 | 精確數值 | Ch.3 動能指標 |
| MACD / DIF / 柱狀 | 精確數值 | Ch.3 動能指標 |
| 成交量 | 億元 | Ch.1 市場總覽 |

### Level 2（備援）：web_search 搜尋技術分析

若 Level 1 的 fetch 內容無法解析（頁面結構變更、回傳空白等），改用搜尋：

| 搜尋關鍵字 | 預期取得 |
|-----------|---------|
| `加權指數 RSI KD MACD {日期}` | 動能指標概覽 |
| `台股 技術分析 均線 {日期}` | 均線相對位置 |
| `加權指數 支撐 壓力` | 關鍵價位 |

優先採信的來源排序：玩股網 > HiStock > CMoney > Investing.com > 其他

### Level 3（最終備援）：FinMind API（Python 環境）

FinMind 提供台股歷史數據 API，需在可執行 Python 的環境中使用。

#### API 端點

```
Base URL: https://api.finmindtrade.com/api/v4/data
```

#### 查詢範例

```python
import requests
import pandas as pd

# 加權指數日線
params = {
    "dataset": "TaiwanStockPrice",
    "data_id": "TAIEX",  # 加權指數
    "start_date": "2026-03-01",
    "end_date": "2026-03-16",
    "token": ""  # 免費 token 可在 finmindtrade.com 申請
}
resp = requests.get("https://api.finmindtrade.com/api/v4/data", params=params)
df = pd.DataFrame(resp.json()["data"])

# 三大法人買賣超
params_inst = {
    "dataset": "TaiwanStockInstitutionalInvestorsBuySell",
    "data_id": "TAIEX",
    "start_date": "2026-03-01",
    "end_date": "2026-03-16",
}

# 融資融券
params_margin = {
    "dataset": "TaiwanStockMarginPurchaseShortSale",
    "data_id": "2330",  # 個股代碼
    "start_date": "2026-03-01",
}
```

#### FinMind 常用 Dataset

| Dataset | 說明 | data_id |
|---------|------|---------|
| TaiwanStockPrice | 股價日線 | 股票代碼或 TAIEX |
| TaiwanStockInstitutionalInvestorsBuySell | 三大法人 | 股票代碼 |
| TaiwanStockMarginPurchaseShortSale | 融資融券 | 股票代碼 |
| TaiwanFutureDailyInfo | 期貨日資訊 | 商品代碼 |
| TaiwanOptionDailyInfo | 選擇權日資訊 | 商品代碼 |
| TaiwanStockPER | 本益比 | 股票代碼 |

#### 技術指標計算（需自行計算）

FinMind 提供原始價格數據，技術指標需用 pandas 計算：

```python
# RSI(14)
delta = df['close'].diff()
gain = delta.where(delta > 0, 0).rolling(14).mean()
loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
rs = gain / loss
rsi = 100 - (100 / (1 + rs))

# KD(9,3,3)
low_min = df['min'].rolling(9).min()
high_max = df['max'].rolling(9).max()
rsv = (df['close'] - low_min) / (high_max - low_min) * 100
k = rsv.ewm(com=2).mean()
d = k.ewm(com=2).mean()

# MACD(12,26,9)
ema12 = df['close'].ewm(span=12).mean()
ema26 = df['close'].ewm(span=26).mean()
dif = ema12 - ema26
macd_signal = dif.ewm(span=9).mean()
histogram = dif - macd_signal

# 均線
for period in [5, 10, 20, 60]:
    df[f'MA{period}'] = df['close'].rolling(period).mean()
```

### 方法三：搭配用戶截圖

若用戶貼出 TradingView 或券商 App 的技術分析截圖，直接從截圖辨識數據，
比 API 查詢更即時且準確。

---

## 資料品質與缺失處理

### 品質檢查

每項數據入報告前檢查：
1. **時效性**：數據日期是否為目標日期？過期數據標註日期。
2. **來源可信度**：官方 > 財經媒體 > 論壇。
3. **一致性**：跨來源數據是否一致？不一致則標註。

### 缺失處理

| 缺失情況 | 處理方式 |
|---------|---------|
| 單一指標缺失 | 該欄位標註「⚠️ 數據暫缺」 |
| 整個路線失敗 | 對應章節標註「⚠️ 本章資料來源不可用」，仍產出其餘章節 |
| 關鍵數據全缺 | 收盤價或指數值取不到時，提示用戶手動提供 |

原則：**寧可標註缺失，絕不編造數字。**

---

## 路線 D — yfinance Python Pipeline

市場報告專用，由 `fetch.py` 統一執行（與 Web 路線並行）。

### 符號表

| 類別 | 符號 | 名稱 |
|------|------|------|
| 指數 | SPY | S&P 500 |
| 指數 | QQQ | Nasdaq 100 |
| 指數 | DIA | Dow Jones |
| 指數 | IWM | Russell 2000 |
| 指數 | VTI | Total Market |
| 波動率 | ^VIX | CBOE VIX |
| 期貨 | ES=F | S&P 500 Futures |
| 期貨 | NQ=F | Nasdaq Futures |
| 期貨 | YM=F | Dow Futures |
| 商品 | GC=F | Gold |
| 商品 | CL=F | WTI Crude Oil |
| 商品 | DX=F | US Dollar Index |
| 公債 | ^TNX | US 10Y Treasury Yield |
| 板塊 | XLK | Technology |
| 板塊 | XLF | Financials |
| 板塊 | XLV | Health Care |
| 板塊 | XLE | Energy |
| 板塊 | XLI | Industrials |
| 板塊 | XLY | Consumer Discretionary |
| 板塊 | XLP | Consumer Staples |
| 板塊 | XLU | Utilities |
| 板塊 | XLRE | Real Estate |
| 板塊 | XLC | Communication Services |
| 板塊 | XLB | Materials |

### VIX 水位解讀
| 區間 | 解讀 |
|------|------|
| < 15 | 自滿（low）|
| 15-20 | 正常（normal）|
| 20-30 | 恐慌初期（elevated）|
| 30-40 | 恐慌（high）|
| > 40 | 投降（extreme）|

## 路線 E — Polymarket Gamma API

- Endpoint: `https://gamma-api.polymarket.com`
- 認證：不需要（公開 API）
- 用途：Fed 利率決策預測 + 地緣政治事件賠率
- 過濾關鍵字：fed, interest rate, fomc, rate cut, inflation, cpi, gdp, recession, war, tariff, china, russia

## 路線 F — Joy88 ETF Dashboard

- 路徑：`C:/Users/USER/Projects/joy88-etf-dashboard/data/`
- `strategy.json`：risk_signals（8項紅黃綠燈）、consensus_trends、velocity、recommendations
- `dashboard.json`：cash_mode、daily_changes（經理人換股）、consensus、conviction
- 觸發：fetch.py 加上 `--joy88` flag
