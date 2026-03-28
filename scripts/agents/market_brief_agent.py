#!/usr/bin/env python3
"""
Market Brief Agent — 每日盤前新聞分析 (混合模式)
=================================================
Sonnet: 抓資料 + 篩選新聞
Opus:   三層分析

流程:
  1. Yahoo Finance 抓市場數據 (VIX, 指數, 重點股)
  2. Google News RSS 抓新聞標題
  3. Claude Sonnet 篩選最重要 1-3 則
  4. Claude Opus 做三層分析
  5. 寫入 data/news_analysis.json
  6. Telegram 推播 + Gmail 草稿 (optional)

用法:
  python market_brief_agent.py                  # 完整執行
  python market_brief_agent.py --dry-run        # 只抓資料，不呼叫 API
  python market_brief_agent.py --no-telegram    # 跳過 Telegram
  python market_brief_agent.py --force          # 強制重跑（忽略當日快取）
"""

import argparse
import json
import os
import re
import sys
import io
import platform
import urllib.request
import urllib.parse
import ssl
from datetime import datetime, timedelta
from pathlib import Path
from xml.etree import ElementTree

if platform.system() == "Windows":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

sys.path.insert(0, str(Path(__file__).parent))
from config import DATA_DIR, LOG_DIR

OUTPUT_FILE = DATA_DIR / "news_analysis.json"

# ── 持倉設定（寫死） ──
POSITIONS = {
    "core_long": ["台積電 (2330)", "台達電 (2308)"],
    "satellite_long": [
        "群聯 (8299)", "力積電 (6770)", "南亞科 (2408)", "華邦電 (2344)",
        "欣興 (3037)",
    ],
    "short": ["宏碁 (2353)", "微星 (2377)"],
}

# ── Yahoo Finance 報價 ──
YAHOO_SYMBOLS = {
    "S&P 500": "^GSPC",
    "Nasdaq": "^IXIC",
    "道瓊": "^DJI",
    "費半 SOX": "^SOX",
    "VIX": "^VIX",
    "TSM (台積電 ADR)": "TSM",
    "NVDA": "NVDA",
    "MU (美光)": "MU",
    "AVGO (Broadcom)": "AVGO",
    "AMD": "AMD",
    "DXY": "DX-Y.NYB",
    "10Y 殖利率": "^TNX",
    "Gold": "GC=F",
}

# ── Google News RSS 查詢 ──
# 台灣財經（中文）
NEWS_QUERIES_TW = [
    "台股 半導體 盤後",
    "Fed FOMC 利率 降息",
    "台積電 AI 法說",
    "美股 盤後 財報 earnings",
    "CPI 通膨 經濟數據 PMI",
    "地緣政治 關稅 制裁",
]

# 國際財經（英文，抓彭博/路透/CNBC 等）
NEWS_QUERIES_EN = [
    "stock market earnings after hours",
    "Bloomberg Federal Reserve interest rate",
    "TSMC semiconductor AI",
    "S&P 500 Nasdaq market today",
    "geopolitical tariff trade war",
]

# ── VIX 燈號規則 ──
VIX_THRESHOLDS = {
    "red_level": 25,
    "yellow_level": 20.5,
    "yellow_daily_spike": 15,  # %
    "yellow_5d_spike": 25,     # %
    "red_daily_spike": 30,     # %
    "blue_pullback": 20,       # % from high
}


def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] 📰 {msg}", file=sys.stderr)


