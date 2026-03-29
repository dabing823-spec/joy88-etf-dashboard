#!/usr/bin/env python3
"""
Agent 2: 信號分析
==================
讀取所有 ETF 歷史持股，計算多因子信號，產出 Markdown 日報 + JSON。

信號因子：
  1. 跟單信號（新進/出場/加碼/減碼）
  2. 多 ETF 共識
  3. 現金水位攻防模式
  4. N日信心度
  5. 老墨跟單策略
"""

import sys
import json
import copy
from datetime import datetime
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from config import ETF_BASE, ETF_IDS, PRIMARY_ETF, REPORT_DIR, DATA_DIR, FINANCE_DATA


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"  [{ts}] {msg}")


# ── 資料載入 ──

def _parse_981a_xlsx(fp, date: str) -> list:
    import openpyxl
    wb = openpyxl.load_workbook(fp, read_only=True, data_only=True)
    ws = wb.active
    all_rows = list(ws.iter_rows(values_only=True))
    wb.close()

    rows = []

    def parse_pct(val):
        if val is None:
            return 0.0
        s = str(val).replace("%", "").replace(",", "").strip()
        try:
            return float(s)
        except ValueError:
            return 0.0

    def parse_int(val):
        if val is None:
            return 0
        s = str(val).replace(",", "").strip()
        try:
            return int(float(s))
        except ValueError:
            return 0

    # Cash items
    for r in all_rows:
        if r and r[0] and str(r[0]).strip() in ("現金", "期貨保證金", "申贖應付款", "應收付證券款"):
            label = str(r[0]).strip()
            pct = parse_pct(r[2]) if len(r) > 2 else 0
            rows.append({"etf": "00981A", "date": date, "code": label, "name": label,
                          "weight": pct, "shares": 0, "category": label})

    # Futures nominal
    for r in all_rows:
        if r and r[0] and "期貨" in str(r[0]) and "名目" in str(r[0]):
            pct = parse_pct(r[2]) if len(r) > 2 else 0
            rows.append({"etf": "00981A", "date": date, "code": "期貨名目", "name": "期貨(名目本金)",
                          "weight": pct, "shares": 0, "category": "期貨"})

    # Stocks
    stock_start = None
    for i, r in enumerate(all_rows):
        if r and r[0] and str(r[0]).strip() == "股票代號":
            stock_start = i + 1
            break

    if stock_start:
        for r in all_rows[stock_start:]:
            if not r or not r[0]:
                continue
            code = str(r[0]).strip()
            if not code or code == "None":
                continue
            name = str(r[1]).strip() if r[1] else ""
            shares = parse_int(r[2]) if len(r) > 2 else 0
            weight = parse_pct(r[3]) if len(r) > 3 else 0
            rows.append({"etf": "00981A", "date": date, "code": code, "name": name,
                          "weight": weight, "shares": shares, "category": "股票"})
    return rows


