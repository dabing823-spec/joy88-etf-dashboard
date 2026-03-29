"""Tests for quality_agent — trading day calculation."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts" / "agents"))

from quality_agent import get_trading_days


class TestGetTradingDays:
    def test_excludes_weekends(self):
        # 2026-03-23 is Monday, 2026-03-29 is Sunday
        days = get_trading_days("2026-03-23", "2026-03-29")
        assert "2026-03-23" in days  # Monday
        assert "2026-03-27" in days  # Friday
        assert "2026-03-28" not in days  # Saturday
        assert "2026-03-29" not in days  # Sunday

    def test_single_day_weekday(self):
        days = get_trading_days("2026-03-26", "2026-03-26")
        assert len(days) == 1
        assert "2026-03-26" in days

    def test_single_day_weekend(self):
        days = get_trading_days("2026-03-28", "2026-03-28")
        assert len(days) == 0

    def test_week_has_5_trading_days(self):
        days = get_trading_days("2026-03-23", "2026-03-27")
        assert len(days) == 5
