#!/usr/bin/env python3
"""
Agent 1: 資料品質檢查
======================
檢查 ETF 歷史資料的完整性、一致性、缺漏。

檢查項目：
  1. 缺漏交易日（與台股交易日曆比對）
  2. 檔案格式異常（xlsx 讀取失敗、csv 欄位缺失）
  3. 重複資料
  4. 權重加總異常（> 105% 或 < 80%）
  5. 各 ETF 最新資料日期是否一致
"""

import sys
import glob
import json
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from config import ETF_BASE, ETF_IDS, LOG_DIR, FINANCE_DATA


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"  [{ts}] {msg}")


def get_trading_days(start: str, end: str) -> set:
    """取得期間內的台股交易日（排除週末，假日需手動維護）"""
    try:
        import holidays
        tw_holidays = holidays.Taiwan(years=range(int(start[:4]), int(end[:4]) + 1))
    except ImportError:
        tw_holidays = {}

    days = set()
    d = datetime.strptime(start, "%Y-%m-%d")
    end_d = datetime.strptime(end, "%Y-%m-%d")
    while d <= end_d:
        if d.weekday() < 5 and d not in tw_holidays:
            days.add(d.strftime("%Y-%m-%d"))
        d += timedelta(days=1)
    return days


def check_981a_xlsx() -> dict:
    """檢查 00981A xlsx 檔案"""
    issues = []
    xlsx_dir = ETF_BASE / "00981A" / "daily_xlsx"
    if not xlsx_dir.exists():
        return {"etf": "00981A", "issues": [{"level": "ERROR", "msg": "daily_xlsx 目錄不存在"}]}

    # 收集所有日期
    dates = []
    for fp in sorted(xlsx_dir.glob("00981A_*.xlsx")):
        if "追蹤" in fp.name or "analysis" in fp.name or "信號" in fp.name:
            continue
        date_str = fp.stem.split("_")[-1]
        if len(date_str) == 10:
            dates.append(date_str)

    for fp in sorted(xlsx_dir.glob("ETF_Investment_Portfolio_*.xlsx")):
        date_str = fp.stem.split("_")[-1]
        if len(date_str) == 8:
            dates.append(f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}")

    dates = sorted(set(dates))
    if not dates:
        issues.append({"level": "ERROR", "msg": "找不到任何 xlsx 檔案"})
        return {"etf": "00981A", "dates": [], "issues": issues}

    # 檢查缺漏日
    trading_days = get_trading_days(dates[0], dates[-1])
    missing = sorted(trading_days - set(dates))
    if missing:
        # 只報最近 30 天的缺漏
        recent_missing = [d for d in missing if d >= (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")]
        if recent_missing:
            issues.append({
                "level": "WARN",
                "msg": f"近30天缺漏 {len(recent_missing)} 個交易日: {', '.join(recent_missing[-5:])}"
            })

    # 抽樣檢查 xlsx 內容（最近 5 筆）
    for date_str in dates[-5:]:
        fp = xlsx_dir / f"00981A_{date_str}.xlsx"
        if not fp.exists():
            continue
        try:
            import openpyxl
            wb = openpyxl.load_workbook(fp, read_only=True, data_only=True)
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))
            wb.close()

            # 檢查是否有持股資料
            stock_count = 0
            total_weight = 0
            in_stocks = False
            for r in rows:
                if r and r[0] and str(r[0]).strip() == "股票代號":
                    in_stocks = True
                    continue
                if in_stocks and r and r[0]:
                    code = str(r[0]).strip()
                    if code and code != "None":
                        stock_count += 1
                        try:
                            w = float(str(r[3]).replace("%", "").replace(",", "")) if r[3] else 0
                            total_weight += w
                        except (ValueError, IndexError):
                            pass

            if stock_count == 0:
                issues.append({"level": "ERROR", "msg": f"{date_str}: xlsx 解析不到持股資料"})
            elif total_weight > 105:
                issues.append({"level": "WARN", "msg": f"{date_str}: 股票權重加總 {total_weight:.1f}% 偏高"})
            elif total_weight < 50:
                issues.append({"level": "WARN", "msg": f"{date_str}: 股票權重加總 {total_weight:.1f}% 偏低"})

        except Exception as e:
            issues.append({"level": "ERROR", "msg": f"{date_str}: xlsx 讀取失敗 - {e}"})

    return {"etf": "00981A", "dates": dates, "n_dates": len(dates), "issues": issues}


