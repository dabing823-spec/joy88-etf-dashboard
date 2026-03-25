
## Step 1：辨識報告類型

根據用戶指令判斷報告類型與時間語境：

| 類型 | 觸發詞 | 時間點 | 預設章節 |
|------|--------|--------|----------|
| 盤前日報 | 盤前、pre-market、今天怎麼看 | 開盤前（~08:00） | 1,2,3,5,7,8 |
| 盤後日報 | 盤後、收盤、post-market、今天走勢 | 收盤後（~14:00） | 1,2,3,4,5,6,7,8 |
| 週報 | 週報、weekly、本週回顧 | 週五收盤後 | 全部 |
| 月報 | 月報、monthly、本月回顧 | 月底 | 1-7（8 改為「下月展望」） |

若用戶未明確指定，根據**現在時間**自動判斷：
- 台灣時間 05:00–08:45 → 盤前日報
- 台灣時間 13:45–23:59 → 盤後日報
- 週五收盤後且用戶語境涉及「這週」→ 週報

---

## Step 2：Portfolio Gate

**每次生成報告前必須執行此步驟。**

### 判斷邏輯

詢問或判斷用戶意圖：

1. **用戶明確指定 Mode** → 直接採用
   - 「跑一份可以分享的」→ Mode B
   - 「幫我看今天部位」→ Mode A

2. **用戶未指定** → 預設 Mode A（自用），但提示：
   > 「預設走 Mode A（含持倉與風控），如需分享版請說『Mode B』。」

### Mode A：自用版（含持倉）

持倉資料來源優先序：
1. **手動輸入**（本次對話中用戶提供的持倉資訊）→ 最高優先
2. **Memory 提取**（從 Claude 記憶中讀取最新持倉分類與風控狀態）→ 備用
3. **缺失處理** → 主動詢問：「需要你提供最新權益數和持倉變化，或我用記憶中的資料？」

Mode A 額外輸出：
- 第 6 章：持倉 P&L 概覽
- 第 7 章：Joy88 風控燈號（HWM 回撤 + VIX + 指數位階）

### Mode B：分享版（純市場分析）

- 移除所有個人持倉、權益數、槓桿數據
- 移除第 6、7 章
- 署名：046Joy88 / Joy88: Invest Talk
- 可直接轉發至 Telegram 或其他社群

---

## Step 3：資料收集（三路並行）

依報告類型決定收集範圍。先讀取 `references/data-sources.md` 確認具體查詢參數。

### 搜尋次數分配（硬編碼）

搜尋是稀缺資源，必須按用途分配，不可全部花在新聞面。

**盤前日報（7-8 次工具呼叫）：**

| 順序 | 工具 | 用途 | 必要性 |
|------|------|------|--------|
| 1 | web_search | 美股收盤 + 台指期夜盤 | 必做 |
| 2 | web_search | 當日重大事件（動態關鍵字） | 必做 |
| 3 | web_search | 台股上日收盤 + 成交量 | 必做 |
| 4 | web_fetch | 證交所三大法人（官方 URL） | 必做 |
| 5 | web_fetch | 玩股網或 HiStock 技術指標頁 | 必做 |
| 6 | web_search | VIX + 選擇權 PC ratio | 必做 |
| 7 | web_search | 補充搜尋（依缺口調整） | 視需要 |
| 8 | web_fetch | 補充 fetch（依缺口調整） | 視需要 |

**盤後日報（8-10 次工具呼叫）：**

| 順序 | 工具 | 用途 | 必要性 |
|------|------|------|--------|
| 1 | web_search | 台股收盤 + 盤中重點 | 必做 |
| 2 | web_fetch | 證交所三大法人（官方 URL） | 必做 |
| 3 | web_fetch | TAIFEX 期貨未平倉（官方 URL） | 必做 |
| 4 | web_fetch | 玩股網技術指標頁 | 必做 |
| 5 | web_search | 選擇權 PC ratio + 最大 OI | 必做 |
| 6 | web_search | 美股盤前/即時 + VIX | 必做 |
| 7 | web_search | 當日重大事件 | 必做 |
| 8 | web_search | 融資融券變化 | 視需要 |
| 9-10 | web_search/fetch | 補充搜尋 | 視需要 |