# ============================================================================
# Step 1: 市場數據
# ============================================================================
def fetch_yahoo_quote(symbol: str) -> dict:
    """Fetch quote from Yahoo Finance v8 API."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        f"?range=6d&interval=1d"
    )
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            data = json.loads(resp.read().decode())
        result = data["chart"]["result"][0]
        meta = result["meta"]
        closes = result["indicators"]["quote"][0]["close"]
        # Filter None values
        closes = [c for c in closes if c is not None]
        if len(closes) < 2:
            return {"price": closes[-1] if closes else 0, "prev": 0, "change_pct": 0}
        price = closes[-1]
        prev = closes[-2]
        change_pct = ((price - prev) / prev * 100) if prev else 0
        return {
            "price": round(price, 2),
            "prev": round(prev, 2),
            "change_pct": round(change_pct, 2),
            "closes": [round(c, 2) for c in closes],
        }
    except Exception as e:
        log(f"  Yahoo 抓取失敗 {symbol}: {e}")
        return {"price": 0, "prev": 0, "change_pct": 0, "closes": []}


def fetch_market_data() -> dict:
    """Fetch all market data from Yahoo Finance."""
    log("Step 1: 抓取市場數據...")
    data = {}
    for name, symbol in YAHOO_SYMBOLS.items():
        quote = fetch_yahoo_quote(symbol)
        data[name] = quote
        pct = quote["change_pct"]
        sign = "+" if pct >= 0 else ""
        log(f"  {name}: {quote['price']} ({sign}{pct}%)")
    return data


def calculate_vix_signal(market_data: dict) -> dict:
    """Calculate VIX traffic light based on position-tracker rules."""
    vix = market_data.get("VIX", {})
    price = vix.get("price", 0)
    prev = vix.get("prev", 0)
    closes = vix.get("closes", [])

    daily_chg = ((price - prev) / prev * 100) if prev else 0

    # 5-day change
    five_day_chg = 0
    if len(closes) >= 6:
        five_day_ago = closes[-6]
        if five_day_ago:
            five_day_chg = ((price - five_day_ago) / five_day_ago * 100)
    elif len(closes) >= 2:
        five_day_ago = closes[0]
        if five_day_ago:
            five_day_chg = ((price - five_day_ago) / five_day_ago * 100)

    # Recent high (for blue light check)
    recent_high = max(closes) if closes else price
    pullback_pct = ((recent_high - price) / recent_high * 100) if recent_high else 0

    # Traffic light determination
    signal = "green"
    reason = "VIX 正常範圍"
    action = "正常操作"

    # Red check
    if (price > VIX_THRESHOLDS["red_level"] and price > prev) or \
       daily_chg > VIX_THRESHOLDS["red_daily_spike"]:
        signal = "red"
        triggers = []
        if price > VIX_THRESHOLDS["red_level"] and price > prev:
            triggers.append(f"VIX {price:.1f} > 25 且仍在上升")
        if daily_chg > VIX_THRESHOLDS["red_daily_spike"]:
            triggers.append(f"單日漲幅 {daily_chg:.1f}% > 30%")
        reason = "；".join(triggers)
        action = "維持現有倉位，不做任何操作"

    # Yellow check
    elif price > VIX_THRESHOLDS["yellow_level"] or \
         daily_chg > VIX_THRESHOLDS["yellow_daily_spike"] or \
         five_day_chg > VIX_THRESHOLDS["yellow_5d_spike"]:
        signal = "yellow"
        triggers = []
        if price > VIX_THRESHOLDS["yellow_level"]:
            triggers.append(f"VIX {price:.1f} > 20.5")
        if daily_chg > VIX_THRESHOLDS["yellow_daily_spike"]:
            triggers.append(f"單日漲幅 {daily_chg:.1f}% > 15%")
        if five_day_chg > VIX_THRESHOLDS["yellow_5d_spike"]:
            triggers.append(f"5日累積 {five_day_chg:.1f}% > 25%")
        reason = "；".join(triggers)
        action = "主動降低 40% 曝險，減碼衛星倉"

    # Blue check
    elif pullback_pct > VIX_THRESHOLDS["blue_pullback"] and \
         len(closes) >= 3 and closes[-1] < closes[-2] < closes[-3]:
        signal = "blue"
        reason = f"VIX 從高點回落 {pullback_pct:.1f}%，連續下降"
        action = "開始加回核心倉"

    return {
        "signal": signal,
        "vix_spot": round(price, 2),
        "vix_prev": round(prev, 2),
        "daily_change_pct": round(daily_chg, 1),
        "five_day_change_pct": round(five_day_chg, 1),
        "reason": reason,
        "action": action,
    }


# ============================================================================
# Step 2: 新聞抓取
# ============================================================================
def _parse_pub_date(pub_date_str: str) -> datetime | None:
    """Parse RSS pubDate string to datetime."""
    formats = [
        "%a, %d %b %Y %H:%M:%S %Z",
        "%a, %d %b %Y %H:%M:%S %z",
        "%Y-%m-%dT%H:%M:%S%z",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(pub_date_str.strip(), fmt)
        except (ValueError, TypeError):
            continue
    # Try replacing timezone abbreviation
    cleaned = re.sub(r'\s+GMT$', ' +0000', pub_date_str.strip())
    try:
        return datetime.strptime(cleaned, "%a, %d %b %Y %H:%M:%S %z")
    except (ValueError, TypeError):
        return None


def fetch_google_news(query: str, lang: str = "zh-TW", max_items: int = 8) -> list[dict]:
    """Fetch news from Google News RSS with when:1d for freshness."""
    # Append when:1d to restrict to last 24 hours
    q_with_time = f"{query} when:1d"
    encoded = urllib.parse.quote(q_with_time)
    if lang == "en":
        url = f"https://news.google.com/rss/search?q={encoded}&hl=en&gl=US&ceid=US:en"
    else:
        url = f"https://news.google.com/rss/search?q={encoded}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    req = urllib.request.Request(url, headers=headers)
    ctx = ssl.create_default_context()
    results = []
    cutoff = datetime.now() - timedelta(hours=24)
    try:
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            xml_data = resp.read().decode("utf-8")
        root = ElementTree.fromstring(xml_data)
        for item in root.findall(".//item")[:max_items]:
            title = item.findtext("title", "")
            pub_date = item.findtext("pubDate", "")
            source = item.findtext("source", "")
            link = item.findtext("link", "")
            # Filter by freshness
            parsed_date = _parse_pub_date(pub_date)
            if parsed_date:
                # Convert to naive for comparison
                naive = parsed_date.replace(tzinfo=None) if parsed_date.tzinfo else parsed_date
                if naive < cutoff:
                    continue
            # Clean title (remove source suffix like " - 鉅亨網")
            clean_title = re.sub(r'\s*-\s*[^-]+$', '', title).strip()
            results.append({
                "title": clean_title,
                "source": source,
                "pub_date": pub_date,
                "link": link,
                "lang": lang,
            })
    except Exception as e:
        log(f"  Google News 抓取失敗 [{query}]: {e}")
    return results


def fetch_all_news() -> list[dict]:
    """Fetch news from TW + EN queries, deduplicate, sort by freshness."""
    log("Step 2: 抓取新聞...")
    all_news = []
    seen_titles = set()

    def _dedup_key(title: str) -> str:
        """Normalize title for deduplication."""
        return re.sub(r'[\s\W]+', '', title)[:20].lower()

    # Taiwan financial news
    for query in NEWS_QUERIES_TW:
        items = fetch_google_news(query, lang="zh-TW", max_items=8)
        for item in items:
            key = _dedup_key(item["title"])
            if key not in seen_titles:
                seen_titles.add(key)
                all_news.append(item)
        log(f"  [TW] [{query}]: {len(items)} 則")

    # International financial news (Bloomberg, Reuters, CNBC, etc.)
    for query in NEWS_QUERIES_EN:
        items = fetch_google_news(query, lang="en", max_items=8)
        for item in items:
            key = _dedup_key(item["title"])
            if key not in seen_titles:
                seen_titles.add(key)
                all_news.append(item)
        log(f"  [EN] [{query}]: {len(items)} 則")

    # Sort by pub_date (newest first)
    def _sort_key(item):
        d = _parse_pub_date(item.get("pub_date", ""))
        return d if d else datetime.min
    all_news.sort(key=_sort_key, reverse=True)

    log(f"  合計: {len(all_news)} 則（去重後，24h 內）")
    return all_news


# ============================================================================
# Step 3: Claude API
# ============================================================================
def get_anthropic_client():
    """Initialize Anthropic client."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY 未設定")
    from anthropic import Anthropic
    return Anthropic(api_key=api_key)


