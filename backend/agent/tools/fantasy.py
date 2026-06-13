from datetime import datetime, timezone

from db import get_db


async def manage_fantasy_roster(fan_id: str, action: str, player_id: str) -> dict:
    """Add or remove a player from the fan's WC2026 fantasy roster.

    Args:
        fan_id: The fan's MongoDB ObjectId string.
        action: "add" to add a player, "remove" to drop them.
        player_id: The player's identifier string.

    Returns:
        {"updated": True, "player_count": int}
    """
    db = get_db()
    if action == "add":
        await db.fantasy_rosters.update_one(
            {"fan_id": fan_id},
            {
                "$addToSet": {"player_ids": player_id},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
    elif action == "remove":
        await db.fantasy_rosters.update_one(
            {"fan_id": fan_id},
            {
                "$pull": {"player_ids": player_id},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )
    else:
        return {"error": "action must be 'add' or 'remove'"}

    roster = await db.fantasy_rosters.find_one({"fan_id": fan_id}, {"player_ids": 1})
    count = len(roster.get("player_ids", [])) if roster else 0
    return {"updated": True, "player_count": count}


async def suggest_lineup(fan_id: str) -> dict:
    """Suggest the best starting 11 from the fan's fantasy roster based on current form.

    Args:
        fan_id: The fan's MongoDB ObjectId string.

    Returns:
        {"lineup": [player_doc, ...], "message": str}
    """
    db = get_db()
    roster = await db.fantasy_rosters.find_one({"fan_id": fan_id})
    if not roster or not roster.get("player_ids"):
        return {"lineup": [], "message": "No players in your roster yet — add some first!"}

    players = (
        await db.players.find(
            {"player_id": {"$in": roster["player_ids"]}, "available": True},
            {"_id": 0, "name": 1, "team": 1, "position": 1, "form": 1},
        )
        .sort("form", -1)
        .to_list(11)
    )
    return {"lineup": players, "message": f"Best {len(players)} available from your squad."}
