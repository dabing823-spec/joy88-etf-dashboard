#!/usr/bin/env python3
"""
AI Advisor Agent — Giant Jay 框架每日行動建議
=============================================
讀取所有 pipeline 輸出，運用 Giant Jay 投資框架，
透過 Claude Opus 產出每日可執行的行動建議。

用法:
  python ai_advisor_agent.py --phase pre-market    # 盤前分析
  python ai_advisor_agent.py --phase post-market   # 盤後分析
  python ai_advisor_agent.py --phase post-market --dry-run  # 乾跑（不呼叫 API）
"""

import argparse
import io
import json
import os
import platform
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import DATA_DIR
from utils import send_telegram_message

TW = timezone(timedelta(hours=8))
PROMPTS_DIR = Path(__file__).parent / "prompts"
ADVISOR_FILE = DATA_DIR / "advisor.json"
MAX_ENTRIES = 14  # rolling 7 days x 2/day


# ── Data loading ──


DATA_SOURCES = {
    "dashboard": {"file": "dashboard.json", "stale_hours": 24},
    "strategy": {"file": "strategy.json", "stale_hours": 2},
    "news_analysis": {"file": "news_analysis.json", "stale_hours": 24},
    "ai_research": {"file": "ai_research.json", "stale_hours": 48},
    "tsmc_vol_signal": {"file": "tsmc_vol_signal.json", "stale_hours": 48},
    "indices_history": {"file": "indices_history.json", "stale_hours": 24},
}


def load_data_files() -> dict:
    """Load all data source files. Returns {name: {data, path, loaded, error}}."""
    result = {}
    for name, spec in DATA_SOURCES.items():
        path = DATA_DIR / spec["file"]
        entry = {"data": None, "path": str(path), "loaded": False, "error": None}
        try:
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    entry["data"] = json.load(f)
                entry["loaded"] = True
            else:
                entry["error"] = "file_not_found"
        except json.JSONDecodeError as e:
            entry["error"] = f"json_parse_error: {e}"
        except Exception as e:
            entry["error"] = str(e)
        result[name] = entry
    return result


def check_freshness(data: dict) -> dict:
    """Check freshness of each data source. Returns {name: {date, fresh, stale_hours}}."""
    now = datetime.now(TW)
    result = {}
    for name, spec in DATA_SOURCES.items():
        entry = data.get(name, {})
        info = {"date": None, "fresh": False, "stale_hours": spec["stale_hours"]}
        if not entry.get("loaded"):
            result[name] = info
            continue

        d = entry["data"]
        # Try to extract date from various fields
        date_str = None
        if isinstance(d, dict):
            date_str = (
                d.get("updated_at")
                or d.get("report_date")
                or d.get("generated_at")
                or d.get("date")
            )
            if not date_str and "dates" in d and isinstance(d["dates"], list):
                date_str = d["dates"][-1] if d["dates"] else None
        elif isinstance(d, list) and d:
            date_str = d[-1].get("date") if isinstance(d[-1], dict) else None

        info["date"] = date_str
        if date_str:
            try:
                dt = _parse_date(date_str)
                hours_ago = (now - dt).total_seconds() / 3600
                info["fresh"] = hours_ago <= spec["stale_hours"]
            except Exception:
                info["fresh"] = False
        result[name] = info
    return result


def _parse_date(s: str) -> datetime:
    """Parse various date formats to TW-aware datetime."""
    for fmt in [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
    ]:
        try:
            dt = datetime.strptime(s.strip(), fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=TW)
            return dt
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: {s}")


def compute_data_completeness(freshness: dict) -> float:
    """Compute data completeness score (0.0 to 1.0)."""
    total = len(freshness)
    if total == 0:
        return 0.0
    fresh_count = sum(1 for v in freshness.values() if v["fresh"])
    return round(fresh_count / total, 2)


# ── Data summarization ──


