#!/bin/bash
# ═══════════════════════════════════════════════════════
# Wolf Pack Dashboard — 每日自動更新腳本
# 放在 Mac Mini 上，爬蟲跑完後自動執行
#
# 功能：
#   1. 執行 Agent Pipeline（品質檢查→信號分析→Dashboard→通知）
#   2. git add + commit + push 到 GitHub
#   3. GitHub Pages 自動更新
#
# 用法：
#   chmod +x daily_update.sh
#   ./daily_update.sh             # 完整 pipeline + git push
#   ./daily_update.sh --no-alert  # 跳過 LINE 通知
# ═══════════════════════════════════════════════════════

set -e

# ── 路徑設定 ──
REPO_DIR="$HOME/wolf-pack-dashboard"
AGENTS_DIR="$REPO_DIR/scripts/agents"
LOG_DIR="$HOME/FinanceData/logs"
LOG_FILE="$LOG_DIR/dashboard_update.log"

# 確保 log 目錄存在
mkdir -p "$LOG_DIR"

# 紀錄函數
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "═══════════════════════════════════════"
log "🐺 Wolf Pack Agent Pipeline 開始"
log "═══════════════════════════════════════"

# ── Step 1: 執行 Agent Pipeline ──
log "🤖 執行 Agent Orchestrator..."
cd "$AGENTS_DIR"

EXTRA_ARGS=""
if [[ "$1" == "--no-alert" ]]; then
    EXTRA_ARGS="--no-alert"
fi

python3 orchestrator.py --git-push $EXTRA_ARGS 2>&1 | tee -a "$LOG_FILE"

PIPELINE_EXIT=$?

if [ $PIPELINE_EXIT -ne 0 ]; then
    log "⚠️ Pipeline 有部分失敗（exit code $PIPELINE_EXIT）"
else
    log "✅ Pipeline 全部完成"
fi

log "🐺 每日更新完成！"
log ""
