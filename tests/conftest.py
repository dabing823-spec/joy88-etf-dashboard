"""Shared pytest fixtures for AI Advisor tests."""

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Add agents to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts" / "agents"))


@pytest.fixture
def sample_dashboard():
    return {
        "report_date": "2026-03-26",
        "dates": ["2026-03-24", "2026-03-25", "2026-03-26"],
        "cash_mode": {
            "mode": "🔵 積極進攻",
            "mode_desc": "現金偏低，經理人積極做多",
            "cash_now": 1.7,
            "futures_signal": "⚠️ 期貨保證金 0.6%",
            "cash_series": [
                {"date": "2026-03-24", "cash_pct": 2.5},
                {"date": "2026-03-25", "cash_pct": 2.1},
                {"date": "2026-03-26", "cash_pct": 1.7},
            ],
        },
        "latest_holdings": {
            "00981A": {
                "date": "2026-03-26",
                "changes": [
                    {"stock": "台積電", "action": "增加", "weight_change": 1.5},
                    {"stock": "群聯", "action": "減少", "weight_change": -0.8},
                ],
            }
        },
    }


@pytest.fixture
def sample_strategy():
    return {
        "risk_signals": {
            "score": 7,
            "max_score": 15,
            "level": "medium",
            "signals": [
                {"name": "VIX", "level": "yellow", "description": "VIX > 20"},
                {"name": "融資", "level": "yellow", "description": "融資連增"},
                {"name": "外資", "level": "green", "description": "外資回補"},
            ],
        },
        "market_indices": {
            "taiex": 22500,
            "taiex_chg_pct": -0.5,
            "vix": 21.3,
            "vix_chg_pct": 3.2,
        },
    }


@pytest.fixture
def sample_news():
    return {
        "analyses": [
            {
                "headline": "Fed 維持利率不變",
                "layer1": {"event": "Fed 宣布利率維持在 5.25-5.50%"},
                "layer2": {"hidden": "點陣圖暗示今年可能只降息一次"},
                "layer3": {"action_plan": "維持現有部位，不追高"},
            }
        ]
    }


@pytest.fixture
def sample_advisory():
    return {
        "date": "2026-03-26",
        "generated_at": "2026-03-26T08:35:00+08:00",
        "market_phase": "盤前",
        "overall_signal": "防守",
        "data_completeness": 0.8,
        "action_items": [
            {
                "priority": 1,
                "action": "減碼台積電至標準權重",
                "reasoning": "VIX 加速惡化中 + 融資連續增加",
                "framework": "部位檢核",
            },
            {
                "priority": 2,
                "action": "觀察美股開盤反應",
                "reasoning": "Fed 決策後市場消化中",
                "framework": "三層次分析",
            },
        ],
        "market_summary": "市場情緒偏保守",
        "risk_assessment": "VIX 黃燈，風控預警",
        "telegram_short": "🔴 防守 — 盤前",
        "data_sources": {
            "dashboard": {"date": "2026-03-25", "fresh": True},
            "strategy": {"date": "2026-03-26", "fresh": True},
            "news_analysis": {"date": "2026-03-26", "fresh": True},
            "ai_research": {"date": "2026-03-25", "fresh": True},
            "tsmc_vol_signal": {"date": None, "fresh": False},
        },
        "data_gaps": ["tsmc_vol_signal"],
        "outcome": None,
    }


@pytest.fixture
def mock_api():
    """Mock the Claude API to return a valid response."""
    valid_response = json.dumps(
        {
            "overall_signal": "防守",
            "action_items": [
                {
                    "priority": 1,
                    "action": "減碼台積電至標準權重",
                    "reasoning": "VIX 惡化",
                    "framework": "風控",
                }
            ],
            "market_summary": "市場風險上升",
            "risk_assessment": "VIX 黃燈預警中",
        }
    )
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=valid_response)]

    with patch("ai_advisor_agent.anthropic") as mock_anthropic:
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.Anthropic.return_value = mock_client
        yield mock_client
