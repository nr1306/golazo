from datetime import datetime, timezone

from bson import ObjectId

from db import get_db


async def create_fan_profile(
    session_id: str,
    home_city: str,
    favorite_team: str,
    budget: int = 3000,
    currency: str = "USD",
    dietary_prefs: list | None = None,
) -> dict:
    """Create a new fan profile or return the existing one for this session.

    Args:
        session_id: The browser session UUID (from localStorage).
        home_city: Fan's home city (e.g. "Chicago").
        favorite_team: Favourite national team (e.g. "Mexico").
        budget: Total trip budget in the given currency (default 3000).
        currency: ISO currency code (default "USD").
        dietary_prefs: List of dietary restrictions (e.g. ["halal", "vegetarian"]).

    Returns:
        {"fan_id": str, "created": bool}
    """
    db = get_db()
    existing = await db.fans.find_one({"session_id": session_id})
    if existing:
        return {"fan_id": str(existing["_id"]), "created": False}

    doc = {
        "session_id": session_id,
        "home_city": home_city,
        "favorite_team": favorite_team,
        "budget": budget,
        "currency": currency,
        "dietary_prefs": dietary_prefs or [],
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.fans.insert_one(doc)
    return {"fan_id": str(result.inserted_id), "created": True}


async def propose_action(
    fan_id: str,
    action_type: str,
    summary: str,
    payload: dict,
) -> dict:
    """Queue an agent-proposed change for the fan to approve (human-in-the-loop).

    Use this whenever the agent wants to modify a fan's trip on their behalf.
    Never modify trips directly — always propose first.

    Args:
        fan_id: The fan's MongoDB ObjectId string.
        action_type: Category (e.g. "add_match_to_trip", "update_hotel").
        summary: Human-readable description shown in the approval UI.
        payload: Data to apply if the fan approves (arbitrary dict).

    Returns:
        {"action_id": str, "status": "pending"}
    """
    db = get_db()
    doc = {
        "fan_id": fan_id,
        "action_type": action_type,
        "summary": summary,
        "payload": payload,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.pending_actions.insert_one(doc)
    return {"action_id": str(result.inserted_id), "status": "pending"}


async def apply_approved_action(action_id: str) -> dict:
    """Apply a fan-approved pending action to their trip.

    Args:
        action_id: The pending_action MongoDB ObjectId string.

    Returns:
        {"applied": True} or {"error": str}
    """
    db = get_db()
    try:
        action = await db.pending_actions.find_one({"_id": ObjectId(action_id)})
    except Exception:
        return {"error": "Invalid action_id"}

    if not action:
        return {"error": "Action not found"}
    if action.get("status") != "approved":
        return {"error": "Action has not been approved by the fan"}

    if action["action_type"] in ("add_match_to_trip", "update_hotel"):
        fan_id = action["fan_id"]
        payload = action.get("payload", {})
        trip = await db.trips.find_one({"fan_id": fan_id})
        legs = list(trip.get("legs", [])) if trip else []
        legs.append(payload)
        await db.trips.update_one(
            {"fan_id": fan_id},
            {"$set": {"legs": legs, "updated_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

    await db.pending_actions.update_one(
        {"_id": ObjectId(action_id)},
        {"$set": {"status": "applied", "applied_at": datetime.now(timezone.utc)}},
    )
    return {"applied": True}
