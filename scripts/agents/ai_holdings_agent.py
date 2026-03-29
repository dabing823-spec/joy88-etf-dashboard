#!/usr/bin/env python3
"""
AI Holdings Analysis Agent — 用 Claude API 分析 ETF 持股異動
================================================================
取代原本依賴 NotebookLM 的 ai_research_agent。
直接從 dashboard.json 讀取最新異動，用 Claude 產出雙視角分析。

環境變數:
  ANTHROPIC_API_KEY — Claude API key
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import DATA_DIR

OUTPUT_FILE = DATA_DIR / "ai_research.json"
DASHBOARD_FILE = DATA_DIR / "dashboard.json"


def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] AI Holdings: {msg}", file=sys.stderr)


def get_latest_changes(dashboard: dict) -> dict:
    """Extract latest daily changes for 00981A."""
    changes = dashboard.get("daily_changes", {}).get("00981A", [])
    if not changes:
        return {}
    latest = changes[-1]
    return latest


def build_changes_summary(changes: dict) -> str:
    """Build a text summary of changes."""
    parts = []
    for s in changes.get("new", []):
        parts.append(f"新增：{s['name']}({s['code']}, {s.get('weight', 0):.1f}%)")
    for s in changes.get("added", []):
        parts.append(f"加碼：{s['name']}({s['code']}, {s.get('weight_chg', 0):+.1f}%)")
    for s in changes.get("reduced", []):
        parts.append(f"減碼：{s['name']}({s['code']}, {s.get('weight_chg', 0):+.1f}%)")
    for s in changes.get("exited", []):
        parts.append(f"出清：{s['name']}({s['code']})")
    return "；".join(parts) if parts else "無異動"


def build_changes_detail(changes: dict) -> dict:
    return {
        "new": [{"code": s["code"], "name": s["name"], "weight": s.get("weight", 0), "weight_chg": s.get("weight", 0)} for s in changes.get("new", [])],
        "added": [{"code": s["code"], "name": s["name"], "weight": s.get("weight", 0), "weight_chg": s.get("weight_chg", 0)} for s in changes.get("added", [])],
        "reduced": [{"code": s["code"], "name": s["name"], "weight": s.get("weight", 0), "weight_chg": s.get("weight_chg", 0)} for s in changes.get("reduced", [])],
        "removed": [{"code": s["code"], "name": s["name"], "weight": 0, "weight_chg": 0} for s in changes.get("exited", [])],
    }


def analyze_with_claude(changes_summary: str, cash_mode: dict, date: str) -> tuple:
    """Call Claude API for dual-perspective analysis."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        log("ANTHROPIC_API_KEY not set, skipping AI analysis")
        return None, None

    from anthropic import Anthropic
    client = Anthropic(api_key=api_key)

    cash_info = f"現金水位: {cash_mode.get('cash_now', 0):.1f}%, 模式: {cash_mode.get('mode', '-')}, 趨勢: {cash_mode.get('trend', '-')}, 持股數: {cash_mode.get('n_holdings', 0)}"

    # Institutional view (沈萬鈞)
    log("Generating institutional view...")
    inst_resp = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": (
                f"你是「沈萬鈞」，一位台灣法人投資研究員，專長產業趨勢分析。\n\n"
                f"日期: {date}\n"
                f"主動式 ETF 00981A（統一台股增長）最新持股異動：\n{changes_summary}\n\n"
                f"{cash_info}\n\n"
                f"請用 3-5 個重點分析：\n"
                f"1. 這些異動背後的投資邏輯與產業趨勢\n"
                f"2. 經理人的操作風格變化（進攻/防守）\n"
                f"3. 對散戶投資人的建議\n\n"
                f"回覆格式：先一段總結（2-3句），再用 bullet points 列出重點。用繁體中文。不要用 markdown 粗體語法（** 或 __）。"
            ),
        }],
    )
    def parse_analysis(text: str) -> tuple:
        """Parse Claude response into summary + key_points, stripping markdown."""
        import re
        # Clean markdown bold
        clean = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
        lines = [l.strip() for l in clean.split("\n") if l.strip()]

        # Find summary = first non-heading paragraph
        summary = ""
        points = []
        for line in lines:
            stripped = re.sub(r'^[#\s*]+', '', line).strip()
            if stripped.startswith(("總結", "重點分析", "---")):
                continue
            if not summary and len(stripped) > 20 and not stripped.startswith(("•", "-", "1.", "2.", "3.", "4.", "5.")):
                summary = stripped
                continue
            # Bullet points
            m = re.match(r'^[•\-\*]\s*(.+)', stripped) or re.match(r'^\d+\.\s*(.+)', stripped)
            if m:
                point = m.group(1).strip()
                # Take first sentence or up to 80 chars for display
                short = point.split("，")[0] + ("..." if len(point) > 60 else "")
                points.append(point)
        return summary, points[:5]

    inst_text = inst_resp.content[0].text.strip()
    inst_summary, inst_points = parse_analysis(inst_text)

    # Trader view (巨人傑)
    log("Generating trader view...")
    trader_resp = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": (
                f"你是「巨人傑」，一位實戰交易者，專長供需結構分析與短線操作。\n\n"
                f"日期: {date}\n"
                f"主動式 ETF 00981A（統一台股增長）最新持股異動：\n{changes_summary}\n\n"
                f"{cash_info}\n\n"
                f"請用 3-5 個重點分析：\n"
                f"1. 這些標的的短線供需結構與交易機會\n"
                f"2. 跟單策略建議（進場時機、持有天數、停損）\n"
                f"3. 風險控管提醒\n\n"
                f"回覆格式：先一段總結（2-3句），再列出重點（bullet points）。用繁體中文。不要用 markdown 粗體語法。"
            ),
        }],
    )
    trader_text = trader_resp.content[0].text.strip()
    trader_summary, trader_points = parse_analysis(trader_text)

    institutional = {
        "source": "沈萬鈞法人視野",
        "analysis": inst_text,
        "summary": inst_summary,
        "key_points": inst_points,
    }
    trader = {
        "source": "巨人思維",
        "analysis": trader_text,
        "summary": trader_summary,
        "key_points": trader_points,
    }

    log(f"Institutional: {len(inst_text)} chars, {len(inst_points)} points")
    log(f"Trader: {len(trader_text)} chars, {len(trader_points)} points")

    return institutional, trader


