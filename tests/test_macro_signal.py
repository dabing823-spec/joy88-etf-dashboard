"""Tests for macro_signal_agent — risk signal calculations."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts" / "agents"))

from macro_signal_agent import (
    _slope,
    _acceleration,
    _regime_probability,
    _ratio_series,
    calc_risk_signals,
    calc_0050_strategy,
)


def _make_series(values, start_date="2026-03-01"):
    """Helper: list of floats → list of {date, close} dicts."""
    from datetime import datetime, timedelta
    base = datetime.strptime(start_date, "%Y-%m-%d")
    return [{"date": (base + timedelta(days=i)).strftime("%Y-%m-%d"), "close": v} for i, v in enumerate(values)]


class TestSlope:
    def test_flat_series(self):
        assert _slope([100.0] * 20, 20) == 0.0

    def test_upward_trend(self):
        vals = [float(i) for i in range(30)]
        assert _slope(vals, 20) > 0.9  # slope ~1.0

    def test_downward_trend(self):
        vals = [float(30 - i) for i in range(30)]
        assert _slope(vals, 20) < -0.9

    def test_too_few_values(self):
        assert _slope([1.0, 2.0], 20) == 0.0  # < 5 values

    def test_window_smaller_than_data(self):
        vals = [float(i) for i in range(50)]
        slope = _slope(vals, 10)
        assert slope > 0.9  # uses last 10 values


class TestAcceleration:
    def test_too_few_values(self):
        accel, phase = _acceleration([1.0] * 10)
        assert accel == 0.0
        assert phase == "stable"

    def test_stable_series(self):
        vals = [float(i) for i in range(20)]  # constant velocity
        accel, phase = _acceleration(vals)
        assert phase == "stable"

    def test_accelerating(self):
        # Exponential-like growth: recent slope > prior slope, same direction
        vals = [float(i ** 2) for i in range(20)]
        accel, phase = _acceleration(vals)
        assert accel > 0
        assert phase == "accelerating"


class TestRegimeProbability:
    def test_not_enough_data(self):
        assert _regime_probability([1.0] * 10, 0.5, 60) is None

    def test_extreme_slope(self):
        # Flat history, then current slope is extreme
        vals = [100.0] * 40 + [100.0 + i * 5 for i in range(10)]
        slope = _slope(vals, 20)
        prob = _regime_probability(vals, slope, 60)
        assert prob is not None
        assert prob < 50  # extreme slope should be rare


class TestRatioSeries:
    def test_basic_ratio(self):
        a = [{"date": "2026-03-01", "close": 100.0}, {"date": "2026-03-02", "close": 200.0}]
        b = [{"date": "2026-03-01", "close": 50.0}, {"date": "2026-03-02", "close": 100.0}]
        result = _ratio_series(a, b)
        assert len(result) == 2
        assert result[0]["close"] == 2.0
        assert result[1]["close"] == 2.0

    def test_missing_dates(self):
        a = [{"date": "2026-03-01", "close": 100.0}, {"date": "2026-03-03", "close": 300.0}]
        b = [{"date": "2026-03-01", "close": 50.0}]
        result = _ratio_series(a, b)
        assert len(result) == 1  # only matching date

    def test_zero_denominator(self):
        a = [{"date": "2026-03-01", "close": 100.0}]
        b = [{"date": "2026-03-01", "close": 0.0}]
        result = _ratio_series(a, b)
        assert len(result) == 0  # skips zero


class TestCalcRiskSignals:
    def _make_history(self, vix_level=20.0, trend=0.0):
        """Generate 30-day history for all 8 indicators."""
        import numpy as np
        days = 30
        base_vals = [vix_level + trend * i + np.random.normal(0, 0.1) for i in range(days)]
        flat_vals = [100.0 + np.random.normal(0, 0.1) for _ in range(days)]
        return {
            "vix": _make_series(base_vals),
            "spy": _make_series(flat_vals),
            "jpy": _make_series([150.0] * days),
            "hyg": _make_series(flat_vals),
            "tlt": _make_series([100.0] * days),
            "dxy": _make_series(flat_vals),
            "us10y": _make_series([4.5] * days),
            "fear_greed": _make_series([50.0] * days),
            "gold": _make_series([2000.0] * days),
            "oil": _make_series([70.0] * days),
        }

    def test_all_green(self):
        history = self._make_history(vix_level=18.0, trend=0.0)
        result = calc_risk_signals(history)
        assert result["score"] <= 3.0
        assert result["level"] == "low"
        assert len(result["signals"]) == 8

    def test_high_vix(self):
        history = self._make_history(vix_level=15.0, trend=1.0)  # rising VIX
        result = calc_risk_signals(history)
        vix_signal = next(s for s in result["signals"] if s["key"] == "vix")
        assert vix_signal["signal"] in ("yellow", "red")

    def test_score_range(self):
        history = self._make_history()
        result = calc_risk_signals(history)
        assert 0 <= result["score"] <= 10
        assert result["n_red"] + result["n_yellow"] + result["n_green"] == 8

    def test_validator_warnings(self):
        history = self._make_history()
        warnings = [{"level": "ERROR", "symbol": "vix"}]
        result = calc_risk_signals(history, warnings)
        vix = next(s for s in result["signals"] if s["key"] == "vix")
        assert vix["reliable"] is False


class TestCalc0050Strategy:
    def test_potential_in(self):
        rankings = [{"rank": i, "code": f"{2300+i}", "name": f"Stock{i}"} for i in range(1, 80)]
        holdings = {f"{2300+i}" for i in range(45, 80)}  # only hold rank 45+
        result = calc_0050_strategy(rankings, holdings)
        # Stocks ranked <= 40 but not held = potential_in
        assert len(result["potential_in"]) > 0

    def test_empty_inputs(self):
        result = calc_0050_strategy([], set())
        assert result["potential_in"] == []
        assert result["potential_out"] == []