**週報/月報**：在盤後基礎上加大搜尋，含產業趨勢、政策變化、外資動向，共 10-15 次。

### 路線 A：Web Search（新聞/總經）

搜尋關鍵字規則：
- 保持 1-6 個字，加入日期提高精準度
- 範例：「美股 三大指數 收盤 3/16」而非「美股 收盤」
- 避免過於寬泛的關鍵字（如單獨「台股」），會產生大量雜訊

### 路線 B：TAIFEX / 證交所官方數據（web_fetch 直取）

**每次報告必須至少 fetch 一個官方數據源，不可全靠二手媒體。**

優先 fetch 順序：

1. **證交所三大法人**（最高優先）
   ```
   web_fetch: https://www.twse.com.tw/rwd/zh/fund/BFI82U?response=json
   ```
   取得：外資/投信/自營 買賣超金額

2. **TAIFEX 三大法人期貨未平倉**
   ```
   web_fetch: https://www.taifex.com.tw/cht/3/futContractsDate
   ```
   取得：外資台指期多空口數、淨部位

3. **TAIFEX 選擇權資料**
   ```
   web_fetch: https://www.taifex.com.tw/cht/3/callsAndPutsDate
   ```
   取得：Put/Call 未平倉比、成交量比

4. **證交所融資融券**
   ```
   web_fetch: https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN
   ```

注意：官方 URL 的可用性可能變動。若 `web_fetch` 回傳錯誤或格式無法解析，降級至 `web_search` 搜尋同類數據（如搜「三大法人 買賣超 {日期}」）。在報告中標註數據來源：「來源：證交所」或「來源：財經媒體轉引」。

### 路線 D — Python Pipeline (fetch.py)

市場報告專用。執行 fetch.py 一次批量抓取所有美股數據：

```bash
cd C:/Users/USER/Projects/market-analyst && C:/Users/USER/anaconda3/python.exe -X utf8 fetch.py --type {pre|post|weekly|monthly} [--joy88] [--tw]
```

**yfinance 資料（自動並行下載）：**
- 指數：SPY, QQQ, DIA, IWM, VTI
- 波動率：^VIX
- 期貨：ES=F, NQ=F, YM=F
- 商品：GC=F (黃金), CL=F (原油), DX=F (美元指數), ^TNX (10Y公債)
- 板塊：11 GICS sector ETFs (XLK, XLF, XLV, XLE, XLI, XLY, XLP, XLU, XLRE, XLC, XLB)
- 技術指標：RSI(14), MACD(12/26/9), SMA(20/50/200) — SPY

**輸出：** `data/market_data.json` + `data/charts/*.png`
**快取：** 1 小時 TTL，可用 `--no-cache` 強制重抓

### 路線 E — Polymarket API

fetch.py 自動並行抓取（Section 5 啟用時）：
- Fed 利率相關市場（升息/降息機率）
- 地緣政治預測（衝突/制裁/關稅）
- API: `https://gamma-api.polymarket.com`（公開、無需認證）

### 路線 F — Joy88 ETF Dashboard

fetch.py 加上 `--joy88` 時讀取：
- `C:/Users/USER/Projects/joy88-etf-dashboard/data/strategy.json` → 風險信號 + 共識 + 速度
- `C:/Users/USER/Projects/joy88-etf-dashboard/data/dashboard.json` → 經理人換股 + 現金模式

### 路線 C：技術指標（三級 fallback）

技術指標取得有三級備援方案，依序嘗試：

**Level 1（優先）：web_fetch 技術分析頁面**

直接抓取有即時技術指標的頁面：

