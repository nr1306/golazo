"""Tests for score_match_atmosphere tool."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def mock_db():
    with patch("agent.tools.trip_planner.get_db") as m:
        db = MagicMock()
        m.return_value = db
        yield db


@pytest.mark.asyncio
async def test_atmosphere_high_score(mock_db):
    from agent.tools.trip_planner import score_match_atmosphere

    mock_db.matches.find_one = AsyncMock(return_value={
        "match_id": "WC2026-018",
        "team_a": "England",
        "team_b": "France",
        "atmosphere_score": 97,
    })
    result = await score_match_atmosphere("WC2026-018")
    assert result["atmosphere_score"] == 97
    assert result["label"] == "Electric"


@pytest.mark.asyncio
async def test_atmosphere_medium_score(mock_db):
    from agent.tools.trip_planner import score_match_atmosphere

    mock_db.matches.find_one = AsyncMock(return_value={
        "match_id": "WC2026-010",
        "atmosphere_score": 65,
    })
    result = await score_match_atmosphere("WC2026-010")
    assert result["label"] == "High Energy"


@pytest.mark.asyncio
async def test_atmosphere_not_found(mock_db):
    from agent.tools.trip_planner import score_match_atmosphere

    mock_db.matches.find_one = AsyncMock(return_value=None)
    result = await score_match_atmosphere("WC2026-999")
    assert "error" in result