def load_all_data() -> pd.DataFrame:
    frames = []

    # 00981A xlsx
    xlsx_dir = ETF_BASE / "00981A" / "daily_xlsx"
    if xlsx_dir.exists():
        for fp in sorted(xlsx_dir.glob("00981A_*.xlsx")):
            if any(skip in fp.name for skip in ("追蹤", "analysis", "信號")):
                continue
            date_str = fp.stem.split("_")[-1]
            if len(date_str) == 10:
                try:
                    frames.extend(_parse_981a_xlsx(fp, date_str))
                except Exception as e:
                    log(f"⚠️ 跳過 {fp.name}: {e}")

        for fp in sorted(xlsx_dir.glob("ETF_Investment_Portfolio_*.xlsx")):
            date_str = fp.stem.split("_")[-1]
            if len(date_str) == 8:
                dt = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
                try:
                    frames.extend(_parse_981a_xlsx(fp, dt))
                except Exception as e:
                    log(f"⚠️ 跳過 {fp.name}: {e}")

    # Other ETFs (Master.csv)
    for etf_id in ["00980A", "00982A", "00991A", "00993A"]:
        csv_path = ETF_BASE / etf_id / f"{etf_id}_Master.csv"
        if not csv_path.exists():
            continue
        try:
            df = pd.read_csv(csv_path, encoding="utf-8-sig")
            col_map = {}
            for c in df.columns:
                cl = c.strip()
                if "代號" in cl: col_map[c] = "code"
                elif "名稱" in cl: col_map[c] = "name"
                elif "權重" in cl: col_map[c] = "weight"
                elif "股數" in cl: col_map[c] = "shares"
                elif "日期" in cl: col_map[c] = "date"
            df = df.rename(columns=col_map)
            df["etf"] = etf_id
            df["code"] = df["code"].astype(str).str.strip()
            df["weight"] = pd.to_numeric(df["weight"], errors="coerce").fillna(0)
            if "shares" in df.columns:
                df["shares"] = pd.to_numeric(df["shares"].astype(str).str.replace(",", ""), errors="coerce").fillna(0).astype(int)
            else:
                df["shares"] = 0
            df["category"] = "股票"
            for c in ["etf", "date", "code", "name", "weight", "shares", "category"]:
                if c not in df.columns:
                    df[c] = ""
            frames.append(df[["etf", "date", "code", "name", "weight", "shares", "category"]])
        except Exception as e:
            log(f"⚠️ {etf_id} CSV 讀取失敗: {e}")

    if not frames:
        return pd.DataFrame()

    all_rows = [f if isinstance(f, pd.DataFrame) else None for f in frames]
    dict_rows = [f for f in frames if isinstance(f, dict)]
    df_list = [f for f in frames if isinstance(f, pd.DataFrame)]

    if dict_rows:
        df_list.append(pd.DataFrame(dict_rows))

    # frames contains mix of dicts and DataFrames
    final_rows = []
    for f in frames:
        if isinstance(f, pd.DataFrame):
            final_rows.append(f)
        elif isinstance(f, dict):
            final_rows.append(pd.DataFrame([f]))

    result = pd.concat(final_rows, ignore_index=True)
    result = result.drop_duplicates(subset=["etf", "date", "code"], keep="last")
    return result


# ── 信號計算 ──

