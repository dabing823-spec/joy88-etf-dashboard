# TODOS

## AI Advisor

**Priority:** P2
**Phase 2: FastAPI + WebSocket + event-driven triggers**
Enable real-time advisor re-analysis on macro anomalies.
Depends on: Phase 1 stable for 2+ weeks.

## Deferred Pages

**Priority:** P3
**P11 Trump Signal — 重新整合**
頁面已停用。待 Trump 政策追蹤策略確認後再重新啟用。
原始頁面檔案保留於 `src/pages/P11TrumpSignal.tsx`。

**Priority:** P3
**P12 TSMC Vol Signal — 改從 tsmc-atr-v2 API 拉資料**
頁面已停用。波動率計算已移植至 tsmc-atr-v2 後端（Parkinson/YangZhang/振幅/SC策略）。
待 tsmc-atr-v2 部署後，改為從 API 即時拉取資料並重新啟用。
原始頁面檔案保留於 `src/pages/P12TsmcVolSignal.tsx`。

## Data Loading

**Priority:** P3
**Per-page lazy data loading**
目前 DataContext 在任何頁面 mount 時都載入全部 10 個 JSON (<200KB)。
GitHub Pages CDN cache 有效所以目前影響小。
當資料量顯著增長（>500KB 或新增大型 JSON）時，改為按頁面需求 lazy-fetch。
Depends on: 資料量成長至瓶頸時。

## Completed

**Existing agent test backfill**
Completed: v1.0 (2026-03-26). 36 new tests for macro_signal, alert, ai_holdings, quality agents.

**Codebase-wide focus-visible styles**
Completed: v1.0 (2026-03-26). Global CSS rule for a, button, summary, [role=button], [tabindex].
