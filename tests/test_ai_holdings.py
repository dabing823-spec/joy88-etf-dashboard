"""Tests for ai_holdings_agent — holdings change analysis."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts" / "agents"))

from ai_holdings_agent import get_latest_changes, build_changes_summary, build_changes_detail


class TestGetLatestChanges:
    def test_with_changes(self):
        dashboard = {
            "daily_changes": {
                "00981A": [
                    {"date": "2026-03-25", "new": [], "added": []},
                    {"date": "2026-03-26", "new": [{"code": "2330", "name": "台積電"}]},
                ]
            }
        }
        result = get_latest_changes(dashboard)
        assert result["date"] == "2026-03-26"

    def test_empty_changes(self):
        dashboard = {"daily_changes": {"00981A": []}}
        assert get_latest_changes(dashboard) == {}

    def test_missing_etf(self):
        dashboard = {"daily_changes": {}}
        assert get_latest_changes(dashboard) == {}

    def test_no_daily_changes_key(self):
        assert get_latest_changes({}) == {}


class TestBuildChangesSummary:
    def test_all_types(self):
        changes = {
            "new": [{"code": "2330", "name": "台積電", "weight": 5.0}],
            "added": [{"code": "8299", "name": "群聯", "weight_chg": 1.5}],
            "reduced": [{"code": "2308", "name": "台達電", "weight_chg": -0.8}],
            "exited": [{"code": "2353", "name": "宏碁"}],
        }
        result = build_changes_summary(changes)
        assert "新增：台積電" in result
        assert "加碼：群聯" in result
        assert "減碼：台達電" in result
        assert "出清：宏碁" in result

    def test_empty(self):
        assert build_changes_summary({}) == "無異動"

    def test_new_only(self):
        changes = {"new": [{"code": "2330", "name": "台積電", "weight": 3.0}]}
        result = build_changes_summary(changes)
        assert "新增" in result
        assert "加碼" not in result


class TestBuildChangesDetail:
    def test_structure(self):
        changes = {
            "new": [{"code": "2330", "name": "台積電", "weight": 5.0}],
            "added": [{"code": "8299", "name": "群聯", "weight": 3.0, "weight_chg": 1.0}],
            "reduced": [],
            "exited": [{"code": "2353", "name": "宏碁"}],
        }
        result = build_changes_detail(changes)
        assert len(result["new"]) == 1
        assert result["new"][0]["code"] == "2330"
        assert len(result["added"]) == 1
        assert result["added"][0]["weight_chg"] == 1.0
        assert len(result["reduced"]) == 0
        assert len(result["removed"]) == 1
        assert result["removed"][0]["weight"] == 0

    def test_empty(self):
        result = build_changes_detail({})
        assert result == {"new": [], "added": [], "reduced": [], "removed": []}