def build_market_summary(market_data: dict, vix_signal: dict) -> str:
    """Build a text summary of market data for the prompt."""
    lines = ["## 美股收盤"]
    for name in ["S&P 500", "Nasdaq", "道瓊", "費半 SOX"]:
        d = market_data.get(name, {})
        lines.append(f"- {name}: {d.get('price', '-')} ({d.get('change_pct', 0):+.2f}%)")

    lines.append("\n## 重點個股")
    for name in ["TSM (台積電 ADR)", "NVDA", "MU (美光)", "AVGO (Broadcom)", "AMD"]:
        d = market_data.get(name, {})
        lines.append(f"- {name}: {d.get('price', '-')} ({d.get('change_pct', 0):+.2f}%)")

    lines.append(f"\n## VIX 風控燈號")
    emoji = {"green": "🟢", "yellow": "🟡", "red": "🔴", "blue": "🔵"}
    lines.append(f"- 燈號: {emoji.get(vix_signal['signal'], '⚪')} {vix_signal['signal'].upper()}")
    lines.append(f"- VIX 現貨: {vix_signal['vix_spot']}")
    lines.append(f"- 日漲幅: {vix_signal['daily_change_pct']:+.1f}%")
    lines.append(f"- 5日累積: {vix_signal['five_day_change_pct']:+.1f}%")
    lines.append(f"- 原因: {vix_signal['reason']}")
    lines.append(f"- 建議: {vix_signal['action']}")

    lines.append(f"\n## 其他指標")
    for name in ["DXY", "10Y 殖利率", "Gold"]:
        d = market_data.get(name, {})
        lines.append(f"- {name}: {d.get('price', '-')} ({d.get('change_pct', 0):+.2f}%)")

    return "\n".join(lines)


