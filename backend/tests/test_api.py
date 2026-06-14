"""Integration tests for the Golazo FastAPI endpoints.

Run with: pytest tests/test_api.py -v
Requires a running backend (or use TestClient which runs in-process).
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient


@pytest.fixture
def client():
    """FastAPI TestClient with mocked DB and agent runner."""
    with (
        patch("main.get_db") as mock_db,
        patch("main.runner") as mock_runner,
        patch("main.session_service") as mock_ss,
        patch("main._created_sessions", new=set()),
    ):
        mock_ss.create_session = AsyncMock()

        mock_col = MagicMock()
        mock_col.find.return_value.sort.return_value.to_list = AsyncMock(return_value=[])
        mock_col.find.return_value.to_list = AsyncMock(return_value=[])
        mock_col.find_one = AsyncMock(return_value=None)
        mock_col.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
        mock_col.insert_one = AsyncMock(return_value=MagicMock())
        mock_db.return_value = MagicMock(
            pending_actions=mock_col,
            trips=mock_col,
        )

        from main import app
        with TestClient(app) as c:
            yield c


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_pending_actions_empty(client):
    resp = client.get("/pending-actions?fan_id=abc123")
    assert resp.status_code == 200
    data = resp.json()
    assert "actions" in data
    assert isinstance(data["actions"], list)


def test_trip_not_found(client):
    resp = client.get("/trip?fan_id=abc123")
    assert resp.status_code == 200
    assert resp.json()["trip"] is None


def test_reject_invalid_action_id(client):
    resp = client.post("/actions/invalid_id/reject")
    assert resp.status_code == 400


def test_approve_invalid_action_id(client):
    resp = client.post("/actions/invalid_id/approve")
    assert resp.status_code == 400


def test_webhook_no_secret(client):
    """Webhook returns 200 even when no secret is configured."""
    body = json.dumps({
        "fullDocument": {"match_id": "WC2026-001", "winner": "Mexico", "status": "finished"}
    })
    resp = client.post(
        "/webhook/match-finished",
        content=body,
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200


def test_webhook_missing_winner(client):
    body = json.dumps({"fullDocument": {"match_id": "WC2026-001"}})
    resp = client.post(
        "/webhook/match-finished",
        content=body,
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.json()["processed"] is False