class SignalEngine:
    def __init__(self, df: pd.DataFrame):
        self.df = df
        self.dates_by_etf = {}
        for etf in df["etf"].unique():
            self.dates_by_etf[etf] = sorted(df[df["etf"] == etf]["date"].unique())

    def get_holdings(self, etf, date):
        return self.df[(self.df["etf"] == etf) & (self.df["date"] == date)].copy()

    def get_prev_date(self, etf, date):
        dates = self.dates_by_etf.get(etf, [])
        idx = list(dates).index(date) if date in dates else -1
        return dates[idx - 1] if idx > 0 else None

    def calc_follow_signals(self, etf="00981A", date=None):
        if date is None:
            date = self.dates_by_etf.get(etf, [None])[-1]
        if date is None:
            return {"new": [], "added": [], "reduced": [], "exited": [], "date": None, "prev_date": None}

        prev_date = self.get_prev_date(etf, date)
        if prev_date is None:
            return {"new": [], "added": [], "reduced": [], "exited": [], "date": date, "prev_date": None}

        today = self.get_holdings(etf, date)
        yesterday = self.get_holdings(etf, prev_date)

        today_stocks = today[today["category"].str.contains("股票|stock", case=False, na=True)]
        yest_stocks = yesterday[yesterday["category"].str.contains("股票|stock", case=False, na=True)]

        today_map = {r["code"]: r for _, r in today_stocks.iterrows()}
        yest_map = {r["code"]: r for _, r in yest_stocks.iterrows()}

        new_entries, exits, added, reduced = [], [], [], []

        for code in set(today_map) - set(yest_map):
            r = today_map[code]
            new_entries.append({"code": code, "name": r["name"], "weight": r["weight"], "shares": int(r["shares"]), "weight_chg": r["weight"]})

        for code in set(yest_map) - set(today_map):
            r = yest_map[code]
            exits.append({"code": code, "name": r["name"], "prev_weight": r["weight"], "prev_shares": int(r["shares"])})

        for code in set(today_map) & set(yest_map):
            tw, yw = today_map[code]["weight"], yest_map[code]["weight"]
            ts, ys = int(today_map[code]["shares"]), int(yest_map[code]["shares"])
            chg = tw - yw
            if abs(chg) < 0.05 and ts == ys:
                continue
            entry = {"code": code, "name": today_map[code]["name"], "weight": tw, "prev_weight": yw,
                     "weight_chg": round(chg, 2), "shares": ts, "prev_shares": ys, "share_chg": ts - ys}
            if chg > 0.05 or ts > ys:
                added.append(entry)
            elif chg < -0.05 or ts < ys:
                reduced.append(entry)

        new_entries.sort(key=lambda x: x["weight"], reverse=True)
        added.sort(key=lambda x: x["weight_chg"], reverse=True)
        reduced.sort(key=lambda x: x["weight_chg"])
        exits.sort(key=lambda x: x["prev_weight"], reverse=True)

        return {"new": new_entries, "added": added, "reduced": reduced, "exited": exits, "date": date, "prev_date": prev_date}

    def calc_consensus(self, date=None):
        if date is None:
            all_dates = [self.dates_by_etf.get(e, [""])[- 1] for e in ETF_IDS if self.dates_by_etf.get(e)]
            date = max(all_dates) if all_dates else None
        if not date:
            return {"date": None, "consensus": []}

        holdings_map, changes_map, name_map = {}, {}, {}
        for etf in ETF_IDS:
            dates = self.dates_by_etf.get(etf, [])
            close = [d for d in dates if d <= date]
            if not close:
                continue
            use_date = close[-1]
            today = self.get_holdings(etf, use_date)
            stocks = today[today["category"].str.contains("股票|stock", case=False, na=True)]
            prev_date = self.get_prev_date(etf, use_date)
            yest_map = {}
            if prev_date:
                yest = self.get_holdings(etf, prev_date)
                yest_s = yest[yest["category"].str.contains("股票|stock", case=False, na=True)]
                yest_map = {r["code"]: r["weight"] for _, r in yest_s.iterrows()}

            for _, r in stocks.iterrows():
                code = r["code"]
                holdings_map.setdefault(code, {})
                changes_map.setdefault(code, {})
                holdings_map[code][etf] = r["weight"]
                name_map[code] = r["name"]
                changes_map[code][etf] = r["weight"] - yest_map.get(code, 0)

        results = []
        for code, etf_weights in holdings_map.items():
            n = len(etf_weights)
            if n < 2:
                continue
            avg_w = round(sum(etf_weights.values()) / n, 2)
            net_chg = round(sum(changes_map.get(code, {}).values()), 2)
            n_add = sum(1 for v in changes_map.get(code, {}).values() if v > 0.05)
            n_red = sum(1 for v in changes_map.get(code, {}).values() if v < -0.05)
            results.append({"code": code, "name": name_map.get(code, ""), "n_etfs": n,
                           "etf_weights": {k: round(v, 2) for k, v in etf_weights.items()},
                           "avg_weight": avg_w, "total_weight": round(sum(etf_weights.values()), 2),
                           "net_change": net_chg, "n_adding": n_add, "n_reducing": n_red,
                           "etf_list": list(etf_weights.keys())})
        results.sort(key=lambda x: x["n_etfs"] * 10 + x["total_weight"], reverse=True)
        return {"date": date, "consensus": results}

    def calc_cash_mode(self, etf="00981A"):
        dates = self.dates_by_etf.get(etf, [])
        cash_series = []
        for date in dates:
            h = self.get_holdings(etf, date)
            cash_rows = h[h["category"].str.contains("現金|cash", case=False, na=False)]
            stock_rows = h[h["category"].str.contains("股票|stock", case=False, na=True)]
            futures_rows = h[h["category"].str.contains("期貨|futures|保證金", case=False, na=False)]
            cash_series.append({
                "date": date,
                "cash_pct": round(cash_rows["weight"].sum(), 2) if not cash_rows.empty else 0,
                "stock_pct": round(stock_rows["weight"].sum(), 2) if not stock_rows.empty else 0,
                "futures_pct": round(futures_rows["weight"].sum(), 2) if not futures_rows.empty else 0,
                "n_holdings": len(stock_rows)
            })
        if not cash_series:
            return {"mode": "未知", "cash_series": []}

        df_c = pd.DataFrame(cash_series)
        if len(df_c) >= 5:
            df_c["cash_5ma"] = df_c["cash_pct"].rolling(5).mean().round(2)
        if len(df_c) >= 20:
            df_c["cash_20ma"] = df_c["cash_pct"].rolling(20).mean().round(2)

        latest = df_c.iloc[-1]
        cash_now = latest["cash_pct"]
        cash_5ma = latest.get("cash_5ma", cash_now)
        cash_20ma = latest.get("cash_20ma", cash_now)
        if pd.isna(cash_5ma): cash_5ma = cash_now
        if pd.isna(cash_20ma): cash_20ma = cash_now

        if cash_now >= 7: mode, desc = "🔴 高度防守", "現金水位極高，經理人明確看空或觀望"
        elif cash_now >= 5: mode, desc = "🟡 防守模式", "現金偏高，經理人保守以對"
        elif cash_now >= 3: mode, desc = "🟢 中性偏攻", "現金適中，經理人正常配置"
        elif cash_now >= 1: mode, desc = "🟢 積極進攻", "現金偏低，經理人積極做多"
        else: mode, desc = "🔵 全力進攻", "幾乎滿倉，經理人極度看多"

        trend = "資料不足"
        if len(df_c) >= 3:
            r3 = df_c["cash_pct"].tail(3).tolist()
            if r3[-1] > r3[0] + 0.5: trend = "⬆️ 減倉中（現金增加）"
            elif r3[-1] < r3[0] - 0.5: trend = "⬇️ 加倉中（現金減少）"
            else: trend = "➡️ 持平觀望"

        return {"mode": mode, "mode_desc": desc, "trend": trend,
                "cash_now": cash_now, "cash_5ma": round(cash_5ma, 2), "cash_20ma": round(cash_20ma, 2),
                "n_holdings": int(latest["n_holdings"]),
                "cash_series": df_c.fillna(0).to_dict("records")}

    def calc_conviction(self, etf="00981A", lookback=20):
        dates = self.dates_by_etf.get(etf, [])
        if len(dates) < 2: return []
        end_date = dates[-1]
        start_date = dates[max(0, len(dates) - lookback)]
        end_h = self.get_holdings(etf, end_date)
        start_h = self.get_holdings(etf, start_date)
        end_stocks = end_h[end_h["category"].str.contains("股票|stock", case=False, na=True)]
        start_map = {r["code"]: r["weight"] for _, r in start_h[start_h["category"].str.contains("股票|stock", case=False, na=True)].iterrows()}

        results = []
        for _, r in end_stocks.iterrows():
            chg = round(r["weight"] - start_map.get(r["code"], 0), 2)
            if chg > 2: level = "⭐⭐⭐ 高信心加碼"
            elif chg > 0.5: level = "⭐⭐ 中等加碼"
            elif chg > 0: level = "⭐ 小幅增持"
            elif chg > -1: level = "🔻 小幅減碼"
            elif chg > -3: level = "🔻🔻 逐步撤退"
            else: level = "🔻🔻🔻 高信心減碼"
            results.append({"code": r["code"], "name": r["name"], "weight": r["weight"],
                           "start_weight": round(start_map.get(r["code"], 0), 2),
                           "weight_chg": chg, "conviction": level})
        results.sort(key=lambda x: x["weight_chg"], reverse=True)
        return results

    def calc_laomo_signals(self, etf="00981A"):
        dates = self.dates_by_etf.get(etf, [])
        signals = []
        for i in range(1, len(dates)):
            date, prev = dates[i], dates[i - 1]
            today_h = self.get_holdings(etf, date)
            yest_h = self.get_holdings(etf, prev)
            today_s = {r["code"]: r for _, r in today_h[today_h["category"].str.contains("股票|stock", case=False, na=True)].iterrows()}
            yest_s = {r["code"]: r for _, r in yest_h[yest_h["category"].str.contains("股票|stock", case=False, na=True)].iterrows()}

            for code in set(today_s) - set(yest_s):
                r = today_s[code]
                signals.append({"date": date, "code": code, "name": r["name"], "type": "新增",
                               "weight": r["weight"], "weight_chg": r["weight"],
                               "hold_suggestion": "持有10日觀察行情",
                               "confidence": "⭐⭐" if r["weight"] >= 1.0 else "⭐"})
            for code in set(today_s) & set(yest_s):
                chg = today_s[code]["weight"] - yest_s[code]["weight"]
                if chg > 0.3:
                    conf = "⭐⭐⭐" if chg > 1.0 else "⭐⭐" if chg > 0.5 else "⭐"
                    signals.append({"date": date, "code": code, "name": today_s[code]["name"], "type": "加碼",
                                   "weight": today_s[code]["weight"], "weight_chg": round(chg, 2),
                                   "hold_suggestion": "持有60日，歷史勝率高" if chg > 0.5 else "持有20日觀察",
                                   "confidence": conf})
        return {"signals": signals}

    def generate_report(self, date=None):
        follow = self.calc_follow_signals(PRIMARY_ETF, date)
        report_date = follow["date"]
        consensus = self.calc_consensus(report_date)
        cash_mode = self.calc_cash_mode(PRIMARY_ETF)
        conviction_5 = self.calc_conviction(PRIMARY_ETF, 5)
        conviction_20 = self.calc_conviction(PRIMARY_ETF, 20)
        laomo = self.calc_laomo_signals(PRIMARY_ETF)
        recent_laomo = [s for s in laomo["signals"] if s["date"] == report_date]

        other_follow = {}
        for etf in ["00980A", "00982A", "00991A", "00993A"]:
            if self.dates_by_etf.get(etf):
                other_follow[etf] = self.calc_follow_signals(etf, report_date)

        return {
            "date": report_date,
            "follow_981a": follow, "consensus": consensus, "cash_mode": cash_mode,
            "conviction_5": conviction_5, "conviction_20": conviction_20,
            "laomo_signals": recent_laomo, "all_laomo": laomo["signals"],
            "other_etf_follow": other_follow
        }


