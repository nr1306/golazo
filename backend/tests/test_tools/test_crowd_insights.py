"""Tests for get_crowd_insights tool."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def mock_db():
    with patch("agent.tools.crowd.get_db") as m:
        db = MagicMock()
        m.return_value = db
        yield db


@pytest.mark.asyncio
async def test_crowd_no_data(mock_db):
    from agent.tools.crowd import get_crowd_insights

    mock_db.trips.aggregate.return_value.to_list = AsyncMock(return_value=[])
    result = await get_crowd_insights("Dallas")
    assert result["fans_booked"] == 0
    assert "budget_tip" in result


@pytest.mark.asyncio
async def test_crowd_with_data(mock_db):
    from agent.tools.crowd import get_crowd_insights

    mock_db.trips.aggregate.return_value.to_list = AsyncMock(return_value=[{
        "_id": "Dallas",
        "fans_booked": 420,
        "avg_hotel_price": 210,
        "neighbourhoods": ["Arlington", "Downtown Dallas", "Deep Ellum"],
    }])
    result = await get_crowd_insights("Dallas")
    assert result["fans_booked"] == 420
    assert result["avg_hotel_price"] == 210
    assert len(result["top_neighbourhoods"]) <= 4
    assert "budget_tip" in result


@pytest.mark.asyncio
async def test_crowd_high_price_marks_overbooked(mock_db):
    from agent.tools.crowd import get_crowd_insights

    mock_db.trips.aggregate.return_value.to_list = AsyncMock(return_value=[{
        "_id": "East Rutherford",
        "fans_booked": 1200,
        "avg_hotel_price": 450,
        "neighbourhoods": ["Times Square", "Brooklyn"],
    }])
    result = await get_crowd_insights("East Rutherford")
    assert len(result["overbooked_zones"]) > 0