def summarize_dashboard(data: dict) -> str:
    """Summarize dashboard.json for prompt."""
    if not data:
        return "（無持倉資料）"
    lines = []
    cm = data.get("cash_mode", {})
    if cm:
        lines.append(f"現金模式: {cm.get('mode', '?')} — {cm.get('mode_desc', '')}")
        lines.append(f"現金水位: {cm.get('cash_now', '?')}%")
        if cm.get("futures_signal"):
            lines.append(f"期貨信號: {cm['futures_signal']}")
        # Cash trend (last 5 days)
        cs = cm.get("cash_series", [])[-5:]
        if cs:
            trend = [f"{c.get('date', '?')}: {c.get('cash_pct', '?')}%" for c in cs]
            lines.append(f"現金趨勢(5日): {', '.join(trend)}")

    # Top holdings changes
    for etf_id in ["00981A", "00980A"]:
        etf_data = data.get("latest_holdings", {}).get(etf_id, {})
        changes = etf_data.get("changes", [])[:5]
        if changes:
            lines.append(f"\n{etf_id} 前5大異動:")
            for c in changes:
                lines.append(
                    f"  {c.get('stock', '?')}: {c.get('action', '?')} "
                    f"{c.get('weight_change', 0):+.2f}%"
                )
    return "\n".join(lines) if lines else "（持倉資料結構不明）"


def summarize_strategy(data: dict) -> str:
    """Summarize strategy.json for prompt."""
    if not data:
        return "（無策略資料）"
    lines = []
    risk = data.get("risk_signals", {})
    if risk:
        lines.append(f"風險評分: {risk.get('score', '?')}/{risk.get('max_score', '?')}")
        lines.append(f"風險等級: {risk.get('level', '?')}")
        signals = risk.get("signals", [])
        top3 = sorted(signals, key=lambda s: {"red": 0, "yellow": 1}.get(s.get("level", ""), 2))[:3]
        for s in top3:
            lines.append(f"  [{s.get('level', '?')}] {s.get('name', '?')}: {s.get('description', '')}")

    # Market indices
    mi = data.get("market_indices", {})
    if mi:
        lines.append("\n市場指數:")
        for key in ["taiex", "tpex", "sp500", "nasdaq", "vix", "dxy", "oil", "gold"]:
            val = mi.get(key)
            chg = mi.get(f"{key}_chg_pct")
            if val is not None:
                chg_str = f" ({chg:+.2f}%)" if chg is not None else ""
                lines.append(f"  {key}: {val}{chg_str}")
    return "\n".join(lines) if lines else "（策略資料結構不明）"


def summarize_news(data) -> str:
    """Summarize news_analysis.json for prompt (latest 2-3 analyses)."""
    if not data:
        return "（無新聞分析）"
    analyses = []
    if isinstance(data, dict):
        analyses = data.get("analyses", [])
    elif isinstance(data, list):
        analyses = data
    if not analyses:
        return "（無新聞分析項目）"

    lines = []
    for entry in analyses[:3]:
        headline = entry.get("headline", "?")
        lines.append(f"\n【{headline}】")
        for layer_key, label in [("layer1", "表面"), ("layer2", "隱藏"), ("layer3", "決策")]:
            layer = entry.get(layer_key, {})
            if isinstance(layer, dict):
                for k, v in layer.items():
                    if v and isinstance(v, str):
                        lines.append(f"  {label}/{k}: {v[:200]}")
    return "\n".join(lines) if lines else "（新聞分析結構不明）"


def summarize_for_prompt(data: dict, phase: str) -> str:
    """Build summarized data section for the user prompt."""
    sections = []

    sections.append("=== 持倉變化 ===")
    d = data.get("dashboard", {}).get("data")
    sections.append(summarize_dashboard(d))

    sections.append("\n=== 風險訊號 ===")
    d = data.get("strategy", {}).get("data")
    sections.append(summarize_strategy(d))

    sections.append("\n=== 新聞分析 ===")
    d = data.get("news_analysis", {}).get("data")
    sections.append(summarize_news(d))

    sections.append("\n=== AI 研究 ===")
    d = data.get("ai_research", {}).get("data")
    if d:
        if isinstance(d, dict):
            sections.append(json.dumps(d, ensure_ascii=False, indent=2)[:3000])
        else:
            sections.append(str(d)[:3000])
    else:
        sections.append("（無 AI 研究資料）")

    sections.append("\n=== TSMC 波動信號 ===")
    d = data.get("tsmc_vol_signal", {}).get("data")
    if d:
        sections.append(json.dumps(d, ensure_ascii=False, indent=2)[:1500])
    else:
        sections.append("（無 TSMC 波動資料）")

    sections.append("\n=== 市場指數趨勢 ===")
    d = data.get("indices_history", {}).get("data")
    if d and isinstance(d, dict):
        # Latest values + 5-day direction
        for idx_name, values in list(d.items())[:8]:
            if isinstance(values, list) and values:
                recent = values[-5:]
                first = recent[0].get("close") if isinstance(recent[0], dict) else recent[0]
                last = recent[-1].get("close") if isinstance(recent[-1], dict) else recent[-1]
                if first and last:
                    try:
                        direction = "↑" if float(last) > float(first) else "↓"
                        sections.append(f"  {idx_name}: {last} ({direction} 5日)")
                    except (ValueError, TypeError):
                        sections.append(f"  {idx_name}: {last}")
    elif not d:
        sections.append("（無指數歷史資料）")

    return "\n".join(sections)