# ── 報告格式化 ──

def format_markdown(report):
    d = report["date"]
    follow = report["follow_981a"]
    cash = report["cash_mode"]
    consensus = report["consensus"]
    laomo = report["laomo_signals"]

    lines = [
        "=" * 50,
        f"🐺 Wolf Pack ETF 多因子信號日報",
        f"📅 {d}",
        "=" * 50, "",
        f"## 📡 攻防模式",
        f"- 模式：{cash['mode']}",
        f"- 說明：{cash['mode_desc']}",
        f"- 現金：{cash['cash_now']}% | 5MA：{cash['cash_5ma']}% | 20MA：{cash['cash_20ma']}%",
        f"- 趨勢：{cash['trend']}",
        f"- 持股數：{cash['n_holdings']}", "",
        f"## 🔄 00981A 持股異動（vs {follow['prev_date']}）",
    ]

    if follow["new"]:
        lines.append("### 🆕 新進場")
        for s in follow["new"]:
            lines.append(f"  - {s['code']} {s['name']} — 權重 {s['weight']:.2f}%")
    if follow["exited"]:
        lines.append("### 🚪 已出場")
        for s in follow["exited"]:
            lines.append(f"  - {s['code']} {s['name']} — 原權重 {s['prev_weight']:.2f}%")
    if follow["added"]:
        lines.append("### ⬆️ 加碼 TOP5")
        for s in follow["added"][:5]:
            lines.append(f"  - {s['code']} {s['name']} — {s['prev_weight']:.2f}% → {s['weight']:.2f}% ({s['weight_chg']:+.2f}%)")
    if follow["reduced"]:
        lines.append("### ⬇️ 減碼 TOP5")
        for s in follow["reduced"][:5]:
            lines.append(f"  - {s['code']} {s['name']} — {s['prev_weight']:.2f}% → {s['weight']:.2f}% ({s['weight_chg']:+.2f}%)")
    lines.append("")

    if laomo:
        lines.append("## 🎯 老墨跟單信號（當日）")
        for s in laomo:
            lines.append(f"  - [{s['type']}] {s['code']} {s['name']} — {s['weight_chg']:+.2f}% {s['confidence']}")
            lines.append(f"    建議：{s['hold_suggestion']}")
        lines.append("")

    top_consensus = [c for c in consensus.get("consensus", []) if c["n_etfs"] >= 3][:10]
    if top_consensus:
        lines.append("## 🤝 多 ETF 共識（≥3 檔持有）")
        for c in top_consensus:
            d_icon = "⬆️" if c["net_change"] > 0.1 else "⬇️" if c["net_change"] < -0.1 else "➡️"
            lines.append(f"  - {c['code']} {c['name']} — {c['n_etfs']}檔, 均權重{c['avg_weight']}%, {d_icon}{c['net_change']:+.2f}%")
        lines.append("")

    lines.append("⚠️ 免責聲明：本報告僅為資訊參考，不構成投資建議。")
    return "\n".join(lines)