def build_positions_text() -> str:
    """Build positions context text."""
    lines = ["## 目前持倉"]
    lines.append(f"- 核心做多: {', '.join(POSITIONS['core_long'])}")
    lines.append(f"- 衛星做多: {', '.join(POSITIONS['satellite_long'])}")
    lines.append(f"- 空方部位: {', '.join(POSITIONS['short'])}")
    return "\n".join(lines)


def step3_filter_news(client, news_list: list[dict], market_summary: str) -> list[dict]:
    """Use Sonnet to filter and rank the most important news."""
    log("Step 3: Sonnet 篩選新聞...")

    news_text = "\n".join(
        f"{i+1}. [{n['source']}] {n['title']}"
        for i, n in enumerate(news_list)
    )

    resp = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": (
                f"以下是今日市場數據和新聞列表（含中文和英文來源）。\n\n"
                f"{market_summary}\n\n"
                f"{build_positions_text()}\n\n"
                f"## 新聞列表\n{news_text}\n\n"
                f"請從中挑選對台股期貨/ETF操作最有影響的 2-4 則新聞。\n"
                f"優先選擇：\n"
                f"1. 彭博(Bloomberg)、路透(Reuters)、CNBC 等權威國際來源\n"
                f"2. 盤後財報、earnings 相關\n"
                f"3. Fed/央行政策、重大經濟數據\n"
                f"4. 地緣政治、關稅等系統性風險\n\n"
                f"回傳 JSON 陣列，每則包含 index (原始編號) 和 reason (一句話說明為何重要)。\n"
                '只回傳 JSON，不要其他文字。範例: [{"index": 3, "reason": "..."}]'
            ),
        }],
    )

    raw = resp.content[0].text.strip()
    try:
        # Try to parse JSON
        start = raw.find('[')
        end = raw.rfind(']')
        if start != -1 and end > start:
            selected = json.loads(raw[start:end + 1])
        else:
            selected = json.loads(raw)
    except json.JSONDecodeError:
        log(f"  Sonnet JSON 解析失敗，使用前 2 則")
        selected = [{"index": 1, "reason": "預設選取"}, {"index": 2, "reason": "預設選取"}]

    # Map back to news items
    result = []
    for s in selected[:3]:
        idx = s.get("index", 1) - 1
        if 0 <= idx < len(news_list):
            item = news_list[idx].copy()
            item["selection_reason"] = s.get("reason", "")
            result.append(item)

    log(f"  選出 {len(result)} 則: {[r['title'][:25]+'...' for r in result]}")
    return result


