#!/usr/bin/env python3
"""
Agent 3: Dashboard 資料更新
============================
重新生成 dashboard.json 和 etf_pages.json，供前端 Dashboard 使用。
本質上是 generate_dashboard_data.py 的 agent 封裝版，
增加了狀態回報和錯誤處理。
"""

import sys
import subprocess
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import SCRIPTS_DIR, DATA_DIR, REPO_DIR


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"  [{ts}] {msg}")


def run() -> dict:
    """執行 Dashboard 資料生成"""
    gen_script = SCRIPTS_DIR / "generate_dashboard_data.py"

    if not gen_script.exists():
        log(f"❌ 找不到 {gen_script}")
        return {"status": "FAIL", "error": f"Script not found: {gen_script}"}

    log("⚙️ 執行 generate_dashboard_data.py...")

    try:
        result = subprocess.run(
            [sys.executable, str(gen_script)],
            capture_output=True, text=True, timeout=120,
            cwd=str(SCRIPTS_DIR)
        )
    except subprocess.TimeoutExpired:
        log("❌ 執行超時（>120s）")
        return {"status": "FAIL", "error": "Timeout"}
    except Exception as e:
        log(f"❌ 執行異常: {e}")
        return {"status": "FAIL", "error": str(e)}

    if result.returncode != 0:
        log(f"❌ 執行失敗 (exit {result.returncode})")
        if result.stderr:
            for line in result.stderr.strip().split("\n")[-5:]:
                log(f"  {line}")
        return {"status": "FAIL", "error": result.stderr[-500:] if result.stderr else "Unknown error"}

    # 顯示輸出摘要
    if result.stdout:
        for line in result.stdout.strip().split("\n")[-5:]:
            log(f"  {line}")

    # 驗證輸出檔案
    dashboard_json = DATA_DIR / "dashboard.json"
    etf_pages_json = DATA_DIR / "etf_pages.json"

    files_ok = True
    file_sizes = {}

    for fp in [dashboard_json, etf_pages_json]:
        if fp.exists():
            size = fp.stat().st_size
            file_sizes[fp.name] = size
            if size < 100:
                log(f"⚠️ {fp.name} 檔案過小 ({size} bytes)")
                files_ok = False
            else:
                log(f"✅ {fp.name}: {size:,} bytes")
        else:
            log(f"❌ {fp.name} 不存在")
            files_ok = False

    # 讀取報告日期
    report_date = None
    if dashboard_json.exists():
        try:
            import json
            with open(dashboard_json, "r", encoding="utf-8") as f:
                data = json.load(f)
            report_date = data.get("report_date")
        except Exception:
            pass

    return {
        "status": "OK" if files_ok else "WARN",
        "date": report_date,
        "files": file_sizes,
        "dashboard_path": str(dashboard_json),
        "etf_pages_path": str(etf_pages_json),
    }


if __name__ == "__main__":
    print("🐺 Wolf Pack — Dashboard 更新 Agent")
    result = run()
    print(f"\n狀態: {result['status']}")
    if result.get("date"):
        print(f"報告日期: {result['date']}")
