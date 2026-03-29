#!/usr/bin/env python3
"""
Trump Signal Agent — 川普密碼信號追蹤
======================================
從 sstklen/trump-code GitHub repo 抓取每日信號資料，
整合到 strategy.json 供前端顯示。

資料來源：https://github.com/sstklen/trump-code/tree/main/data

標準介面：run() → {status, duration_ms, data, stats}
"""

import sys
import json
import time
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))
from config import DATA_DIR

BASE_URL = "https://raw.githubusercontent.com/sstklen/trump-code/main/data"

FILES_TO_FETCH = {
    'daily_report': 'daily_report.json',
    'rt_predictions': 'rt_predictions.json',
    'playbook': 'trump_playbook.json',
    'opus_briefing': 'opus_briefing.json',
    'signal_confidence': 'signal_confidence.json',
    'market_sp500': 'market_SP500.json',
    'predictions_log': 'predictions_log.json',
}


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"  [{ts}] [TrumpSignal] {msg}")


def fetch_file(fname):
    """Fetch a single JSON file from trump-code repo"""
    import requests
    url = f"{BASE_URL}/{fname}"
    try:
        r = requests.get(url, timeout=15)
        if r.status_code == 200:
            return r.json()
        else:
            log(f"  {fname}: HTTP {r.status_code}")
            return None
    except Exception as e:
        log(f"  {fname} failed: {e}")
        return None


def process_data(raw):
    """處理原始資料，產出前端需要的結構"""

    daily = raw.get('daily_report') or {}
    playbook = raw.get('playbook') or {}
    briefing = raw.get('opus_briefing') or {}
    confidence = raw.get('signal_confidence') or {}
    rt_preds = raw.get('rt_predictions') or []
    sp500 = raw.get('market_sp500') or []
    pred_log = raw.get('predictions_log') or []

    # 今日信號
    signals_today = daily.get('signals_detected', [])
    consensus = (daily.get('direction_summary') or {}).get('consensus', 'NEUTRAL')
    posts_today = daily.get('posts_today', 0)

    # 模型績效
    models = briefing.get('model_performance', {})
    model_list = []
    for key, m in models.items():
        model_list.append({
            'id': key,
            'name': m.get('name', key),
            'win_rate': m.get('win_rate', 0),
            'avg_return': m.get('avg_return', 0),
            'total_trades': m.get('total_trades', 0),
        })
    model_list.sort(key=lambda x: x['win_rate'], reverse=True)

    # Playbook 規則
    hedge_rules = (playbook.get('hedge_signals') or {}).get('rules', [])
    position_rules = (playbook.get('position_signals') or {}).get('rules', [])

    # 即時預測
    live_predictions = []
    for p in rt_preds[:10]:  # 最新 10 筆
        live_predictions.append({
            'time': p.get('post_time', ''),
            'preview': p.get('post_preview', '')[:120],
            'direction': p.get('predicted_direction', 'NEUTRAL'),
            'confidence': p.get('confidence', 0),
            'signal_types': p.get('signal_types', []),
            'status': p.get('status', 'UNKNOWN'),
        })

    # S&P 500 近 30 天
    sp500_recent = []
    if sp500:
        for item in sp500[-30:]:
            sp500_recent.append({
                'date': item.get('date', ''),
                'close': item.get('close', 0),
                'change_pct': item.get('change_pct', 0),
            })

    # 歷史預測績效
    total_preds = len(pred_log)
    correct_preds = sum(1 for p in pred_log if p.get('correct'))
    hit_rate = round(correct_preds / total_preds * 100, 1) if total_preds > 0 else 0

    # 信號信心度
    signal_conf = []
    for sig, conf in confidence.items():
        signal_conf.append({
            'signal': sig,
            'confidence': conf,
            'detected_today': sig in signals_today,
        })
    signal_conf.sort(key=lambda x: x['confidence'], reverse=True)

    return {
        'date': daily.get('date', datetime.now().strftime('%Y-%m-%d')),
        'posts_today': posts_today,
        'signals_today': signals_today,
        'consensus': consensus,
        'latest_post': daily.get('latest_post', {}),
        'models': model_list,
        'hedge_rules': hedge_rules,
        'position_rules': position_rules,
        'live_predictions': live_predictions,
        'sp500_recent': sp500_recent,
        'signal_confidence': signal_conf,
        'overall_hit_rate': hit_rate,
        'total_predictions': total_preds,
        'summary_zh': (daily.get('summary') or {}).get('zh', ''),
        'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    }


def run() -> dict:
    """執行川普信號抓取"""
    start = time.time()
    log("Fetching trump-code data...")

    raw = {}
    fetched = 0
    for key, fname in FILES_TO_FETCH.items():
        data = fetch_file(fname)
        if data is not None:
            raw[key] = data
            fetched += 1
            log(f"  {key}: OK")
        time.sleep(0.3)

    if fetched == 0:
        duration = int((time.time() - start) * 1000)
        return {'status': 'ERROR', 'duration_ms': duration, 'data': {}, 'stats': {'fetched': 0}}

    result = process_data(raw)
    duration = int((time.time() - start) * 1000)

    log(f"Done in {duration}ms — {fetched}/{len(FILES_TO_FETCH)} files, "
        f"signals: {result['signals_today']}, consensus: {result['consensus']}")

    return {
        'status': 'OK',
        'duration_ms': duration,
        'data': result,
        'stats': {
            'fetched': fetched,
            'total_files': len(FILES_TO_FETCH),
            'posts_today': result['posts_today'],
            'signals_count': len(result['signals_today']),
            'models_count': len(result['models']),
            'predictions_total': result['total_predictions'],
        },
    }


if __name__ == "__main__":
    result = run()
    print(json.dumps({k: v for k, v in result.items() if k != 'data'}, ensure_ascii=False, indent=2))
    if result.get('data'):
        d = result['data']
        print(f"\nSignals: {d['signals_today']}")
        print(f"Consensus: {d['consensus']}")
        print(f"Posts today: {d['posts_today']}")
        print(f"Models: {len(d['models'])}")
        print(f"Hit rate: {d['overall_hit_rate']}% ({d['total_predictions']} predictions)")