def clean_for_json(obj):
    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_for_json(i) for i in obj]
    elif isinstance(obj, (int, float, str, bool, type(None))):
        if isinstance(obj, float) and (obj != obj):  # NaN
            return None
        return obj
    else:
        return str(obj)


def run(date=None) -> dict:
    """執行信號分析"""
    log("📊 載入所有 ETF 資料...")
    df = load_all_data()
    if df.empty:
        log("❌ 沒有任何資料")
        return {"status": "FAIL", "error": "No data"}

    log(f"✅ 載入 {len(df)} 筆記錄，{df['etf'].nunique()} 檔 ETF")

    engine = SignalEngine(df)
    report = engine.generate_report(date)
    report_date = report["date"]
    log(f"📅 報告日期: {report_date}")

    # Save Markdown
    md = format_markdown(report)
    md_path = REPORT_DIR / f"Wolf_Pack_ETF_Signal_{report_date}.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md)
    log(f"📄 Markdown: {md_path}")

    # Save JSON
    json_report = clean_for_json(copy.deepcopy(report))
    json_path = REPORT_DIR / "etf_signal_data.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_report, f, ensure_ascii=False, indent=2)
    log(f"📊 JSON: {json_path}")

    return {
        "status": "OK",
        "date": report_date,
        "report": report,
        "md_path": str(md_path),
        "json_path": str(json_path),
        "summary": {
            "new": len(report["follow_981a"]["new"]),
            "exited": len(report["follow_981a"]["exited"]),
            "added": len(report["follow_981a"]["added"]),
            "reduced": len(report["follow_981a"]["reduced"]),
            "consensus_3plus": len([c for c in report["consensus"].get("consensus", []) if c["n_etfs"] >= 3]),
            "cash_mode": report["cash_mode"]["mode"],
            "laomo_signals": len(report["laomo_signals"]),
        }
    }


if __name__ == "__main__":
    print("🐺 Wolf Pack — 信號分析 Agent")
    result = run()
    if result["status"] == "OK":
        s = result["summary"]
        print(f"\n📊 {result['date']} 摘要:")
        print(f"  新進場: {s['new']}, 出場: {s['exited']}, 加碼: {s['added']}, 減碼: {s['reduced']}")
        print(f"  共識標的(≥3): {s['consensus_3plus']}, 攻防: {s['cash_mode']}")
        print(f"  老墨信號: {s['laomo_signals']}")