def step4_analyze_news(
    client, selected_news: list[dict], market_summary: str, vix_signal: dict
) -> tuple[list[dict], dict]:
    """Use Opus for 3-layer analysis on selected news + macro."""
    log("Step 4: Opus 三層分析...")

    news_text = "\n\n".join(
        f"### 新聞 {i+1}: {n['title']}\n來源: {n.get('source', '未知')}\n重要性: {n.get('selection_reason', '')}"
        for i, n in enumerate(selected_news)
    )

    today = datetime.now().strftime("%Y-%m-%d")

    prompt = (
        f"今天是 {today}。你是巨人傑三層分析框架的台股交易助理。\n\n"
        f"{market_summary}\n\n"
        f"{build_positions_text()}\n\n"
        f"## 今日重要新聞\n{news_text}\n\n"
        f"請執行兩個任務：\n\n"
        f"### 任務 A: 對每則新聞做三層分析\n"
        f"### 任務 B: 對整體宏觀環境做三層分析\n\n"
        f"嚴格區分「事實」與「推論」。\n\n"
        f"回傳以下 JSON 格式（不要有其他文字）：\n"
        f'{{\n'
        f'  "news_analyses": [\n'
        f'    {{\n'
        f'      "headline": "新聞標題",\n'
        f'      "category": "央行政策|經濟數據|財報發布|地緣政治|半導體|市場動態",\n'
        f'      "layer1": {{"event": "...", "data": "...", "market_reaction": "...", "timeline": "..."}},\n'
        f'      "layer2": {{"beneficiaries": ["..."], "victims": ["..."], "pricing_status": "...", "real_motive": "...", "market_blind_spots": "..."}},\n'
        f'      "layer3": {{"position_impact": "...", "expected_value": "...", "timing": "...", "risk_assessment": "...", "action_plan": "..."}}\n'
        f'    }}\n'
        f'  ],\n'
        f'  "macro_analysis": {{\n'
        f'    "layer1": {{"event": "...", "data": "...", "market_reaction": "...", "timeline": "..."}},\n'
        f'    "layer2": {{"beneficiaries": ["..."], "victims": ["..."], "pricing_status": "...", "real_motive": "...", "market_blind_spots": "..."}},\n'
        f'    "layer3": {{"position_impact": "...", "expected_value": "...", "timing": "...", "risk_assessment": "...", "action_plan": "..."}}\n'
        f'  }}\n'
        f'}}'
    )

    resp = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = resp.content[0].text.strip()
    log(f"  Opus 回應: {len(raw)} 字, input={resp.usage.input_tokens}, output={resp.usage.output_tokens}")

    # Parse response
    parsed = _parse_opus_response(raw)

    # Build news_analyses entries
    category_colors = {
        "央行政策": "orange", "經濟數據": "blue", "財報發布": "purple",
        "地緣政治": "red", "半導體": "cyan", "市場動態": "blue",
    }
    news_entries = []
    for i, analysis in enumerate(parsed.get("news_analyses", [])):
        cat = analysis.get("category", "市場動態")
        src = selected_news[i] if i < len(selected_news) else {}
        news_entries.append({
            "id": f"{today.replace('-', '')}_{i+1:03d}",
            "date": today,
            "headline": analysis.get("headline", src.get("title", "")),
            "category": cat,
            "category_color": category_colors.get(cat, "blue"),
            "source": src.get("source", ""),
            "link": src.get("link", ""),
            "layer1": analysis.get("layer1", {}),
            "layer2": analysis.get("layer2", {}),
            "layer3": analysis.get("layer3", {}),
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        })

    # Build macro_analysis
    macro = parsed.get("macro_analysis", {})
    vix_emoji = {"green": "🟢", "yellow": "🟡", "red": "🔴", "blue": "🔵"}
    macro_entry = {
        "date": today,
        "risk_context": f"VIX {vix_emoji.get(vix_signal['signal'], '⚪')} {vix_signal['vix_spot']} | {vix_signal['reason']}",
        "layer1": macro.get("layer1", {}),
        "layer2": macro.get("layer2", {}),
        "layer3": macro.get("layer3", {}),
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }

    return news_entries, macro_entry


