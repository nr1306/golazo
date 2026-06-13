from db import get_db


async def search_players(
    query: str = "",
    team: str = "",
    position: str = "",
    limit: int = 15,
) -> dict:
    """Search WC2026 players by name, team, or position.

    Use this before manage_fantasy_roster to find the correct player_id.

    Args:
        query: Player name or partial name (e.g. "Mbappe", "Vini").
        team: National team filter (e.g. "Brazil", "France").
        position: Position filter — Forward, Midfielder, Defender, Goalkeeper.
        limit: Max results (default 15).

    Returns:
        {"players": [{"player_id": str, "name": str, "team": str, "position": str, "form": int, "available": bool}]}
    """
    db = get_db()
    mongo_query: dict = {}

    if query:
        mongo_query["name"] = {"$regex": query, "$options": "i"}
    if team:
        mongo_query["team"] = {"$regex": team, "$options": "i"}
    if position:
        mongo_query["position"] = {"$regex": position, "$options": "i"}

    players = (
        await db.players.find(mongo_query, {"_id": 0})
        .sort("form", -1)
        .limit(limit)
        .to_list(limit)
    )
    return {"players": players}


async def get_fantasy_roster(fan_id: str) -> dict:
    """Get the fan's current fantasy roster with full player details and suggested lineup.

    Args:
        fan_id: The fan's MongoDB ObjectId string.

    Returns:
        {"roster": [player_doc, ...], "suggested_xi": [player_doc, ...], "player_count": int}
    """
    db = get_db()
    roster_doc = await db.fantasy_rosters.find_one({"fan_id": fan_id})
    if not roster_doc or not roster_doc.get("player_ids"):
        return {"roster": [], "suggested_xi": [], "player_count": 0}

    player_ids = roster_doc["player_ids"]
    players = await db.players.find(
        {"player_id": {"$in": player_ids}},
        {"_id": 0},
    ).sort("form", -1).to_list(50)

    # Best available XI — pick by position quota: 1 GK, 4 DEF, 3 MID, 3 FWD
    quotas = {"Goalkeeper": 1, "Defender": 4, "Midfielder": 3, "Forward": 3}
    counts: dict[str, int] = {}
    xi = []
    for p in players:
        if not p.get("available"):
            continue
        pos = p.get("position", "")
        if counts.get(pos, 0) < quotas.get(pos, 0):
            xi.append(p)
            counts[pos] = counts.get(pos, 0) + 1
        if len(xi) == 11:
            break

    return {"roster": players, "suggested_xi": xi, "player_count": len(players)}