# ── Prompt building ──


def build_prompt(phase: str, data: dict) -> tuple[str, str]:
    """Build system + user prompts. Returns (system_prompt, user_prompt)."""
    system_path = PROMPTS_DIR / "giant_jay_system.md"
    template_path = PROMPTS_DIR / (
        "advisor_premarket.md" if phase == "pre-market" else "advisor_postmarket.md"
    )

    system_prompt = system_path.read_text(encoding="utf-8")
    template = template_path.read_text(encoding="utf-8")
    data_summary = summarize_for_prompt(data, phase)
    user_prompt = template.replace("{data}", data_summary)

    return system_prompt, user_prompt


# ── Claude API ──


def call_claude(system_prompt: str, user_prompt: str) -> str:
    """Call Claude Opus API. Returns raw response text."""
    import anthropic

    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-opus-4-20250514",
        max_tokens=2000,
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text


def parse_response(raw: str) -> dict | None:
    """Parse Claude response as JSON. Returns None on failure."""
    text = raw.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        print(f"[advisor] JSON parse failed, raw:\n{text[:500]}")
        return None

    # Validate required fields
    required = ["overall_signal", "action_items", "market_summary", "risk_assessment"]
    for field in required:
        if field not in parsed:
            print(f"[advisor] Missing required field: {field}")
            return None

    if parsed["overall_signal"] not in ("攻擊", "防守", "觀望"):
        print(f"[advisor] Invalid signal: {parsed['overall_signal']}")
        return None

    # Enforce max 3 action items
    parsed["action_items"] = parsed["action_items"][:3]

    return parsed


# ── advisor.json management ──


