"""Atlas Database Trigger webhook handler — extracted for testability."""

import hashlib
import hmac
import json
import os
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase


def verify_signature(body: bytes, sig_header: str, secret: str) -> bool:
    """Verify Atlas HMAC-SHA256 webhook signature."""
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig_header, expected)


async def handle_match_finished(payload: dict, db: AsyncIOMotorDatabase) -> dict:
    """Process a finished match: find affected fans and create pending_actions.

    Args:
        payload: Atlas Trigger payload containing fullDocument.
        db: Async Motor database handle.

    Returns:
        {"processed": bool, "pending_actions_created": int}
    """
    full_doc = payload.get("fullDocument", {})
    match_id = full_doc.get("match_id")
    winner   = full_doc.get("winner")

    if not match_id or not winner:
        return {"processed": False, "reason": "missing match_id or winner"}

    # Find fans whose trip includes the winning team
    affected: list[dict] = []
    for field in ("legs.team_a", "legs.team_b"):
        affected += await db.trips.find(
            {field: winner}, {"fan_id": 1, "legs": 1}
        ).to_list(200)

    seen: set[str] = set()
    created = 0
    for trip in affected:
        fan_id = trip.get("fan_id")
        if not fan_id or fan_id in seen:
            continue
        seen.add(fan_id)

        summary = (
            f"{winner} advanced! We found a hotel near the next venue — "
            "review and approve to add it to your trip."
        )
        await db.pending_actions.insert_one({
            "fan_id":      fan_id,
            "action_type": "add_match_to_trip",
            "summary":     summary,
            "payload":     {"team": winner, "match_id": match_id, "source": "proactive"},
            "status":      "pending",
            "created_at":  datetime.now(timezone.utc),
        })
        created += 1

    return {"processed": True, "pending_actions_created": created}
