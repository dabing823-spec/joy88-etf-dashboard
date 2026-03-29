#!/usr/bin/env python3
"""
Agent 4: 異動通知
==================
偵測重大異動並透過 LINE Notify 發送通知。

通知觸發條件：
  1. 新進場 / 出場任何股票
  2. 現金水位單日變動 > 1%
  3. 攻防模式切換
  4. 多 ETF 共識加碼（≥3 檔同時加碼）
  5. 高信心老墨信號（⭐⭐⭐）
"""

import os
import sys
import json
import requests
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import LINE_NOTIFY_TOKEN, FINANCE_DATA, LOG_DIR

LINE_API = "https://notify-api.line.me/api/notify"
STATE_FILE = Path(__file__).parent / ".alert_state.json"


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"  [{ts}] {msg}")


def send_line(message: str, token: str = None) -> bool:
    token = token or LINE_NOTIFY_TOKEN
    if not token:
        log("⚠️ LINE_NOTIFY_TOKEN 未設定，跳過通知")
        return False

    if len(message) > 990:
        message = message[:990] + "\n...(截斷)"

    try:
        resp = requests.post(
            LINE_API,
            headers={"Authorization": f"Bearer {token}"},
            data={"message": message},
            timeout=10
        )
        if resp.status_code == 200:
            log("✅ LINE 通知已發送")
            return True
        else:
            log(f"❌ LINE 通知失敗: {resp.status_code}")
            return False
    except Exception as e:
        log(f"❌ LINE 通知異常: {e}")
        return False


def load_prev_state() -> dict:
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_state(state: dict):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def analyze_alerts(signal_result: dict) -> list:
    """分析信號結果，產生通知清單"""
    alerts = []
    report = signal_result.get("report", {})
    date = signal_result.get("date", "")
    follow = report.get("follow_981a", {})
    cash = report.get("cash_mode", {})
    consensus = report.get("consensus", {})
    laomo = report.get("laomo_signals", [])

    prev_state = load_prev_state()

    # 1. 新進場
    if follow.get("new"):
        names = ", ".join(f"{s['code']}{s['name']}({s['weight']:.1f}%)" for s in follow["new"])
        alerts.append({
            "type": "NEW_POSITION",
            "priority": "HIGH",
            "msg": f"🆕 00981A 新進場: {names}"
        })

    # 2. 出場
    if follow.get("exited"):
        names = ", ".join(f"{s['code']}{s['name']}" for s in follow["exited"])
        alerts.append({
            "type": "EXIT_POSITION",
            "priority": "HIGH",
            "msg": f"🚪 00981A 出場: {names}"
        })

    # 3. 現金水位大變動
    prev_cash = prev_state.get("cash_now")
    cash_now = cash.get("cash_now", 0)
    if prev_cash is not None:
        cash_chg = cash_now - prev_cash
        if abs(cash_chg) >= 1.0:
            direction = "增加" if cash_chg > 0 else "減少"
            alerts.append({
                "type": "CASH_CHANGE",
                "priority": "MEDIUM",
                "msg": f"💰 現金水位{direction} {abs(cash_chg):.1f}% → {cash_now:.1f}%"
            })

    # 4. 攻防模式切換
    prev_mode = prev_state.get("mode")
    curr_mode = cash.get("mode", "")
    if prev_mode and prev_mode != curr_mode:
        alerts.append({
            "type": "MODE_CHANGE",
            "priority": "HIGH",
            "msg": f"📡 攻防模式切換: {prev_mode} → {curr_mode}"
        })

    # 5. 多 ETF 共識加碼
    consensus_list = consensus.get("consensus", [])
    strong_consensus = [c for c in consensus_list if c["n_etfs"] >= 3 and c.get("n_adding", 0) >= 2]
    if strong_consensus:
        names = ", ".join(f"{c['code']}{c['name']}({c['n_etfs']}檔)" for c in strong_consensus[:3])
        alerts.append({
            "type": "CONSENSUS_ADD",
            "priority": "MEDIUM",
            "msg": f"🤝 多ETF共識加碼: {names}"
        })

    # 6. 高信心老墨信號
    high_conf = [s for s in laomo if s.get("confidence") == "⭐⭐⭐"]
    if high_conf:
        names = ", ".join(f"{s['code']}{s['name']}({s['type']})" for s in high_conf)
        alerts.append({
            "type": "LAOMO_HIGH",
            "priority": "HIGH",
            "msg": f"🎯 高信心信號: {names}"
        })

    # 7. 大幅加碼（權重變化 > 1%）
    big_adds = [s for s in follow.get("added", []) if s.get("weight_chg", 0) > 1.0]
    if big_adds:
        names = ", ".join(f"{s['code']}{s['name']}({s['weight_chg']:+.1f}%)" for s in big_adds[:3])
        alerts.append({
            "type": "BIG_ADD",
            "priority": "MEDIUM",
            "msg": f"⬆️ 大幅加碼: {names}"
        })

    # 8. 大幅減碼
    big_reds = [s for s in follow.get("reduced", []) if s.get("weight_chg", 0) < -1.0]
    if big_reds:
        names = ", ".join(f"{s['code']}{s['name']}({s['weight_chg']:+.1f}%)" for s in big_reds[:3])
        alerts.append({
            "type": "BIG_REDUCE",
            "priority": "MEDIUM",
            "msg": f"⬇️ 大幅減碼: {names}"
        })

    # 更新狀態
    new_state = {
        "date": date,
        "cash_now": cash_now,
        "mode": curr_mode,
        "timestamp": datetime.now().isoformat()
    }
    save_state(new_state)

    return alerts


