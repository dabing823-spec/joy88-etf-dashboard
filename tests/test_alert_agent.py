"""Tests for alert_agent — alert analysis and formatting."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts" / "agents"))

from alert_agent import format_line_message


class TestFormatLineMessage:
    def test_high_priority(self):
        alerts = [{"priority": "HIGH", "type": "new_entry", "msg": "台積電新進場"}]
        result = format_line_message("2026-03-26", alerts)
        assert "2026-03-26" in result
        assert "重要異動" in result
        assert "台積電新進場" in result

    def test_medium_priority(self):
        alerts = [{"priority": "MEDIUM", "type": "cash_change", "msg": "現金水位變動 +1.5%"}]
        result = format_line_message("2026-03-26", alerts)
        assert "注意事項" in result
        assert "現金水位" in result

    def test_mixed_priorities(self):
        alerts = [
            {"priority": "HIGH", "type": "exit", "msg": "群聯出場"},
            {"priority": "MEDIUM", "type": "mode_change", "msg": "模式切換為防守"},
        ]
        result = format_line_message("2026-03-26", alerts)
        assert "重要異動" in result
        assert "注意事項" in result
        # HIGH should appear before MEDIUM
        assert result.index("重要異動") < result.index("注意事項")

    def test_empty_alerts(self):
        result = format_line_message("2026-03-26", [])
        assert "2026-03-26" in result
