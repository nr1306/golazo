"""Tests for recall_memory and remember tools."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def mock_db():
    with patch("agent.tools.memory.get_db") as m:
        db = MagicMock()
        m.return_value = db
        yield db


@pytest.fixture(autouse=True)
def stub_embed():
    """Stub out Vertex AI embed so tests don't need GCP creds."""
    with patch("agent.tools.memory._embed", new=AsyncMock(return_value=[0.0] * 768)):
        yield


@pytest.mark.asyncio
async def test_recall_no_fan_id(mock_db):
    from agent.tools.memory import recall_memory

    result = await recall_memory("none", "What team do I support?")
    assert result == {"memories": []}
    mock_db.agent_memory.aggregate.assert_not_called()


@pytest.mark.asyncio
async def test_recall_returns_memories(mock_db):
    from agent.tools.memory import recall_memory

    mock_db.agent_memory.aggregate.return_value.to_list = AsyncMock(return_value=[
        {"content": "Supports Mexico", "type": "preference", "created_at": "2026-06-07T00:00:00"},
    ])
    result = await recall_memory("fan123", "team")
    assert len(result["memories"]) == 1
    assert result["memories"][0]["content"] == "Supports Mexico"


@pytest.mark.asyncio
async def test_remember_stores_memory(mock_db):
    from agent.tools.memory import remember

    mock_result = MagicMock()
    mock_result.inserted_id = "abc123"
    mock_db.agent_memory.insert_one = AsyncMock(return_value=mock_result)

    result = await remember("fan123", "Prefers halal food", "dietary")
    assert result["stored"] is True
    assert result["id"] == "abc123"


@pytest.mark.asyncio
async def test_remember_no_fan_id(mock_db):
    from agent.tools.memory import remember

    result = await remember("none", "something")
    assert result["stored"] is False