def run():
    if not DASHBOARD_FILE.exists():
        log("dashboard.json not found")
        return

    dashboard = json.loads(DASHBOARD_FILE.read_text(encoding="utf-8"))
    date = dashboard.get("report_date", "")
    changes = get_latest_changes(dashboard)
    cash_mode = dashboard.get("cash_mode", {})

    if not changes or (not changes.get("new") and not changes.get("added") and not changes.get("reduced") and not changes.get("exited")):
        log(f"No changes on {date}, skipping")
        return

    summary = build_changes_summary(changes)
    detail = build_changes_detail(changes)
    log(f"Changes: {summary[:80]}...")

    institutional, trader = analyze_with_claude(summary, cash_mode, date)

    # Build output
    analysis = {
        "etf_code": "00981A",
        "date": date,
        "changes_summary": summary,
        "changes_detail": detail,
        "institutional": institutional or {"source": "沈萬鈞法人視野", "analysis": "", "summary": "", "key_points": []},
        "trader": trader or {"source": "巨人思維", "analysis": "", "summary": "", "key_points": []},
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }

    # Read existing or create new
    existing = {"version": 1, "updated_at": "", "notebooks": {}, "analyses": {}}
    if OUTPUT_FILE.exists():
        try:
            existing = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, KeyError):
            pass

    existing["analyses"]["00981A"] = analysis
    existing["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    existing["notebooks"]["00981A"] = "Claude API (Sonnet)"

    OUTPUT_FILE.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"Written to {OUTPUT_FILE}")


if __name__ == "__main__":
    run()