def _parse_opus_response(raw: str) -> dict:
    """Parse Opus response with fallback."""
    # 1. Direct JSON
    try:
        data = json.loads(raw)
        if "news_analyses" in data:
            return data
    except (json.JSONDecodeError, TypeError):
        pass

    # 2. Extract ```json block
    m = re.search(r'```(?:json)?\s*(\{[\s\S]*\})\s*```', raw)
    if m:
        try:
            data = json.loads(m.group(1))
            if "news_analyses" in data:
                return data
        except json.JSONDecodeError:
            pass

    # 3. Find first { to last }
    start = raw.find('{')
    end = raw.rfind('}')
    if start != -1 and end > start:
        try:
            data = json.loads(raw[start:end + 1])
            if "news_analyses" in data:
                return data
        except json.JSONDecodeError:
            pass

    # 4. Fallback
    log("  Opus JSON 解析失敗，使用 fallback")
    empty_layers = {
        "layer1": {"event": raw[:300], "data": "-", "market_reaction": "-", "timeline": "-"},
        "layer2": {"beneficiaries": [], "victims": [], "pricing_status": "-", "real_motive": "-", "market_blind_spots": "-"},
        "layer3": {"position_impact": "-", "expected_value": "-", "timing": "-", "risk_assessment": "-", "action_plan": "-"},
    }
    return {"news_analyses": [{"headline": "分析", "category": "市場動態", **empty_layers}], "macro_analysis": empty_layers}