```
web_fetch: https://www.wantgoo.com/index/0000
```
玩股網加權指數頁包含：RSI、KD、MACD、均線、成交量、即時走勢。
從頁面內容中提取：
- 收盤價、開盤、最高、最低
- 均線值（5/10/20/60MA）
- 離季線距離（頁面有顯示）

```
web_fetch: https://histock.tw/stock/taiex01.aspx
```
HiStock 大盤技術分析頁，含 RSI、KD、MACD 數值。

**Level 2（備援）：web_search 搜尋技術分析**

若 Level 1 的 fetch 內容無法解析（網頁結構變更等），改用搜尋：
- 「加權指數 RSI KD MACD {日期}」
- 「台股 技術分析 今日」
- 「加權指數 均線 5MA 20MA」

常見可靠來源：玩股網、HiStock、CMoney、Investing.com

**Level 3（最終備援）：FinMind API（Python 環境）**

若環境允許執行 Python（如 Cowork），用 FinMind API 自行計算。
詳見 `references/data-sources.md` 的 FinMind 查詢範例與計算公式。

**絕對禁止：所有三級都失敗時，不可用「應該」「大約」「推估」等模糊語言猜測指標數值。** 改為在報告中標註「⚠️ 技術指標數據暫缺，建議參閱 TradingView」。

**重要：資料收集以「能取得多少用多少」為原則。** 若某路資料無法取得，在報告中標註「⚠️ 數據缺失」，不可編造數字。

---

## Step 4：分析處理

### 4.1 市場定調（必做）

綜合三路資料，判斷市場狀態：

```
多頭格局 📈 ─ 指數站穩 5MA 上、法人買超、VIX 低檔
震盪格局 📊 ─ 指數在 5MA 與 20MA 之間、法人分歧、VIX 中性
空頭格局 📉 ─ 指數跌破 20MA、法人賣超、VIX 升高
事件驅動 ⚡ ─ 有重大事件主導（央行、地緣、財報），技術面次要
```

### 4.2 巨人傑三層次框架應用

對每則重大新聞/事件，快速套用三層分析（精簡版）：
- L1：發生什麼（✅ 事實）
- L2：背後意義（🔶 推論，標註推論依據）
- L3：操作含意（對部位/策略的具體影響）

### 4.3 Joy88 交易信號（Mode A）

綜合研判後給出信號：
- 🟢 偏多：可維持/加碼多頭
- 🟡 中性：觀望或降低槓桿
- 🔴 偏空：減碼/對沖/翻空

信號強度：強（高確信）/ 中 / 弱（低確信）

---

## Step 5：報告組裝

### 8 個章節模組

根據 Step 1 判斷的報告類型，條件式納入章節。

詳見 `references/report-templates.md` 取得每個章節的完整 Markdown 模板。

| # | 章節名稱 | 內容概要 |
|---|---------|---------|
| 1 | 市場總覽 | 指數收盤/現況、漲跌幅、成交量、市場定調 |
| 2 | 重大新聞與事件 | 當日/本週重點新聞，三層分析精簡版 |
| 3 | 技術面信號 | RSI/KD/MACD、均線、型態研判 |
| 4 | 籌碼面掃描 | 三大法人、融資融券、大額交易人 |
| 5 | 選擇權與情緒 | P/C ratio、VIX、最大未平倉 strike、情緒研判 |
| 6 | 持倉 P&L | Mode A only — 持倉損益、曝險分佈 |
| 7 | 風控燈號 | Mode A only — HWM/VIX/指數三系統狀態 |
| 8 | 明日/下週展望 | 關鍵價位、事件預告、操作方向建議 |

### 章節納入矩陣

```
         盤前  盤後  週報  月報
Ch.1 ✅   ✅    ✅    ✅    ✅
Ch.2 ✅   ✅    ✅    ✅    ✅
Ch.3 ✅   ✅    ✅    ✅    ✅
Ch.4      ○     ✅    ✅    ✅
Ch.5 ✅   ✅    ✅    ✅    ✅
Ch.6 A    ○     ✅    ✅    ✅
Ch.7 A    ✅    ✅    ✅    ✅
Ch.8 ✅   ✅    ✅    ✅    ○
```
✅ = 預設納入 ○ = 有資料時納入 A = Mode A only

