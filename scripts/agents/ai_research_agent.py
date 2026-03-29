#!/usr/bin/env python3
"""
AI Research Agent — NotebookLM 雙視角持股異動分析。

讀取 dashboard.json 的 daily_changes，
對最新異動跑沈萬鈞（法人）+ 巨人傑（交易）雙視角分析，
結果寫入 data/ai_research.json 供前端顯示。

用法:
    python ai_research_agent.py                    # 分析所有 ETF 最新異動
    python ai_research_agent.py --etf 00981A       # 只分析指定 ETF
    python ai_research_agent.py --dry-run          # 顯示會分析什麼，但不實際執行
"""

import argparse
import asyncio
import json
import sys
import io
import platform
from datetime import datetime
from pathlib import Path

if platform.system() == "Windows":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

SCRIPT_DIR = Path(__file__).parent
REPO_DIR = SCRIPT_DIR.parent.parent
DATA_DIR = REPO_DIR / "data"
OUTPUT_FILE = DATA_DIR / "ai_research.json"

# NotebookLM notebooks to query
NOTEBOOKS = {
    "institutional": "沈萬鈞法人視野",
    "trader": "巨人思維",
}


def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] 🧠 {msg}", file=sys.stderr)


def load_daily_changes() -> dict:
    """Load daily_changes from dashboard.json."""
    dashboard_path = DATA_DIR / "dashboard.json"
    if not dashboard_path.exists():
        log(f"找不到 {dashboard_path}")
        return {}
    with open(dashboard_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("daily_changes", {})


def build_changes_text(change: dict) -> str:
    """Build a readable summary of holdings changes."""
    parts = []
    if change.get("new"):
        names = [f"{s['name']}({s['code']})" for s in change["new"][:5]]
        parts.append(f"新建倉：{', '.join(names)}")
    if change.get("added"):
        names = [f"{s['name']}({s['code']}, +{s.get('weight_chg', 0):.1f}%)" for s in change["added"][:5]]
        parts.append(f"加碼：{', '.join(names)}")
    if change.get("reduced"):
        names = [f"{s['name']}({s['code']}, {s.get('weight_chg', 0):.1f}%)" for s in change["reduced"][:5]]
        parts.append(f"減碼：{', '.join(names)}")
    if change.get("exited"):
        names = [f"{s['name']}({s['code']})" for s in change["exited"][:5]]
        parts.append(f"出清：{', '.join(names)}")
    return "；".join(parts) if parts else ""


def build_questions(etf_code: str, changes_text: str) -> dict:
    """Build questions for both notebooks."""
    return {
        "institutional": (
            f"主動式 ETF {etf_code} 最新持股異動如下：{changes_text}。\n\n"
            f"請從法人產業研究的角度分析：\n"
            f"1. 這些異動背後可能的投資邏輯是什麼？經理人看到了什麼趨勢？\n"
            f"2. 新建倉/加碼的標的，目前在產業鏈中的位置與供需狀態如何？\n"
            f"3. 出清/減碼的標的，可能的賣出原因是什麼？\n"
            f"4. 這些操作對投資人的啟示是什麼？"
        ),
        "trader": (
            f"主動式 ETF {etf_code} 最新持股異動：{changes_text}。\n\n"
            f"從實戰交易者的角度分析：\n"
            f"1. 這些新建倉/加碼的標的，目前供需結構如何？有沒有風報比不對等的交易機會？\n"
            f"2. 如果要跟單經理人，試單策略怎麼設計？什麼情況代表「進場理由消失」？\n"
            f"3. 散戶跟單主動式 ETF 最常犯的錯誤是什麼？\n"
            f"4. 被減碼/出清的標的，是否有融資斷頭後的反彈機會？"
        ),
    }


async def ask_notebook(client, notebook_name: str, question: str) -> str:
    """Ask a question against a NotebookLM notebook."""
    notebooks = await client.notebooks.list()
    nb = None
    for n in notebooks:
        if notebook_name.lower() in n.title.lower():
            nb = n
            break

    if not nb:
        return f"（找不到筆記本：{notebook_name}）"

    try:
        result = await client.chat.ask(nb.id, question=question)
        return result.answer
    except Exception as e:
        return f"（查詢失敗：{e}）"


async def analyze_etf(client, etf_code: str, changes: list[dict]) -> dict | None:
    """Analyze the latest changes for one ETF."""
    if not changes:
        return None

    latest = changes[0]
    date = latest.get("date", "unknown")
    changes_text = build_changes_text(latest)

    if not changes_text:
        log(f"  {etf_code} {date}: 沒有異動，跳過")
        return None

    log(f"  {etf_code} {date}: {changes_text[:80]}...")

    questions = build_questions(etf_code, changes_text)

    # Ask both notebooks
    log(f"    📊 問 {NOTEBOOKS['institutional']}...")
    inst_answer = await ask_notebook(client, NOTEBOOKS["institutional"], questions["institutional"])
    log(f"    ✓ 法人觀點完成（{len(inst_answer)} 字）")

    log(f"    ⚡ 問 {NOTEBOOKS['trader']}...")
    trader_answer = await ask_notebook(client, NOTEBOOKS["trader"], questions["trader"])
    log(f"    ✓ 交易觀點完成（{len(trader_answer)} 字）")

    return {
        "etf_code": etf_code,
        "date": date,
        "changes_summary": changes_text,
        "changes_detail": {
            "new": latest.get("new", []),
            "added": latest.get("added", []),
            "reduced": latest.get("reduced", []),
            "exited": latest.get("exited", []),
        },
        "institutional": {
            "source": NOTEBOOKS["institutional"],
            "analysis": inst_answer,
        },
        "trader": {
            "source": NOTEBOOKS["trader"],
            "analysis": trader_answer,
        },
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }


async def run(etf_filter: str | None = None, dry_run: bool = False):
    daily_changes = load_daily_changes()
    if not daily_changes:
        log("沒有 daily_changes 數據")
        return

    # Load existing results
    existing = {}
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            existing = json.load(f)

    etf_codes = [etf_filter] if etf_filter else list(daily_changes.keys())
    log(f"分析 ETF: {', '.join(etf_codes)}")

    if dry_run:
        for code in etf_codes:
            changes = daily_changes.get(code, [])
            if changes:
                text = build_changes_text(changes[0])
                log(f"  {code} {changes[0].get('date')}: {text}")
            else:
                log(f"  {code}: 無數據")
        return

    from notebooklm import NotebookLMClient

    async with await NotebookLMClient.from_storage() as client:
        results = existing.get("analyses", {})

        for code in etf_codes:
            changes = daily_changes.get(code, [])
            result = await analyze_etf(client, code, changes)
            if result:
                results[code] = result

        output = {
            "version": 1,
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "notebooks": NOTEBOOKS,
            "analyses": results,
        }

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        log(f"結果已寫入 {OUTPUT_FILE}")
        log(f"分析了 {len(results)} 檔 ETF")


def main():
    parser = argparse.ArgumentParser(description="AI Research Agent — NotebookLM 雙視角分析")
    parser.add_argument("--etf", default=None, help="只分析指定 ETF（如 00981A）")
    parser.add_argument("--dry-run", action="store_true", help="只顯示會分析什麼")
    args = parser.parse_args()

    asyncio.run(run(etf_filter=args.etf, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