# ============================================================================
# Step 5: 輸出
# ============================================================================
def save_output(news_entries: list[dict], macro_entry: dict):
    """Save to news_analysis.json."""
    existing = {"version": 1, "news_analyses": [], "macro_analysis": None}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except (json.JSONDecodeError, KeyError):
            pass

    # Prepend new news, deduplicate by headline, keep latest 30
    seen = {e.get("headline", "") for e in news_entries}
    old = [e for e in existing.get("news_analyses", []) if e.get("headline", "") not in seen]
    existing["news_analyses"] = (news_entries + old)[:30]

    # Update macro
    existing["macro_analysis"] = macro_entry
    existing["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    existing["notebook"] = "Claude API (Sonnet+Opus)"

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

    log(f"Step 5: 寫入 {OUTPUT_FILE}")


# ============================================================================
# Step 6: Telegram 推播
# ============================================================================
def send_telegram(
    market_data: dict, vix_signal: dict,
    news_entries: list[dict], macro_entry: dict,
):
    """Send brief to Telegram."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")
    if not token or not chat_id:
        log("Step 6: Telegram token/chat_id 未設定，跳過")
        return False

    today = datetime.now().strftime("%Y-%m-%d")
    emoji = {"green": "🟢", "yellow": "🟡", "red": "🔴", "blue": "🔵"}

    # Build message
    lines = [f"📊 盤前簡報 {today}", ""]

    # Indices
    lines.append("━━ 美股 ━━")
    for name, key in [("S&P", "S&P 500"), ("Nas", "Nasdaq"), ("DJ", "道瓊"), ("SOX", "費半 SOX")]:
        d = market_data.get(key, {})
        lines.append(f"{name}: {d.get('price', '-')} ({d.get('change_pct', 0):+.1f}%)")

    # Key stocks
    lines.append("\n━━ 焦點股 ━━")
    stocks = []
    for name, key in [("TSM", "TSM (台積電 ADR)"), ("NVDA", "NVDA"), ("MU", "MU (美光)")]:
        d = market_data.get(key, {})
        stocks.append(f"{name} {d.get('change_pct', 0):+.1f}%")
    lines.append(" | ".join(stocks))
    stocks2 = []
    for name, key in [("AVGO", "AVGO (Broadcom)"), ("AMD", "AMD")]:
        d = market_data.get(key, {})
        stocks2.append(f"{name} {d.get('change_pct', 0):+.1f}%")
    lines.append(" | ".join(stocks2))

    # VIX
    sig = vix_signal
    lines.append(f"\n━━ VIX {emoji.get(sig['signal'], '⚪')} ━━")
    lines.append(f"現貨 {sig['vix_spot']} | 日 {sig['daily_change_pct']:+.1f}% | 5日 {sig['five_day_change_pct']:+.1f}%")
    lines.append(f"→ {sig['action']}")

    # News
    lines.append("\n━━ 重點解讀 ━━")
    for entry in news_entries[:2]:
        lines.append(f"【{entry.get('headline', '')[:40]}】")
        l1 = entry.get("layer1", {})
        l3 = entry.get("layer3", {})
        lines.append(f"事實：{l1.get('event', '-')[:60]}")
        lines.append(f"操作：{l3.get('action_plan', '-')[:60]}")
        lines.append("")

    msg = "\n".join(lines)

    # Send (split if needed)
    chunks = [msg[i:i+4000] for i in range(0, len(msg), 4000)]
    for chunk in chunks:
        data = json.dumps({
            "chat_id": chat_id,
            "text": chunk,
            "parse_mode": "Markdown",
        }).encode()
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read().decode())
                if result.get("ok"):
                    log("Step 6: Telegram 推播成功")
                else:
                    log(f"Step 6: Telegram 推播失敗: {result}")
        except Exception as e:
            log(f"Step 6: Telegram 推播錯誤: {e}")
            return False
    return True


# ============================================================================
# Main
# ============================================================================
def run(dry_run: bool = False, no_telegram: bool = False, force: bool = False):
    """Main pipeline."""
    today = datetime.now().strftime("%Y-%m-%d")

    # Check if already ran today
    if not force and OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)
            if existing.get("macro_analysis", {}).get("date") == today:
                log(f"今日 ({today}) 已有分析，跳過（用 --force 覆蓋）")
                return
        except (json.JSONDecodeError, KeyError):
            pass

    # Step 1: Market data
    market_data = fetch_market_data()
    vix_signal = calculate_vix_signal(market_data)
    market_summary = build_market_summary(market_data, vix_signal)

    # Step 2: News
    news_list = fetch_all_news()

    if dry_run:
        log("=== DRY RUN ===")
        log(f"市場數據: {len(market_data)} 項")
        log(f"VIX 燈號: {vix_signal['signal']} ({vix_signal['reason']})")
        log(f"新聞: {len(news_list)} 則")
        for n in news_list[:5]:
            log(f"  - {n['title'][:60]}")
        return

    if not news_list:
        log("沒有抓到新聞，跳過分析")
        return

    # Step 3: Sonnet filters
    client = get_anthropic_client()
    selected = step3_filter_news(client, news_list, market_summary)

    if not selected:
        log("Sonnet 沒有選出新聞，跳過")
        return

    # Step 4: Opus analyzes
    news_entries, macro_entry = step4_analyze_news(
        client, selected, market_summary, vix_signal
    )

    # Step 5: Save
    save_output(news_entries, macro_entry)

    # Step 6: Telegram
    if not no_telegram:
        send_telegram(market_data, vix_signal, news_entries, macro_entry)

    log("Pipeline 完成")


def main():
    parser = argparse.ArgumentParser(description="Market Brief Agent — 盤前新聞分析")
    parser.add_argument("--dry-run", action="store_true", help="只抓資料，不呼叫 Claude API")
    parser.add_argument("--no-telegram", action="store_true", help="跳過 Telegram 推播")
    parser.add_argument("--force", action="store_true", help="強制重跑（忽略當日快取）")
    args = parser.parse_args()

    run(dry_run=args.dry_run, no_telegram=args.no_telegram, force=args.force)


if __name__ == "__main__":
    main()