---

## Step 6：Markdown 輸出

### 格式規範

- 輸出為純 Markdown，可直接貼 Telegram
- 使用 emoji 作為視覺錨點（統一風格）
- 事實標記 ✅、推論標記 🔶（遵循 Joy88 慣例）
- 每個章節以 `---` 分隔
- 報告頭尾固定格式

### 報告頭部
```markdown
# 🐺 Joy88: Invest Talk Market Analyst
## {報告類型} — {日期}
> 市場定調：{多頭📈/震盪📊/空頭📉/事件驅動⚡}
---
```

### 報告尾部
```markdown
---
> 📋 報告人：046Joy88 | Joy88: Invest Talk
> ⏰ 生成時間：{timestamp}
> ⚠️ 本報告僅供研究參考，不構成投資建議。
> 🔖 ✅ = 事實 | 🔶 = 推論（基於市場邏輯或歷史模式）
```

### Mode B 額外處理

分享版報告在尾部加上：
```markdown
> 📢 更多分析：Joy88: Invest Talk
```

---

## 與其他 SKILL 的協作

本 SKILL 是**報告引擎**，負責整合與組裝。遇到以下情況時調用其他 SKILL：

| 情境 | 調用 SKILL |
|------|-----------|
| 用戶要 .docx 版本 | → trading-report-generator（排版） |
| 單一新聞深度解讀 | → news-3-layer-analysis（完整三層） |
| 持倉風控詳細計算 | → position-tracker（三系統完整運算） |
| 個股加減碼決策 | → position-checklist |
| 交易期望值計算 | → trade-ev-calculator |
| 事件衝擊評估 | → event-impact-scanner |

本 SKILL 的第 7 章（風控燈號）是 position-tracker 的精簡版摘要。
若用戶需要完整的風控運算（含砍倉建議、崩跌試算），應引導至 position-tracker。

---

## 注意事項

1. **不可編造數據**：任何具體數字（指數、成交量、法人買賣超）必須來自搜尋結果或用戶提供。無法取得時標註「⚠️ 數據暫缺」。
2. **事實與推論分離**：嚴格使用 ✅（事實）和 🔶（推論）標記。推論必須附帶依據。
3. **時效性提示**：若搜尋結果非當日數據，標註日期提醒。
4. **Mode 不可混淆**：Mode B 報告中絕對不能出現任何個人持倉、權益數或槓桿數據。
5. **Telegram 友善**：避免過寬的表格，用 emoji + 冒號格式取代複雜表格。

### 報告長度與密度控制

各報告類型有嚴格的長度上限和內容密度規則：

**盤前日報（目標 800-1000 字）— 快速決策用，不是研究報告：**
- Ch.2 新聞：最多 3 則，每則限 2 行（1 行 ✅ 事實 + 1 行 🔶 推論）
- Ch.3 技術面：只列數值和關鍵價位，不寫解釋性段落
- Ch.5 情緒面：只列 VIX 值 + P/C ratio + 一句研判
- Ch.7 風控燈號：三系統各一行 + 目標/實際槓桿 + 一行結論
- Ch.8 展望：最多 3 個關注焦點 + 操作方向（多/空/基準各一句）
- 整份報告控制在手機一屏半以內可讀完

**盤後日報（目標 1200-1800 字）：**
- Ch.2 新聞：最多 5 則，每則可展開至 3-4 行
- Ch.3/4/5 可正常展開
- Ch.6 持倉：表格化呈現，不寫大段文字

**週報（目標 2000-3000 字）/ 月報（目標 2500-4000 字）：**
- 可完整展開所有章節
- 新聞可加入三層分析精簡版
- 增加趨勢性研判段落