def format_line_message(date: str, alerts: list) -> str:
    """格式化 LINE 通知訊息"""
    lines = [f"\n🐺 Wolf Pack ETF 異動通知", f"📅 {date}", ""]

    high = [a for a in alerts if a["priority"] == "HIGH"]
    medium = [a for a in alerts if a["priority"] == "MEDIUM"]

    if high:
        lines.append("🔴 重要異動:")
        for a in high:
            lines.append(f"  {a['msg']}")
        lines.append("")

    if medium:
        lines.append("🟡 注意事項:")
        for a in medium:
            lines.append(f"  {a['msg']}")

    return "\n".join(lines)


def run(signal_result: dict = None) -> dict:
    """執行異動檢查並發送通知"""

    # 如果沒傳入 signal_result，嘗試從檔案讀取
    if signal_result is None:
        json_path = FINANCE_DATA / "etf_signal_data.json"
        if json_path.exists():
            log(f"📂 從 {json_path} 讀取信號資料...")
            with open(json_path, "r", encoding="utf-8") as f:
                signal_result = {"report": json.load(f), "date": json.load(open(json_path))["date"], "status": "OK"}
            # Re-read properly
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            signal_result = {"report": data, "date": data.get("date", ""), "status": "OK"}
        else:
            log("❌ 找不到信號資料，請先執行 signal_agent")
            return {"status": "FAIL", "error": "No signal data"}

    if signal_result.get("status") != "OK":
        log("⚠️ 信號分析狀態非 OK，跳過通知")
        return {"status": "SKIP", "reason": "Signal not OK"}

    log("🔔 分析異動通知...")
    alerts = analyze_alerts(signal_result)

    if not alerts:
        log("ℹ️ 無重大異動")
        return {"status": "OK", "alerts": [], "sent": False}

    log(f"⚠️ 發現 {len(alerts)} 項異動")
    for a in alerts:
        icon = "🔴" if a["priority"] == "HIGH" else "🟡"
        log(f"  {icon} [{a['type']}] {a['msg']}")

    # 發送 LINE 通知
    date = signal_result.get("date", "")
    message = format_line_message(date, alerts)
    sent = send_line(message)

    return {
        "status": "OK",
        "date": date,
        "alerts": alerts,
        "n_alerts": len(alerts),
        "sent": sent,
        "message_preview": message[:200]
    }


if __name__ == "__main__":
    print("🐺 Wolf Pack — 異動通知 Agent")
    result = run()
    print(f"\n狀態: {result['status']}")
    if result.get("n_alerts"):
        print(f"異動數: {result['n_alerts']}, 已發送: {result.get('sent')}")
