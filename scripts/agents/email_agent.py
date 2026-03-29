#!/usr/bin/env python3
"""
Email Agent — 每日風險訊號摘要推播
====================================
讀取 strategy.json，產生 HTML email 摘要，
透過 Resend API 寄出給訂閱者。

環境變數：
  RESEND_API_KEY   — Resend API key
  EMAIL_TO         — 收件者 email（逗號分隔多人）
  EMAIL_FROM       — 寄件者 email（預設 onboarding@resend.dev）

用法：
  python email_agent.py                    # 讀取 strategy.json 並寄出
  python email_agent.py --dry-run          # 只產生 HTML，不寄出
  python email_agent.py --preview email.html  # 輸出 HTML 到檔案
"""

import sys
import os
import json
import time
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))
from config import DATA_DIR

STRATEGY_PATH = DATA_DIR / "strategy.json"

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
EMAIL_TO = os.environ.get("EMAIL_TO", "")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "JOY88 ETF <onboarding@resend.dev>")


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"  [{ts}] [EmailAgent] {msg}")


def load_strategy():
    """載入 strategy.json"""
    with open(STRATEGY_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_email_html(data):
    """產生 email HTML 內容"""
    rs = data.get('risk_signals', {})
    s0050 = data.get('strategy_0050', {})
    agent_status = data.get('agent_status', {})
    report_date = data.get('report_date', datetime.now().strftime('%Y-%m-%d'))

    score = rs.get('score', 0)
    level = rs.get('level', 'unknown')
    level_map = {'high': '高度警戒', 'medium': '中度警戒', 'low': '風險偏低'}
    level_text = level_map.get(level, level)
    score_color = '#ff4757' if score >= 7 else '#ffa502' if score >= 4 else '#00c48c'

    # Signal rows
    signal_rows = ''
    for s in rs.get('signals', []):
        sig_color = '#ff4757' if s['signal'] == 'red' else '#ffa502' if s['signal'] == 'yellow' else '#00c48c'
        phase_text = {'accelerating': 'Accel', 'decelerating': 'Decel', 'stable': '-'}.get(s.get('phase', ''), '-')
        val = s.get('value', '-')
        if isinstance(val, float):
            val = f'{val:.2f}'
        signal_rows += f'''
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2e3d;color:{sig_color};font-weight:600;">{s['name']}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2e3d;text-align:right;">{val}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2e3d;text-align:right;">{s.get('slope_20d', '-')}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2e3d;text-align:center;">{phase_text}</td>
        </tr>'''

    # 0050 section
    pot_in = s0050.get('potential_in', [])
    pot_out = s0050.get('potential_out', [])
    s0050_text = f'{len(pot_in)} potential in, {len(pot_out)} potential out'
    if pot_in:
        names_in = ', '.join(f"{s['name']}(#{s['rank']})" for s in pot_in[:5])
        s0050_text += f'<br>In: {names_in}'
    if pot_out:
        names_out = ', '.join(f"{s['name']}(#{s['rank']})" for s in pot_out[:5])
        s0050_text += f'<br>Out: {names_out}'

    # Agent status
    agent_text = ''
    for name, info in agent_status.items():
        status = info.get('status', '?')
        dur = info.get('duration_ms', 0)
        dur_str = f'{dur/1000:.1f}s' if dur >= 1000 else f'{dur}ms'
        icon = 'OK' if status == 'OK' else 'WARN' if status == 'WARN' else 'ERR'
        agent_text += f'{name}: {icon} ({dur_str}) | '
    agent_text = agent_text.rstrip(' | ')

    # Validator warnings
    v_warnings = agent_status.get('validator_agent', {}).get('warnings', [])
    warning_html = ''
    if v_warnings:
        warning_items = ''.join(f'<li style="margin-bottom:4px;color:#ffa502;">{w["msg"]}</li>' for w in v_warnings)
        warning_html = f'<div style="margin-top:12px;padding:8px 12px;background:#1a1d28;border-radius:6px;border-left:3px solid #ffa502;"><ul style="margin:0;padding-left:16px;font-size:13px;">{warning_items}</ul></div>'

    html = f'''<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="text-align:center;padding:20px 0;border-bottom:1px solid #2a2e3d;">
        <div style="font-size:24px;font-weight:700;color:#e4e6eb;">JOY88 ETF Dashboard</div>
        <div style="font-size:14px;color:#8b8fa3;margin-top:4px;">Daily Risk Signal Report - {report_date}</div>
    </div>

    <!-- Score -->
    <div style="text-align:center;padding:24px 0;">
        <div style="display:inline-block;width:80px;height:80px;border-radius:50%;border:4px solid {score_color};line-height:80px;font-size:32px;font-weight:700;color:{score_color};">{score}</div>
        <div style="font-size:20px;font-weight:600;color:{score_color};margin-top:8px;">{level_text}</div>
        <div style="font-size:13px;color:#8b8fa3;margin-top:4px;">
            Red: {rs.get('n_red', 0)} | Yellow: {rs.get('n_yellow', 0)} | Green: {rs.get('n_green', 0)}
        </div>
    </div>

    <!-- Signals Table -->
    <div style="background:#1a1d28;border-radius:8px;border:1px solid #2a2e3d;overflow:hidden;margin-bottom:16px;">
        <div style="padding:12px 16px;border-bottom:1px solid #2a2e3d;font-weight:600;color:#e4e6eb;font-size:14px;">Risk Signals</div>
        <table style="width:100%;border-collapse:collapse;color:#e4e6eb;font-size:13px;">
            <thead>
                <tr style="background:#22263a;">
                    <th style="padding:8px 12px;text-align:left;color:#8b8fa3;font-size:12px;">Signal</th>
                    <th style="padding:8px 12px;text-align:right;color:#8b8fa3;font-size:12px;">Value</th>
                    <th style="padding:8px 12px;text-align:right;color:#8b8fa3;font-size:12px;">Slope 20d</th>
                    <th style="padding:8px 12px;text-align:center;color:#8b8fa3;font-size:12px;">Phase</th>
                </tr>
            </thead>
            <tbody>{signal_rows}</tbody>
        </table>
    </div>

    <!-- 0050 Strategy -->
    <div style="background:#1a1d28;border-radius:8px;border:1px solid #2a2e3d;padding:12px 16px;margin-bottom:16px;">
        <div style="font-weight:600;color:#e4e6eb;font-size:14px;margin-bottom:8px;">0050 Strategy</div>
        <div style="font-size:13px;color:#a0a3b5;line-height:1.6;">{s0050_text}</div>
    </div>

    <!-- Agent Status -->
    <div style="background:#1a1d28;border-radius:8px;border:1px solid #2a2e3d;padding:12px 16px;margin-bottom:16px;">
        <div style="font-weight:600;color:#e4e6eb;font-size:14px;margin-bottom:8px;">Agent Pipeline</div>
        <div style="font-size:12px;color:#8b8fa3;">{agent_text}</div>
        {warning_html}
    </div>

    <!-- CTA -->
    <div style="text-align:center;padding:20px 0;">
        <a href="https://dabing823-spec.github.io/joy88-etf-dashboard/" style="display:inline-block;padding:12px 32px;background:#4f8ef7;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Open Dashboard</a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px 0;border-top:1px solid #2a2e3d;font-size:11px;color:#8b8fa3;">
        JOY88 ETF Dashboard. Not investment advice.<br>
        Data: TWSE, TAIFEX, Yahoo Finance, CNN.
    </div>

</div>
</body>
</html>'''

    return html


def send_email(html, subject):
    """透過 Resend API 寄出 email"""
    import requests

    if not RESEND_API_KEY:
        log("RESEND_API_KEY not set, skipping send")
        return {'status': 'SKIP', 'reason': 'no API key'}

    if not EMAIL_TO:
        log("EMAIL_TO not set, skipping send")
        return {'status': 'SKIP', 'reason': 'no recipients'}

    recipients = [e.strip() for e in EMAIL_TO.split(',') if e.strip()]

    try:
        r = requests.post(
            'https://api.resend.com/emails',
            headers={
                'Authorization': f'Bearer {RESEND_API_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'from': EMAIL_FROM,
                'to': recipients,
                'subject': subject,
                'html': html,
            },
            timeout=15,
        )
        if r.status_code == 200:
            log(f"Email sent to {len(recipients)} recipients")
            return {'status': 'OK', 'recipients': len(recipients)}
        else:
            log(f"Resend API error: {r.status_code} {r.text}")
            return {'status': 'ERROR', 'error': f'HTTP {r.status_code}'}
    except Exception as e:
        log(f"Send failed: {e}")
        return {'status': 'ERROR', 'error': str(e)}


def run(dry_run=False, preview_path=None) -> dict:
    """執行 email agent"""
    start = time.time()
    log("Loading strategy data...")

    if not STRATEGY_PATH.exists():
        log("strategy.json not found")
        return {'status': 'ERROR', 'error': 'strategy.json not found'}

    data = load_strategy()
    rs = data.get('risk_signals', {})
    score = rs.get('score', 0)
    level_map = {'high': '高度警戒', 'medium': '中度警戒', 'low': '風險偏低'}
    level_text = level_map.get(rs.get('level', ''), '')
    report_date = data.get('report_date', datetime.now().strftime('%Y-%m-%d'))

    subject = f'[JOY88] Risk {score}/10 {level_text} - {report_date}'

    log(f"Building email: {subject}")
    html = build_email_html(data)

    if preview_path:
        with open(preview_path, 'w', encoding='utf-8') as f:
            f.write(html)
        log(f"Preview saved to {preview_path}")

    if dry_run:
        log("Dry run, skipping send")
        send_result = {'status': 'DRY_RUN'}
    else:
        send_result = send_email(html, subject)

    duration = int((time.time() - start) * 1000)
    return {
        'status': send_result.get('status', 'ERROR'),
        'duration_ms': duration,
        'subject': subject,
        'send_result': send_result,
    }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="JOY88 Email Agent")
    parser.add_argument("--dry-run", action="store_true", help="Don't send, just build")
    parser.add_argument("--preview", type=str, help="Save HTML to file")
    args = parser.parse_args()

    result = run(dry_run=args.dry_run, preview_path=args.preview)
    print(json.dumps(result, ensure_ascii=False, indent=2))
