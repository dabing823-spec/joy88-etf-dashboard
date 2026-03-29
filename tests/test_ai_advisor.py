"""Tests for AI Advisor Agent."""

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts" / "agents"))

from ai_advisor_agent import (
    check_freshness,
    compute_data_completeness,
    load_data_files,
    parse_response,
    summarize_dashboard,
    summarize_news,
    summarize_strategy,
    update_advisor_json,
)

TW = timezone(timedelta(hours=8))


# ── load_data_files ──


class TestLoadDataFiles:
    def test_all_present(self, tmp_path):
        """All 6 JSON files load correctly."""
        for name in ["dashboard", "strategy", "news_analysis", "ai_research", "tsmc_vol_signal", "indices_history"]:
            (tmp_path / f"{name}.json").write_text('{"ok": true}', encoding="utf-8")

        with patch("ai_advisor_agent.DATA_DIR", tmp_path):
            result = load_data_files()
        assert all(v["loaded"] for v in result.values())
        assert len(result) == 6

    def test_missing_files(self, tmp_path):
        """Graceful handling when files are missing."""
        with patch("ai_advisor_agent.DATA_DIR", tmp_path):
            result = load_data_files()
        assert all(not v["loaded"] for v in result.values())
        assert all(v["error"] == "file_not_found" for v in result.values())

    def test_malformed_json(self, tmp_path):
        """JSON parse error handling."""
        (tmp_path / "dashboard.json").write_text("{bad json", encoding="utf-8")
        with patch("ai_advisor_agent.DATA_DIR", tmp_path):
            result = load_data_files()
        assert not result["dashboard"]["loaded"]
        assert "json_parse_error" in result["dashboard"]["error"]


# ── check_freshness ──


class TestCheckFreshness:
    def test_fresh_data(self):
        now = datetime.now(TW)
        data = {
            "dashboard": {
                "loaded": True,
                "data": {"report_date": now.strftime("%Y-%m-%d")},
            }
        }
        result = check_freshness(data)
        assert result["dashboard"]["fresh"] is True

    def test_stale_data(self):
        old = (datetime.now(TW) - timedelta(hours=48)).strftime("%Y-%m-%d")
        data = {
            "dashboard": {"loaded": True, "data": {"report_date": old}},
        }
        result = check_freshness(data)
        assert result["dashboard"]["fresh"] is False


# ── compute_data_completeness ──


class TestDataCompleteness:
    def test_all_fresh(self):
        freshness = {
            "a": {"fresh": True},
            "b": {"fresh": True},
            "c": {"fresh": True},
        }
        assert compute_data_completeness(freshness) == 1.0

    def test_partial(self):
        freshness = {
            "a": {"fresh": True},
            "b": {"fresh": False},
            "c": {"fresh": True},
            "d": {"fresh": False},
            "e": {"fresh": True},
        }
        assert compute_data_completeness(freshness) == 0.6

    def test_empty(self):
        assert compute_data_completeness({}) == 0.0


# ── summarize ──


class TestSummarize:
    def test_summarize_premarket(self, sample_dashboard, sample_strategy, sample_news):
        result = summarize_dashboard(sample_dashboard)
        assert "積極進攻" in result
        assert "1.7%" in result

    def test_summarize_postmarket(self, sample_strategy):
        result = summarize_strategy(sample_strategy)
        assert "7/15" in result
        assert "medium" in result

    def test_summarize_news(self, sample_news):
        result = summarize_news(sample_news)
        assert "Fed" in result
        assert "利率" in result

    def test_summarize_null(self):
        assert "無持倉" in summarize_dashboard(None)
        assert "無策略" in summarize_strategy(None)
        assert "無新聞" in summarize_news(None)


# ── parse_response ──


class TestParseResponse:
    def test_valid_json(self):
        raw = json.dumps({
            "overall_signal": "防守",
            "action_items": [
                {"priority": 1, "action": "test", "reasoning": "r", "framework": "f"}
            ],
            "market_summary": "summary",
            "risk_assessment": "assessment",
        })
        result = parse_response(raw)
        assert result is not None
        assert result["overall_signal"] == "防守"

    def test_invalid_json(self):
        assert parse_response("not json at all") is None

    def test_missing_fields(self):
        raw = json.dumps({"overall_signal": "防守"})
        assert parse_response(raw) is None

    def test_invalid_signal(self):
        raw = json.dumps({
            "overall_signal": "INVALID",
            "action_items": [],
            "market_summary": "s",
            "risk_assessment": "a",
        })
        assert parse_response(raw) is None

    def test_strips_markdown_fences(self):
        raw = '```json\n{"overall_signal":"攻擊","action_items":[],"market_summary":"s","risk_assessment":"a"}\n```'
        result = parse_response(raw)
        assert result is not None
        assert result["overall_signal"] == "攻擊"

    def test_trims_action_items_to_3(self):
        items = [
            {"priority": i, "action": f"a{i}", "reasoning": "r", "framework": "f"}
            for i in range(1, 6)
        ]
        raw = json.dumps({
            "overall_signal": "觀望",
            "action_items": items,
            "market_summary": "s",
            "risk_assessment": "a",
        })
        result = parse_response(raw)
        assert len(result["action_items"]) == 3


# ── update_advisor_json ──


class TestUpdateAdvisorJson:
    def test_new_file(self, tmp_path, sample_advisory):
        path = tmp_path / "advisor.json"
        with patch("ai_advisor_agent.ADVISOR_FILE", path):
            update_advisor_json(sample_advisory)
        data = json.loads(path.read_text(encoding="utf-8"))
        assert len(data["advisories"]) == 1
        assert data["advisories"][0]["overall_signal"] == "防守"

    def test_append(self, tmp_path, sample_advisory):
        path = tmp_path / "advisor.json"
        existing = {"advisories": [{"date": "2026-03-25", "overall_signal": "觀望"}]}
        path.write_text(json.dumps(existing), encoding="utf-8")
        with patch("ai_advisor_agent.ADVISOR_FILE", path):
            update_advisor_json(sample_advisory)
        data = json.loads(path.read_text(encoding="utf-8"))
        assert len(data["advisories"]) == 2
        assert data["advisories"][0]["overall_signal"] == "防守"  # newest first

    def test_trim_to_14(self, tmp_path, sample_advisory):
        path = tmp_path / "advisor.json"
        existing = {"advisories": [{"date": f"2026-03-{i:02d}"} for i in range(1, 16)]}
        path.write_text(json.dumps(existing), encoding="utf-8")
        with patch("ai_advisor_agent.ADVISOR_FILE", path):
            update_advisor_json(sample_advisory)
        data = json.loads(path.read_text(encoding="utf-8"))
        assert len(data["advisories"]) == 14
