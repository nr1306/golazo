from db import get_db


async def get_matches_by_team(team: str) -> dict:
    """Get all WC2026 matches for a national team.

    Args:
        team: Team name (e.g. "Mexico", "Brazil", "England").

    Returns:
        {"matches": [match_doc, ...]}
    """
    db = get_db()
    query = {"$or": [
        {"team_a": {"$regex": team, "$options": "i"}},
        {"team_b": {"$regex": team, "$options": "i"}},
    ]}
    matches = await db.matches.find(query, {"_id": 0}).sort("date", 1).to_list(50)
    return {"matches": matches}


async def get_matches_by_city(city: str) -> dict:
    """Get all WC2026 matches scheduled in a specific city.

    Args:
        city: City name (e.g. "Dallas", "Toronto", "Mexico City").

    Returns:
        {"matches": [match_doc, ...]}
    """
    db = get_db()
    matches = (
        await db.matches.find(
            {"city": {"$regex": city, "$options": "i"}}, {"_id": 0}
        )
        .sort("date", 1)
        .to_list(50)
    )
    return {"matches": matches}


async def find_matches_near_me(lat: float, lon: float, radius_km: int = 500) -> dict:
    """Find WC2026 matches within radius_km of a geographic coordinate.

    Args:
        lat: Latitude of the fan's location.
        lon: Longitude of the fan's location.
        radius_km: Search radius in kilometres (default 500).

    Returns:
        {"matches": [...], "nearby_cities": [...]}
    """
    db = get_db()
    radians = radius_km / 6378.1
    venues = await db.venues.find(
        {"location": {"$geoWithin": {"$centerSphere": [[lon, lat], radians]}}},
        {"city": 1, "_id": 0},
    ).to_list(20)
    cities = [v["city"] for v in venues if v.get("city")]
    if not cities:
        return {"matches": [], "nearby_cities": []}
    matches = (
        await db.matches.find({"city": {"$in": cities}}, {"_id": 0})
        .sort("date", 1)
        .to_list(50)
    )
    return {"matches": matches, "nearby_cities": cities}


async def get_match_day_briefing(match_id: str = "", team: str = "") -> dict:
    """Full match-day briefing: fixture details, venue info, atmosphere score, fan zone tips.

    Pass either match_id OR team name. If team is given, finds their next upcoming match.

    Args:
        match_id: The match identifier (e.g. "WC2026-001"). Optional if team is given.
        team: Team name to find the next upcoming match for (e.g. "Brazil"). Optional if match_id is given.

    Returns:
        {"match": {...}, "venue": {...}, "atmosphere_score": int, "fan_zones": [...], "transport_tips": str}
    """
    db = get_db()

    match = None
    if match_id:
        match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})

    if not match and team:
        match = await db.matches.find_one(
            {
                "$or": [
                    {"team_a": {"$regex": team, "$options": "i"}},
                    {"team_b": {"$regex": team, "$options": "i"}},
                ],
                "status": {"$in": ["upcoming", "live"]},
            },
            {"_id": 0},
            sort=[("date", 1)],
        )

    if not match:
        return {"error": f"No upcoming match found for {'match_id=' + match_id if match_id else 'team=' + team}"}

    venue = await db.venues.find_one(
        {"city": {"$regex": match.get("city", ""), "$options": "i"}},
        {"_id": 0, "vibe_embedding": 0},
    )
    v = venue or {}

    return {
        "match": match,
        "venue": v,
        "atmosphere_score": match.get("atmosphere_score", 70),
        "fan_zones": v.get("fan_zones", []),
        "transport_tips": v.get("transport_tips", "Check local transit on match day."),
        "food_spots": v.get("local_food", []),
    }