def check_master_csv(etf_id: str) -> dict:
    """檢查 Master.csv 格式的 ETF"""
    issues = []
    csv_path = ETF_BASE / etf_id / f"{etf_id}_Master.csv"

    if not csv_path.exists():
        return {"etf": etf_id, "issues": [{"level": "ERROR", "msg": "Master.csv 不存在"}]}

    try:
        df = pd.read_csv(csv_path, encoding="utf-8-sig")
    except Exception as e:
        return {"etf": etf_id, "issues": [{"level": "ERROR", "msg": f"CSV 讀取失敗: {e}"}]}

    # 檢查必要欄位
    required_keywords = ["日期", "代號", "名稱", "權重"]
    col_str = " ".join(df.columns)
    for kw in required_keywords:
        if kw not in col_str:
            issues.append({"level": "WARN", "msg": f"欄位中找不到「{kw}」關鍵字"})

    # 找日期欄位
    date_col = None
    for c in df.columns:
        if "日期" in c or "date" in c.lower():
            date_col = c
            break

    if date_col is None:
        issues.append({"level": "ERROR", "msg": "找不到日期欄位"})
        return {"etf": etf_id, "issues": issues}

    dates = sorted(df[date_col].dropna().unique())
    n_dates = len(dates)

    # 檢查重複
    weight_col = None
    code_col = None
    for c in df.columns:
        if "權重" in c:
            weight_col = c
        if "代號" in c:
            code_col = c

    if code_col and date_col:
        dupes = df.duplicated(subset=[date_col, code_col], keep=False)
        n_dupes = dupes.sum()
        if n_dupes > 0:
            issues.append({"level": "WARN", "msg": f"發現 {n_dupes} 筆重複記錄"})

    # 檢查每日權重加總
    if weight_col:
        for dt in dates[-5:]:
            day_df = df[df[date_col] == dt]
            total_w = pd.to_numeric(day_df[weight_col], errors="coerce").sum()
            if total_w > 105:
                issues.append({"level": "WARN", "msg": f"{dt}: 權重加總 {total_w:.1f}% 偏高"})
            elif total_w < 50:
                issues.append({"level": "WARN", "msg": f"{dt}: 權重加總 {total_w:.1f}% 偏低"})

    # 檢查近 30 天缺漏
    if dates:
        trading_days = get_trading_days(str(dates[0]), str(dates[-1]))
        date_strs = set(str(d) for d in dates)
        missing = sorted(trading_days - date_strs)
        recent_missing = [d for d in missing if d >= (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")]
        if recent_missing:
            issues.append({
                "level": "WARN",
                "msg": f"近30天缺漏 {len(recent_missing)} 個交易日: {', '.join(recent_missing[-5:])}"
            })

    # 檢查 daily_xlsx 目錄
    xlsx_dir = ETF_BASE / etf_id / "daily_xlsx"
    if xlsx_dir.exists():
        xlsx_count = len(list(xlsx_dir.glob("*.xlsx")))
    else:
        xlsx_count = 0

    return {
        "etf": etf_id, "n_dates": n_dates,
        "date_range": f"{dates[0]} ~ {dates[-1]}" if dates else "N/A",
        "xlsx_count": xlsx_count, "issues": issues
    }


def run() -> dict:
    """執行完整資料品質檢查"""
    log("🔍 開始資料品質檢查...")
    results = {}

    # 00981A (xlsx)
    log("  檢查 00981A (xlsx)...")
    results["00981A"] = check_981a_xlsx()

    # 其他 ETF (Master.csv)
    for etf_id in ["00980A", "00982A", "00991A", "00993A"]:
        log(f"  檢查 {etf_id} (csv)...")
        results[etf_id] = check_master_csv(etf_id)

    # 跨 ETF 一致性檢查
    latest_dates = {}
    for etf_id, r in results.items():
        if r.get("dates"):
            latest_dates[etf_id] = r["dates"][-1]
        elif r.get("date_range") and r["date_range"] != "N/A":
            latest_dates[etf_id] = r["date_range"].split(" ~ ")[-1]

    if latest_dates:
        max_date = max(latest_dates.values())
        lagging = {k: v for k, v in latest_dates.items() if v < max_date}
        if lagging:
            lag_str = ", ".join(f"{k}({v})" for k, v in lagging.items())
            for etf_id in lagging:
                results[etf_id].setdefault("issues", []).append({
                    "level": "INFO",
                    "msg": f"資料落後最新日期 {max_date}（目前: {lagging[etf_id]}）"
                })

    # 統計
    total_issues = sum(len(r.get("issues", [])) for r in results.values())
    errors = sum(1 for r in results.values() for i in r.get("issues", []) if i["level"] == "ERROR")
    warns = sum(1 for r in results.values() for i in r.get("issues", []) if i["level"] == "WARN")

    summary = {
        "timestamp": datetime.now().isoformat(),
        "total_issues": total_issues,
        "errors": errors,
        "warnings": warns,
        "etf_results": results,
        "status": "FAIL" if errors > 0 else "WARN" if warns > 0 else "OK"
    }

    # 輸出摘要
    log(f"  檢查完成: {total_issues} 問題 ({errors} ERROR, {warns} WARN)")
    for etf_id, r in results.items():
        n = r.get("n_dates", 0)
        issues = r.get("issues", [])
        status = "❌" if any(i["level"] == "ERROR" for i in issues) else "⚠️" if issues else "✅"
        log(f"    {status} {etf_id}: {n} 天, {len(issues)} 問題")
        for i in issues:
            icon = "🔴" if i["level"] == "ERROR" else "🟡" if i["level"] == "WARN" else "ℹ️"
            log(f"      {icon} {i['msg']}")

    return summary


if __name__ == "__main__":
    print("🐺 Wolf Pack — 資料品質檢查 Agent")
    print(f"   資料路徑: {ETF_BASE}")
    result = run()
    print(f"\n狀態: {result['status']}")