def update_advisor_json(advisory: dict) -> None:
    """Prepend new advisory to advisor.json, trim to MAX_ENTRIES."""
    existing = {"advisories": []}
    if ADVISOR_FILE.exists():
        try:
            with open(ADVISOR_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except (json.JSONDecodeError, Exception):
            pass

    advisories = existing.get("advisories", [])
    advisories.insert(0, advisory)
    advisories = advisories[:MAX_ENTRIES]

    with open(ADVISOR_FILE, "w", encoding="utf-8") as f:
        json.dump({"advisories": advisories}, f, ensure_ascii=False, indent=2)
    print(f"[advisor] Updated {ADVISOR_FILE} ({len(advisories)} entries)")


# ── Telegram ──


def build_telegram_message(advisory: dict) -> str:
    """Build short Telegram notification."""
    signal_emoji = {"攻擊": "🟢", "防守": "🔴", "觀望": "🟡"}.get(
        advisory["overall_signal"], "⚪"
    )
    phase = advisory.get("market_phase", "")
    date = advisory.get("date", "")

    lines = [f"{signal_emoji} {advisory['overall_signal']} — {phase} {date}"]
    for item in advisory.get("action_items", [])[:3]:
        lines.append(f"  {item['priority']}. {item['action']}")
    lines.append(
        f"\n📊 https://dabing823-spec.github.io/joy88-etf-dashboard/#/dashboard"
    )
    return "\n".join(lines)


# ── Main ──


def run(phase: str, dry_run: bool = False) -> dict:
    """Run the advisor agent. Returns the advisory dict."""
    print(f"[advisor] Starting {phase} analysis...")
    now = datetime.now(TW)

    # 1. Load data
    data = load_data_files()
    loaded_count = sum(1 for v in data.values() if v["loaded"])
    print(f"[advisor] Loaded {loaded_count}/{len(data)} data sources")

    # 2. Check freshness
    freshness = check_freshness(data)
    completeness = compute_data_completeness(freshness)
    print(f"[advisor] Data completeness: {completeness}")

    data_sources = {}
    data_gaps = []
    for name, info in freshness.items():
        data_sources[name] = {"date": info["date"], "fresh": info["fresh"]}
        if not info["fresh"]:
            data_gaps.append(name)

    # 3. Build prompt
    system_prompt, user_prompt = build_prompt(phase, data)
    print(
        f"[advisor] Prompt built — system: ~{len(system_prompt)//4} tokens, "
        f"user: ~{len(user_prompt)//4} tokens"
    )

    if dry_run:
        print("[advisor] Dry run — skipping API call")
        advisory = {
            "date": now.strftime("%Y-%m-%d"),
            "generated_at": now.isoformat(),
            "market_phase": "盤前" if phase == "pre-market" else "盤後",
            "overall_signal": "觀望",
            "data_completeness": completeness,
            "action_items": [
                {
                    "priority": 1,
                    "action": "（乾跑模式，無 API 呼叫）",
                    "reasoning": "dry-run",
                    "framework": "系統",
                }
            ],
            "market_summary": "乾跑模式，無實際分析。",
            "risk_assessment": "乾跑模式。",
            "telegram_short": "🟡 觀望 — 乾跑模式",
            "data_sources": data_sources,
            "data_gaps": data_gaps,
            "outcome": None,
        }
        update_advisor_json(advisory)
        return advisory

    # 4. Call Claude
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        print("[advisor] ANTHROPIC_API_KEY not set, skipping")
        return {"status": "skipped", "reason": "no_api_key"}

    retries = 2
    raw_response = None
    for attempt in range(1, retries + 1):
        try:
            raw_response = call_claude(system_prompt, user_prompt)
            break
        except Exception as e:
            print(f"[advisor] API call failed (attempt {attempt}): {e}")
            if attempt < retries:
                import time

                time.sleep(attempt * 2)

    if not raw_response:
        msg = "[advisor] API call failed after retries"
        print(msg)
        send_telegram_message(f"❌ AI Advisor {phase} 失敗 — API 無回應")
        return {"status": "error", "reason": "api_failed"}

    # 5. Parse response
    parsed = parse_response(raw_response)
    if not parsed:
        msg = "[advisor] Response parsing failed"
        print(msg)
        send_telegram_message(f"❌ AI Advisor {phase} 失敗 — 回應格式錯誤")
        return {"status": "error", "reason": "parse_failed"}

    # 6. Build advisory
    advisory = {
        "date": now.strftime("%Y-%m-%d"),
        "generated_at": now.isoformat(),
        "market_phase": "盤前" if phase == "pre-market" else "盤後",
        "overall_signal": parsed["overall_signal"],
        "data_completeness": completeness,
        "action_items": parsed["action_items"],
        "market_summary": parsed["market_summary"][:150],
        "risk_assessment": parsed["risk_assessment"][:200],
        "telegram_short": "",
        "data_sources": data_sources,
        "data_gaps": data_gaps,
        "outcome": None,
    }

    # 7. Update advisor.json
    update_advisor_json(advisory)

    # 8. Telegram
    tg_msg = build_telegram_message(advisory)
    advisory["telegram_short"] = tg_msg.split("\n")[0]
    send_telegram_message(tg_msg)

    print(f"[advisor] Done — signal: {advisory['overall_signal']}")
    return advisory


if __name__ == "__main__":
    if platform.system() == "Windows":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
    parser = argparse.ArgumentParser(description="AI Advisor Agent")
    parser.add_argument(
        "--phase",
        choices=["pre-market", "post-market"],
        required=True,
        help="Market phase",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Skip API call, output test data"
    )
    args = parser.parse_args()
    result = run(phase=args.phase, dry_run=args.dry_run)
    print(json.dumps(result, ensure_ascii=False, indent=2))
