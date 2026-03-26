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

## Completed

**Existing agent test backfill**
Completed: v1.0 (2026-03-26). 36 new tests for macro_signal, alert, ai_holdings, quality agents.

**Codebase-wide focus-visible styles**
Completed: v1.0 (2026-03-26). Global CSS rule for a, button, summary, [role=button], [tabindex].
