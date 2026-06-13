"""Tests for trip planner tools."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def mock_db():
    with patch("agent.tools.trip_planner.get_db") as m:
        db = MagicMock()
        m.return_value = db
        yield db


@pytest.fixture(autouse=True)
def stub_embed():
    with patch("agent.tools.trip_planner._embed", new=AsyncMock(return_value=[0.0] * 768)):
        yield


@pytest.mark.asyncio
async def test_save_trip(mock_db):
    from agent.tools.trip_planner import save_trip_itinerary

    mock_db.trips.update_one = AsyncMock(return_value=MagicMock())
    result = await save_trip_itinerary("fan123", [{"city": "Dallas", "match_number": 18}])
    assert result["saved"] is True
    assert result["leg_count"] == 1


@pytest.mark.asyncio
async def test_get_trip_not_found(mock_db):
    from agent.tools.trip_planner import get_trip_itinerary

    mock_db.trips.find_one = AsyncMock(return_value=None)
    result = await get_trip_itinerary("fan123")
    assert result["trip"] is None


@pytest.mark.asyncio
async def test_discover_by_vibe(mock_db):
    from agent.tools.trip_planner import discover_by_vibe

    mock_db.venues.aggregate.return_value.to_list = AsyncMock(return_value=[
        {"stadium": "Hard Rock Stadium", "city": "Miami", "vibe_tags": ["tropical heat", "Latin passion"]},
    ])
    result = await discover_by_vibe("tropical beach party atmosphere")
    assert len(result["venues"]) == 1
    assert result["venues"][0]["city"] == "Miami"


@pytest.mark.asyncio
async def test_fetch_hotels_no_api_key(mock_db):
    from agent.tools.trip_planner import fetch_hotels_near_stadium

    with patch.dict("os.environ", {}, clear=True):
        # Ensure APIFY_API_KEY is not set
        import os
        os.environ.pop("APIFY_API_KEY", None)
        result = await fetch_hotels_near_stadium("Dallas", "2026-06-24", "2026-06-26")
    assert result["hotels"] == []
    assert "note" in result
